import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import { hydrateProfessorCourses } from '@/lib/professor-courses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const { code } = await request.json() as { code?: string };
    const normalized = code?.trim().toUpperCase();
    if (!normalized) return NextResponse.json({ error: 'Course code is required' }, { status: 400 });

    const supabase = getSupabase();
    const { data: course, error } = await supabase
      .from('professor_courses')
      .select('id, lecturer_id, title, code, institution, description, pricing_model, created_at')
      .eq('code', normalized)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const { error: enrollError } = await supabase
      .from('professor_course_enrollments')
      .upsert({
        id: nanoid(),
        course_id: course.id,
        student_id: userId,
        created_at: new Date().toISOString(),
      }, { onConflict: 'course_id,student_id' });

    if (enrollError) throw new Error(enrollError.message);

    const [summary] = await hydrateProfessorCourses([course]);
    return NextResponse.json({ course: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to join course';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
