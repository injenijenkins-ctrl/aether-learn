import { nanoid } from 'nanoid';
import { getSupabase } from '@/lib/supabase';

export type ProfessorCourse = {
  id: string;
  lecturer_id: string;
  title: string;
  code: string;
  institution: string | null;
  description: string | null;
  pricing_model: string;
  created_at: string;
};

export type ProfessorCourseSummary = ProfessorCourse & {
  materialCount: number;
  studentCount: number;
  materials: {
    id: string;
    title: string;
    type: string;
    createdAt: string;
  }[];
};

const COURSE_SELECT = 'id, lecturer_id, title, code, institution, description, pricing_model, created_at';

export function createCourseCode(title: string) {
  const prefix = title
    .replace(/[^a-z0-9]+/gi, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'A');
  return `${prefix}-${nanoid(5).toUpperCase()}`;
}

export async function getApprovedResourceIds(courseId: string) {
  const { data, error } = await getSupabase()
    .from('professor_course_materials')
    .select('resource_id')
    .eq('course_id', courseId);

  if (error) throw new Error(error.message);
  return (data || []).map((row) => row.resource_id as string);
}

export async function assertCourseAccess(courseId: string, userId: string) {
  const supabase = getSupabase();
  const { data: course, error: courseError } = await supabase
    .from('professor_courses')
    .select(COURSE_SELECT)
    .eq('id', courseId)
    .maybeSingle();

  if (courseError) throw new Error(courseError.message);
  if (!course) throw new Error('Course not found');
  if (course.lecturer_id === userId) return course as ProfessorCourse;

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('professor_course_enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', userId)
    .maybeSingle();

  if (enrollmentError) throw new Error(enrollmentError.message);
  if (!enrollment) throw new Error('You are not enrolled in this course');

  return course as ProfessorCourse;
}

export async function hydrateProfessorCourses(courses: ProfessorCourse[]) {
  if (courses.length === 0) return [] as ProfessorCourseSummary[];

  const courseIds = courses.map((course) => course.id);
  const supabase = getSupabase();
  const [{ data: materials }, { data: enrollments }] = await Promise.all([
    supabase
      .from('professor_course_materials')
      .select('course_id, resource_id')
      .in('course_id', courseIds),
    supabase
      .from('professor_course_enrollments')
      .select('course_id')
      .in('course_id', courseIds),
  ]);

  const resourceIds = Array.from(new Set((materials || []).map((row) => row.resource_id)));
  const resourceMap = new Map<string, { id: string; title: string; type: string; createdAt: string }>();

  if (resourceIds.length > 0) {
    const { data: resources } = await supabase
      .from('resources')
      .select('id, title, type, created_at')
      .in('id', resourceIds);

    for (const resource of resources || []) {
      resourceMap.set(resource.id, {
        id: resource.id,
        title: resource.title,
        type: resource.type,
        createdAt: resource.created_at,
      });
    }
  }

  return courses.map((course) => {
    const courseMaterials = (materials || [])
      .filter((row) => row.course_id === course.id)
      .map((row) => resourceMap.get(row.resource_id))
      .filter(Boolean) as ProfessorCourseSummary['materials'];

    return {
      ...course,
      materialCount: courseMaterials.length,
      studentCount: (enrollments || []).filter((row) => row.course_id === course.id).length,
      materials: courseMaterials,
    };
  });
}

export async function getProfessorCoursesForUser(userId: string) {
  const supabase = getSupabase();
  const [{ data: owned, error: ownedError }, { data: enrolledRows, error: enrolledError }] =
    await Promise.all([
      supabase
        .from('professor_courses')
        .select(COURSE_SELECT)
        .eq('lecturer_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('professor_course_enrollments')
        .select('course_id')
        .eq('student_id', userId),
    ]);

  if (ownedError) throw new Error(ownedError.message);
  if (enrolledError) throw new Error(enrolledError.message);

  const enrolledIds = (enrolledRows || []).map((row) => row.course_id);
  let enrolled: ProfessorCourse[] = [];
  if (enrolledIds.length > 0) {
    const { data, error } = await supabase
      .from('professor_courses')
      .select(COURSE_SELECT)
      .in('id', enrolledIds);
    if (error) throw new Error(error.message);
    enrolled = (data || []) as ProfessorCourse[];
  }

  const byId = new Map<string, ProfessorCourse>();
  for (const course of [...((owned || []) as ProfessorCourse[]), ...enrolled]) {
    byId.set(course.id, course);
  }

  return hydrateProfessorCourses([...byId.values()]);
}
