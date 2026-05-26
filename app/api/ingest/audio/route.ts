import { NextResponse } from 'next/server';
import { parseProviderFromRequest } from '@/lib/ai-provider';
import { ingestContent } from '@/lib/ingest-pipeline';
import {
  ALLOWED_AUDIO_EXTENSIONS,
  MAX_AUDIO_BYTES,
  validateFileSize,
} from '@/lib/file-extract';
import { transcribeAudio } from '@/lib/whisper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = formData.get('action')?.toString() || 'transcribe';
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const lower = file.name.toLowerCase();
    if (!ALLOWED_AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return NextResponse.json(
        {
          error:
            'Unsupported format. Use MP3, MP4, WAV, M4A, or WEBM.',
        },
        { status: 400 }
      );
    }

    validateFileSize(file.size, MAX_AUDIO_BYTES);

    const provider = parseProviderFromRequest(request);

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await transcribeAudio(buffer, file.name, provider);

    if (action === 'transcribe') {
      return NextResponse.json({ text, filename: file.name });
    }

    if (text.length <= 50) {
      return NextResponse.json(
        { error: 'Transcribed text must be longer than 50 characters' },
        { status: 400 }
      );
    }

    const title =
      formData.get('title')?.toString()?.trim() ||
      file.name.replace(/\.[^.]+$/, '');

    const result = await ingestContent(title, text, 'audio', provider);
    return NextResponse.json({ ...result, transcribedText: text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Audio ingest failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
