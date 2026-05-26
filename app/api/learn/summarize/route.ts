import { NextResponse } from 'next/server';
import { generateCompletion, parseProviderFromRequest } from '@/lib/ai-provider';
import { retrieveContext } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = parseProviderFromRequest(request, body);
    const { query } = body as { query?: string };

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const context = await retrieveContext(query, provider);
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
      return NextResponse.json(summary);
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
