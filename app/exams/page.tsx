'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { SourceCitations, type SourceCitation } from '@/components/source-citations';
import { providerHeaders, providerPayload } from '@/lib/ai-settings';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, FileText, Loader2, RotateCcw, Sparkles, XCircle } from 'lucide-react';

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

type Exam = {
  title: string;
  duration: number;
  questions: ExamQuestion[];
  totalMarks: number;
  sources?: SourceCitation[];
};

const questionCounts = [5, 10, 15, 20];
const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];
const examTypes: { value: ExamType; label: string }[] = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'mixed', label: 'Mixed' },
];

const cardStyle = {
  background: 'rgba(13,17,23,0.82)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const inputStyle = {
  background: 'rgba(20,27,36,0.88)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#F0F4F8',
};

function normalizeAnswer(answer: string) {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getOptionLetter(option: string, index: number) {
  const match = option.match(/^([A-D])[\).]/i);
  return match ? match[1].toUpperCase() : String.fromCharCode(65 + index);
}

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="min-h-[40px] rounded-full px-4 text-sm font-medium transition-all"
            style={
              active
                ? { background: 'rgba(124,106,245,0.18)', border: '1px solid rgba(124,106,245,0.45)', color: '#F0F4F8' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#8B9AB0' }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ExamsPage() {
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [examType, setExamType] = useState<ExamType>('mixed');
  const [exam, setExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const score = useMemo(() => {
    if (!exam) return 0;

    return exam.questions.reduce((sum, question) => {
      const answer = answers[question.id] || '';
      const correct =
        question.type === 'multiple-choice'
          ? answer === question.correctAnswer
          : normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);
      return correct ? sum + question.marks : sum;
    }, 0);
  }, [answers, exam]);

  const generateExam = async () => {
    if (!topic.trim()) {
      toast.error('Enter an exam topic');
      return;
    }

    setLoading(true);
    setSubmitted(false);
    setAnswers({});

    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify({
          ...providerPayload(),
          topic: topic.trim(),
          questionCount,
          difficulty,
          examType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate exam');
      setExam(data as Exam);
      toast.success('Exam ready');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate exam');
    } finally {
      setLoading(false);
    }
  };

  const submitExam = () => {
    if (!exam) return;
    setSubmitted(true);
    toast.success('Exam submitted');
  };

  const tryAgain = () => {
    setSubmitted(false);
    setAnswers({});
  };

  const generateNewExam = () => {
    setExam(null);
    setSubmitted(false);
    setAnswers({});
  };

  return (
    <AppShell
      title="Exams"
      description="Generate full practice exams from your ingested learning material."
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-2xl p-5 sm:p-6"
        style={cardStyle}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <Label htmlFor="exam-topic" style={{ color: '#8B9AB0' }}>
              What topic should the exam cover?
            </Label>
            <Input
              id="exam-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Photosynthesis, calculus limits, contract law"
              className="mt-2 min-h-[44px]"
              style={inputStyle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') generateExam();
              }}
            />
          </div>

          <div>
            <Label style={{ color: '#8B9AB0' }}>Questions</Label>
            <div className="mt-2 grid grid-cols-4 gap-2 lg:grid-cols-2">
              {questionCounts.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className="min-h-[44px] rounded-xl text-sm font-semibold transition-all"
                  style={
                    questionCount === count
                      ? { background: 'rgba(124,106,245,0.18)', border: '1px solid rgba(124,106,245,0.45)', color: '#F0F4F8' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#8B9AB0' }
                  }
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <Label style={{ color: '#8B9AB0' }}>Difficulty</Label>
            <div className="mt-2">
              <PillGroup options={difficulties} value={difficulty} onChange={setDifficulty} />
            </div>
          </div>
          <div>
            <Label style={{ color: '#8B9AB0' }}>Exam type</Label>
            <div className="mt-2">
              <PillGroup options={examTypes} value={examType} onChange={setExamType} />
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={generateExam}
          disabled={loading}
          className="mt-6 min-h-[44px] text-white"
          style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate Exam
        </Button>
      </motion.div>

      {loading && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: '#7C6AF5' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating your exam...
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="space-y-4 rounded-2xl p-5"
              style={cardStyle}
            >
              <Skeleton className="h-5 w-2/3 bg-white/[0.08]" />
              <Skeleton className="h-11 w-full rounded-xl bg-white/[0.08]" />
              <Skeleton className="h-11 w-full rounded-xl bg-white/[0.08]" />
              <Skeleton className="h-20 w-full rounded-xl bg-white/[0.08]" />
            </motion.div>
          ))}
        </div>
      )}

      {!loading && !exam && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl p-8 text-center"
          style={cardStyle}
        >
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(124,106,245,0.12)' }}
          >
            <FileText className="h-7 w-7" style={{ color: '#7C6AF5' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>
            Generate your first exam above to test your knowledge
          </p>
        </motion.div>
      )}

      {!loading && exam && (
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
            style={cardStyle}
          >
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold" style={{ color: '#F0F4F8' }}>
                {exam.title}
              </h2>
              <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
                Total marks: {exam.totalMarks}
              </p>
            </div>
            <div
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-sm font-medium"
              style={{ background: 'rgba(124,106,245,0.12)', border: '1px solid rgba(124,106,245,0.2)', color: '#F0F4F8' }}
            >
              <Clock className="h-4 w-4" style={{ color: '#7C6AF5' }} />
              {exam.duration} min
            </div>
          </motion.div>

          <SourceCitations sources={exam.sources} title="Exam sources" />

          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-6 text-center"
              style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <p className="text-3xl font-bold" style={{ color: '#34D399' }}>
                {score} / {exam.totalMarks}
              </p>
              <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
                Score out of total marks
              </p>
            </motion.div>
          )}

          {exam.questions.map((question, index) => {
            const answer = answers[question.id] || '';
            const correct =
              question.type === 'multiple-choice'
                ? answer === question.correctAnswer
                : normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);

            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl p-5 sm:p-6"
                style={cardStyle}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-relaxed" style={{ color: '#F0F4F8' }}>
                    <span style={{ color: '#7C6AF5' }}>{index + 1}.</span> {question.question}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: 'rgba(91,141,245,0.12)', color: '#5B8DF5' }}
                  >
                    {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                  </span>
                </div>

                {question.type === 'multiple-choice' ? (
                  <div className="space-y-2">
                    {(question.options || []).map((option, optionIndex) => {
                      const letter = getOptionLetter(option, optionIndex);
                      const selected = answer === letter;
                      const isCorrect = question.correctAnswer === letter;
                      let optionStyle: React.CSSProperties = {
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#8B9AB0',
                      };

                      if (selected && !submitted) {
                        optionStyle = {
                          background: 'rgba(124,106,245,0.15)',
                          border: '1px solid rgba(124,106,245,0.4)',
                          color: '#F0F4F8',
                        };
                      } else if (submitted && isCorrect) {
                        optionStyle = {
                          background: 'rgba(52,211,153,0.12)',
                          border: '1px solid rgba(52,211,153,0.35)',
                          color: '#34D399',
                        };
                      } else if (submitted && selected && !isCorrect) {
                        optionStyle = {
                          background: 'rgba(248,113,113,0.12)',
                          border: '1px solid rgba(248,113,113,0.35)',
                          color: '#F87171',
                        };
                      }

                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={submitted}
                          onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: letter }))}
                          className={cn(
                            'flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all',
                            !submitted && !selected && 'hover:bg-white/[0.05] hover:border-white/[0.12]'
                          )}
                          style={optionStyle}
                        >
                          <span className="break-words">{option}</span>
                          {submitted && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                          {submitted && selected && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <Textarea
                    value={answer}
                    onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
                    disabled={submitted}
                    placeholder="Write your answer..."
                    className="min-h-28 resize-none"
                    style={inputStyle}
                  />
                )}

                {submitted && (
                  <div className="mt-4 space-y-2">
                    <p
                      className="rounded-xl px-4 py-3 text-sm"
                      style={{
                        background: correct ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                        border: correct ? '1px solid rgba(52,211,153,0.22)' : '1px solid rgba(248,113,113,0.22)',
                        color: correct ? '#34D399' : '#F87171',
                      }}
                    >
                      Correct answer: {question.correctAnswer}
                    </p>
                    <p
                      className="rounded-xl px-4 py-3 text-sm leading-relaxed"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#8B9AB0' }}
                    >
                      {question.explanation}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}

          {!submitted ? (
            <Button
              type="button"
              onClick={submitExam}
              className="w-full min-h-[44px] text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
            >
              Submit Exam
            </Button>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={tryAgain}
                className="min-h-[44px] flex-1"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0F4F8' }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                type="button"
                onClick={generateNewExam}
                className="min-h-[44px] flex-1 text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate New Exam
              </Button>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
