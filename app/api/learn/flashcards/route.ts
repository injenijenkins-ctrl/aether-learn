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
      return NextResponse.json(data);
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
