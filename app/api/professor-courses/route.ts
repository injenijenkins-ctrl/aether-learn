import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';
import {
  createCourseCode,
  getProfessorCoursesForUser,
  hydrateProfessorCourses,
} from '@/lib/professor-courses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    const courses = await getProfessorCoursesForUser(userId);
    return NextResponse.json({ courses });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load courses';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const {
      title,
      institution,
      description,
      resourceIds = [],
    } = body as {
      title?: string;
      institution?: string;
      description?: string;
      resourceIds?: string[];
    };

    const trimmedTitle = title?.trim();
    if (!trimmedTitle) {
      return NextResponse.json({ error: 'Course title is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const now = new Date().toISOString();
    const course = {
      id: nanoid(),
      lecturer_id: userId,
      title: trimmedTitle,
      code: createCourseCode(trimmedTitle),
      institution: institution?.trim() || null,
      description: description?.trim() || null,
      pricing_model: 'per_course',
      created_at: now,
    };

    const { data, error } = await supabase
      .from('professor_courses')
      .insert(course)
      .select('id, lecturer_id, title, code, institution, description, pricing_model, created_at')
      .single();

    if (error) throw new Error(error.message);

    const uniqueResourceIds = Array.from(new Set(resourceIds.filter(Boolean)));
    if (uniqueResourceIds.length > 0) {
      const { error: materialError } = await supabase.from('professor_course_materials').insert(
        uniqueResourceIds.map((resourceId) => ({
          id: nanoid(),
          course_id: course.id,
          resource_id: resourceId,
          lecturer_id: userId,
          material_type: 'approved_material',
          created_at: now,
        }))
      );
      if (materialError) throw new Error(materialError.message);
    }

    const [summary] = await hydrateProfessorCourses([data]);
    return NextResponse.json({ course: summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create course';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
