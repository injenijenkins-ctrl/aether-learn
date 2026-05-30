import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateCompletion, parseProviderFromRequest } from '@/lib/ai-provider';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { vectorStore } from '@/lib/vector-store';
import { checkAndDeductCredit } from '@/lib/credits';
import { retrieveContextWithSources } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MASTER_PROVIDER = {
  apiKey: process.env.MASTER_AI_KEY || '',
  baseUrl: process.env.MASTER_AI_BASE_URL || 'https://openrouter.ai/api/v1',
  model: process.env.MASTER_AI_MODEL || 'qwen/qwen3-8b:free',
  embeddingModel: 'text-embedding-3-small',
};

export async function GET() {
  try {
    const userId = await getUserId();
    const { data: row, error } = await getSupabase()
      .from('study_plans')
      .select('id, daily_minutes, target_topics, study_goal, plan_json, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!row) {
      return NextResponse.json({ plan: null });
    }

    return NextResponse.json({
      plan: {
        id: row.id,
        dailyMinutes: row.daily_minutes,
        targetTopics: row.target_topics,
        studyGoal: row.study_goal,
        days: row.plan_json,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load study plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Determine provider — BYO key or master key
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

    const { dailyMinutes, targetTopics, studyGoal } = body as {
      dailyMinutes?: number;
      targetTopics?: string;
      studyGoal?: string;
    };

    if (!dailyMinutes || !targetTopics?.trim() || !studyGoal?.trim()) {
      return NextResponse.json(
        { error: 'dailyMinutes, targetTopics, and studyGoal are required' },
        { status: 400 }
      );
    }

    const userId = await getUserId();
    const resources = await vectorStore.getAll(userId);
    const resourceList = resources
      .map((r) => `- ${r.title} (${r.type})`)
      .join('\n');
    const { context, sources } = await retrieveContextWithSources(targetTopics, provider);

    const systemPrompt = `You are a study coach. Create a 7-day weekly study plan as JSON only:
{
  "days": [
    {
      "day": "Monday",
      "topics": ["topic1"],
      "resources": ["resource title"],
      "estimatedMinutes": 30,
      "tasks": ["specific task"]
    }
  ]
}
Study goal: ${studyGoal}. Daily budget: ${dailyMinutes} minutes. Target topics: ${targetTopics}.`;

    const prompt = `Ingested resources:\n${resourceList || 'No resources yet — use target topics only.'}`;
    const studyContextPrompt = `${prompt}\n\nRelevant source context:\n${context}`;
    const raw = await generateCompletion(studyContextPrompt, provider, systemPrompt);
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned) as { days: unknown[] };

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const { error } = await getSupabase().from('study_plans').insert({
      id,
      user_id: userId,
      daily_minutes: dailyMinutes,
      target_topics: targetTopics.trim(),
      study_goal: studyGoal.trim(),
      plan_json: parsed.days,
      created_at: createdAt,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      id,
      dailyMinutes,
      targetTopics: targetTopics.trim(),
      studyGoal: studyGoal.trim(),
      days: parsed.days,
      sources,
      createdAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate study plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
