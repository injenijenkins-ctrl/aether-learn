import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { buildMemoryCurve, estimateMemory } from '@/lib/memory-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReviewRow = {
  id: string;
  card_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: string;
  last_review: string | null;
  topic: string | null;
  created_at: string;
};

function topicName(value: string | null) {
  return value?.trim() || 'General review';
}

export async function GET() {
  try {
    const userId = await getUserId();

    const { data, error } = await getSupabase()
      .from('flashcard_reviews')
      .select('id, card_id, ease_factor, interval, repetitions, next_review, last_review, topic, created_at')
      .eq('user_id', userId)
      .order('next_review', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data || []) as ReviewRow[];
    const grouped = new Map<string, ReviewRow[]>();

    for (const row of rows) {
      const topic = topicName(row.topic);
      grouped.set(topic, [...(grouped.get(topic) || []), row]);
    }

    const now = new Date();
    const topics = [...grouped.entries()]
      .map(([topic, cards]) => {
        const estimates = cards.map((card) =>
          estimateMemory({
            easeFactor: card.ease_factor,
            interval: card.interval,
            repetitions: card.repetitions,
            lastReview: card.last_review,
            nextReview: card.next_review,
            createdAt: card.created_at,
          }, now)
        );

        const currentStrength =
          estimates.reduce((sum, estimate) => sum + estimate.strength, 0) /
          Math.max(estimates.length, 1);

        const curve = Array.from({ length: 22 }, (_, day) => {
          const cardStrengths = cards.map((card) =>
            buildMemoryCurve({
              easeFactor: card.ease_factor,
              interval: card.interval,
              repetitions: card.repetitions,
              lastReview: card.last_review,
              nextReview: card.next_review,
              createdAt: card.created_at,
            }, 21, now)[day]
          );

          const average =
            cardStrengths.reduce((sum, point) => sum + point.strength, 0) /
            Math.max(cardStrengths.length, 1);

          return {
            date: cardStrengths[0]?.date ?? now.toISOString().slice(0, 10),
            day,
            strength: Math.round(average),
            forgettingThreshold: 60,
          };
        });

        const lowest = estimates
          .map((estimate, index) => ({ estimate, card: cards[index] }))
          .sort((a, b) => a.estimate.strength - b.estimate.strength)[0];

        const nextOptimal = estimates
          .map((estimate) => estimate.optimalReviewAt)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

        return {
          topic,
          cardCount: cards.length,
          currentStrength: Math.round(currentStrength * 100),
          stabilityDays: Math.round(
            estimates.reduce((sum, estimate) => sum + estimate.stabilityDays, 0) /
              Math.max(estimates.length, 1)
          ),
          dueCards: estimates.filter((estimate) => estimate.overdue).length,
          nextOptimalReviewAt: nextOptimal,
          weakestCardId: lowest?.card.card_id ?? null,
          predictedForgetAt: lowest?.estimate.predictedForgetAt ?? null,
          curve,
        };
      })
      .sort((a, b) => a.currentStrength - b.currentStrength);

    return NextResponse.json({
      generatedAt: now.toISOString(),
      targetRecall: 86,
      forgettingThreshold: 60,
      topics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load memory strength';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
