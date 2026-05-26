'use client';

import {
  AI_SETTINGS_STORAGE_KEY,
  DEFAULT_AI_PROVIDER,
  type AIProviderConfig,
} from './ai-provider-types';

export function loadAISettings(): AIProviderConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_AI_PROVIDER };
  try {
    const raw = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_PROVIDER };
    const parsed = JSON.parse(raw) as Partial<AIProviderConfig>;
    return {
      ...DEFAULT_AI_PROVIDER,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_AI_PROVIDER };
  }
}

export function saveAISettings(settings: AIProviderConfig): void {
  localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function isAIConfigured(settings: AIProviderConfig): boolean {
  return Boolean(
    settings.apiKey?.trim() &&
      settings.baseUrl?.trim() &&
      settings.model?.trim()
  );
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key ? '••••••••' : '';
  return `${key.slice(0, 4)}${'•'.repeat(12)}${key.slice(-4)}`;
}

/** Payload sent to API routes alongside request data */
export function providerPayload(
  settings: AIProviderConfig = loadAISettings()
): { provider: AIProviderConfig } {
  return {
    provider: {
      apiKey: settings.apiKey.trim(),
      baseUrl: settings.baseUrl.trim(),
      model: settings.model.trim(),
      embeddingModel:
        settings.embeddingModel?.trim() ||
        DEFAULT_AI_PROVIDER.embeddingModel,
    },
  };
}

export function providerHeaders(
  settings: AIProviderConfig = loadAISettings()
): Record<string, string> {
  return {
    'x-ai-api-key': settings.apiKey.trim(),
    'x-ai-base-url': settings.baseUrl.trim(),
    'x-ai-model': settings.model.trim(),
    'x-ai-embedding-model':
      settings.embeddingModel?.trim() ||
      DEFAULT_AI_PROVIDER.embeddingModel ||
      'text-embedding-3-small',
  };
}
