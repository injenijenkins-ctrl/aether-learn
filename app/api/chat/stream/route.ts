import { parseProviderFromRequest, streamCompletion } from '@/lib/ai-provider';
import { retrieveContext } from '@/lib/rag';
import { getUserId } from '@/lib/session';
import { checkAndDeductCredit } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MASTER_PROVIDER = {
  apiKey: process.env.MASTER_AI_KEY || '',
  baseUrl: process.env.MASTER_AI_BASE_URL || 'https://openrouter.ai/api/v1',
  model: process.env.MASTER_AI_MODEL || 'qwen/qwen3-8b:free',
  embeddingModel: 'text-embedding-3-small',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body as { query?: string };

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine provider — BYO key or master key
    let provider;
    let usingMasterKey = false;

    try {
      provider = parseProviderFromRequest(request, body);
    } catch {
      if (!MASTER_PROVIDER.apiKey) {
        return new Response(
          JSON.stringify({ error: 'No AI provider configured. Add your API key in Settings.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      provider = MASTER_PROVIDER;
      usingMasterKey = true;
    }

    // Check credits if using master key
    if (usingMasterKey) {
      const userId = await getUserId();
      const { allowed, remaining, message } = await checkAndDeductCredit(userId);

      if (!allowed) {
        return new Response(
          JSON.stringify({ error: message }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const context = await retrieveContext(query, provider);
      const systemPrompt = `You are a helpful AI tutor. Use the provided context to answer the student's question.
Be clear, direct, and educational. End with a follow-up question.
CONTEXT: ${context}`;

      return new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            try {
              controller.enqueue(
                encoder.encode(`\x00${JSON.stringify({ credits: remaining })}\x00`)
              );
              for await (const chunk of streamCompletion(query, provider, systemPrompt)) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.close();
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Stream failed';
              controller.enqueue(encoder.encode(`\n\nError: ${msg}`));
              controller.close();
            }
          },
        }),
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // BYO key path — no credit check
    const context = await retrieveContext(query, provider);
    const systemPrompt = `You are a helpful AI tutor. Use the provided context to answer the student's question.
Be clear, direct, and educational. End with a follow-up question.
CONTEXT: ${context}`;

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of streamCompletion(query, provider, systemPrompt)) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Stream failed';
            controller.enqueue(encoder.encode(`\n\nError: ${msg}`));
            controller.close();
          }
        },
      }),
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return new Response(message, { status: 500 });
  }
}