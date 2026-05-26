import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const { data: rows, error } = await getSupabase()
      .from('notes')
      .select('id, title, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const notes = (rows || []).map((r) => {
      const parsed = JSON.parse(r.content) as {
        query: string;
        summary: unknown;
      };
      return {
        id: r.id,
        title: r.title,
        query: parsed.query,
        summary: parsed.summary,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({ notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load notes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, query, summary } = body as {
      title?: string;
      query?: string;
      summary?: unknown;
    };

    if (!query || !summary) {
      return NextResponse.json(
        { error: 'query and summary are required' },
        { status: 400 }
      );
    }

    const userId = await getUserId();
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const noteTitle = title?.trim() || query.slice(0, 80);
    const content = JSON.stringify({ query, summary });

    const { error } = await getSupabase().from('notes').insert({
      id,
      user_id: userId,
      title: noteTitle,
      content,
      created_at: createdAt,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      id,
      title: noteTitle,
      query,
      summary,
      createdAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const userId = await getUserId();
    const { data, error } = await getSupabase()
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
