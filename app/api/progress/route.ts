import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { vectorStore } from '@/lib/vector-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const supabase = getSupabase();

    const { data: quizRows } = await supabase
      .from('quiz_results')
      .select('topic, score, total')
      .eq('user_id', userId);

    const topicMap = new Map<
      string,
      { totalScore: number; totalPossible: number; count: number }
    >();

    for (const row of quizRows || []) {
      const entry = topicMap.get(row.topic) || {
        totalScore: 0,
        totalPossible: 0,
        count: 0,
      };
      entry.totalScore += row.score;
      entry.totalPossible += row.total;
      entry.count += 1;
      topicMap.set(row.topic, entry);
    }

    const topicScores = [...topicMap.entries()].map(([topic, v]) => ({
      topic,
      avgScore:
        v.totalPossible > 0 ? (v.totalScore / v.totalPossible) * 100 : 0,
      attempts: v.count,
    }));

    const weakTopics = topicScores
      .filter((t) => t.avgScore < 60)
      .map((t) => ({ topic: t.topic, avgScore: Math.round(t.avgScore) }));

    const strongTopics = topicScores
      .filter((t) => t.avgScore > 80)
      .map((t) => ({ topic: t.topic, avgScore: Math.round(t.avgScore) }));

    const resources = await vectorStore.getAll(userId);
    const resourceTitles = new Set(resources.map((r) => r.title.toLowerCase()));

    let studyNext: { topic: string; avgScore: number } | null = null;
    const sortedWeak = [...weakTopics].sort((a, b) => a.avgScore - b.avgScore);
    for (const w of sortedWeak) {
      const hasContent = [...resourceTitles].some(
        (t) => t.includes(w.topic.toLowerCase()) || w.topic.toLowerCase().includes(t)
      );
      if (hasContent || resources.length > 0) {
        studyNext = w;
        break;
      }
    }
    if (!studyNext && sortedWeak.length > 0) {
      studyNext = sortedWeak[0];
    }

    const { data: activityRows } = await supabase
      .from('activity')
      .select('created_at')
      .eq('user_id', userId);

    const activityDays = new Set(
      (activityRows || []).map((a) =>
        new Date(a.created_at).toISOString().slice(0, 10)
      )
    );

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const day = d.toISOString().slice(0, 10);
      if (activityDays.has(day)) streak++;
      else if (i > 0) break;
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekIso = weekStart.toISOString();

    const { count: weeklyLessons } = await supabase
      .from('activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'lesson')
      .gte('created_at', weekIso);

    const { count: weeklyQuizzes } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekIso);

    const { data: weeklyQuizRows } = await supabase
      .from('quiz_results')
      .select('score, total')
      .eq('user_id', userId)
      .gte('created_at', weekIso);

    let weeklyAvg: number | null = null;
    if (weeklyQuizRows && weeklyQuizRows.length > 0) {
      const sum = weeklyQuizRows.reduce(
        (acc, r) => acc + (r.total > 0 ? (r.score / r.total) * 100 : 0),
        0
      );
      weeklyAvg = sum / weeklyQuizRows.length;
    }

    const { count: weeklyFlashcards } = await supabase
      .from('flashcard_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('last_review', weekIso);

    return NextResponse.json({
      weakTopics,
      strongTopics,
      studyNext,
      streak,
      weeklySummary: {
        lessonsGenerated: weeklyLessons ?? 0,
        quizzesTaken: weeklyQuizzes ?? 0,
        averageScore: weeklyAvg != null ? Math.round(weeklyAvg) : null,
        flashcardsReviewed: weeklyFlashcards ?? 0,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load progress';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
