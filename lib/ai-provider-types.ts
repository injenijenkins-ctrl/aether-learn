export interface AIProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Used for RAG embeddings; defaults to text-embedding-3-small */
  embeddingModel?: string;
}

export const DEFAULT_AI_PROVIDER: AIProviderConfig = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  embeddingModel: 'text-embedding-3-small',
};

export const AI_SETTINGS_STORAGE_KEY = 'aetherlearn-ai-provider';

export const PROVIDER_PRESETS: {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  embeddingModel: string;
}[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    embeddingModel: 'openai/text-embedding-3-small',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    embeddingModel: 'text-embedding-3-small',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-small-latest',
    embeddingModel: 'mistral-embed',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    embeddingModel: 'nomic-embed-text',
  },
  {
    id: 'gemini-openai',
    label: 'Google Gemini (OpenAI-compat)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.0-flash',
    embeddingModel: 'gemini-embedding-001',
  },
];
