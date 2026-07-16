'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Sparkles,
  GraduationCap,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  useCurriculumSession,
  type TeachingStage,
  type FlashcardsStage,
  type QuizStage,
  type QuizSubmitResult,
} from '@/hooks/use-curriculum';
import { cn } from '@/lib/utils';

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

type Phase = 'input' | 'teaching' | 'flashcards' | 'quiz' | 'quiz-result' | 'completed';

interface LessonContent {
  explanation: string;
  keyPoints?: string[];
  commonMistakes?: string[];
}

function parseLessonContent(raw: string): LessonContent {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.explanation === 'string') return parsed;
  } catch {
    // teaching_content wasn't valid JSON (e.g. an older/curated row) —
    // fall back to showing it as plain explanation text.
  }
  return { explanation: raw };
}

function getOptionLetter(option: string): string {
  const match = option.match(/^([A-D])\./);
  return match ? match[1] : option.charAt(0);
}

function errorMessage(error: unknown, fallback: string) {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  if (message.includes('no ai provider')) {
    return 'Add your API key in Settings, or try again in a moment.';
  }
  // Matches the actual backend text (lib/ai-usage.ts) rather than a
  // generic "usage limit" / "429" guess — verified against both real
  // messages: tier cap says "interaction limit", IP throttling says
  // "too many ai requests", neither contains "usage limit" or "429".
  if (message.includes('interaction limit') || message.includes('too many ai requests')) {
    return "You've reached your plan's AI usage limit for this period. Add your own API key in Settings for unlimited access.";
  }
  return fallback;
}

export default function JourneyPage() {
  const { loading, startSubject, requestFlashcards, requestQuiz, submitQuiz } =
    useCurriculumSession();

  const [phase, setPhase] = useState<Phase>('input');
  const [subjectName, setSubjectName] = useState('');
  const [teaching, setTeaching] = useState<TeachingStage | null>(null);
  const [flashcards, setFlashcards] = useState<FlashcardsStage | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [quiz, setQuiz] = useState<QuizStage | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizSubmitResult | null>(null);

  const resetToInput = () => {
    setPhase('input');
    setTeaching(null);
    setFlashcards(null);
    setQuiz(null);
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleStart = async () => {
    if (!subjectName.trim()) {
      toast.error('Enter a subject you want to learn');
      return;
    }
    try {
      const result = await startSubject(subjectName.trim());
      if (result.stage === 'subject_completed') {
        setTeaching(result);
        setPhase('completed');
        return;
      }
      setTeaching(result);
      setPhase('teaching');
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't start this subject. Please try again."));
    }
  };

  const goToFlashcards = async () => {
    if (!teaching) return;
    try {
      const result = await requestFlashcards(teaching.subject.id);
      setFlashcards(result);
      setCardIndex(0);
      setCardFlipped(false);
      setPhase('flashcards');
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't generate flashcards. Please try again."));
    }
  };

  const goToQuiz = async () => {
    if (!teaching) return;
    try {
      const result = await requestQuiz(teaching.subject.id);
      setQuiz(result);
      setQuizAnswers({});
      setPhase('quiz');
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't generate the quiz. Please try again."));
    }
  };

  const handleSubmitQuiz = async () => {
    if (!teaching || !quiz) return;
    if (Object.keys(quizAnswers).length < quiz.questions.length) {
      toast.error('Answer every question before submitting');
      return;
    }
    // Grading happens client-side (same trust model the app's existing
    // quiz feature already uses) — we just group correctness by concept
    // so the server can update mastery per concept, not just an
    // aggregate score.
    const answers = quiz.questions.map((q) => ({
      conceptId: q.conceptId,
      correct: quizAnswers[q.id] === q.correctAnswer,
    }));
    try {
      const result = await submitQuiz(teaching.subject.id, answers);
      setQuizResult(result);
      setPhase('quiz-result');
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't submit your quiz. Please try again."));
    }
  };

  const continueAfterResult = async () => {
    if (!quizResult) return;

    if (quizResult.decision === 'subject_completed') {
      setPhase('completed');
      return;
    }
    if (quizResult.decision === 'advance' && quizResult.next) {
      setTeaching(quizResult.next);
      setFlashcards(null);
      setQuiz(null);
      setQuizResult(null);
      setPhase('teaching');
      return;
    }
    if (quizResult.decision === 'reinforce') {
      await goToFlashcards();
      return;
    }
    if (quizResult.decision === 'reteach') {
      // Alternative explanation is already in quizResult — re-quiz once
      // they're ready, no need to re-fetch teaching content.
      setPhase('quiz-result'); // stays here; the "Try the quiz again" button below drives goToQuiz
    }
  };

  const content = teaching ? parseLessonContent(teaching.lesson.teaching_content) : null;

  return (
    <AppShell
      title="Learning Journey"
      description="Pick a subject and AetherLearn teaches, quizzes, and adapts to you automatically — no separate flashcards or quiz pages to juggle."
    >
      {/* --- Input phase --- */}
      {phase === 'input' && (
        <div className="mb-8 max-w-2xl space-y-5 rounded-2xl p-6" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: 'rgba(124,106,245,0.12)' }}
            >
              <GraduationCap className="h-5 w-5" style={{ color: '#7C6AF5' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>
                What do you want to learn?
              </p>
              <p className="text-xs" style={{ color: '#4A5568' }}>
                e.g. "Web Development", "Linear Algebra", "Kiswahili grammar"
              </p>
            </div>
          </div>
          <div>
            <Label htmlFor="subject" style={{ color: '#8B9AB0' }}>Subject</Label>
            <Input
              id="subject"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="Type a subject to start or resume your journey"
              className="mt-2 min-h-[44px]"
              style={{
                background: 'rgba(20,27,36,0.8)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#F0F4F8',
              }}
            />
          </div>
          <Button
            onClick={handleStart}
            disabled={loading}
            className="min-h-[44px] text-white"
            style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Start Learning
          </Button>
        </div>
      )}

      {loading && phase === 'input' && (
        <div className="max-w-2xl space-y-4 rounded-2xl p-6" style={cardStyle}>
          <div className="flex animate-pulse items-center gap-2 text-sm font-medium" style={{ color: '#7C6AF5' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Setting up your curriculum...
          </div>
          <Skeleton className="h-5 w-2/3 bg-white/[0.08]" />
          <Skeleton className="h-4 w-full bg-white/[0.08]" />
        </div>
      )}

      {/* --- Teaching phase --- */}
      {phase === 'teaching' && teaching && content && (
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl space-y-6 rounded-2xl p-6 md:p-8"
          style={cardStyle}
        >
          <div>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#4A5568' }}>
              <Layers className="h-3.5 w-3.5" />
              {teaching.subject.name} · {teaching.module.title}
            </div>
            <h2 className="mt-2 text-xl font-bold" style={{ color: '#F0F4F8' }}>
              {teaching.lesson.title}
            </h2>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#8B9AB0' }}>
            {content.explanation}
          </p>

          {content.keyPoints && content.keyPoints.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold" style={{ color: '#5B8DF5' }}>Key Points</h3>
              <ul className="space-y-1.5">
                {content.keyPoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#F0F4F8' }}>
                    <span style={{ color: '#7C6AF5', marginTop: 2 }}>•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {content.commonMistakes && content.commonMistakes.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold" style={{ color: '#F87171' }}>Common Mistakes</h3>
              <ul className="space-y-1.5">
                {content.commonMistakes.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#8B9AB0' }}>
                    <span style={{ color: '#F87171', marginTop: 2 }}>•</span>
                    {m}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button
            onClick={goToFlashcards}
            disabled={loading}
            className="min-h-[44px] w-full text-white sm:w-auto"
            style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            I've got this — Flashcards
          </Button>
        </motion.article>
      )}

      {/* --- Flashcards phase --- */}
      {phase === 'flashcards' && flashcards && flashcards.cards.length > 0 && (
        <div className="max-w-2xl space-y-5">
          <p className="text-xs" style={{ color: '#4A5568' }}>
            Card {cardIndex + 1} of {flashcards.cards.length}
          </p>
          <motion.div
            key={cardIndex}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl p-8 text-center"
            style={cardStyle}
            onClick={() => setCardFlipped((f) => !f)}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: cardFlipped ? '#5B8DF5' : '#7C6AF5' }}
            >
              {cardFlipped ? 'Answer' : 'Question'}
            </p>
            <p className="mt-4 text-base leading-relaxed" style={{ color: '#F0F4F8' }}>
              {cardFlipped ? flashcards.cards[cardIndex].back : flashcards.cards[cardIndex].front}
            </p>
            <p className="mt-6 text-xs" style={{ color: '#4A5568' }}>Tap to flip</p>
          </motion.div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={cardIndex === 0}
              className="min-h-[44px] flex-1"
              style={{ background: 'rgba(20,27,36,0.6)', border: '1px solid rgba(255,255,255,0.08)', color: '#F0F4F8' }}
              onClick={() => {
                setCardIndex((i) => Math.max(0, i - 1));
                setCardFlipped(false);
              }}
            >
              Previous
            </Button>
            {cardIndex < flashcards.cards.length - 1 ? (
              <Button
                className="min-h-[44px] flex-1 text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
                onClick={() => {
                  setCardIndex((i) => i + 1);
                  setCardFlipped(false);
                }}
              >
                Next Card
              </Button>
            ) : (
              <Button
                onClick={goToQuiz}
                disabled={loading}
                className="min-h-[44px] flex-1 text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Continue to Quiz
              </Button>
            )}
          </div>
        </div>
      )}

      {/* --- Quiz phase --- */}
      {phase === 'quiz' && quiz && (
        <div className="max-w-2xl space-y-5">
          {quiz.questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl p-6"
              style={cardStyle}
            >
              <p className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>
                <span style={{ color: '#7C6AF5' }}>{idx + 1}.</span> {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const letter = getOptionLetter(opt);
                  const selected = quizAnswers[q.id] === letter;
                  const optStyle: React.CSSProperties = selected
                    ? { background: 'rgba(124,106,245,0.15)', border: '1px solid rgba(124,106,245,0.4)', color: '#F0F4F8' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#8B9AB0' };
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: letter }))}
                      className={cn(
                        'min-h-[44px] w-full rounded-xl px-4 py-3 text-left text-sm transition-all',
                        !selected && 'hover:bg-white/[0.05] hover:border-white/[0.12]'
                      )}
                      style={optStyle}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
          <Button
            onClick={handleSubmitQuiz}
            disabled={loading}
            className="min-h-[44px] w-full text-white"
            style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Submit Quiz
          </Button>
        </div>
      )}

      {/* --- Quiz result / adaptive decision phase --- */}
      {phase === 'quiz-result' && quizResult && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl space-y-5 rounded-2xl p-6 md:p-8"
          style={cardStyle}
        >
          {quizResult.decision === 'advance' && (
            <>
              <p className="text-sm font-semibold" style={{ color: '#34D399' }}>Nice work — you've got this lesson.</p>
              <p className="text-sm" style={{ color: '#8B9AB0' }}>
                Moving on to the next lesson{quizResult.next ? `: ${quizResult.next.lesson.title}` : ''}.
              </p>
              <Button
                onClick={continueAfterResult}
                disabled={loading}
                className="min-h-[44px] text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Continue
              </Button>
            </>
          )}

          {quizResult.decision === 'reinforce' && (
            <>
              <p className="text-sm font-semibold" style={{ color: '#FBBF24' }}>Almost there — let's reinforce a few concepts.</p>
              {quizResult.weakConcepts && quizResult.weakConcepts.length > 0 && (
                <ul className="space-y-1.5">
                  {quizResult.weakConcepts.map((c) => (
                    <li key={c.id} className="text-sm" style={{ color: '#F0F4F8' }}>• {c.name}</li>
                  ))}
                </ul>
              )}
              <Button
                onClick={continueAfterResult}
                disabled={loading}
                className="min-h-[44px] text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Review Flashcards Again
              </Button>
            </>
          )}

          {quizResult.decision === 'reteach' && (
            <>
              <p className="text-sm font-semibold" style={{ color: '#F87171' }}>Let's try this a different way.</p>
              {quizResult.alternativeExplanation && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#8B9AB0' }}>
                  {quizResult.alternativeExplanation}
                </p>
              )}
              <Button
                onClick={goToQuiz}
                disabled={loading}
                className="min-h-[44px] text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Try the Quiz Again
              </Button>
            </>
          )}

          {quizResult.decision === 'subject_completed' && (
            <>
              <p className="text-sm font-semibold" style={{ color: '#34D399' }}>You've completed this subject!</p>
              <Button
                onClick={resetToInput}
                className="min-h-[44px] text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                Start a New Subject
              </Button>
            </>
          )}
        </motion.div>
      )}

      {/* --- Completed phase --- */}
      {phase === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex max-w-2xl flex-col items-center justify-center rounded-2xl p-12 text-center"
          style={cardStyle}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(52,211,153,0.12)' }}>
            <CheckCircle2 className="h-7 w-7" style={{ color: '#34D399' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>
            You've completed {teaching?.subject.name ?? 'this subject'}!
          </p>
          <Button
            onClick={resetToInput}
            className="mt-4 min-h-[44px] text-white"
            style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
          >
            Start a New Subject
          </Button>
        </motion.div>
      )}
    </AppShell>
  );
}
