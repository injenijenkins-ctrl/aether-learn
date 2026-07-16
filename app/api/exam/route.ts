/*
-- Run in Supabase SQL Editor: CREATE TABLE IF NOT EXISTS exam_history (id TEXT PRIMARY KEY, user_id TEXT NOT NULL DEFAULT 'anonymous', topic TEXT NOT NULL, score INTEGER, total_marks INTEGER, difficulty TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
*/

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateCompletion, resolveRequestProvider } from '@/lib/ai-provider';
import { retrieveContextWithSources, type SourceCitation } from '@/lib/rag';
import { getUserId } from '@/lib/session';
import { getSupabase } from '@/lib/supabase';
import {
  enforceAIUsageLimit,
  usageLimitResponse,
  withUsageHeaders,
} from '@/lib/ai-usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Difficulty = 'easy' | 'medium' | 'hard';
type ExamType = 'multiple-choice' | 'short-answer' | 'mixed';

type ExamQuestion = {
  id: string;
  type: 'multiple-choice' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  marks: number;
};

type GeneratedExam = {
  title: string;
  duration: number;
  questions: ExamQuestion[];
  totalMarks: number;
  sources?: SourceCitation[];
};

const QUESTION_COUNTS = new Set([5, 10, 15, 20]);
const DIFFICULTIES = new Set<Difficulty>(['easy', 'medium', 'hard']);
const EXAM_TYPES = new Set<ExamType>(['multiple-choice', 'short-answer', 'mixed']);

function cleanJson(raw: string) {
  return raw.replace(/```json\n?|\n?```/g, '').trim();
}

function normalizeExam(exam: GeneratedExam, requestedCount: number): GeneratedExam {
  const questions = Array.isArray(exam.questions) ? exam.questions.slice(0, requestedCount) : [];

  const normalizedQuestions = questions.map((question, index) => {
    const type: ExamQuestion['type'] =
      question.type === 'short-answer' ? 'short-answer' : 'multiple-choice';
    const marks = Number.isFinite(question.marks) && question.marks > 0 ? Math.round(question.marks) : 1;

    return {
      id: question.id || `q${index + 1}`,
      type,
      question: question.question || `Question ${index + 1}`,
      options: type === 'multiple-choice' ? (question.options || []).slice(0, 4) : undefined,
      correctAnswer: question.correctAnswer || '',
      explanation: question.explanation || '',
      marks,
    };
  });

  const totalMarks = normalizedQuestions.reduce((sum, question) => sum + question.marks, 0);

  return {
    title: exam.title || 'Generated Exam',
    duration: Number.isFinite(exam.duration) && exam.duration > 0
      ? Math.round(exam.duration)
      : Math.max(10, requestedCount * 2),
    questions: normalizedQuestions,
    totalMarks,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, questionCount, difficulty, examType } = body as {
      topic?: string;
      questionCount?: number;
      difficulty?: Difficulty;
      examType?: ExamType;
    };

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    if (typeof questionCount !== 'number' || !QUESTION_COUNTS.has(questionCount)) {
      return NextResponse.json({ error: 'Question count must be 5, 10, 15, or 20' }, { status: 400 });
    }

    if (!difficulty || !DIFFICULTIES.has(difficulty)) {
      return NextResponse.json({ error: 'Difficulty is required' }, { status: 400 });
    }

    if (!examType || !EXAM_TYPES.has(examType)) {
      return NextResponse.json({ error: 'Exam type is required' }, { status: 400 });
    }

    let provider;
    try {
      ({ provider } = await resolveRequestProvider(request, body, 'quiz_generation'));
    } catch {
      return NextResponse.json(
        { error: 'No AI provider configured. Add your API key in Settings.' },
        { status: 400 }
      );
    }

    const userId = await getUserId();

    const usage = await enforceAIUsageLimit(request);
    if (!usage.allowed) {
      return usageLimitResponse(usage);
    }

    const { context, sources } = await retrieveContextWithSources(topic, provider);
    const systemPrompt = `You are an expert examiner. Generate a complete exam from the provided learning context.
Return ONLY valid JSON, no markdown.
The JSON must match this shape exactly:
{
  "title": "string",
  "duration": 30,
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "string",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correctAnswer": "A",
      "explanation": "string",
      "marks": 1
    }
  ],
  "totalMarks": 10
}
For multiple-choice questions, provide exactly four options and make correctAnswer the matching option letter.
For short-answer questions, omit options and make correctAnswer concise but complete.
Difficulty: ${difficulty}. Exam type: ${examType}. Question count: ${questionCount}.`;

    const prompt = `Topic: ${topic.trim()}\n\nContext:\n${context}`;
    const raw = await generateCompletion(prompt, provider, systemPrompt);

    let exam: GeneratedExam;
    try {
      exam = normalizeExam(JSON.parse(cleanJson(raw)) as GeneratedExam, questionCount);
    } catch {
      return NextResponse.json({ error: 'Failed to parse exam' }, { status: 500 });
    }

    const { error } = await getSupabase().from('exam_history').insert({
      id: uuidv4(),
      user_id: userId,
      topic: topic.trim(),
      score: null,
      total_marks: exam.totalMarks,
      difficulty,
      created_at: new Date().toISOString(),
    });

    if (error) console.error('exam_history insert failed:', error);

    return withUsageHeaders(NextResponse.json({ ...exam, sources }), usage);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Exam generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
