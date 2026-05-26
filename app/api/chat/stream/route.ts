import { parseProviderFromRequest, streamCompletion, type ChatMessage } from '@/lib/ai-provider';
import { retrieveContext } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = parseProviderFromRequest(request, body);
    const { query, messages } = body as {
      query?: string;
      messages?: { role: string; content: string }[];
    };

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const history: ChatMessage[] = (messages || [])
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string'
      )
      .slice(-10)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const context = await retrieveContext(query, provider);
    const systemPrompt = `You are a helpful AI tutor. Use the provided context to answer the student's question.
Be clear, direct, and educational. End with a follow-up question.
CONTEXT: ${context}`;

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of streamCompletion(
              query,
              provider,
              systemPrompt,
              history
            )) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Stream failed';
            controller.enqueue(encoder.encode(`\n\nError: ${message}`));
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
