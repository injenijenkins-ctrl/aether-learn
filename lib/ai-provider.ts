import type { AIProviderConfig } from './ai-provider-types';
import { DEFAULT_AI_PROVIDER } from './ai-provider-types';

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function resolveProviderConfig(
  input?: Partial<AIProviderConfig> | null
): AIProviderConfig {
  if (!input?.apiKey?.trim()) {
    throw new Error(
      'AI provider not configured. Add your API key, base URL, and model in Settings.'
    );
  }
  if (!input.baseUrl?.trim()) {
    throw new Error('Base URL is required');
  }
  if (!input.model?.trim()) {
    throw new Error('Model name is required');
  }

  return {
    apiKey: input.apiKey.trim(),
    baseUrl: normalizeBaseUrl(input.baseUrl),
    model: input.model.trim(),
    embeddingModel:
      input.embeddingModel?.trim() ||
      DEFAULT_AI_PROVIDER.embeddingModel ||
      'text-embedding-3-small',
  };
}

export function parseProviderFromBody(
  body: Record<string, unknown>
): AIProviderConfig {
  const provider = (body.provider ?? body) as Partial<AIProviderConfig>;
  return resolveProviderConfig(provider);
}

function providerFromHeaders(headers: Headers): Partial<AIProviderConfig> {
  const authHeader = headers.get('authorization') || '';
  const bearerKey = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  return {
    apiKey:
      headers.get('x-ai-api-key')?.trim() ||
      headers.get('x-openai-api-key')?.trim() ||
      bearerKey,
    baseUrl:
      headers.get('x-ai-base-url')?.trim() ||
      headers.get('x-openai-base-url')?.trim(),
    model:
      headers.get('x-ai-model')?.trim() ||
      headers.get('x-openai-model')?.trim(),
    embeddingModel:
      headers.get('x-ai-embedding-model')?.trim() ||
      headers.get('x-openai-embedding-model')?.trim(),
  };
}

export function parseProviderFromRequest(
  request: Request,
  body?: Record<string, unknown>
): AIProviderConfig {
  const fromHeaders = providerFromHeaders(request.headers);
  const fromBody = body ? ((body.provider ?? body) as Partial<AIProviderConfig>) : {};
  return resolveProviderConfig({
    ...fromHeaders,
    ...fromBody,
  });
}

function headers(config: AIProviderConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };
}

export async function embedText(
  text: string,
  config: AIProviderConfig
): Promise<number[]> {
  const base = normalizeBaseUrl(config.baseUrl);

  // Try OpenAI-compatible embeddings first
  try {
    const model = config.embeddingModel || 'text-embedding-3-small';
    const response = await fetch(`${base}/embeddings`, {
      method: 'POST',
      headers: headers(config),
      body: JSON.stringify({ model, input: text }),
    });

    if (response.ok) {
      const data = await response.json();
      const embedding = data?.data?.[0]?.embedding;
      if (Array.isArray(embedding)) return embedding as number[];
    }
  } catch {
    // fall through to Gemini native
  }

  // Gemini native embedding fallback
  try {
    const geminiModel = config.embeddingModel?.includes('embedding')
      ? config.embeddingModel
      : 'text-embedding-004';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:embedContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${geminiModel}`,
          content: { parts: [{ text }] },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const embedding = data?.embedding?.values;
      if (Array.isArray(embedding)) return embedding as number[];
    }
  } catch {
    // fall through to basic fallback
  }

  // Last resort: simple hash-based vector
  const vector = new Array(384).fill(0);
  for (let i = 0; i < text.length; i++) {
    vector[i % 384] += text.charCodeAt(i);
  }
  const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
  return vector.map(v => v / magnitude);
}

export async function embedMultiple(
  texts: string[],
  config: AIProviderConfig
): Promise<number[][]> {
  return Promise.all(texts.map((t) => embedText(t, config)));
}

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function generateCompletion(
  prompt: string,
  config: AIProviderConfig,
  systemPrompt?: string,
  history?: ChatMessage[]
): Promise<string> {
  const base = normalizeBaseUrl(config.baseUrl);
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  if (history?.length) {
    messages.push(...history.slice(-10));
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Generation failed: ${response.status} ${await response.text()}`
    );
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('No text in completion response');
  }
  return text;
}

export async function* streamCompletion(
  prompt: string,
  config: AIProviderConfig,
  systemPrompt?: string,
  history?: ChatMessage[]
): AsyncGenerator<string> {
  const base = normalizeBaseUrl(config.baseUrl);
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  if (history?.length) {
    messages.push(...history.slice(-10));
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Stream failed: ${response.status} ${await response.text()}`);
  }

  if (!response.body) {
    throw new Error('No response body for stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length > 0) {
          yield delta;
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
}
