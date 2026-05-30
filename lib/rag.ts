import { embedText } from './ai-provider';
import type { AIProviderConfig } from './ai-provider-types';
import {
  searchForUser,
  searchForUserWithSources,
  vectorStore,
  type SourceChunk,
} from './vector-store';

export interface SourceCitation {
  id: string;
  number: number;
  chunkId: string;
  resourceId: string;
  title: string;
  type: string;
  snippet: string;
}

function snippet(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function contextFromSourceChunks(chunks: SourceChunk[]) {
  return chunks
    .map((chunk, index) => {
      const number = index + 1;
      return `[${number}] Source: ${chunk.resourceTitle} (${chunk.resourceType})\n${chunk.text}`;
    })
    .join('\n\n');
}

function citationsFromChunks(chunks: SourceChunk[]): SourceCitation[] {
  return chunks.map((chunk, index) => ({
    id: `${chunk.resourceId}:${chunk.id}`,
    number: index + 1,
    chunkId: chunk.id,
    resourceId: chunk.resourceId,
    title: chunk.resourceTitle,
    type: chunk.resourceType,
    snippet: snippet(chunk.text),
  }));
}

export async function retrieveContext(
  query: string,
  config: AIProviderConfig,
  topK = 5,
  userId?: string
): Promise<string> {
  const queryEmbedding = await embedText(query, config);
  const chunks = userId
    ? await vectorStore.search(queryEmbedding, topK, userId)
    : await searchForUser(queryEmbedding, topK);

  if (chunks.length === 0) {
    return 'No ingested content available. Ask the user to add learning materials first.';
  }

  return chunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
}

export async function retrieveContextWithSources(
  query: string,
  config: AIProviderConfig,
  topK = 5,
  userId?: string
): Promise<{ context: string; sources: SourceCitation[] }> {
  const queryEmbedding = await embedText(query, config);
  const chunks = userId
    ? await vectorStore.searchWithSources(queryEmbedding, topK, userId)
    : await searchForUserWithSources(queryEmbedding, topK);

  if (chunks.length === 0) {
    return {
      context: 'No ingested content available. Ask the user to add learning materials first.',
      sources: [],
    };
  }

  return {
    context: contextFromSourceChunks(chunks),
    sources: citationsFromChunks(chunks),
  };
}

export async function retrieveContextWithSourcesForResources(
  query: string,
  config: AIProviderConfig,
  resourceIds: string[],
  topK = 6
): Promise<{ context: string; sources: SourceCitation[] }> {
  const queryEmbedding = await embedText(query, config);
  const chunks = await vectorStore.searchResourceIdsWithSources(queryEmbedding, resourceIds, topK);

  if (chunks.length === 0) {
    return {
      context: 'No approved course material matched this question. Tell the student that the answer is not available in lecturer-approved sources.',
      sources: [],
    };
  }

  return {
    context: contextFromSourceChunks(chunks),
    sources: citationsFromChunks(chunks),
  };
}
