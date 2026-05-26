import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const userId = await getUserId();
    const pattern = `%${q}%`;
    const supabase = getSupabase();
    const results: {
      type: string;
      id: string;
      title: string;
      excerpt: string;
      href: string;
    }[] = [];

    const { data: resources } = await supabase
      .from('resources')
      .select('id, title')
      .eq('user_id', userId)
      .ilike('title', pattern)
      .limit(5);

    for (const r of resources || []) {
      results.push({
        type: 'Resource',
        id: r.id,
        title: r.title,
        excerpt: r.title,
        href: '/ingestion',
      });
    }

    const { data: notesByTitle } = await supabase
      .from('notes')
      .select('id, title, content')
      .eq('user_id', userId)
      .ilike('title', pattern)
      .limit(5);

    const { data: notesByContent } = await supabase
      .from('notes')
      .select('id, title, content')
      .eq('user_id', userId)
      .ilike('content', pattern)
      .limit(5);

    const notesMap = new Map<string, { id: string; title: string; content: string }>();
    for (const n of [...(notesByTitle || []), ...(notesByContent || [])]) {
      notesMap.set(n.id, n);
    }
    const notes = [...notesMap.values()].slice(0, 5);

    for (const n of notes || []) {
      let excerpt = n.title;
      try {
        const parsed = JSON.parse(n.content) as { query?: string };
        excerpt = parsed.query || n.title;
      } catch {
        excerpt = n.content.slice(0, 80);
      }
      results.push({
        type: 'Note',
        id: n.id,
        title: n.title,
        excerpt,
        href: '/notes',
      });
    }

    const { data: lessonsByTitle } = await supabase
      .from('lesson_history')
      .select('id, title, query')
      .eq('user_id', userId)
      .ilike('title', pattern)
      .limit(5);

    const { data: lessonsByQuery } = await supabase
      .from('lesson_history')
      .select('id, title, query')
      .eq('user_id', userId)
      .ilike('query', pattern)
      .limit(5);

    const lessonsMap = new Map<string, { id: string; title: string; query: string }>();
    for (const l of [...(lessonsByTitle || []), ...(lessonsByQuery || [])]) {
      lessonsMap.set(l.id, l);
    }
    const lessons = [...lessonsMap.values()].slice(0, 5);

    for (const l of lessons || []) {
      results.push({
        type: 'Lesson',
        id: l.id,
        title: l.title,
        excerpt: l.query.slice(0, 80),
        href: '/lessons',
      });
    }

    const { data: quizzes } = await supabase
      .from('quiz_results')
      .select('id, topic, score, total')
      .eq('user_id', userId)
      .ilike('topic', pattern)
      .limit(5);

    for (const quiz of quizzes || []) {
      results.push({
        type: 'Quiz',
        id: quiz.id,
        title: quiz.topic,
        excerpt: `Score: ${quiz.score}/${quiz.total}`,
        href: '/quizzes',
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
