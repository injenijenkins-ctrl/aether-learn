import { embedText } from './ai-provider';
import type { AIProviderConfig } from './ai-provider-types';
import { searchForUser } from './vector-store';

export async function retrieveContext(
  query: string,
  config: AIProviderConfig,
  topK = 5
): Promise<string> {
  const queryEmbedding = await embedText(query, config);
  const chunks = await searchForUser(queryEmbedding, topK);

  if (chunks.length === 0) {
    return 'No ingested content available. Ask the user to add learning materials first.';
  }

  return chunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
}
