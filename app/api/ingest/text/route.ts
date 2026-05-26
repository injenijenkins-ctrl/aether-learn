import { NextResponse } from 'next/server';
import { parseProviderFromRequest } from '@/lib/ai-provider';
import { ingestContent } from '@/lib/ingest-pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = parseProviderFromRequest(request, body);
    const { text, title } = body as { text?: string; title?: string };

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (text.length <= 50) {
      return NextResponse.json(
        { error: 'Text must be longer than 50 characters' },
        { status: 400 }
      );
    }

    const resourceTitle =
      title && typeof title === 'string' && title.trim()
        ? title.trim()
        : 'Untitled Document';

    const result = await ingestContent(resourceTitle, text, 'text', provider);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
