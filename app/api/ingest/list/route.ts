import { NextResponse } from 'next/server';
import { vectorStore } from '@/lib/vector-store';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const resources = (await vectorStore.getAll(userId)).map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      chunkCount: r.chunks.length,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ resources });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to list resources';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
