import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateCompletion, resolveRequestProvider } from '@/lib/ai-provider';
import { getSupabase } from '@/lib/supabase';
import { retrieveContextWithSources } from '@/lib/rag';
import { getUserId } from '@/lib/session';
import {
  enforceAIUsageLimit,
  usageLimitResponse,
  withUsageHeaders,
} from '@/lib/ai-usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Determine provider — BYO key or master key
    let provider;

    try {
      ({ provider } = await resolveRequestProvider(request, body, 'quiz_generation'));
    } catch {
      return NextResponse.json(
        { error: 'No AI provider configured. Add your API key in Settings.' },
        { status: 400 }
      );
    }

    const { query, score, total } = body as {
      query?: string;
      score?: number;
      total?: number;
    };

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const userId = await getUserId();
    const supabase = getSupabase();

    if (typeof score === 'number' && typeof total === 'number') {
      const { error } = await supabase.from('quiz_results').insert({
        id: uuidv4(),
        user_id: userId,
        topic: query,
        score,
        total,
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({ success: true });
    }

    const usage = await enforceAIUsageLimit(request);
    if (!usage.allowed) {
      return usageLimitResponse(usage);
    }

    const { data: answered } = await supabase
      .from('quiz_questions_answered')
      .select('question')
      .eq('user_id', userId)
      .eq('topic', query);

    const excludeList = (answered || []).map((a) => a.question).join('\n- ');

    const { context, sources } = await retrieveContextWithSources(query, provider);
    const systemPrompt = `Generate a 5-question quiz. Return ONLY valid JSON, no markdown fences:
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "type": "multiple_choice",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctAnswer": "A"
    }
  ]
}
Generate exactly 5 NEW multiple choice questions. Do NOT repeat these questions:
${excludeList ? `- ${excludeList}` : '(none yet)'}`;

    const prompt = `Quiz topic: ${query}\n\nContext:\n${context}`;
    const raw = await generateCompletion(prompt, provider, systemPrompt);

    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      const quiz = JSON.parse(cleaned) as {
        questions?: { id: string; question: string }[];
      };

      if (quiz.questions?.length) {
        const { error } = await supabase.from('quiz_questions_answered').insert(
          quiz.questions.map((q) => ({
            id: uuidv4(),
            user_id: userId,
            topic: query,
            question: q.question,
            created_at: new Date().toISOString(),
          }))
        );

        if (error) {
          console.error('quiz_questions_answered insert failed:', error);
        }
      }

      return withUsageHeaders(NextResponse.json({ ...quiz, sources }), usage);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse quiz' },
        { status: 500 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
