import { NextResponse } from 'next/server';
import { resolveRequestProvider } from '@/lib/ai-provider';
import { enforceAIUsageLimit, usageHeaders, usageLimitResponse } from '@/lib/ai-usage';
import { ingestContent } from '@/lib/ingest-pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    let provider;
    try {
      ({ provider } = await resolveRequestProvider(request, body, 'embedding'));
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

    return NextResponse.json(result, { headers: usageHeaders(usage) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
