import { NextResponse } from 'next/server';
import { parseProviderFromRequest } from '@/lib/ai-provider';
import { ingestContent } from '@/lib/ingest-pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { scrapeUrl } from '@/lib/scraper';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = parseProviderFromRequest(request, body);
    const { url } = body as { url?: string };

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

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
