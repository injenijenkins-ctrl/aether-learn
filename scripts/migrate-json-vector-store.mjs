import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const EMBEDDING_DIMENSION = 1536;
const BATCH_SIZE = 500;

function usage() {
  console.error(
    'Usage: node scripts/migrate-json-vector-store.mjs <vector-store.json> [--dry-run]'
  );
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filePath = args.find((arg) => !arg.startsWith('--'));

  if (!filePath) {
    usage();
    process.exit(1);
  }

  return { filePath, dryRun };
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function vectorLiteral(embedding, label) {
  if (!Array.isArray(embedding)) {
    throw new Error(`${label} is missing an embedding array`);
  }

  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `${label} has ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSION}`
    );
  }

  return `[${embedding.join(',')}]`;
}

function normalizeResource(resource, fallbackUserId) {
  const id = resource.id || resource.resourceId || resource.source_id || randomUUID();
  return {
    id,
    user_id: resource.user_id || resource.userId || fallbackUserId || 'anonymous',
    title: resource.title || resource.name || 'Untitled source',
    type: resource.type || 'text',
    content: resource.content || '',
    created_at: resource.created_at || resource.createdAt || new Date().toISOString(),
  };
}

function normalizeFromResources(resources) {
  const resourceRows = [];
  const embeddingRows = [];

  for (const rawResource of resources) {
    const resource = normalizeResource(rawResource);
    resourceRows.push(resource);

    for (const chunk of asArray(rawResource.chunks)) {
      const chunkId = chunk.id || chunk.chunkId || randomUUID();
      embeddingRows.push({
        id: chunkId,
        content_chunk: chunk.text || chunk.content_chunk || chunk.content || '',
        embedding: vectorLiteral(chunk.embedding, `chunk ${chunkId}`),
        source_id: resource.id,
        metadata: {
          ...(chunk.metadata || {}),
          user_id: resource.user_id,
          resource_title: resource.title,
          resource_type: resource.type,
          legacy_chunk_id: chunkId,
        },
        created_at: chunk.created_at || chunk.createdAt || resource.created_at,
      });
    }
  }

  return { resourceRows, embeddingRows };
}

function normalizeFromChunks(chunks) {
  const resourceMap = new Map();
  const embeddingRows = [];

  for (const chunk of chunks) {
    const sourceId =
      chunk.source_id ||
      chunk.sourceId ||
      chunk.resource_id ||
      chunk.resourceId ||
      chunk.metadata?.source_id ||
      chunk.metadata?.resource_id ||
      randomUUID();
    const userId = chunk.user_id || chunk.userId || chunk.metadata?.user_id || 'anonymous';
    const resource = normalizeResource(
      {
        id: sourceId,
        user_id: userId,
        title:
          chunk.resourceTitle ||
          chunk.resource_title ||
          chunk.metadata?.resource_title ||
          chunk.metadata?.title,
        type: chunk.resourceType || chunk.resource_type || chunk.metadata?.resource_type,
        content: chunk.resourceContent || chunk.metadata?.resource_content,
        created_at: chunk.resourceCreatedAt || chunk.created_at || chunk.createdAt,
      },
      userId
    );
    resourceMap.set(sourceId, resource);

    const chunkId = chunk.id || chunk.chunkId || randomUUID();
    embeddingRows.push({
      id: chunkId,
      content_chunk: chunk.text || chunk.content_chunk || chunk.content || '',
      embedding: vectorLiteral(chunk.embedding, `chunk ${chunkId}`),
      source_id: sourceId,
      metadata: {
        ...(chunk.metadata || {}),
        user_id: userId,
        resource_title: resource.title,
        resource_type: resource.type,
        legacy_chunk_id: chunkId,
      },
      created_at: chunk.created_at || chunk.createdAt || new Date().toISOString(),
    });
  }

  return {
    resourceRows: Array.from(resourceMap.values()),
    embeddingRows,
  };
}

function normalizeStore(store) {
  if (Array.isArray(store)) {
    const looksLikeResources = store.some((item) => Array.isArray(item?.chunks));
    return looksLikeResources ? normalizeFromResources(store) : normalizeFromChunks(store);
  }

  if (Array.isArray(store?.resources)) return normalizeFromResources(store.resources);
  if (Array.isArray(store?.chunks)) return normalizeFromChunks(store.chunks);
  if (Array.isArray(store?.embeddings)) return normalizeFromChunks(store.embeddings);
  if (Array.isArray(store?.items)) {
    const looksLikeResources = store.items.some((item) => Array.isArray(item?.chunks));
    return looksLikeResources
      ? normalizeFromResources(store.items)
      : normalizeFromChunks(store.items);
  }

  throw new Error(
    'Unsupported vector store JSON shape. Expected resources[], chunks[], embeddings[], items[], or an array.'
  );
}

async function upsertBatches(supabase, table, rows, onConflict) {
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) {
      throw new Error(`Failed to upsert ${table}: ${error.message}`);
    }
  }
}

async function main() {
  const { filePath, dryRun } = parseArgs();
  const raw = await readFile(filePath, 'utf8');
  const store = JSON.parse(raw);
  const { resourceRows, embeddingRows } = normalizeStore(store);

  console.log(
    `Prepared ${resourceRows.length} resources and ${embeddingRows.length} embeddings.`
  );

  if (dryRun) {
    console.log('Dry run complete; no rows were written.');
    return;
  }

  const supabase = getSupabaseClient();
  await upsertBatches(supabase, 'resources', resourceRows, 'id');
  await upsertBatches(supabase, 'embeddings', embeddingRows, 'id');

  console.log('Migration complete.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
