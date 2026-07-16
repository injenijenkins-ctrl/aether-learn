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

type Depth = 'beginner' | 'deeper' | 'real_world' | 'simpler';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, depth, userLevel } = body as {
      query?: string;
      depth?: Depth;
      userLevel?: 'beginner' | 'intermediate' | 'advanced';
    };

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Determine provider
    let provider;

    try {
      ({ provider } = await resolveRequestProvider(request, body, 'deep_tutoring'));
    } catch {
      return NextResponse.json(
        { error: 'No AI provider configured. Add your API key in Settings.' },
        { status: 400 }
      );
    }

    const usage = await enforceAIUsageLimit(request);
    if (!usage.allowed) {
      return usageLimitResponse(usage);
    }

    let depthLevel: Depth =
      depth === 'deeper' || depth === 'real_world' || depth === 'simpler'
        ? depth
        : 'beginner';

    if (depth === 'simpler') depthLevel = 'beginner';
    if (depth === 'deeper') depthLevel = 'deeper';

    const level =
      userLevel === 'intermediate' || userLevel === 'advanced'
        ? userLevel
        : 'beginner';

    const { context, sources } = await retrieveContextWithSources(query, provider);
    const systemPrompt = `You are an expert tutor. Given this content, generate a structured lesson.
Return ONLY valid JSON, no markdown fences:
{
  "title": "lesson title",
  "explanation": "full explanation based on depth level",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "commonMistakes": ["mistake 1", "mistake 2"],
  "depth": "beginner|deeper|real_world"
}
Depth level: ${depthLevel}. Student proficiency: ${level}. Adjust vocabulary and complexity for ${level} learners.`;

    const prompt = `Student question/topic: ${query}\n\nContext:\n${context}`;
    const raw = await generateCompletion(prompt, provider, systemPrompt);

    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      const lesson = JSON.parse(cleaned);

      const userId = await getUserId();
      const { error } = await getSupabase().from('lesson_history').insert({
        id: uuidv4(),
        user_id: userId,
        title: lesson.title || query.slice(0, 80),
        query,
        depth: depthLevel,
        created_at: new Date().toISOString(),
      });

      if (error) console.error('lesson_history insert failed:', error);

      return withUsageHeaders(NextResponse.json({ ...lesson, sources }), usage);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse lesson' },
        { status: 500 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lesson failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
