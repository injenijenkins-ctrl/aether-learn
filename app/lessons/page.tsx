'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { useLearn, type Lesson, type LessonDepth } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';

type UserLevel = 'beginner' | 'intermediate' | 'advanced';

export default function LessonsPage() {
  const { generateLesson, loading, error } = useLearn();
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<LessonDepth>('beginner');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel>('beginner');

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
    if (!query.trim()) {
      toast.error('Enter a topic or question');
      return;
    }
    try {
      const result = await generateLesson(query.trim(), lessonDepth, userLevel);
      setLesson(result);
      setDepth(lessonDepth);
      logActivity({ type: 'lesson', title: result.title });
      toast.success('Lesson generated');
    } catch {
      toast.error(error || 'Failed to generate lesson');
    }
  };

  return (
    <AppShell
      title="Lessons"
      description="Generate structured lessons from your ingested content at the depth you choose."
    >
      <div className="mb-8 max-w-2xl space-y-4 rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
        <div>
          <Label htmlFor="query">Topic or question</Label>
          <Input
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Explain the main concepts from my notes"
            className="mt-2 min-h-[44px] border-white/10 bg-background/50"
          />
        </div>
        <div>
          <Label>Depth</Label>
          <Select value={depth} onValueChange={(v) => setDepth(v as LessonDepth)}>
            <SelectTrigger className="mt-2 min-h-[44px] border-white/10 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="deeper">Deeper</SelectItem>
              <SelectItem value="real_world">Real World</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Auto level from quiz performance: {userLevel}
          </p>
        </div>
        <Button
          onClick={() => runGenerate(depth)}
          disabled={loading}
          className="min-h-[44px] bg-gradient-to-r from-indigo-600 to-purple-600"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Lesson
        </Button>
      </div>

      {lesson && (
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl md:p-8"
        >
          <div>
            <span className="text-xs uppercase tracking-wide text-indigo-400">
              {lesson.depth}
            </span>
            <h2 className="mt-1 text-2xl font-bold">{lesson.title}</h2>
          </div>
          <section>
            <h3 className="mb-2 font-semibold text-indigo-300">Explanation</h3>
            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {lesson.explanation}
            </p>
          </section>
          <section>
            <h3 className="mb-2 font-semibold text-indigo-300">Key Points</h3>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {lesson.keyPoints?.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="mb-2 font-semibold text-red-300/90">Common Mistakes</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {lesson.commonMistakes?.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </section>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={loading || !query.trim()}
              onClick={() => runGenerate('simpler')}
            >
              Explain simpler
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={loading || !query.trim()}
              onClick={() => runGenerate('deeper')}
            >
              Go deeper
            </Button>
          </div>
        </motion.article>
      )}
    </AppShell>
  );
}
