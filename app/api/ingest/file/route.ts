import { NextResponse } from 'next/server';
import { resolveRequestProvider } from '@/lib/ai-provider';
import { enforceAIUsageLimit, usageHeaders, usageLimitResponse } from '@/lib/ai-usage';
import { ingestContent } from '@/lib/ingest-pipeline';
import {
  ALLOWED_FILE_EXTENSIONS,
  extractTextFromFile,
  validateFileSize,
} from '@/lib/file-extract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    let provider;
    try {
      ({ provider } = await resolveRequestProvider(request, undefined, 'embedding'));
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

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const lower = file.name.toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return NextResponse.json(
        { error: 'Unsupported format. Use PDF, TXT, or DOCX.' },
        { status: 400 }
      );
    }

    validateFileSize(file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile(buffer, file.name);

    if (text.length <= 50) {
      return NextResponse.json(
        { error: 'Extracted text must be longer than 50 characters' },
        { status: 400 }
      );
    }

    const title =
      formData.get('title')?.toString()?.trim() || file.name.replace(/\.[^.]+$/, '');

    const result = await ingestContent(title, text, 'file', provider);
    return NextResponse.json(result, { headers: usageHeaders(usage) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'File ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
