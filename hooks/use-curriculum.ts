'use client';

import { useCallback, useState } from 'react';
import { providerHeaders, providerPayload } from '@/lib/ai-settings';

export interface CurriculumSubject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  source: 'curated' | 'ai_generated';
}

export interface CurriculumModule {
  id: string;
  title: string;
  order_index: number;
}

export interface CurriculumLesson {
  id: string;
  title: string;
  order_index: number;
  teaching_content: string;
}

export interface CurriculumConcept {
  id: string;
  name: string;
  description: string | null;
}

export interface TeachingStage {
  stage: 'teaching' | 'subject_completed';
  subject: CurriculumSubject;
  module: CurriculumModule;
  lesson: CurriculumLesson;
  concepts: CurriculumConcept[];
}

export interface FlashcardsStage {
  stage: 'flashcards';
  cards: { id: string; conceptId: string; front: string; back: string }[];
  concepts: CurriculumConcept[];
}

export interface QuizStage {
  stage: 'quiz';
  questions: {
    id: string;
    conceptId: string;
    question: string;
    type: string;
    options: string[];
    correctAnswer: string;
  }[];
  concepts: CurriculumConcept[];
}

export interface QuizSubmitResult {
  decision: 'advance' | 'reinforce' | 'reteach' | 'subject_completed';
  masteryResults: { conceptId: string; masteryScore: number }[];
  next?: TeachingStage;
  alternativeExplanation?: string;
  weakConcepts?: CurriculumConcept[];
}

function withProvider<T extends Record<string, unknown>>(data: T) {
  return { ...data, ...providerPayload() };
}

async function postSession<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/curriculum/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...providerHeaders() },
    body: JSON.stringify(withProvider(body)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Curriculum request failed');
  return data as T;
}

export function useCurriculumSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Curriculum request failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const startSubject = useCallback(
    (subjectName: string) =>
      run(() => postSession<TeachingStage>({ event: 'start', subjectName })),
    [run]
  );

  const requestFlashcards = useCallback(
    (subjectId: string) =>
      run(() => postSession<FlashcardsStage>({ event: 'flashcards_requested', subjectId })),
    [run]
  );

  const requestQuiz = useCallback(
    (subjectId: string) =>
      run(() => postSession<QuizStage>({ event: 'quiz_requested', subjectId })),
    [run]
  );

  const submitQuiz = useCallback(
    (subjectId: string, answers: { conceptId: string; correct: boolean }[]) =>
      run(() =>
        postSession<QuizSubmitResult>({ event: 'quiz_submitted', subjectId, answers })
      ),
    [run]
  );

  return { loading, error, startSubject, requestFlashcards, requestQuiz, submitQuiz };
}
