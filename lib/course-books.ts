import { nanoid } from 'nanoid';
import { getSupabase } from './supabase';

export type CourseBook = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  color: string;
  goal: string | null;
  created_at: string;
};

export type CourseBookResource = {
  id: string;
  title: string;
  type: 'url' | 'text' | 'file' | 'audio';
  chunkCount: number;
  createdAt: string;
};

export type CourseBookSummary = CourseBook & {
  resources: CourseBookResource[];
  resourceCount: number;
  chunkCount: number;
};

const COURSE_SELECT = 'id, user_id, title, description, color, goal, created_at';
const COURSE_COLORS = new Set(['violet', 'blue', 'emerald', 'amber', 'rose']);

function normalizeColor(color?: string) {
  return color && COURSE_COLORS.has(color) ? color : 'violet';
}

async function getResourceChunkCounts(resourceIds: string[]) {
  const ids = Array.from(new Set(resourceIds.filter(Boolean)));
  const counts = new Map<string, number>();

  if (ids.length === 0) return counts;

  const { data } = await getSupabase()
    .from('chunks')
    .select('resource_id')
    .in('resource_id', ids);

  for (const row of data || []) {
    counts.set(row.resource_id, (counts.get(row.resource_id) || 0) + 1);
  }

  return counts;
}

async function hydrateCourseBooks(courseBooks: CourseBook[]): Promise<CourseBookSummary[]> {
  if (courseBooks.length === 0) return [];

  const courseIds = courseBooks.map((courseBook) => courseBook.id);
  const { data: assignments, error: assignmentError } = await getSupabase()
    .from('course_book_resources')
    .select('course_book_id, resource_id')
    .in('course_book_id', courseIds);

  if (assignmentError) throw new Error(assignmentError.message);

  const resourceIds = Array.from(new Set((assignments || []).map((row) => row.resource_id)));
  const resourceMap = new Map<string, CourseBookResource>();

  if (resourceIds.length > 0) {
    const [{ data: resources, error: resourceError }, chunkCounts] = await Promise.all([
      getSupabase()
        .from('resources')
        .select('id, title, type, created_at')
        .in('id', resourceIds),
      getResourceChunkCounts(resourceIds),
    ]);

    if (resourceError) throw new Error(resourceError.message);

    for (const resource of resources || []) {
      resourceMap.set(resource.id, {
        id: resource.id,
        title: resource.title,
        type: resource.type as CourseBookResource['type'],
        chunkCount: chunkCounts.get(resource.id) || 0,
        createdAt: resource.created_at,
      });
    }
  }

  const resourcesByCourse = new Map<string, CourseBookResource[]>();
  for (const assignment of assignments || []) {
    const resource = resourceMap.get(assignment.resource_id);
    if (!resource) continue;

    const resources = resourcesByCourse.get(assignment.course_book_id) || [];
    resources.push(resource);
    resourcesByCourse.set(assignment.course_book_id, resources);
  }

  return courseBooks.map((courseBook) => {
    const resources = resourcesByCourse.get(courseBook.id) || [];
    return {
      ...courseBook,
      resources,
      resourceCount: resources.length,
      chunkCount: resources.reduce((sum, resource) => sum + resource.chunkCount, 0),
    };
  });
}

export async function getCourseBooksForUser(userId: string): Promise<CourseBookSummary[]> {
  const { data, error } = await getSupabase()
    .from('course_books')
    .select(COURSE_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return hydrateCourseBooks((data || []) as CourseBook[]);
}

export async function getCourseBookById(
  courseBookId: string,
  userId: string
): Promise<CourseBookSummary | null> {
  const { data, error } = await getSupabase()
    .from('course_books')
    .select(COURSE_SELECT)
    .eq('id', courseBookId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [courseBook] = await hydrateCourseBooks([data as CourseBook]);
  return courseBook || null;
}

export async function createCourseBook(
  userId: string,
  input: {
    title: string;
    description?: string;
    color?: string;
    goal?: string;
  }
): Promise<CourseBookSummary> {
  const title = input.title.trim();
  if (!title) throw new Error('Course book title is required');

  const now = new Date().toISOString();
  const courseBook = {
    id: nanoid(),
    user_id: userId,
    title,
    description: input.description?.trim() || null,
    color: normalizeColor(input.color),
    goal: input.goal?.trim() || null,
    created_at: now,
  };

  const { data, error } = await getSupabase()
    .from('course_books')
    .insert(courseBook)
    .select(COURSE_SELECT)
    .single();

  if (error) throw new Error(error.message);

  return {
    ...(data as CourseBook),
    resources: [],
    resourceCount: 0,
    chunkCount: 0,
  };
}

export async function updateCourseBookResources(
  courseBookId: string,
  userId: string,
  resourceIds: string[]
): Promise<CourseBookSummary> {
  const courseBook = await getCourseBookById(courseBookId, userId);
  if (!courseBook) throw new Error('Course book not found');

  const uniqueResourceIds = Array.from(new Set(resourceIds.filter(Boolean)));

  if (uniqueResourceIds.length > 0) {
    const { data: ownedResources, error: resourceError } = await getSupabase()
      .from('resources')
      .select('id')
      .eq('user_id', userId)
      .in('id', uniqueResourceIds);

    if (resourceError) throw new Error(resourceError.message);

    const ownedIds = new Set((ownedResources || []).map((resource) => resource.id));
    const unauthorized = uniqueResourceIds.some((resourceId) => !ownedIds.has(resourceId));
    if (unauthorized) throw new Error('One or more resources were not found');
  }

  const supabase = getSupabase();
  const { error: deleteError } = await supabase
    .from('course_book_resources')
    .delete()
    .eq('course_book_id', courseBookId)
    .eq('user_id', userId);

  if (deleteError) throw new Error(deleteError.message);

  if (uniqueResourceIds.length > 0) {
    const { error: insertError } = await supabase.from('course_book_resources').insert(
      uniqueResourceIds.map((resourceId) => ({
        id: nanoid(),
        course_book_id: courseBookId,
        resource_id: resourceId,
        user_id: userId,
        created_at: new Date().toISOString(),
      }))
    );

    if (insertError) throw new Error(insertError.message);
  }

  const updated = await getCourseBookById(courseBookId, userId);
  if (!updated) throw new Error('Course book not found');
  return updated;
}

