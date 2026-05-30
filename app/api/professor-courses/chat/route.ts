import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { parseProviderFromRequest, generateCompletion } from '@/lib/ai-provider';
import { retrieveContextWithSourcesForResources } from '@/lib/rag';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { assertCourseAccess, getApprovedResourceIds } from '@/lib/professor-courses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MASTER_PROVIDER = {
  apiKey: process.env.MASTER_AI_KEY || '',
  baseUrl: process.env.MASTER_AI_BASE_URL || 'https://openrouter.ai/api/v1',
  model: process.env.MASTER_AI_MODEL || 'qwen/qwen3-8b:free',
  embeddingModel: 'text-embedding-3-small',
};

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { courseId, question } = body as { courseId?: string; question?: string };

    if (!courseId || !question?.trim()) {
      return NextResponse.json({ error: 'courseId and question are required' }, { status: 400 });
    }

    const course = await assertCourseAccess(courseId, userId);
    const resourceIds = await getApprovedResourceIds(courseId);
    if (resourceIds.length === 0) {
      return NextResponse.json(
        { error: 'This course has no approved lecturer materials yet.' },
        { status: 400 }
      );
    }

    let provider;
    try {
      provider = parseProviderFromRequest(request, body);
    } catch {
      if (!MASTER_PROVIDER.apiKey) {
        return NextResponse.json({ error: 'No AI provider configured.' }, { status: 400 });
      }
      provider = MASTER_PROVIDER;
    }

    const { context, sources } = await retrieveContextWithSourcesForResources(
      question,
      provider,
      resourceIds,
      7
    );

    const systemPrompt = `You are the AI tutor for "${course.title}".
Only answer from lecturer-approved materials in CONTEXT.
If the answer is not present, say it is not in the approved materials and suggest what to ask the lecturer.
Cite source numbers inline like [1].
Also infer a concise topic label and possible misconception when relevant.
CONTEXT:
${context}`;

    const answer = await generateCompletion(question, provider, systemPrompt);

    await getSupabase().from('professor_course_questions').insert({
      id: nanoid(),
      course_id: courseId,
      student_id: userId,
      question: question.trim(),
      topic: question.trim().split(/[?.:]/)[0].slice(0, 80),
      misconception: null,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ answer, sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Course tutor failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
