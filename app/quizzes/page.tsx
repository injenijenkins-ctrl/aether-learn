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

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

export default function QuizzesPage() {
  const { generateQuiz, saveQuizResult, loading, error } = useLearn();
  const [topic, setTopic] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error('Enter a quiz topic'); return; }
    setSubmitted(false);
    setAnswers({});
    try {
      const result = await generateQuiz(topic.trim());
      setQuiz(result);
      toast.success('Quiz ready');
    } catch { toast.error(error || 'Failed to generate quiz'); }
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
    logActivity({ type: 'quiz', title: topic.slice(0, 60), meta: { score: pct } });
    saveQuizResult(topic.trim(), correct, quiz.questions.length);
  };

  const handleRetry = () => { setSubmitted(false); setAnswers({}); setScore(0); };

  const scoreColor = score >= 80 ? '#34D399' : score >= 60 ? '#FBBF24' : '#F87171';

  return (
    <AppShell
      title="Quizzes"
      description="Five multiple-choice questions generated from your RAG context."
    >
      {/* Generator */}
      <div className="mb-8 max-w-xl space-y-4 rounded-2xl p-6" style={cardStyle}>
        <div>
          <Label htmlFor="topic" style={{ color: '#8B9AB0' }}>Quiz topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Core concepts from my article"
            className="mt-2 min-h-[44px]"
            style={{ background: 'rgba(20,27,36,0.8)', border: '1px solid rgba(255,255,255,0.06)', color: '#F0F4F8' }}
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="min-h-[44px] text-white"
          style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate Quiz
        </Button>
      </div>

      {quiz?.questions && (
        <div className="space-y-5">
          {/* Score banner */}
          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-6 text-center"
              style={{
                background: `rgba(${score >= 80 ? '52,211,153' : score >= 60 ? '251,191,36' : '248,113,113'},0.08)`,
                border: `1px solid rgba(${score >= 80 ? '52,211,153' : score >= 60 ? '251,191,36' : '248,113,113'},0.2)`,
              }}
            >
              <p className="text-3xl font-bold" style={{ color: scoreColor }}>{score}%</p>
              <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
                {score >= 80 ? 'Excellent work!' : score >= 60 ? 'Good effort!' : 'Keep practicing!'}
              </p>
              <Button
                className="mt-4 min-h-[44px]"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#F0F4F8' }}
                onClick={handleRetry}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </motion.div>
          )}

          {/* Questions */}
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
                  const selected = answers[q.id] === letter;
                  const isCorrect = q.correctAnswer === letter;
                  let optStyle: React.CSSProperties = {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#8B9AB0',
                  };
                  if (selected && !submitted) {
                    optStyle = { background: 'rgba(124,106,245,0.15)', border: '1px solid rgba(124,106,245,0.4)', color: '#F0F4F8' };
                  } else if (submitted && isCorrect) {
                    optStyle = { background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399' };
                  } else if (submitted && selected && !isCorrect) {
                    optStyle = { background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)', color: '#F87171' };
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: letter }))}
                      className={cn(
                        'min-h-[44px] w-full rounded-xl px-4 py-3 text-left text-sm transition-all',
                        !submitted && !selected && 'hover:bg-white/[0.05] hover:border-white/[0.12]'
                      )}
                      style={optStyle}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="mt-3 text-xs" style={{ color: '#4A5568' }}>
                  Correct answer: <span style={{ color: '#34D399' }}>{q.correctAnswer}</span>
                </p>
              )}
            </motion.div>
          ))}

          {!submitted && quiz.questions.length > 0 && (
            <Button
              className="w-full min-h-[44px] text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < quiz.questions.length}
            >
              Submit Quiz
            </Button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!quiz && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl p-12 text-center"
          style={cardStyle}
        >
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(124,106,245,0.12)' }}
          >
            <HelpCircle className="h-7 w-7" style={{ color: '#7C6AF5' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>No quizzes yet</p>
          <p className="mt-1 text-xs max-w-xs" style={{ color: '#4A5568' }}>
            Test your knowledge by generating a quiz above.
          </p>
        </motion.div>
      )}
    </AppShell>
  );
}
