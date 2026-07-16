import { resolveRequestProvider, streamCompletion } from '@/lib/ai-provider';
import { retrieveContextWithSources } from '@/lib/rag';
import {
  enforceAIUsageLimit,
  usageHeaders,
  usageLimitResponse,
} from '@/lib/ai-usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function tutorSystemPrompt(context: string, tutorModeInstruction?: string) {
  const modeInstruction = tutorModeInstruction
    ? `\nTUTOR MODE: ${tutorModeInstruction}\n`
    : '\n';

  return `You are a helpful AI tutor. Use the provided context to answer the student's question.${modeInstruction}
Be clear, direct, and educational. When you use the provided context, cite it inline with source numbers like [1] or [2].
If the context is not enough, say what is missing instead of pretending. End with a follow-up question.
CONTEXT: ${context}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, tutorModeInstruction } = body as {
      query?: string;
      tutorModeInstruction?: string;
    };

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let provider;
    try {
      ({ provider } = await resolveRequestProvider(request, body, 'deep_tutoring'));
    } catch {
      return new Response(
        JSON.stringify({ error: 'No AI provider configured. Add your API key in Settings.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const usage = await enforceAIUsageLimit(request);
    if (!usage.allowed) {
      return usageLimitResponse(usage);
    }

    const { context, sources } = await retrieveContextWithSources(query, provider);
    const systemPrompt = tutorSystemPrompt(context, tutorModeInstruction);

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            controller.enqueue(
              encoder.encode(`\x00${JSON.stringify({ remainingQuota: usage.remaining, sources })}\x00`)
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
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          ...usageHeaders(usage),
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chat failed';
    return new Response(message, { status: 500 });
  }
}
