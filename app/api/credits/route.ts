import { NextResponse } from 'next/server';
import { getCreditStatus } from '@/lib/credits';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const { credits, is_pro } = await getCreditStatus(userId);
    return NextResponse.json({ credits, is_pro });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch credits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
