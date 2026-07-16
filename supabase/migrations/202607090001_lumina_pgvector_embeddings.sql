CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  content_chunk TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  source_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON embeddings((metadata->>'user_id'));
CREATE INDEX IF NOT EXISTS idx_embeddings_embedding_hnsw
  ON embeddings USING hnsw (embedding vector_cosine_ops);

ALTER TABLE embeddings DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 5,
  filter_user_id TEXT DEFAULT NULL,
  filter_source_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  content_chunk TEXT,
  embedding TEXT,
  source_id TEXT,
  metadata JSONB,
  resource_title TEXT,
  resource_type TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.id,
    e.content_chunk,
    e.embedding::text AS embedding,
    e.source_id,
    e.metadata,
    r.title AS resource_title,
    r.type AS resource_type,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  LEFT JOIN resources r ON r.id = e.source_id
  WHERE
    (filter_user_id IS NULL OR COALESCE(e.metadata->>'user_id', r.user_id) = filter_user_id)
    AND (filter_source_ids IS NULL OR e.source_id = ANY(filter_source_ids))
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
