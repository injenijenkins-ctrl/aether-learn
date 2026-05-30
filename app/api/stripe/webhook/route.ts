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

    if (userId) {
      await getSupabase()
        .from('users')
        .update({ is_pro: true, daily_credits: 999999 })
        .eq('id', userId);
    }
  }

  return new NextResponse('OK', { status: 200 });
}
