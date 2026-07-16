import { NextResponse } from 'next/server';
import { resolveRequestProvider } from '@/lib/ai-provider';
import { enforceAIUsageLimit, usageHeaders, usageLimitResponse } from '@/lib/ai-usage';
import { getUserId } from '@/lib/session';
import {
  getSubjectById,
  getModulesForSubject,
  getLesson,
  getConceptsForLesson,
  getUserProgress,
  getRecentSessionSummaries,
  createSessionSummary,
} from '@/lib/curriculum';
import {
  startOrResumeSubject,
  generateLessonFlashcards,
  generateLessonQuiz,
  recordQuizResults,
  decideAdvancement,
  advanceToNextLesson,
  generateAlternativeExplanation,
  generateSessionSummary,
  ADVANCE_THRESHOLD,
} from '@/lib/curriculum-orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type SessionEvent = 'start' | 'flashcards_requested' | 'quiz_requested' | 'quiz_submitted';

interface SessionBody {
  event: SessionEvent;
  subjectName?: string;
  subjectId?: string;
  answers?: { conceptId: string; correct: boolean }[];
}

/**
 * Loads the current module/lesson/concepts for a subject from the
 * user's actual stored progress — never trusts a client-supplied
 * lesson/module/concept id directly, so a stale or tampered client
 * request can't desync server-side progress state.
 */
async function loadCurrentContext(userId: string, subjectId: string) {
  const subject = await getSubjectById(subjectId);
  if (!subject) throw new Error('Subject not found');

  const progress = await getUserProgress(userId, subjectId);
  if (!progress?.current_module_id || !progress.current_lesson_id) {
    throw new Error('No active progress for this subject — call the "start" event first');
  }

  const modules = await getModulesForSubject(subjectId);
  const currentModule = modules.find((m) => m.id === progress.current_module_id);
  if (!currentModule) throw new Error('Current module not found');

  const lesson = await getLesson(progress.current_lesson_id);
  if (!lesson) throw new Error('Current lesson not found');

  const concepts = await getConceptsForLesson(lesson.id);

  return { subject, currentModule, lesson, concepts, progress };
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = (await request.json()) as SessionBody;

    if (!body.event) {
      return NextResponse.json({ error: 'event is required' }, { status: 400 });
    }

    // Task type varies by event — teaching content benefits from the
    // stronger model, flashcards/quiz generation are routine enough for
    // the cheaper default.
    const taskType =
      body.event === 'start'
        ? 'deep_tutoring'
        : body.event === 'quiz_requested'
          ? 'quiz_generation'
          : body.event === 'flashcards_requested'
            ? 'flashcard_generation'
            : 'deep_tutoring'; // quiz_submitted may trigger a reteach explanation

    let provider;
    try {
      ({ provider } = await resolveRequestProvider(request, body as unknown as Record<string, unknown>, taskType));
    } catch {
      return NextResponse.json(
        { error: 'No AI provider configured. Add your API key in Settings.' },
        { status: 400 }
      );
    }

    const usage = await enforceAIUsageLimit(request);
    if (!usage.allowed) {
      return usageLimitResponse(usage);
    }

    // --- start: resume or begin a subject -------------------------------
    if (body.event === 'start') {
      if (!body.subjectName?.trim()) {
        return NextResponse.json({ error: 'subjectName is required' }, { status: 400 });
      }
      const state = await startOrResumeSubject(userId, body.subjectName.trim(), provider);
      return NextResponse.json(
        {
          stage: state.status === 'completed' ? 'subject_completed' : 'teaching',
          subject: state.subject,
          module: state.module,
          lesson: { ...state.lesson, teaching_content: state.teachingContent },
          concepts: state.concepts,
        },
        { headers: usageHeaders(usage) }
      );
    }

    // Every other event operates on an existing, in-progress subject.
    if (!body.subjectId) {
      return NextResponse.json({ error: 'subjectId is required' }, { status: 400 });
    }
    const { subject, currentModule, lesson, concepts } = await loadCurrentContext(
      userId,
      body.subjectId
    );

    // --- flashcards_requested: teaching stage is done -------------------
    if (body.event === 'flashcards_requested') {
      const flashcards = await generateLessonFlashcards(lesson, concepts, provider);
      return NextResponse.json(
        { stage: 'flashcards', ...flashcards, concepts },
        { headers: usageHeaders(usage) }
      );
    }

    // --- quiz_requested: flashcard review is done -----------------------
    if (body.event === 'quiz_requested') {
      const recentSummaries = await getRecentSessionSummaries(userId, subject.id);
      const quiz = await generateLessonQuiz(
        lesson,
        concepts,
        provider,
        recentSummaries.map((s) => s.summary_text)
      );
      return NextResponse.json(
        { stage: 'quiz', ...quiz, concepts },
        { headers: usageHeaders(usage) }
      );
    }

    // --- quiz_submitted: grade, update mastery, decide what's next ------
    if (body.event === 'quiz_submitted') {
      if (!body.answers?.length) {
        return NextResponse.json({ error: 'answers are required' }, { status: 400 });
      }

      const masteryResults = await recordQuizResults(userId, body.answers);
      const decision = decideAdvancement(masteryResults.map((r) => r.masteryScore));

      // Best-effort: a failed summary shouldn't block the actual lesson
      // flow the student is waiting on. Logged, not surfaced as an error.
      try {
        const summaryText = await generateSessionSummary(lesson, concepts, masteryResults, provider);
        await createSessionSummary(userId, subject.id, lesson.id, summaryText);
      } catch (summaryError) {
        console.warn('Session summary generation failed:', summaryError);
      }

      if (decision === 'advance') {
        const outcome = await advanceToNextLesson(userId, subject, currentModule, lesson);
        if (outcome === 'subject_completed') {
          return NextResponse.json(
            { decision: 'subject_completed', masteryResults },
            { headers: usageHeaders(usage) }
          );
        }
        // Load and return the next lesson's teaching content immediately,
        // so the frontend can move straight into it.
        const nextState = await startOrResumeSubject(userId, subject.name, provider);
        return NextResponse.json(
          {
            decision: 'advance',
            masteryResults,
            next: {
              stage: 'teaching',
              subject: nextState.subject,
              module: nextState.module,
              lesson: { ...nextState.lesson, teaching_content: nextState.teachingContent },
              concepts: nextState.concepts,
            },
          },
          { headers: usageHeaders(usage) }
        );
      }

      if (decision === 'reteach') {
        const weakConceptIds = new Set(
          masteryResults.filter((r) => r.masteryScore < 50).map((r) => r.conceptId)
        );
        const weakConcepts = concepts.filter((c) => weakConceptIds.has(c.id));
        const explanation = await generateAlternativeExplanation(
          lesson,
          subject.name,
          weakConcepts.map((c) => c.name),
          provider
        );
        return NextResponse.json(
          { decision: 'reteach', masteryResults, alternativeExplanation: explanation, weakConcepts },
          { headers: usageHeaders(usage) }
        );
      }

      // reinforce: stay on the same lesson, point back at the weak
      // concepts for another flashcard pass before re-quizzing.
      const weakConceptIds = new Set(
        masteryResults.filter((r) => r.masteryScore < ADVANCE_THRESHOLD).map((r) => r.conceptId)
      );
      const weakConcepts = concepts.filter((c) => weakConceptIds.has(c.id));
      return NextResponse.json(
        { decision: 'reinforce', masteryResults, weakConcepts },
        { headers: usageHeaders(usage) }
      );
    }

    return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Curriculum session failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
