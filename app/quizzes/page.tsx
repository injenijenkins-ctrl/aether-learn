'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RotateCcw, Sparkles, HelpCircle } from 'lucide-react';
import { useLearn, type Quiz, type QuizQuestion } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';
import { cn } from '@/lib/utils';

function getOptionLetter(option: string): string {
  const match = option.match(/^([A-D])\./);
  return match ? match[1] : option.charAt(0);
}

export default function QuizzesPage() {
  const { generateQuiz, saveQuizResult, loading, error } = useLearn();
  const [topic, setTopic] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Enter a quiz topic');
      return;
    }
    setSubmitted(false);
    setAnswers({});
    try {
      const result = await generateQuiz(topic.trim());
      setQuiz(result);
      toast.success('Quiz ready');
    } catch {
      toast.error(error || 'Failed to generate quiz');
    }
  };

  const handleSubmit = () => {
    if (!quiz?.questions) return;
    let correct = 0;
    quiz.questions.forEach((q: QuizQuestion) => {
      if (answers[q.id] === q.correctAnswer) correct++;
    });
    const pct = Math.round((correct / quiz.questions.length) * 100);
    setScore(pct);
    setSubmitted(true);
    logActivity({
      type: 'quiz',
      title: topic.slice(0, 60),
      meta: { score: pct },
    });
    saveQuizResult(topic.trim(), correct, quiz.questions.length);
  };

  const handleRetry = () => {
    setSubmitted(false);
    setAnswers({});
    setScore(0);
  };

  return (
    <AppShell
      title="Quizzes"
      description="Five multiple-choice questions generated from your RAG context."
    >
      <div className="mb-8 max-w-xl space-y-4 rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
        <div>
          <Label htmlFor="topic">Quiz topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Core concepts from my article"
            className="mt-2 border-white/10 bg-background/50"
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-gradient-to-r from-indigo-600 to-purple-600"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Quiz
        </Button>
      </div>

      {quiz?.questions && (
        <div className="space-y-6">
          {submitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-center"
            >
              <p className="text-2xl font-bold text-indigo-300">Score: {score}%</p>
              <Button variant="outline" className="mt-3" onClick={handleRetry}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </motion.div>
          )}

          {quiz.questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl"
            >
              <p className="mb-4 font-medium">
                {idx + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const letter = getOptionLetter(opt);
                  const selected = answers[q.id] === letter;
                  const isCorrect = q.correctAnswer === letter;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={submitted}
                      onClick={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: letter }))
                      }
                      className={cn(
                        'min-h-[44px] w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                        selected && !submitted && 'border-indigo-500 bg-indigo-500/20',
                        submitted && isCorrect && 'border-green-500 bg-green-500/20',
                        submitted &&
                          selected &&
                          !isCorrect &&
                          'border-red-500 bg-red-500/20',
                        !selected && !submitted && 'border-white/10 hover:bg-white/5'
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Correct answer: {q.correctAnswer}
                </p>
              )}
            </motion.div>
          ))}

          {!submitted && quiz.questions.length > 0 && (
            <Button
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600"
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < quiz.questions.length}
            >
              Submit Quiz
            </Button>
          )}
        </div>
      )}

      {!quiz && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.15] bg-white/[0.08] p-8 text-center backdrop-blur-xl"
        >
          <HelpCircle className="h-12 w-12 text-indigo-400/80 mb-3" />
          <p className="text-sm text-muted-foreground max-w-sm">
            No quizzes yet. Test your knowledge by generating a quiz above.
          </p>
        </motion.div>
      )}
    </AppShell>
  );
}
