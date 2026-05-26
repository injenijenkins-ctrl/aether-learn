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
  createdAt: string;
}

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [dailyMinutes, setDailyMinutes] = useState('30');
  const [targetTopics, setTargetTopics] = useState('');
  const [studyGoal, setStudyGoal] = useState('exam prep');

  useEffect(() => {
    fetch('/api/study-plan')
      .then((r) => r.json())
      .then((d) => {
        if (d.plan) setPlan(d.plan);
      })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!targetTopics.trim()) {
      toast.error('Enter target topics');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...providerHeaders(),
        },
        body: JSON.stringify({
          ...providerPayload(),
          dailyMinutes: parseInt(dailyMinutes, 10) || 30,
          targetTopics: targetTopics.trim(),
          studyGoal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate plan');
      setPlan({
        id: data.id,
        dailyMinutes: data.dailyMinutes,
        targetTopics: data.targetTopics,
        studyGoal: data.studyGoal,
        days: data.days,
        createdAt: data.createdAt,
      });
      toast.success('Study plan generated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Study Plan"
      description="AI-generated weekly schedule based on your ingested content and goals."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">Generate New Plan</h2>
          <div className="space-y-4">
            <div>
              <Label>Daily study time (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(e.target.value)}
                className="mt-2 min-h-[44px] border-white/10 bg-background/50"
              />
            </div>
            <div>
              <Label>Target topics</Label>
              <Input
                value={targetTopics}
                onChange={(e) => setTargetTopics(e.target.value)}
                placeholder="e.g. Calculus, Organic Chemistry"
                className="mt-2 min-h-[44px] border-white/10 bg-background/50"
              />
            </div>
            <div>
              <Label>Study goal</Label>
              <Select value={studyGoal} onValueChange={setStudyGoal}>
                <SelectTrigger className="mt-2 min-h-[44px] border-white/10 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam prep">Exam prep</SelectItem>
                  <SelectItem value="deep learning">Deep learning</SelectItem>
                  <SelectItem value="quick revision">Quick revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="min-h-[44px] w-full bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Weekly Plan
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">My Study Plan</h2>
          {!plan ? (
            <p className="text-sm text-muted-foreground">
              No plan yet. Generate one from your ingested materials.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {plan.studyGoal} · {plan.dailyMinutes} min/day ·{' '}
                {new Date(plan.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-indigo-300">{plan.targetTopics}</p>
              {(plan.days as PlanDay[]).map((day, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-white/10 bg-background/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{day.day}</h3>
                    <span className="text-xs text-muted-foreground">
                      ~{day.estimatedMinutes} min
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-indigo-300">
                    {day.topics?.join(', ')}
                  </p>
                  {day.resources?.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Resources: {day.resources.join(', ')}
                    </p>
                  )}
                  <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                    {day.tasks?.map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
