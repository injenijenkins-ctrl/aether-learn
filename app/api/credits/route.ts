import { NextResponse } from 'next/server';
import { getUsageStatus } from '@/lib/ai-usage';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const { remaining, tier } = await getUsageStatus(userId);
    // Response shape kept identical to the legacy credits system
    // (top-nav.tsx and settings/page.tsx read `credits` and `is_pro`
    // directly) so this swap doesn't require frontend changes.
    return NextResponse.json({ credits: remaining, is_pro: tier !== 'free' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch credits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
