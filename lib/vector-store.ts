import { getSupabase } from './supabase';
import { getUserId } from './session';

export interface Chunk {
  id: string;
  text: string;
  embedding: number[];
}

export interface Resource {
  id: string;
  title: string;
  type: 'url' | 'text' | 'file' | 'audio';
  content: string;
  chunks: Chunk[];
  createdAt: Date;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
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
      .from('chunks')
      .select('id, text, embedding')
      .eq('resource_id', resourceId)
      .order('id');

    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      text: r.text,
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

    const { error: deleteChunksError } = await supabase
      .from('chunks')
      .delete()
      .eq('resource_id', resource.id);

    if (deleteChunksError) {
      throw new Error(`Failed to clear chunks: ${deleteChunksError.message}`);
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
      const { error: chunksError } = await supabase.from('chunks').insert(
        resource.chunks.map((chunk) => ({
          id: chunk.id,
          resource_id: resource.id,
          user_id: uid,
          text: chunk.text,
          embedding: chunk.embedding,
        }))
      );

      if (chunksError) {
        throw new Error(`Failed to add chunks: ${chunksError.message}`);
      }
    }
  }

  async delete(id: string, userId?: string): Promise<boolean> {
    try {
      const supabase = getSupabase();

      await supabase.from('chunks').delete().eq('resource_id', id);

      let query = supabase.from('resources').delete().eq('id', id);
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.select('id');

      if (error) return false;
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
    try {
      const supabase = getSupabase();
      let rows: { id: string; text: string; embedding: unknown }[] = [];

      if (userId) {
        const { data: resourceIds } = await supabase
          .from('resources')
          .select('id')
          .eq('user_id', userId);

        const ids = (resourceIds || []).map((r) => r.id);
        if (ids.length === 0) return [];

        const { data, error } = await supabase
          .from('chunks')
          .select('id, text, embedding')
          .in('resource_id', ids);

        if (error || !data) return [];
        rows = data;
      } else {
        const { data, error } = await supabase
          .from('chunks')
          .select('id, text, embedding');

        if (error || !data) return [];
        rows = data;
      }

      const scored: { chunk: Chunk; score: number }[] = [];

      for (const row of rows) {
        const embedding = parseEmbedding(row.embedding);
        const chunk: Chunk = { id: row.id, text: row.text, embedding };
        scored.push({
          chunk,
          score: cosineSimilarity(queryEmbedding, embedding),
        });
      }

      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((s) => s.chunk);
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
          await supabase.from('chunks').delete().in('resource_id', ids);
        }
        await supabase.from('resources').delete().eq('user_id', userId);
      } else {
        await supabase.from('chunks').delete().neq('id', '');
        await supabase.from('resources').delete().neq('id', '');
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
