import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { nextSM2State, type ReviewQuality } from '@/lib/sm2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const todayEnd = new Date().toISOString();

    const { data: due, error: dueError } = await getSupabase()
      .from('flashcard_reviews')
      .select(
        'id, card_id, ease_factor, interval, repetitions, next_review, last_review, front, back, topic'
      )
      .eq('user_id', userId)
      .lte('next_review', todayEnd)
      .order('next_review', { ascending: true });

    if (dueError) {
      throw new Error(dueError.message);
    }

    const { data: all, error: allError } = await getSupabase()
      .from('flashcard_reviews')
      .select(
        'id, card_id, ease_factor, interval, repetitions, next_review, last_review, front, back, topic'
      )
      .eq('user_id', userId)
      .order('next_review', { ascending: false });

    if (allError) {
      throw new Error(allError.message);
    }

    const mapRow = (r: Record<string, unknown>) => ({
      id: r.id,
      cardId: r.card_id,
      easeFactor: r.ease_factor,
      interval: r.interval,
      repetitions: r.repetitions,
      nextReview: r.next_review,
      lastReview: r.last_review,
      front: r.front,
      back: r.back,
      topic: r.topic,
    });

    return NextResponse.json({
      due: (due || []).map(mapRow),
      all: (all || []).map(mapRow),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load reviews';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      cardId,
      front,
      back,
      topic,
      quality,
      reviewId,
    } = body as {
      cardId?: string;
      front?: string;
      back?: string;
      topic?: string;
      quality?: ReviewQuality;
      reviewId?: string;
    };

    const userId = await getUserId();
    const now = new Date().toISOString();

    if (quality && reviewId) {
      const { data: existing, error: fetchError } = await getSupabase()
        .from('flashcard_reviews')
        .select('ease_factor, interval, repetitions')
        .eq('id', reviewId)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!existing) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 });
      }

      const next = nextSM2State(
        {
          easeFactor: existing.ease_factor,
          interval: existing.interval,
          repetitions: existing.repetitions,
        },
        quality
      );

      const { error: updateError } = await getSupabase()
        .from('flashcard_reviews')
        .update({
          ease_factor: next.easeFactor,
          interval: next.interval,
          repetitions: next.repetitions,
          next_review: next.nextReview.toISOString(),
          last_review: now,
        })
        .eq('id', reviewId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return NextResponse.json({
        success: true,
        nextReview: next.nextReview.toISOString(),
      });
    }

    if (!cardId || !front || !back) {
      return NextResponse.json(
        { error: 'cardId, front, and back are required' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const nextReview = new Date().toISOString();

    const { error } = await getSupabase().from('flashcard_reviews').insert({
      id,
      user_id: userId,
      card_id: cardId,
      ease_factor: 2.5,
      interval: 0,
      repetitions: 0,
      next_review: nextReview,
      last_review: null,
      front,
      back,
      topic: topic ?? null,
      created_at: now,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ id, cardId, nextReview });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save review';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
