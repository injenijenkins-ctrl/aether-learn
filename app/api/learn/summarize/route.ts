import { NextResponse } from 'next/server';
import { generateCompletion, resolveRequestProvider } from '@/lib/ai-provider';
import { retrieveContextWithSources } from '@/lib/rag';
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
      ({ provider } = await resolveRequestProvider(request, body, 'content_summarization'));
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
      return withUsageHeaders(NextResponse.json({ ...summary, sources }), usage);
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
