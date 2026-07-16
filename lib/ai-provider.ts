import type { AIProviderConfig } from './ai-provider-types';
import { DEFAULT_AI_PROVIDER } from './ai-provider-types';
import { assertSafeUrl, UnsafeUrlError } from './url-guard';

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

/**
 * Resolves and validates a user-supplied (BYOK) provider config.
 *
 * baseUrl comes directly from request headers/body — every downstream
 * call (embedText, generateCompletion, streamCompletion) fetches
 * `${baseUrl}/...` with no further checks. Without validation here, any
 * authenticated user could point baseUrl at an internal service or cloud
 * metadata endpoint (169.254.169.254) and use AetherLearn's server as an
 * SSRF proxy, reading back whatever that internal endpoint returns via
 * the completion response or error message.
 *
 * This reuses the same private-IP/DNS-rebind guard built for the web
 * scraper (lib/url-guard.ts) rather than duplicating that logic — same
 * threat, same fix. Only user-supplied configs go through this path;
 * the server-side master provider (lib/getServerProviderForTask) is
 * admin-configured via env vars and never touches this validation.
 */
export async function resolveProviderConfig(
  input?: Partial<AIProviderConfig> | null
): Promise<AIProviderConfig> {
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

  const baseUrl = normalizeBaseUrl(input.baseUrl);

  try {
    await assertSafeUrl(baseUrl);
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      // Generic message — don't confirm to the caller which internal
      // check tripped or what's reachable on the internal network.
      throw new Error('This provider base URL is not allowed.');
    }
    throw error;
  }

  return {
    apiKey: input.apiKey.trim(),
    baseUrl,
    model: input.model.trim(),
    embeddingModel:
      input.embeddingModel?.trim() ||
      DEFAULT_AI_PROVIDER.embeddingModel ||
      'text-embedding-3-small',
  };
}

export async function parseProviderFromBody(
  body: Record<string, unknown>
): Promise<AIProviderConfig> {
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

export async function parseProviderFromRequest(
  request: Request,
  body?: Record<string, unknown>
): Promise<AIProviderConfig> {
  const fromHeaders = providerFromHeaders(request.headers);
  const fromBody = body ? ((body.provider ?? body) as Partial<AIProviderConfig>) : {};
  return resolveProviderConfig({
    ...fromHeaders,
    ...fromBody,
  });
}


// ---------------------------------------------------------------------
// Server-side provider (AetherLearn pays, tier caps control cost)
//
// Previously this "master key" fallback was copy-pasted independently
// into 10 different route files, each hardcoding the same model for
// every task. Centralized here, with per-task-type model selection so
// cheap/high-volume tasks (quick Q&A, summarization) don't burn the
// same budget as tasks that need a stronger model (deep tutoring).
//
// Because the app already speaks the OpenAI-compatible chat/completions
// format everywhere, and the default base URL is OpenRouter, routing
// between providers (Gemini, Claude, etc.) is just a different `model`
// string here — no separate SDK integration needed per provider.
// ---------------------------------------------------------------------

export type AITaskType =
  | 'quick_qa'
  | 'deep_tutoring'
  | 'content_summarization'
  | 'quiz_generation'
  | 'flashcard_generation'
  | 'embedding';

const TASK_MODEL_ENV_KEYS: Record<AITaskType, string> = {
  quick_qa: 'MASTER_AI_MODEL_QUICK',
  deep_tutoring: 'MASTER_AI_MODEL_DEEP',
  content_summarization: 'MASTER_AI_MODEL_QUICK',
  quiz_generation: 'MASTER_AI_MODEL_QUICK',
  flashcard_generation: 'MASTER_AI_MODEL_QUICK',
  embedding: 'MASTER_AI_EMBEDDING_MODEL',
};

// Sensible OpenRouter defaults if the specific env var isn't set — Flash-tier
// for high-volume/cheap tasks, a stronger model for tasks where reasoning
// quality visibly matters. Override any of these via env without a code change.
const TASK_MODEL_DEFAULTS: Record<AITaskType, string> = {
  quick_qa: 'google/gemini-2.5-flash',
  deep_tutoring: 'anthropic/claude-sonnet-4.6',
  content_summarization: 'google/gemini-2.5-flash',
  quiz_generation: 'google/gemini-2.5-flash',
  flashcard_generation: 'google/gemini-2.5-flash',
  embedding: 'text-embedding-3-small',
};

export function getServerProviderForTask(taskType: AITaskType): AIProviderConfig {
  const apiKey = process.env.MASTER_AI_KEY || '';
  const baseUrl = process.env.MASTER_AI_BASE_URL || 'https://openrouter.ai/api/v1';
  const envKey = TASK_MODEL_ENV_KEYS[taskType];
  const model =
    process.env[envKey] ||
    process.env.MASTER_AI_MODEL || // legacy single-model override, still honored
    TASK_MODEL_DEFAULTS[taskType];

  return {
    apiKey,
    baseUrl: normalizeBaseUrl(baseUrl),
    model,
    embeddingModel: process.env.MASTER_AI_EMBEDDING_MODEL || 'text-embedding-3-small',
  };
}

export function isServerProviderConfigured(): boolean {
  return Boolean(process.env.MASTER_AI_KEY);
}

/**
 * The single resolution path every route should use: prefer the user's
 * own key if they've configured one (BYOK stays available as an opt-in
 * that bypasses tier caps entirely — this matches the existing "add your
 * own key for unlimited access" messaging already shown in Settings).
 * Otherwise fall back to the server-paid provider, routed by task type.
 *
 * Throws only if neither a user key nor a server key is available.
 */
export async function resolveRequestProvider(
  request: Request,
  body: Record<string, unknown> | undefined,
  taskType: AITaskType
): Promise<{ provider: AIProviderConfig; usingServerKey: boolean }> {
  try {
    return { provider: await parseProviderFromRequest(request, body), usingServerKey: false };
  } catch {
    if (!isServerProviderConfigured()) {
      throw new Error('No AI provider configured. Add your API key in Settings.');
    }
    return { provider: getServerProviderForTask(taskType), usingServerKey: true };
  }
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
