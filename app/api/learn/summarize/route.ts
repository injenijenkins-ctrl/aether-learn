import { NextResponse } from 'next/server';
import { generateCompletion, parseProviderFromRequest } from '@/lib/ai-provider';
import { retrieveContextWithSources } from '@/lib/rag';
import { getUserId } from '@/lib/session';
import { checkAndDeductCredit } from '@/lib/credits';

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

    const { query } = body as { query?: string };

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const { context, sources } = await retrieveContextWithSources(query, provider);
    const systemPrompt = `Return ONLY valid JSON, no markdown fences:
{
  "oneLiner": "one sentence summary",
  "keyPoints": ["point 1", ...],
  "coreTakeaway": "the single most important thing"
}`;

    const prompt = `Summarize based on this topic: ${query}\n\nContext:\n${context}`;
    const raw = await generateCompletion(prompt, provider, systemPrompt);

    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      const summary = JSON.parse(cleaned);
      return NextResponse.json({ ...summary, sources });
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse summary' },
        { status: 500 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Summarize failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
