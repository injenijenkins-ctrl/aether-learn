import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ActivityRow = {
  type: string;
  description: string;
  created_at: string;
  meta?: Record<string, unknown> | null;
};

type QuizRow = {
  topic: string;
  score: number;
  total: number;
  created_at: string;
};

type FlashcardRow = {
  topic: string | null;
  next_review: string;
  repetitions: number;
  last_review: string | null;
};

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysSince(dateIso?: string | null) {
  if (!dateIso) return null;
  const now = Date.now();
  const then = new Date(dateIso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

function mode<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function formatHour(hour: number | null) {
  if (hour == null) return null;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 || 12;
  return `${normalized}:00 ${suffix}`;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const supabase = getSupabase();

    const [activityResult, quizResult, flashcardResult] = await Promise.all([
      supabase
        .from('activity')
        .select('type, description, created_at, meta')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(120),
      supabase
        .from('quiz_results')
        .select('topic, score, total, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(120),
      supabase
        .from('flashcard_reviews')
        .select('topic, next_review, repetitions, last_review')
        .eq('user_id', userId)
        .limit(200),
    ]);

    if (activityResult.error) throw new Error(activityResult.error.message);
    if (quizResult.error) throw new Error(quizResult.error.message);
    if (flashcardResult.error) throw new Error(flashcardResult.error.message);

    const activity = (activityResult.data || []) as ActivityRow[];
    const quizzes = (quizResult.data || []) as QuizRow[];
    const flashcards = (flashcardResult.data || []) as FlashcardRow[];

    const topicMap = new Map<
      string,
      { score: number; total: number; attempts: number; lastSeen: string }
    >();

    for (const quiz of quizzes) {
      const current = topicMap.get(quiz.topic) || {
        score: 0,
        total: 0,
        attempts: 0,
        lastSeen: quiz.created_at,
      };
      current.score += quiz.score;
      current.total += quiz.total;
      current.attempts += 1;
      if (new Date(quiz.created_at) > new Date(current.lastSeen)) {
        current.lastSeen = quiz.created_at;
      }
      topicMap.set(quiz.topic, current);
    }

    const weakAreas = [...topicMap.entries()]
      .map(([topic, value]) => ({
        topic,
        avgScore: value.total > 0 ? Math.round((value.score / value.total) * 100) : 0,
        attempts: value.attempts,
        lastSeen: value.lastSeen,
      }))
      .filter((topic) => topic.avgScore < 70)
      .sort((a, b) => a.avgScore - b.avgScore || b.attempts - a.attempts)
      .slice(0, 5);

    const now = new Date();
    const dueFlashcards = flashcards.filter((card) => new Date(card.next_review) <= now);
    const dueTopics = [...new Set(dueFlashcards.map((card) => card.topic).filter(Boolean))];

    const activityDates = activity.map((entry) => new Date(entry.created_at));
    const activeDays = new Set(activityDates.map(toDayKey));
    const activeHours = activityDates.map((date) => date.getHours());
    const preferredHour = mode(activeHours);
    const preferredDay = mode(
      activityDates.map((date) =>
        date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
      )
    );

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      if (activeDays.has(toDayKey(day))) streak++;
      else if (i > 0) break;
    }

    const typeCounts = activity.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {});
    const dominantHabit =
      Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const lastActiveAt = activity[0]?.created_at ?? null;
    const inactiveDays = getDaysSince(lastActiveAt);
    const recentQuiz = quizzes[0];
    const recentQuizScore =
      recentQuiz && recentQuiz.total > 0
        ? Math.round((recentQuiz.score / recentQuiz.total) * 100)
        : null;

    let nudge = {
      title: 'Build your learning memory',
      message: 'Add material or complete a quiz so your companion can start spotting patterns.',
      href: '/ingestion',
      cta: 'Add material',
      priority: 'setup',
    };

    if (inactiveDays != null && inactiveDays >= 2) {
      nudge = {
        title: 'Restart with a tiny session',
        message: `It has been ${inactiveDays} days since your last study action. A 10-minute review will rebuild momentum.`,
        href: '/dashboard',
        cta: 'Start sprint',
        priority: 'habit',
      };
    } else if (weakAreas.length > 0) {
      const weakest = weakAreas[0];
      nudge = {
        title: `Revisit ${weakest.topic}`,
        message: `Your average there is ${weakest.avgScore}%. Ask the tutor for a simple explanation, then retry a quiz.`,
        href: `/tutor?prompt=${encodeURIComponent(`Help me fix my weak area in ${weakest.topic}. Start simple, then quiz me.`)}`,
        cta: 'Ask tutor',
        priority: 'weak-area',
      };
    } else if (dueFlashcards.length > 0) {
      nudge = {
        title: `${dueFlashcards.length} cards are due`,
        message: dueTopics.length
          ? `Review ${dueTopics.slice(0, 2).join(', ')} before starting new material.`
          : 'Review due flashcards before starting new material.',
        href: '/flashcards',
        cta: 'Review now',
        priority: 'retention',
      };
    } else if (recentQuizScore != null && recentQuizScore >= 80) {
      nudge = {
        title: 'Lock in that win',
        message: `You scored ${recentQuizScore}% recently. Generate flashcards now while the idea is fresh.`,
        href: '/flashcards',
        cta: 'Make cards',
        priority: 'retention',
      };
    }

    return NextResponse.json({
      profile: {
        totalStudyActions: activity.length,
        streak,
        lastActiveAt,
        inactiveDays,
        preferredStudyTime: formatHour(preferredHour),
        preferredStudyDay: preferredDay,
        dominantHabit,
        balance: typeCounts,
      },
      memory: {
        weakAreas,
        dueFlashcards: dueFlashcards.length,
        dueTopics,
        recentQuizScore,
      },
      nudge,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load companion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
