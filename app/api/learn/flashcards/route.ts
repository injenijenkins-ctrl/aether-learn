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
      ({ provider } = await resolveRequestProvider(request, body, 'flashcard_generation'));
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
    const systemPrompt = `Generate flashcards from the context. Return ONLY valid JSON, no markdown:
{
  "cards": [
    {
      "id": "c1",
      "front": "term or question",
      "back": "definition with a real-world example sentence"
    }
  ]
}
Create 6-10 cards. Every "back" must include a concrete real-world example.`;

    const prompt = `Topic: ${query}\n\nContext:\n${context}`;
    const raw = await generateCompletion(prompt, provider, systemPrompt);

    try {
      const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(cleaned);
      return withUsageHeaders(NextResponse.json({ ...data, sources }), usage);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse flashcards' },
        { status: 500 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Flashcard generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
