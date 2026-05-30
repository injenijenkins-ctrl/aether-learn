import { NextResponse } from 'next/server';
import { parseProviderFromRequest, streamCompletion, type ChatMessage } from '@/lib/ai-provider';
import { checkAndDeductCredit, getCreditStatus } from '@/lib/credits';
import { retrieveContext } from '@/lib/rag';
import { getUserId } from '@/lib/session';
import {
  addMessage,
  getRoomById,
  getRoomMembers,
  getRoomMessages,
  userCanAccessRoom,
} from '@/lib/study-rooms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MASTER_PROVIDER = {
  apiKey: process.env.MASTER_AI_KEY || '',
  baseUrl: process.env.MASTER_AI_BASE_URL || 'https://openrouter.ai/api/v1',
  model: process.env.MASTER_AI_MODEL || 'qwen/qwen3-8b:free',
  embeddingModel: 'text-embedding-3-small',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    if (!(await userCanAccessRoom(id, userId))) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = await getRoomById(id);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const [messages, members, hostCredits] = await Promise.all([
      getRoomMessages(id),
      getRoomMembers(id),
      getCreditStatus(room.host_id),
    ]);

    return NextResponse.json({ room, messages, members, hostCredits });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load room';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body as { content?: string };

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const senderId = await getUserId();
    const room = await getRoomById(id);

    if (!room || !(await userCanAccessRoom(id, senderId))) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    let provider;
    let usingMasterKey = false;

    try {
      provider = parseProviderFromRequest(request, body);
    } catch {
      if (!MASTER_PROVIDER.apiKey) {
        return NextResponse.json(
          { error: 'No AI provider configured. Add your API key in Settings.' },
          { status: 400 }
        );
      }
      provider = MASTER_PROVIDER;
      usingMasterKey = true;
    }

    let remaining: number | null = null;
    if (usingMasterKey) {
      const { allowed, remaining: credits, message } = await checkAndDeductCredit(room.host_id);
      remaining = credits;

      if (!allowed) {
        return NextResponse.json({ error: message }, { status: 429 });
      }
    }

    const userMessage = await addMessage(id, senderId, 'user', content.trim());
    const roomMessages = await getRoomMessages(id);
    const history: ChatMessage[] = roomMessages
      .filter((message) => message.content && message.id !== userMessage.id)
      .slice(-10)
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: `${message.userName || 'Learner'}: ${message.content}`,
      }));

    const context = await retrieveContext(content, provider, 5, room.host_id);
    const systemPrompt = `You are AetherLearn, a helpful AI tutor inside a group study room.
Use the host's ingested learning materials as the shared source of truth.
Answer clearly, reference relevant context when useful, and invite the group to continue.
CONTEXT:
${context}`;

    let aiContent = '';
    for await (const chunk of streamCompletion(content, provider, systemPrompt, history)) {
      aiContent += chunk;
    }

    const aiMessage = await addMessage(
      id,
      'aetherlearn-ai',
      'assistant',
      aiContent.trim() || 'I could not generate a response. Please try again.'
    );

    return NextResponse.json({
      message: userMessage,
      aiMessage: { ...aiMessage, userName: 'AetherLearn' },
      credits: remaining,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
