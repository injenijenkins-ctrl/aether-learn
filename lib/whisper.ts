import type { AIProviderConfig } from './ai-provider-types';
import { normalizeBaseUrl } from './ai-provider';

export async function transcribeAudio(
  buffer: Buffer,
  filename: string,
  provider: AIProviderConfig
): Promise<string> {
  const base = normalizeBaseUrl(provider.baseUrl);
  const whisperUrl =
    base.includes('openai.com') || base.endsWith('/v1')
      ? 'https://api.openai.com/v1/audio/transcriptions'
      : `${base}/audio/transcriptions`;

  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');

  const response = await fetch(whisperUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Transcription failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { text?: string };
  if (!data.text?.trim()) {
    throw new Error('Transcription returned empty text');
  }

  return data.text.trim();
}
