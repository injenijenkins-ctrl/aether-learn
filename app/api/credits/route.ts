import { NextResponse } from 'next/server';
import { getRemainingCredits } from '@/lib/credits';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const credits = await getRemainingCredits(userId);
    return NextResponse.json({ credits });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch credits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
