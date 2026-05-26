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
      .from('activity')
      .select('id, type, description, created_at, meta')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    const entries = (rows || []).map((r) => ({
      id: r.id,
      type: r.type,
      title: r.description,
      timestamp: r.created_at,
      meta: r.meta as Record<string, unknown> | undefined,
    }));

    return NextResponse.json({ entries });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load activity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, title, meta } = body as {
      type?: string;
      title?: string;
      meta?: Record<string, unknown>;
    };

    if (!type || !title) {
      return NextResponse.json(
        { error: 'type and title are required' },
        { status: 400 }
      );
    }

    const userId = await getUserId();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const { error } = await getSupabase().from('activity').insert({
      id,
      user_id: userId,
      type,
      description: title,
      created_at: createdAt,
      meta: meta ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      id,
      type,
      title,
      timestamp: createdAt,
      meta,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to log activity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
