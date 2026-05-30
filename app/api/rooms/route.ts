import { NextResponse } from 'next/server';
import { createRoom, getRoomsForUser } from '@/lib/study-rooms';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const rooms = await getRoomsForUser(userId);
    return NextResponse.json({ rooms });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load rooms';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    const userId = await getUserId();
    const room = await createRoom(userId, name);
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create room';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
