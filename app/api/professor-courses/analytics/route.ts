import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    if (!courseId) return NextResponse.json({ error: 'courseId is required' }, { status: 400 });

    const supabase = getSupabase();
    const { data: course, error: courseError } = await supabase
      .from('professor_courses')
      .select('id, lecturer_id')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError) throw new Error(courseError.message);
    if (!course || course.lecturer_id !== userId) {
      return NextResponse.json({ error: 'Only the lecturer can view analytics' }, { status: 403 });
    }

    const [{ data: questions }, { data: enrollments }, { data: quizRows }] = await Promise.all([
      supabase
        .from('professor_course_questions')
        .select('question, topic, misconception, created_at')
        .eq('course_id', courseId),
      supabase
        .from('professor_course_enrollments')
        .select('student_id')
        .eq('course_id', courseId),
      supabase
        .from('quiz_results')
        .select('topic, score, total, created_at'),
    ]);

    const topicCounts = new Map<string, number>();
    for (const q of questions || []) {
      const topic = (q.topic || q.question.slice(0, 60) || 'General').trim();
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }

    const commonTopics = [...topicCounts.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const misconceptionCounts = new Map<string, number>();
    for (const q of questions || []) {
      const value = q.misconception?.trim();
      if (!value) continue;
      misconceptionCounts.set(value, (misconceptionCounts.get(value) || 0) + 1);
    }

    const commonMisconceptions = [...misconceptionCounts.entries()]
      .map(([misconception, count]) => ({ misconception, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const performanceTrends = (quizRows || []).slice(-20).map((row, index) => ({
      attempt: index + 1,
      topic: row.topic,
      score: row.total > 0 ? Math.round((row.score / row.total) * 100) : 0,
      date: row.created_at,
    }));

    return NextResponse.json({
      studentCount: new Set((enrollments || []).map((row) => row.student_id)).size,
      questionCount: questions?.length || 0,
      commonTopics,
      commonMisconceptions,
      performanceTrends,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
