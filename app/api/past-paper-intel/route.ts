import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { generateCompletion, resolveRequestProvider } from '@/lib/ai-provider';
import { enforceAIUsageLimit, usageLimitResponse } from '@/lib/ai-usage';
import { extractTextFromFile, validateFileSize } from '@/lib/file-extract';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced || text.match(/\{[\s\S]*\}/)?.[0] || text;
  return JSON.parse(raw);
}

async function providerFor(request: Request, body?: Record<string, unknown>) {
  const { provider } = await resolveRequestProvider(request, body, 'content_summarization');
  return provider;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const supabase = getSupabase();
    const [{ data: analyses, error }, { data: attempts }] = await Promise.all([
      supabase
        .from('past_paper_analyses')
        .select('id, exam_type, title, analysis, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('past_paper_attempts')
        .select('analysis_id, question_type, correct')
        .eq('user_id', userId),
    ]);

    if (error) throw new Error(error.message);

    const weaknessMap = new Map<string, { attempts: number; correct: number }>();
    for (const attempt of attempts || []) {
      const current = weaknessMap.get(attempt.question_type) || { attempts: 0, correct: 0 };
      current.attempts += 1;
      if (attempt.correct) current.correct += 1;
      weaknessMap.set(attempt.question_type, current);
    }

    const trackedWeaknesses = [...weaknessMap.entries()]
      .map(([questionType, value]) => ({
        questionType,
        attempts: value.attempts,
        accuracy: Math.round((value.correct / Math.max(value.attempts, 1)) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    return NextResponse.json({ analyses: analyses || [], trackedWeaknesses });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load past papers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const contentType = request.headers.get('content-type') || '';
    let examType = 'KCSE';
    let title = 'Past paper';
    let text = '';
    let providerBody: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      examType = form.get('examType')?.toString() || examType;
      title = form.get('title')?.toString() || title;
      const file = form.get('file');
      if (file instanceof File) {
        validateFileSize(file.size);
        text = await extractTextFromFile(Buffer.from(await file.arrayBuffer()), file.name);
        title = title === 'Past paper' ? file.name.replace(/\.[^.]+$/, '') : title;
      }
    } else {
      const body = await request.json();
      providerBody = body;
      examType = body.examType || examType;
      title = body.title || title;
      text = body.text || '';
    }

    if (text.trim().length < 80) {
      return NextResponse.json({ error: 'Past paper text is too short' }, { status: 400 });
    }

    const provider = await providerFor(request, providerBody);

    const usage = await enforceAIUsageLimit(request);
    if (!usage.allowed) {
      return usageLimitResponse(usage);
    }

    const prompt = `Analyze this ${examType} past paper with exam intelligence.
Return strict JSON with this shape:
{
  "summary": "short overall insight",
  "questionPatterns": [{"type":"...", "frequency": 3, "skills":["..."], "markingHints":["..."]}],
  "markingSchemeSignals": ["..."],
  "highYieldTopics": [{"topic":"...", "reason":"..."}],
  "practicePlan": [{"questionType":"...", "drill":"...", "why":"..."}]
}
Focus on KCSE, WASSCE, or JAMB style question patterns, marking schemes, and repeatable skills.
PAST PAPER:
${text.slice(0, 18000)}`;

    const output = await generateCompletion(prompt, provider, 'You are an exam-analysis specialist. Return JSON only.');
    const analysis = extractJson(output);
    const id = nanoid();

    const { error } = await getSupabase().from('past_paper_analyses').insert({
      id,
      user_id: userId,
      exam_type: examType,
      title,
      analysis,
      created_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ id, examType, title, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to analyze past paper';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getUserId();
    const { analysisId, questionType, correct } = await request.json() as {
      analysisId?: string;
      questionType?: string;
      correct?: boolean;
    };

    if (!analysisId || !questionType || typeof correct !== 'boolean') {
      return NextResponse.json(
        { error: 'analysisId, questionType, and correct are required' },
        { status: 400 }
      );
    }

    const { error } = await getSupabase().from('past_paper_attempts').insert({
      id: nanoid(),
      user_id: userId,
      analysis_id: analysisId,
      question_type: questionType,
      correct,
      created_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to track attempt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
