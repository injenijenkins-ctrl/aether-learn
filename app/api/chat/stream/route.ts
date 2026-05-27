import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateCompletion, parseProviderFromRequest } from '@/lib/ai-provider';
import { getSupabase } from '@/lib/supabase';
import { retrieveContext } from '@/lib/rag';
import { getUserId } from '@/lib/session';
import { checkAndDeductCredit } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Depth = 'beginner' | 'deeper' | 'real_world' | 'simpler';

const MASTER_PROVIDER = {
  apiKey: process.env.MASTER_AI_KEY || '',
  baseUrl: process.env.MASTER_AI_BASE_URL || 'https://openrouter.ai/api/v1',
  model: process.env.MASTER_AI_MODEL || 'deepseek/deepseek-v4-flash:free',
  embeddingModel: 'text-embedding-3-small',
};

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
    let usingMasterKey = false;

    try {
      provider = parseProviderFromRequest(request, body);
    } catch {
      if (!MASTER_PROVIDER.apiKey) {
        return NextResponse.json(
          { error: 'No AI provider configured. Add your API key in Settings.' },
          { status: 400 }
        );
      }
      provider = MASTER_PROVIDER;
      usingMasterKey = true;
    }

    // Check credits if using master key
    if (usingMasterKey) {
      const userId = await getUserId();
      const { allowed, message } = await checkAndDeductCredit(userId);

      if (!allowed) {
        return NextResponse.json({ error: message }, { status: 429 });
      }
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

    const context = await retrieveContext(query, provider);
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

      return NextResponse.json(lesson);
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