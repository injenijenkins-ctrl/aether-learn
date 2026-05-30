// Vercel env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_PRO_PRICE_ID

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/auth';
import { getUserId, ANONYMOUS_USER_ID } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRO_PRICE_ID;

    if (!stripeSecretKey || !priceId) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const userId = await getUserId();
    if (userId === ANONYMOUS_USER_ID) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const session = await auth();
    const email = session?.user?.email ?? '';
    const origin = new URL(request.url).origin;
    const stripe = new Stripe(stripeSecretKey);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      success_url: `${origin}/settings?upgraded=true`,
      cancel_url: `${origin}/settings`,
      metadata: {
        user_id: userId,
        user_email: email,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          user_email: email,
        },
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: 'Checkout URL was not created' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create checkout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
