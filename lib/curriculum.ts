import { nanoid } from 'nanoid';
import { getSupabase } from './supabase';

export type CurriculumSource = 'curated' | 'ai_generated';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface CurriculumSubject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  source: CurriculumSource;
  created_at: string;
}

export interface CurriculumModule {
  id: string;
  subject_id: string;
  title: string;
  order_index: number;
}

export interface CurriculumLesson {
  id: string;
  module_id: string;
  title: string;
  order_index: number;
  teaching_content: string | null;
  generated_at: string | null;
  source_resource_id: string | null;
}

export interface CurriculumConcept {
  id: string;
  lesson_id: string;
  name: string;
  description: string | null;
}

export interface UserSubjectProgress {
  user_id: string;
  subject_id: string;
  current_module_id: string | null;
  current_lesson_id: string | null;
  status: ProgressStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface UserConceptMastery {
  user_id: string;
  concept_id: string;
  mastery_score: number;
  review_count: number;
  last_reviewed_at: string | null;
  next_review_due: string | null;
  ease_factor: number;
  interval: number;
  repetitions: number;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// --- Subjects ---------------------------------------------------------

export async function getSubjectBySlug(slug: string): Promise<CurriculumSubject | null> {
  const { data, error } = await getSupabase()
    .from('curriculum_subjects')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch subject: ${error.message}`);
  return data;
}

export async function getSubjectById(id: string): Promise<CurriculumSubject | null> {
  const { data, error } = await getSupabase()
    .from('curriculum_subjects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch subject: ${error.message}`);
  return data;
}

export async function createSubject(
  name: string,
  slug: string,
  source: CurriculumSource,
  description?: string
): Promise<CurriculumSubject> {
  const row = {
    id: nanoid(),
    name,
    slug,
    description: description ?? null,
    source,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabase()
    .from('curriculum_subjects')
    .insert(row)
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create subject: ${error.message}`);
  return data;
}

// --- Modules / Lessons / Concepts --------------------------------------

export async function createModule(
  subjectId: string,
  title: string,
  orderIndex: number
): Promise<CurriculumModule> {
  const { data, error } = await getSupabase()
    .from('curriculum_modules')
    .insert({ id: nanoid(), subject_id: subjectId, title, order_index: orderIndex })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create module: ${error.message}`);
  return data;
}

export async function createLesson(
  moduleId: string,
  title: string,
  orderIndex: number
): Promise<CurriculumLesson> {
  const { data, error } = await getSupabase()
    .from('curriculum_lessons')
    .insert({ id: nanoid(), module_id: moduleId, title, order_index: orderIndex })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create lesson: ${error.message}`);
  return data;
}

export async function createConcepts(
  lessonId: string,
  concepts: { name: string; description?: string }[]
): Promise<CurriculumConcept[]> {
  if (concepts.length === 0) return [];
  const rows = concepts.map((c) => ({
    id: nanoid(),
    lesson_id: lessonId,
    name: c.name,
    description: c.description ?? null,
  }));
  const { data, error } = await getSupabase()
    .from('curriculum_concepts')
    .insert(rows)
    .select('*');
  if (error) throw new Error(`Failed to create concepts: ${error.message}`);
  return data;
}

export async function getModulesForSubject(subjectId: string): Promise<CurriculumModule[]> {
  const { data, error } = await getSupabase()
    .from('curriculum_modules')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(`Failed to fetch modules: ${error.message}`);
  return data || [];
}

export async function getLessonsForModule(moduleId: string): Promise<CurriculumLesson[]> {
  const { data, error } = await getSupabase()
    .from('curriculum_lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: true });
  if (error) throw new Error(`Failed to fetch lessons: ${error.message}`);
  return data || [];
}

export async function getLesson(lessonId: string): Promise<CurriculumLesson | null> {
  const { data, error } = await getSupabase()
    .from('curriculum_lessons')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch lesson: ${error.message}`);
  return data;
}

export async function updateLessonContent(lessonId: string, content: string): Promise<void> {
  const { error } = await getSupabase()
    .from('curriculum_lessons')
    .update({ teaching_content: content, generated_at: new Date().toISOString() })
    .eq('id', lessonId);
  if (error) throw new Error(`Failed to save lesson content: ${error.message}`);
}

export async function getConceptsForLesson(lessonId: string): Promise<CurriculumConcept[]> {
  const { data, error } = await getSupabase()
    .from('curriculum_concepts')
    .select('*')
    .eq('lesson_id', lessonId);
  if (error) throw new Error(`Failed to fetch concepts: ${error.message}`);
  return data || [];
}

// --- Progress -----------------------------------------------------------

export async function getUserProgress(
  userId: string,
  subjectId: string
): Promise<UserSubjectProgress | null> {
  const { data, error } = await getSupabase()
    .from('user_subject_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch progress: ${error.message}`);
  return data;
}

export async function upsertUserProgress(
  userId: string,
  subjectId: string,
  fields: Partial<
    Pick<UserSubjectProgress, 'current_module_id' | 'current_lesson_id' | 'status'>
  >
): Promise<UserSubjectProgress> {
  const now = new Date().toISOString();
  const existing = await getUserProgress(userId, subjectId);

  const row = {
    user_id: userId,
    subject_id: subjectId,
    current_module_id: fields.current_module_id ?? existing?.current_module_id ?? null,
    current_lesson_id: fields.current_lesson_id ?? existing?.current_lesson_id ?? null,
    status: fields.status ?? existing?.status ?? 'not_started',
    started_at: existing?.started_at ?? (fields.status ? now : null),
    completed_at: fields.status === 'completed' ? now : existing?.completed_at ?? null,
    updated_at: now,
  };

  const { data, error } = await getSupabase()
    .from('user_subject_progress')
    .upsert(row, { onConflict: 'user_id,subject_id' })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to update progress: ${error.message}`);
  return data;
}

// --- Session summaries (condensed strengths/weaknesses, NOT full chat
// history — see migration comment for why) --------------------------

export interface UserSessionSummary {
  id: string;
  user_id: string;
  subject_id: string;
  lesson_id: string | null;
  summary_text: string;
  created_at: string;
}

export async function createSessionSummary(
  userId: string,
  subjectId: string,
  lessonId: string,
  summaryText: string
): Promise<UserSessionSummary> {
  const { data, error } = await getSupabase()
    .from('user_session_summaries')
    .insert({
      id: nanoid(),
      user_id: userId,
      subject_id: subjectId,
      lesson_id: lessonId,
      summary_text: summaryText,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to save session summary: ${error.message}`);
  return data;
}

/**
 * Capped on read (default 3), not just capped at write time — this is
 * the actual token-cost control: even as summaries accumulate over
 * months of use, only the most recent few are ever pulled into a
 * prompt.
 */
export async function getRecentSessionSummaries(
  userId: string,
  subjectId: string,
  limit = 3
): Promise<UserSessionSummary[]> {
  const { data, error } = await getSupabase()
    .from('user_session_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to fetch session summaries: ${error.message}`);
  return data || [];
}

// --- Mastery --------------------------------------------------------------

export async function getMasteryForConcepts(
  userId: string,
  conceptIds: string[]
): Promise<UserConceptMastery[]> {
  if (conceptIds.length === 0) return [];
  const { data, error } = await getSupabase()
    .from('user_concept_mastery')
    .select('*')
    .eq('user_id', userId)
    .in('concept_id', conceptIds);
  if (error) throw new Error(`Failed to fetch mastery: ${error.message}`);
  return data || [];
}

export async function upsertMastery(
  userId: string,
  conceptId: string,
  fields: {
    mastery_score: number;
    ease_factor: number;
    interval: number;
    repetitions: number;
    next_review_due: string;
  }
): Promise<UserConceptMastery> {
  const existing = (await getMasteryForConcepts(userId, [conceptId]))[0];
  const row = {
    user_id: userId,
    concept_id: conceptId,
    mastery_score: fields.mastery_score,
    review_count: (existing?.review_count ?? 0) + 1,
    last_reviewed_at: new Date().toISOString(),
    next_review_due: fields.next_review_due,
    ease_factor: fields.ease_factor,
    interval: fields.interval,
    repetitions: fields.repetitions,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabase()
    .from('user_concept_mastery')
    .upsert(row, { onConflict: 'user_id,concept_id' })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to update mastery: ${error.message}`);
  return data;
}
