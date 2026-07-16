import { NextResponse } from 'next/server';
import { resolveRequestProvider } from '@/lib/ai-provider';
import { enforceAIUsageLimit, usageHeaders, usageLimitResponse } from '@/lib/ai-usage';
import { ingestContent } from '@/lib/ingest-pipeline';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { scrapeUrl } from '@/lib/scraper';
import { UnsafeUrlError } from '@/lib/url-guard';

export async function POST(request: Request) {
  let url: string | undefined;
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

    ({ url } = body as { url?: string });

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!url.startsWith('http')) {
      return NextResponse.json(
        { error: 'URL must start with http or https' },
        { status: 400 }
      );
    }

    const { title, content } = await scrapeUrl(url);
    const result = await ingestContent(title, content, 'url', provider);

    return NextResponse.json(result, { headers: usageHeaders(usage) });
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      const userId = await getUserId().catch(() => 'unknown');
      // Deliberately generic message to the client — don't confirm which
      // internal check tripped, just that the URL isn't allowed.
      console.warn(
        JSON.stringify({
          event: 'scrape_url_rejected',
          userId,
          url,
          reason: error.message,
          at: new Date().toISOString(),
        })
      );
      return NextResponse.json({ error: 'This URL cannot be fetched' }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
