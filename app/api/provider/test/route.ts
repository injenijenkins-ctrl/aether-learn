import { NextResponse } from 'next/server';
import { generateCompletion, parseProviderFromRequest } from '@/lib/ai-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = await parseProviderFromRequest(request, body);

    const probe = await generateCompletion(
      'Reply with exactly: OK',
      provider,
      'You are a health-check assistant.'
    );

    return NextResponse.json({
      success: true,
      provider: {
        baseUrl: provider.baseUrl,
        model: provider.model,
        embeddingModel: provider.embeddingModel,
      },
      responsePreview: typeof probe === 'string' ? probe.slice(0, 80) : '',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Provider connection failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
