import { getSupabase } from './supabase';
import { getUserId } from './session';

const EMBEDDING_DIMENSION = 1536;

export interface Chunk {
  id: string;
  text: string;
  embedding: number[];
}

export interface SourceChunk extends Chunk {
  resourceId: string;
  resourceTitle: string;
  resourceType: Resource['type'];
}

export interface Resource {
  id: string;
  title: string;
  type: 'url' | 'text' | 'file' | 'audio';
  content: string;
  chunks: Chunk[];
  createdAt: Date;
}

type MatchEmbeddingRow = {
  id: string;
  content_chunk: string;
  embedding: unknown;
  source_id: string;
  metadata?: {
    resource_title?: string;
    resource_type?: Resource['type'];
  };
  resource_title?: string | null;
  resource_type?: string | null;
};

function vectorLiteral(embedding: number[]): string {
  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${embedding.length}`
    );
  }

  return `[${embedding.join(',')}]`;
}

function parseEmbedding(value: unknown): number[] {
  if (Array.isArray(value)) return value as number[];
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as number[];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToResource(
  row: {
    id: string;
    title: string;
    type: string;
    content: string;
    created_at: string;
  },
  chunks: Chunk[]
): Resource {
  return {
    id: row.id,
    title: row.title,
    type: row.type as Resource['type'],
    content: row.content,
    chunks,
    createdAt: new Date(row.created_at),
  };
}

async function loadChunksForResource(resourceId: string): Promise<Chunk[]> {
  try {
    const { data, error } = await getSupabase()
      .from('embeddings')
      .select('id, content_chunk, embedding')
      .eq('source_id', resourceId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to load embeddings: ${error.message}`);
    if (!data) return [];

    return data.map((r) => ({
      id: r.id,
      text: r.content_chunk,
      embedding: parseEmbedding(r.embedding),
    }));
  } catch {
    return [];
  }
}

class VectorStore {
  async add(resource: Resource, userId?: string): Promise<void> {
    const uid = userId ?? 'anonymous';
    const createdAt =
      resource.createdAt instanceof Date
        ? resource.createdAt.toISOString()
        : new Date(resource.createdAt).toISOString();

    const supabase = getSupabase();

    const { error: deleteEmbeddingsError } = await supabase
      .from('embeddings')
      .delete()
      .eq('source_id', resource.id);

    if (deleteEmbeddingsError) {
      throw new Error(`Failed to clear embeddings: ${deleteEmbeddingsError.message}`);
    }

    const { error: resourceError } = await supabase.from('resources').upsert({
      id: resource.id,
      user_id: uid,
      title: resource.title,
      type: resource.type,
      content: resource.content,
      created_at: createdAt,
    });

    if (resourceError) {
      throw new Error(`Failed to add resource: ${resourceError.message}`);
    }

    if (resource.chunks.length > 0) {
      const { error: embeddingsError } = await supabase.from('embeddings').insert(
        resource.chunks.map((chunk) => ({
          id: chunk.id,
          content_chunk: chunk.text,
          embedding: vectorLiteral(chunk.embedding),
          source_id: resource.id,
          metadata: {
            user_id: uid,
            resource_title: resource.title,
            resource_type: resource.type,
          },
          created_at: createdAt,
        }))
      );

      if (embeddingsError) {
        throw new Error(`Failed to add embeddings: ${embeddingsError.message}`);
      }
    }
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      const supabase = getSupabase();

      const { error: embeddingError } = await supabase
        .from('embeddings')
        .delete()
        .eq('source_id', id);

      if (embeddingError) {
        throw new Error(`Failed to delete embeddings: ${embeddingError.message}`);
      }

      let query = supabase.from('resources').delete().eq('id', id);
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.select('id');

      if (error) throw new Error(`Failed to delete resource: ${error.message}`);
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async getAll(userId?: string): Promise<Resource[]> {
    try {
      let query = getSupabase()
        .from('resources')
        .select('id, title, type, content, created_at')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: rows, error } = await query;

      if (error || !rows) return [];

      const resources: Resource[] = [];
      for (const r of rows) {
        resources.push(rowToResource(r, await loadChunksForResource(r.id)));
      }
      return resources;
    } catch {
      return [];
    }
  }

  async getById(id: string, userId?: string): Promise<Resource | undefined> {
    try {
      let query = getSupabase()
        .from('resources')
        .select('id, title, type, content, created_at')
        .eq('id', id);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) return undefined;
      return rowToResource(data, await loadChunksForResource(data.id));
    } catch {
      return undefined;
    }
  }

  async search(
    queryEmbedding: number[],
    topK = 5,
    userId?: string
  ): Promise<Chunk[]> {
    const chunks = await this.searchWithSources(queryEmbedding, topK, userId);
    return chunks.map(({ id, text, embedding }) => ({ id, text, embedding }));
  }

  async searchWithSources(
    queryEmbedding: number[],
    topK = 5,
    userId?: string
  ): Promise<SourceChunk[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('match_embeddings', {
        query_embedding: vectorLiteral(queryEmbedding),
        match_count: topK,
        filter_user_id: userId ?? null,
        filter_source_ids: null,
      });

      if (error) throw new Error(`Failed to search embeddings: ${error.message}`);

      return ((data || []) as MatchEmbeddingRow[]).map((row) => ({
        id: row.id,
        text: row.content_chunk,
        embedding: parseEmbedding(row.embedding),
        resourceId: row.source_id,
        resourceTitle: row.resource_title || row.metadata?.resource_title || 'Untitled source',
        resourceType: (row.resource_type || row.metadata?.resource_type || 'text') as Resource['type'],
      }));
    } catch {
      return [];
    }
  }

  async searchResourceIdsWithSources(
    queryEmbedding: number[],
    resourceIds: string[],
    topK = 5
  ): Promise<SourceChunk[]> {
    const ids = Array.from(new Set(resourceIds.filter(Boolean)));
    if (ids.length === 0) return [];

    try {
      const { data, error } = await getSupabase().rpc('match_embeddings', {
        query_embedding: vectorLiteral(queryEmbedding),
        match_count: topK,
        filter_user_id: null,
        filter_source_ids: ids,
      });

      if (error) throw new Error(`Failed to search embeddings: ${error.message}`);

      return ((data || []) as MatchEmbeddingRow[]).map((row) => ({
        id: row.id,
        text: row.content_chunk,
        embedding: parseEmbedding(row.embedding),
        resourceId: row.source_id,
        resourceTitle: row.resource_title || row.metadata?.resource_title || 'Approved course material',
        resourceType: (row.resource_type || row.metadata?.resource_type || 'text') as Resource['type'],
      }));
    } catch {
      return [];
    }
  }

  async clear(userId?: string): Promise<void> {
    try {
      const supabase = getSupabase();

      if (userId) {
        const { data: resources } = await supabase
          .from('resources')
          .select('id')
          .eq('user_id', userId);

        const ids = (resources || []).map((r) => r.id);
        if (ids.length > 0) {
          const { error: embeddingError } = await supabase
            .from('embeddings')
            .delete()
            .in('source_id', ids);
          if (embeddingError) throw new Error(embeddingError.message);
        }
        const { error: resourceError } = await supabase
          .from('resources')
          .delete()
          .eq('user_id', userId);
        if (resourceError) throw new Error(resourceError.message);
      } else {
        const { error: embeddingError } = await supabase
          .from('embeddings')
          .delete()
          .neq('id', '');
        if (embeddingError) throw new Error(embeddingError.message);

        const { error: resourceError } = await supabase
          .from('resources')
          .delete()
          .neq('id', '');
        if (resourceError) throw new Error(resourceError.message);
      }
    } catch {
      // ignore
    }
  }
}

export const vectorStore = new VectorStore();

/** Scoped search for current user */
export async function searchForUser(
  queryEmbedding: number[],
  topK = 5
): Promise<Chunk[]> {
  const userId = await getUserId();
  return vectorStore.search(queryEmbedding, topK, userId);
}

/** Source-aware scoped search for current user */
export async function searchForUserWithSources(
  queryEmbedding: number[],
  topK = 5
): Promise<SourceChunk[]> {
  const userId = await getUserId();
  return vectorStore.searchWithSources(queryEmbedding, topK, userId);
}
