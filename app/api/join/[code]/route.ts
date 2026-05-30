import { NextResponse } from 'next/server';
import { joinRoom } from '@/lib/study-rooms';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const userId = await getUserId();
    const room = await joinRoom(code, userId);
    return NextResponse.json({ roomId: room.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to join room';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
