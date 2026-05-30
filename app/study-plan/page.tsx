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
import { SourceCitations, type SourceCitation } from '@/components/source-citations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock3, Loader2, Sparkles, Target } from 'lucide-react';
import { providerHeaders, providerPayload } from '@/lib/ai-settings';

interface PlanDay {
  day: string;
  topics: string[];
  resources: string[];
  estimatedMinutes: number;
  tasks: string[];
}

interface StudyPlan {
  id: string;
  dailyMinutes: number;
  targetTopics: string;
  studyGoal: string;
  days: PlanDay[];
  sources?: SourceCitation[];
  createdAt: string;
}

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const inputStyle = {
  background: 'rgba(20,27,36,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#F0F4F8',
};

const creditLimitMessage =
  "You've used all your free requests for today. Your credits reset in a few hours. Add your API key in Settings for unlimited access.";

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [dailyMinutes, setDailyMinutes] = useState('30');
  const [targetTopics, setTargetTopics] = useState('');
  const [studyGoal, setStudyGoal] = useState('exam prep');
  const [generationError, setGenerationError] = useState<{ message: string; creditLimit: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/study-plan')
      .then((r) => r.json())
      .then((d) => { if (d.plan) setPlan(d.plan); })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!targetTopics.trim()) { toast.error('Enter target topics'); return; }
    setGenerationError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify({
          ...providerPayload(),
          dailyMinutes: parseInt(dailyMinutes, 10) || 30,
          targetTopics: targetTopics.trim(),
          studyGoal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const creditLimit = res.status === 429;
        const message = creditLimit
          ? creditLimitMessage
          : "Couldn't generate your study plan. Please try again.";
        setGenerationError({ message, creditLimit });
        throw new Error(message);
      }
      setPlan({
        id: data.id,
        dailyMinutes: data.dailyMinutes,
        targetTopics: data.targetTopics,
        studyGoal: data.studyGoal,
        days: data.days,
        sources: data.sources || [],
        createdAt: data.createdAt,
      });
      toast.success('Study plan generated');
    } catch (error) {
      const message =
        error instanceof Error && error.message === creditLimitMessage
          ? creditLimitMessage
          : "Couldn't generate your study plan. Please try again.";
      setGenerationError({
        message,
        creditLimit: message === creditLimitMessage,
      });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Study Plan"
      description="AI-generated weekly schedule based on your ingested content and goals."
    >
      <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Generator form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6"
          style={cardStyle}
        >
          <div className="mb-7 flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(124,106,245,0.12)' }}
            >
              <Target className="h-6 w-6" style={{ color: '#7C6AF5' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>Generate New Plan</h2>
              <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
                Set a focused weekly path around the topics you want to master.
              </p>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <Label style={{ color: '#8B9AB0' }}>Daily study time (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(e.target.value)}
                className="mt-2 min-h-[44px]"
                style={inputStyle}
              />
            </div>
            <div>
              <Label style={{ color: '#8B9AB0' }}>Target topics</Label>
              <Input
                value={targetTopics}
                onChange={(e) => setTargetTopics(e.target.value)}
                placeholder="e.g. Calculus, Organic Chemistry"
                className="mt-2 min-h-[44px]"
                style={inputStyle}
              />
            </div>
            <div>
              <Label style={{ color: '#8B9AB0' }}>Study goal</Label>
              <Select value={studyGoal} onValueChange={setStudyGoal}>
                <SelectTrigger
                  className="mt-2 min-h-[44px]"
                  style={inputStyle}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: '#141B24', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <SelectItem value="exam prep">Exam prep</SelectItem>
                  <SelectItem value="deep learning">Deep learning</SelectItem>
                  <SelectItem value="quick revision">Quick revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="min-h-[44px] w-full text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Weekly Plan
            </Button>
          </div>
        </motion.div>

        {/* Plan display */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl p-6"
          style={cardStyle}
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>My Study Plan</h2>
              <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
                Your generated schedule, broken into daily sessions.
              </p>
            </div>
            {plan && (
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{ background: 'rgba(124,106,245,0.1)', border: '1px solid rgba(124,106,245,0.2)' }}
              >
                <Clock3 className="h-3.5 w-3.5" style={{ color: '#7C6AF5' }} />
                <span className="text-xs font-medium" style={{ color: '#F0F4F8' }}>{plan.dailyMinutes} min/day</span>
              </div>
            )}
          </div>
          {generationError && (
            <div
              className="mb-5 rounded-2xl p-4"
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
          {loading ? (
            <div className="space-y-4">
              <div className="flex animate-pulse items-center gap-2 text-sm font-medium" style={{ color: '#7C6AF5' }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Building your study plan...
              </div>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <Skeleton className="h-4 w-1/3 bg-white/[0.08]" />
                  <Skeleton className="h-3 w-2/3 bg-white/[0.08]" />
                  <Skeleton className="h-3 w-full bg-white/[0.08]" />
                </div>
              ))}
            </div>
          ) : !plan ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: 'rgba(124,106,245,0.12)' }}
              >
                <Calendar className="h-7 w-7" style={{ color: '#7C6AF5' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>No plan yet</p>
              <p className="mt-1 text-xs max-w-xs" style={{ color: '#4A5568' }}>
                Generate one from your ingested materials.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium capitalize"
                  style={{ background: 'rgba(124,106,245,0.12)', color: '#7C6AF5' }}
                >
                  {plan.studyGoal}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: 'rgba(91,141,245,0.12)', color: '#5B8DF5' }}
                >
                  {plan.dailyMinutes} min/day
                </span>
                <span className="text-xs self-center" style={{ color: '#4A5568' }}>
                  {new Date(plan.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs" style={{ color: '#8B9AB0' }}>{plan.targetTopics}</p>
              {(plan.days as PlanDay[]).map((day, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  whileHover={{ borderColor: 'rgba(124,106,245,0.22)', background: 'rgba(20,27,36,0.72)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>{day.day}</h3>
                    <span className="text-xs" style={{ color: '#4A5568' }}>~{day.estimatedMinutes} min</span>
                  </div>
                  <p className="mt-1.5 text-xs" style={{ color: '#7C6AF5' }}>{day.topics?.join(', ')}</p>
                  {day.resources?.length > 0 && (
                    <p className="mt-1 text-xs" style={{ color: '#4A5568' }}>
                      Resources: {day.resources.join(', ')}
                    </p>
                  )}
                  <ul className="mt-2 space-y-1">
                    {day.tasks?.map((t, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs" style={{ color: '#8B9AB0' }}>
                        <span style={{ color: '#5B8DF5', marginTop: 2 }}>•</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
              <SourceCitations sources={plan.sources} title="Study plan sources" />
            </div>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
