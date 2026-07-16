import { generateCompletion } from './ai-provider';
import type { AIProviderConfig } from './ai-provider-types';
import { retrieveContextWithSources } from './rag';
import { nextSM2State, type SM2State } from './sm2';
import {
  slugify,
  getSubjectBySlug,
  createSubject,
  createModule,
  createLesson,
  createConcepts,
  getModulesForSubject,
  getLessonsForModule,
  getLesson,
  updateLessonContent,
  getConceptsForLesson,
  getUserProgress,
  upsertUserProgress,
  getMasteryForConcepts,
  upsertMastery,
  type CurriculumSubject,
  type CurriculumModule,
  type CurriculumLesson,
  type CurriculumConcept,
} from './curriculum';

function stripJsonFences(raw: string): string {
  return raw.replace(/```json\n?|\n?```/g, '').trim();
}

// ---------------------------------------------------------------------
// 1. Subject resolution (hybrid: curated reused if it exists, otherwise
//    AI-generates a skeleton once and caches it under a slug so every
//    learner after the first reuses the same structure).
// ---------------------------------------------------------------------

export async function resolveOrCreateSubject(
  name: string,
  provider: AIProviderConfig
): Promise<CurriculumSubject> {
  const slug = slugify(name);
  const existing = await getSubjectBySlug(slug);
  if (existing) return existing;

  // No curated or previously-generated subject at this slug — generate
  // a skeleton (module/lesson titles only, NOT full teaching content;
  // that stays lazy per-lesson so we don't pay for content nobody reads).
  const systemPrompt = `You are a curriculum designer. Design a structured course outline for the given subject.
Return ONLY valid JSON, no markdown fences:
{
  "description": "one sentence describing this subject",
  "modules": [
    {
      "title": "module title",
      "lessons": ["lesson 1 title", "lesson 2 title", "lesson 3 title"]
    }
  ]
}
Design 3-6 modules, each with 2-5 lessons, ordered from foundational to advanced. Keep titles concise.`;

  const raw = await generateCompletion(`Subject: ${name}`, provider, systemPrompt);
  const outline = JSON.parse(stripJsonFences(raw)) as {
    description?: string;
    modules: { title: string; lessons: string[] }[];
  };

  const subject = await createSubject(name, slug, 'ai_generated', outline.description);

  for (let m = 0; m < outline.modules.length; m++) {
    const mod = outline.modules[m];
    const createdModule = await createModule(subject.id, mod.title, m);
    for (let l = 0; l < mod.lessons.length; l++) {
      await createLesson(createdModule.id, mod.lessons[l], l);
    }
  }

  return subject;
}

// ---------------------------------------------------------------------
// 2. Lazy content generation per lesson (cached on first generation).
// ---------------------------------------------------------------------

export async function ensureLessonContent(
  lesson: CurriculumLesson,
  subjectName: string,
  moduleTitle: string,
  provider: AIProviderConfig,
  userId?: string
): Promise<string> {
  if (lesson.teaching_content) return lesson.teaching_content;

  // Reuses the same RAG lookup as the standalone /learn route — if the
  // user has ingested relevant material it grounds the lesson in that;
  // otherwise falls back to the model's general knowledge, same as today.
  const { context } = await retrieveContextWithSources(
    `${subjectName}: ${lesson.title}`,
    provider,
    5,
    userId
  );

  const systemPrompt = `You are an expert tutor teaching within a structured course.
Course: "${subjectName}" | Module: "${moduleTitle}" | Lesson: "${lesson.title}"
Return ONLY valid JSON, no markdown fences:
{
  "explanation": "full lesson explanation for a beginner in this course, building on the module context",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "commonMistakes": ["mistake 1", "mistake 2"]
}`;

  const prompt = `Context:\n${context}`;
  const raw = await generateCompletion(prompt, provider, systemPrompt);
  const cleaned = stripJsonFences(raw);

  await updateLessonContent(lesson.id, cleaned);
  return cleaned;
}

// ---------------------------------------------------------------------
// 3. Lazy concept extraction per lesson (cached — concepts are what
//    mastery tracking attaches to, so these need to exist before quiz
//    results can be graded per-concept).
// ---------------------------------------------------------------------

export async function ensureConcepts(
  lesson: CurriculumLesson,
  teachingContent: string,
  provider: AIProviderConfig
): Promise<CurriculumConcept[]> {
  const existing = await getConceptsForLesson(lesson.id);
  if (existing.length > 0) return existing;

  const systemPrompt = `Extract the key testable concepts from this lesson content.
Return ONLY valid JSON, no markdown fences:
{ "concepts": [{ "name": "short concept name", "description": "one sentence" }] }
Extract 3-6 concepts. Each should be specific enough to write a quiz question about.`;

  const raw = await generateCompletion(teachingContent, provider, systemPrompt);
  const parsed = JSON.parse(stripJsonFences(raw)) as {
    concepts: { name: string; description?: string }[];
  };

  return createConcepts(lesson.id, parsed.concepts);
}

// ---------------------------------------------------------------------
// 4. Session state — "what should the user see right now" for a subject.
//    This is what the frontend calls to start or resume a subject.
// ---------------------------------------------------------------------

export interface CurriculumSessionState {
  subject: CurriculumSubject;
  module: CurriculumModule;
  lesson: CurriculumLesson;
  teachingContent: string;
  concepts: CurriculumConcept[];
  status: 'in_progress' | 'completed';
}

export async function startOrResumeSubject(
  userId: string,
  subjectName: string,
  provider: AIProviderConfig
): Promise<CurriculumSessionState> {
  const subject = await resolveOrCreateSubject(subjectName, provider);
  let progress = await getUserProgress(userId, subject.id);

  if (!progress || !progress.current_lesson_id || !progress.current_module_id) {
    const modules = await getModulesForSubject(subject.id);
    if (modules.length === 0) throw new Error('Subject has no modules');
    const firstModule = modules[0];
    const lessons = await getLessonsForModule(firstModule.id);
    if (lessons.length === 0) throw new Error('First module has no lessons');

    progress = await upsertUserProgress(userId, subject.id, {
      current_module_id: firstModule.id,
      current_lesson_id: lessons[0].id,
      status: 'in_progress',
    });
  }

  if (progress.status === 'completed') {
    const modules = await getModulesForSubject(subject.id);
    const lastModule = modules[modules.length - 1];
    const lessons = lastModule ? await getLessonsForModule(lastModule.id) : [];
    const lastLesson = lessons[lessons.length - 1];
    const teachingContent = lastLesson?.teaching_content || '';
    return {
      subject,
      module: lastModule,
      lesson: lastLesson,
      teachingContent,
      concepts: lastLesson ? await getConceptsForLesson(lastLesson.id) : [],
      status: 'completed',
    };
  }

  const modules = await getModulesForSubject(subject.id);
  const currentModule = modules.find((m) => m.id === progress!.current_module_id)!;
  const lesson = await getLesson(progress.current_lesson_id!);
  if (!lesson) throw new Error('Current lesson not found');

  const teachingContent = await ensureLessonContent(
    lesson,
    subject.name,
    currentModule.title,
    provider,
    userId
  );
  const concepts = await ensureConcepts(lesson, teachingContent, provider);

  return {
    subject,
    module: currentModule,
    lesson,
    teachingContent,
    concepts,
    status: 'in_progress',
  };
}

// ---------------------------------------------------------------------
// 5. Flashcards / quiz generation, scoped to the current lesson's
//    concepts. Quiz questions are tagged with conceptId so grading can
//    update mastery per-concept, not just an aggregate score.
// ---------------------------------------------------------------------

export async function generateLessonFlashcards(
  lesson: CurriculumLesson,
  concepts: CurriculumConcept[],
  provider: AIProviderConfig
) {
  const systemPrompt = `Generate flashcards covering these concepts from the lesson "${lesson.title}".
Return ONLY valid JSON, no markdown:
{ "cards": [{ "id": "c1", "conceptId": "must be one of the given concept ids", "front": "term or question", "back": "definition with a real-world example" }] }
Create 1-2 cards per concept. Every "back" must include a concrete real-world example.`;

  const conceptList = concepts.map((c) => `- id: ${c.id} | ${c.name}: ${c.description ?? ''}`).join('\n');
  const raw = await generateCompletion(
    `Concepts:\n${conceptList}\n\nLesson content:\n${lesson.teaching_content ?? ''}`,
    provider,
    systemPrompt
  );
  return JSON.parse(stripJsonFences(raw));
}

export async function generateLessonQuiz(
  lesson: CurriculumLesson,
  concepts: CurriculumConcept[],
  provider: AIProviderConfig,
  recentSummaries?: string[]
) {
  const memoryContext =
    recentSummaries && recentSummaries.length > 0
      ? `\n\nWhat we know about this student from recent sessions (use to inform question difficulty/framing, don't reference it directly in the questions):\n${recentSummaries.map((s) => `- ${s}`).join('\n')}`
      : '';

  const systemPrompt = `Generate a quiz covering these concepts from the lesson "${lesson.title}".
Return ONLY valid JSON, no markdown fences:
{ "questions": [{ "id": "q1", "conceptId": "must be one of the given concept ids", "question": "...", "type": "multiple_choice", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "A" }] }
Generate 1-2 questions per concept (at least ${concepts.length} questions total). Tag every question with the conceptId it tests.${memoryContext}`;

  const conceptList = concepts.map((c) => `- id: ${c.id} | ${c.name}: ${c.description ?? ''}`).join('\n');
  const raw = await generateCompletion(
    `Concepts:\n${conceptList}\n\nLesson content:\n${lesson.teaching_content ?? ''}`,
    provider,
    systemPrompt
  );
  return JSON.parse(stripJsonFences(raw));
}

/**
 * Generates a short (2-4 sentence) summary of what a student struggled
 * with / grasped quickly this session, for storage in
 * user_session_summaries. Deliberately NOT stored on the shared lesson
 * row (that content is cached across every learner of the subject —
 * see the note on generateAlternativeExplanation above for why mutating
 * shared content per-user isn't safe); this is a separate, per-user
 * record read back via getRecentSessionSummaries.
 */
export async function generateSessionSummary(
  lesson: CurriculumLesson,
  concepts: CurriculumConcept[],
  masteryResults: { conceptId: string; masteryScore: number }[],
  provider: AIProviderConfig
): Promise<string> {
  const conceptById = new Map(concepts.map((c) => [c.id, c.name]));
  const performanceLines = masteryResults
    .map((r) => `- ${conceptById.get(r.conceptId) ?? r.conceptId}: ${r.masteryScore}/100`)
    .join('\n');

  const systemPrompt = `Summarize this student's quiz performance on the lesson "${lesson.title}" in 2-4 sentences.
Focus on what they struggled with and what they grasped quickly. Be specific and factual, not encouraging filler.
Return ONLY valid JSON, no markdown fences:
{ "summary": "the 2-4 sentence summary" }`;

  const raw = await generateCompletion(
    `Concept performance this session:\n${performanceLines}`,
    provider,
    systemPrompt
  );
  const parsed = JSON.parse(stripJsonFences(raw)) as { summary: string };
  return parsed.summary;
}

// ---------------------------------------------------------------------
// 6. Quiz grading -> mastery update -> advancement decision.
//
// Deliberately rule-based, not another AI call: cheap, fast, and
// predictable. The AI is only used for content generation above; the
// decision of what happens next is plain arithmetic against the
// mastery scores, same principle discussed for the whole orchestrator.
// ---------------------------------------------------------------------

export type AdvancementDecision = 'advance' | 'reinforce' | 'reteach' | 'subject_completed';

const ADVANCE_THRESHOLD = 80;
const REINFORCE_THRESHOLD = 50;
export { ADVANCE_THRESHOLD, REINFORCE_THRESHOLD };

function defaultSM2State(): SM2State {
  return { easeFactor: 2.5, interval: 0, repetitions: 0 };
}

/**
 * Updates mastery for each concept touched by the quiz, reusing the
 * existing SM-2 (lib/sm2.ts) and forgetting-curve (lib/memory-model.ts)
 * logic already used for flashcards, rather than a new formula.
 * 'correct' maps to SM-2 quality 'good', 'incorrect' maps to 'hard' —
 * same two-state mapping the app's existing flashcard review already
 * relies on ('hard' triggers SM-2's < 3 "forgotten" branch).
 */
export async function recordQuizResults(
  userId: string,
  answers: { conceptId: string; correct: boolean }[]
): Promise<{ conceptId: string; masteryScore: number }[]> {
  // Group answers by concept — a concept may have >1 question.
  const byConceptCorrectRatio = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const entry = byConceptCorrectRatio.get(a.conceptId) || { correct: 0, total: 0 };
    entry.total += 1;
    if (a.correct) entry.correct += 1;
    byConceptCorrectRatio.set(a.conceptId, entry);
  }

  const conceptIds = Array.from(byConceptCorrectRatio.keys());
  const existingMastery = await getMasteryForConcepts(userId, conceptIds);
  const existingByConceptId = new Map(existingMastery.map((m) => [m.concept_id, m]));

  const results: { conceptId: string; masteryScore: number }[] = [];

  for (const conceptId of conceptIds) {
    const { correct, total } = byConceptCorrectRatio.get(conceptId)!;
    const majorityCorrect = correct / total >= 0.5;

    const prior = existingByConceptId.get(conceptId);
    const state: SM2State = prior
      ? { easeFactor: prior.ease_factor, interval: prior.interval, repetitions: prior.repetitions }
      : defaultSM2State();

    const quality = majorityCorrect ? 'good' : 'hard';
    const updated = nextSM2State(state, quality);

    // Mastery score: NOT estimateMemory().strength evaluated at "now" —
    // that function models decay since the last review, so at elapsed
    // time ~0 (i.e. right after any review, correct or not) it's always
    // close to 100% by construction of the exponential curve. That would
    // make mastery look near-perfect immediately after a WRONG answer
    // too, which defeats the point. Instead, derive mastery directly
    // from the SM-2 repetitions streak — which DOES correctly reset to
    // 0 on a failed recall — blended with easeFactor for nuance. The
    // forgetting-curve model is still used below, correctly, for
    // scheduling next_review_due (a genuine "when will they forget"
    // question, which is what it's designed to answer).
    // Mastery score is calibrated so THIS attempt's correctness is the
    // dominant signal (a student who answers correctly the first time
    // should be able to advance immediately — they already went through
    // teaching + flashcards before reaching the quiz, so a clean pass is
    // a real signal, not a fluke to be doubted). The repetitions streak
    // adds a smaller bonus on top, rewarding sustained correct recall
    // over multiple sessions (relevant for spaced-repetition, less so
    // for a single lesson's advance/reinforce/reteach decision).
    //
    // Earlier version based this primarily on repetitions*30, which
    // meant even a perfect first quiz (repetitions going 0->1) only
    // scored 30/100 — always routing to "reteach" regardless of how
    // well the student actually did. Caught by the live test below.
    const base = majorityCorrect ? 75 : 20;
    const streakBonus = Math.min(25, updated.repetitions * 8);
    const easeAdjustment = Math.round((updated.easeFactor - 2.5) * 5);
    const masteryScore = Math.max(0, Math.min(100, base + streakBonus + easeAdjustment));

    await upsertMastery(userId, conceptId, {
      mastery_score: masteryScore,
      ease_factor: updated.easeFactor,
      interval: updated.interval,
      repetitions: updated.repetitions,
      next_review_due: updated.nextReview.toISOString(),
    });

    results.push({ conceptId, masteryScore });
  }

  return results;
}

/**
 * For the 'reteach' decision: generates a fresh explanation using a
 * different angle/approach for a user who is struggling, WITHOUT
 * overwriting the lesson's cached teaching_content — that content is
 * shared across every learner of this subject (that's the whole point
 * of caching it), so mutating it because one user struggled would
 * silently change the lesson for everyone else too. This is returned
 * to the caller as a one-off supplementary explanation instead.
 */
export async function generateAlternativeExplanation(
  lesson: CurriculumLesson,
  subjectName: string,
  weakConceptNames: string[],
  provider: AIProviderConfig
): Promise<string> {
  const systemPrompt = `A student is struggling with this lesson from the course "${subjectName}": "${lesson.title}".
They specifically struggled with: ${weakConceptNames.join(', ')}.
Re-explain these concepts using a DIFFERENT approach than a standard textbook explanation — use an analogy, a worked example, or a different framing. Keep it focused only on the concepts they struggled with.
Return ONLY valid JSON, no markdown fences:
{ "explanation": "the alternative explanation" }`;

  const raw = await generateCompletion(
    `Original lesson content for reference:\n${lesson.teaching_content ?? ''}`,
    provider,
    systemPrompt
  );
  const parsed = JSON.parse(stripJsonFences(raw)) as { explanation: string };
  return parsed.explanation;
}

export function decideAdvancement(masteryScores: number[]): 'advance' | 'reinforce' | 'reteach' {
  if (masteryScores.length === 0) return 'reinforce';
  const avg = masteryScores.reduce((a, b) => a + b, 0) / masteryScores.length;
  if (avg >= ADVANCE_THRESHOLD) return 'advance';
  if (avg >= REINFORCE_THRESHOLD) return 'reinforce';
  return 'reteach';
}

/**
 * Moves progress to the next lesson in the current module, or the next
 * module's first lesson, or marks the subject completed if there's
 * nothing left. Only called when decideAdvancement() returns 'advance'.
 */
export async function advanceToNextLesson(
  userId: string,
  subject: CurriculumSubject,
  currentModule: CurriculumModule,
  currentLesson: CurriculumLesson
): Promise<AdvancementDecision> {
  const lessonsInModule = await getLessonsForModule(currentModule.id);
  const nextLesson = lessonsInModule.find((l) => l.order_index === currentLesson.order_index + 1);

  if (nextLesson) {
    await upsertUserProgress(userId, subject.id, {
      current_module_id: currentModule.id,
      current_lesson_id: nextLesson.id,
      status: 'in_progress',
    });
    return 'advance';
  }

  const modules = await getModulesForSubject(subject.id);
  const nextModule = modules.find((m) => m.order_index === currentModule.order_index + 1);

  if (nextModule) {
    const lessonsInNextModule = await getLessonsForModule(nextModule.id);
    const firstLesson = lessonsInNextModule[0];
    if (firstLesson) {
      await upsertUserProgress(userId, subject.id, {
        current_module_id: nextModule.id,
        current_lesson_id: firstLesson.id,
        status: 'in_progress',
      });
      return 'advance';
    }
  }

  // No more lessons or modules left — subject is done.
  await upsertUserProgress(userId, subject.id, { status: 'completed' });
  return 'subject_completed';
}
