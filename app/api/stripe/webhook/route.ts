import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const config = { api: { bodyParser: false } };

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return new NextResponse('OK', { status: 200 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new NextResponse('OK', { status: 200 });
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return new NextResponse('OK', { status: 200 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    // Which tier was purchased — expects the checkout session to be created
    // with metadata.tier set to 'basic' | 'plus' | 'pro'. Falls back to
    // 'pro' for backward compatibility with any checkout links that don't
    // yet set this metadata.
    const purchasedTier = session.metadata?.tier || 'pro';

    if (userId) {
      // NOTE: previously this only set is_pro=true and daily_credits, but
      // never touched ai_tier — the actual rate-limiting column. Since
      // ai_tier defaults to 'free' (NOT NULL), getUserTier()'s fallback
      // check for is_pro never fired, meaning paying customers were still
      // capped at the free tier. Set ai_tier directly as the source of truth.
      await getSupabase()
        .from('users')
        .update({ is_pro: true, ai_tier: purchasedTier })
        .eq('id', userId);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
