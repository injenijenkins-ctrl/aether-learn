import { v4 as uuidv4 } from 'uuid';
import { embedMultiple } from './ai-provider';
import type { AIProviderConfig } from './ai-provider-types';
import { chunkText } from './chunking';
import { vectorStore, type Resource } from './vector-store';
import { getUserId } from './session';

export type IngestType = 'url' | 'text' | 'file' | 'audio';

export async function ingestContent(
  title: string,
  content: string,
  type: IngestType,
  provider: AIProviderConfig
): Promise<{
  id: string;
  title: string;
  type: IngestType;
  chunkCount: number;
  createdAt: Date;
}> {
  const chunks = chunkText(content);
  const embeddings = await embedMultiple(chunks, provider);
  const userId = await getUserId();

  const resource: Resource = {
    id: uuidv4(),
    title,
    type,
    content,
    chunks: chunks.map((text, i) => ({
      id: uuidv4(),
      text,
      embedding: embeddings[i],
    })),
    createdAt: new Date(),
  };

  await vectorStore.add(resource, userId);

  return {
    id: resource.id,
    title: resource.title,
    type: resource.type,
    chunkCount: resource.chunks.length,
    createdAt: resource.createdAt,
  };
}
