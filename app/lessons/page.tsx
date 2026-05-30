'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceCitations } from '@/components/source-citations';
import { AudioLearningControls } from '@/components/audio-learning-controls';
import { OfflineSaveButton } from '@/components/offline-save-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, Book } from 'lucide-react';
import { useLearn, type Lesson, type LessonDepth } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';

type UserLevel = 'beginner' | 'intermediate' | 'advanced';

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const creditLimitMessage =
  "You've used all your free requests for today. Your credits reset in a few hours. Add your API key in Settings for unlimited access.";

function isCreditLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    message.includes('429') ||
    normalized.includes('free requests') ||
    normalized.includes('credits') ||
    normalized.includes('api key')
  );
}

export default function LessonsPage() {
  const { generateLesson, loading } = useLearn();
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<LessonDepth>('beginner');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel>('beginner');
  const [generationError, setGenerationError] = useState<{ message: string; creditLimit: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/progress')
      .then((r) => r.json())
      .then((d) => {
        const avg = d.weeklySummary?.averageScore;
        if (avg == null) return;
        if (avg >= 80) setUserLevel('advanced');
        else if (avg >= 60) setUserLevel('intermediate');
        else setUserLevel('beginner');
      })
      .catch(() => {});
  }, []);

  const runGenerate = async (lessonDepth: LessonDepth) => {
    if (!query.trim()) { toast.error('Enter a topic or question'); return; }
    setGenerationError(null);
    try {
      const result = await generateLesson(query.trim(), lessonDepth, userLevel);
      setLesson(result);
      setDepth(lessonDepth);
      logActivity({ type: 'lesson', title: result.title });
      toast.success('Lesson generated');
    } catch (error) {
      const creditLimit = isCreditLimitError(error);
      const message = creditLimit
        ? creditLimitMessage
        : "Couldn't generate your lesson. Please try again.";
      setGenerationError({ message, creditLimit });
      toast.error(message);
    }
  };

  return (
    <AppShell
      title="Lessons"
      description="Generate structured lessons from your ingested content at the depth you choose."
    >
      {/* Generator form */}
      <div className="mb-8 max-w-2xl space-y-5 rounded-2xl p-6" style={cardStyle}>
        <div>
          <Label htmlFor="query" style={{ color: '#8B9AB0' }}>Topic or question</Label>
          <Input
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Explain the main concepts from my notes"
            className="mt-2 min-h-[44px]"
            style={{
              background: 'rgba(20,27,36,0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#F0F4F8',
            }}
          />
        </div>
        <div>
          <Label style={{ color: '#8B9AB0' }}>Depth</Label>
          <Select value={depth} onValueChange={(v) => setDepth(v as LessonDepth)}>
            <SelectTrigger
              className="mt-2 min-h-[44px]"
              style={{
                background: 'rgba(20,27,36,0.8)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#F0F4F8',
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#141B24', border: '1px solid rgba(255,255,255,0.08)' }}>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="deeper">Deeper</SelectItem>
              <SelectItem value="real_world">Real World</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs" style={{ color: '#4A5568' }}>
            Auto level from quiz performance: <span style={{ color: '#7C6AF5' }}>{userLevel}</span>
          </p>
        </div>
        <Button
          onClick={() => runGenerate(depth)}
          disabled={loading}
          className="min-h-[44px] text-white"
          style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate Lesson
        </Button>
      </div>

      {generationError && (
        <div
          className="mb-8 rounded-2xl p-5"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)' }}
        >
          <p className="text-sm" style={{ color: '#F0F4F8' }}>{generationError.message}</p>
          {generationError.creditLimit && (
            <Link href="/settings" className="mt-4 inline-block">
              <Button
                className="min-h-[40px] text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                Add API Key
              </Button>
            </Link>
          )}
        </div>
      )}

      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5 rounded-2xl p-6 md:p-8"
          style={cardStyle}
        >
          <div className="flex animate-pulse items-center gap-2 text-sm font-medium" style={{ color: '#7C6AF5' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating your lesson...
          </div>
          <Skeleton className="h-5 w-2/3 bg-white/[0.08]" />
          <Skeleton className="h-4 w-full bg-white/[0.08]" />
          <Skeleton className="h-4 w-5/6 bg-white/[0.08]" />
        </motion.div>
      )}

      {/* Lesson output */}
      {!loading && lesson && (
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 rounded-2xl p-6 md:p-8"
          style={cardStyle}
        >
          <div>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
              style={{ background: 'rgba(124,106,245,0.12)', color: '#7C6AF5' }}
            >
              {lesson.depth}
            </span>
            <h2 className="mt-3 text-xl font-bold" style={{ color: '#F0F4F8' }}>{lesson.title}</h2>
          </div>

          <AudioLearningControls
            title={lesson.title}
            text={`${lesson.title}. ${lesson.explanation}. Key points: ${lesson.keyPoints?.join('. ') || ''}. Common mistakes: ${lesson.commonMistakes?.join('. ') || ''}`}
          />

          <section>
            <h3 className="mb-2 text-sm font-semibold" style={{ color: '#7C6AF5' }}>Explanation</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#8B9AB0' }}>
              {lesson.explanation}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold" style={{ color: '#5B8DF5' }}>Key Points</h3>
            <ul className="space-y-1.5">
              {lesson.keyPoints?.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#F0F4F8' }}>
                  <span style={{ color: '#7C6AF5', marginTop: 2 }}>•</span>
                  {p}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold" style={{ color: '#F87171' }}>Common Mistakes</h3>
            <ul className="space-y-1.5">
              {lesson.commonMistakes?.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#8B9AB0' }}>
                  <span style={{ color: '#F87171', marginTop: 2 }}>•</span>
                  {m}
                </li>
              ))}
            </ul>
          </section>

          <SourceCitations sources={lesson.sources} title="Lesson sources" />

          <div className="flex flex-col gap-2 sm:flex-row pt-2">
            <OfflineSaveButton
              id={`lesson:${lesson.title}`}
              type="lesson"
              title={lesson.title}
              content={`${lesson.explanation}\n\nKey Points\n${lesson.keyPoints?.join('\n') || ''}\n\nCommon Mistakes\n${lesson.commonMistakes?.join('\n') || ''}`}
            />
            <Button
              variant="outline"
              className="min-h-[44px]"
              style={{
                background: 'rgba(20,27,36,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F0F4F8',
              }}
              disabled={loading || !query.trim()}
              onClick={() => runGenerate('simpler')}
            >
              Explain simpler
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px]"
              style={{
                background: 'rgba(20,27,36,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F0F4F8',
              }}
              disabled={loading || !query.trim()}
              onClick={() => runGenerate('deeper')}
            >
              Go deeper
            </Button>
          </div>
        </motion.article>
      )}

      {/* Empty state */}
      {!loading && !lesson && (
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
            <Book className="h-7 w-7" style={{ color: '#7C6AF5' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>No lessons yet</p>
          <p className="mt-1 text-xs max-w-xs" style={{ color: '#4A5568' }}>
            Generate your first lesson above to get started.
          </p>
        </motion.div>
      )}
    </AppShell>
  );
}
