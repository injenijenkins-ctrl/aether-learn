'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import { getActivity, getStats, refreshActivity } from '@/lib/activity-store';

interface ProgressIntel {
  weakTopics: { topic: string; avgScore: number }[];
  strongTopics: { topic: string; avgScore: number }[];
  studyNext: { topic: string; avgScore: number } | null;
  streak: number;
  weeklySummary: {
    lessonsGenerated: number;
    quizzesTaken: number;
    averageScore: number | null;
    flashcardsReviewed: number;
  };
}

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [intel, setIntel] = useState<ProgressIntel | null>(null);

  useEffect(() => {
    setMounted(true);
    refreshActivity();
    fetch('/api/progress')
      .then((r) => r.json())
      .then(setIntel)
      .catch(() => setIntel(null));
  }, []);

  const activity = mounted ? getActivity() : [];
  const stats = mounted ? getStats() : { lessonsGenerated: 0, quizScore: 0, streak: 0 };

  const lessonsOverTime = useMemo(() => {
    const days: Record<string, number> = {};
    activity
      .filter((a) => a.type === 'lesson')
      .forEach((a) => {
        const day = a.timestamp.slice(0, 10);
        days[day] = (days[day] || 0) + 1;
      });
    return Object.entries(days)
      .slice(0, 7)
      .reverse()
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
        lessons: count,
      }));
  }, [activity]);

  const quizScores = useMemo(() => {
    return activity
      .filter((a) => a.type === 'quiz' && a.meta?.score != null)
      .slice(0, 6)
      .reverse()
      .map((a, i) => ({
        attempt: `#${i + 1}`,
        score: a.meta?.score as number,
      }));
  }, [activity]);

  const topicsStudied = useMemo(() => {
    const counts: Record<string, number> = {};
    activity.forEach((a) => {
      const key = a.type;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([topic, count]) => ({ topic, count }));
  }, [activity]);

  const defaultLessons = [
    { date: 'Mon', lessons: 1 },
    { date: 'Tue', lessons: 2 },
    { date: 'Wed', lessons: 0 },
    { date: 'Thu', lessons: 3 },
    { date: 'Fri', lessons: 1 },
  ];

  const defaultQuizzes = [
    { attempt: '#1', score: 60 },
    { attempt: '#2', score: 80 },
  ];

  const defaultTopics = [
    { topic: 'ingest', count: 2 },
    { topic: 'lesson', count: 3 },
    { topic: 'chat', count: 5 },
  ];

  const streak = intel?.streak ?? stats.streak;

  return (
    <AppShell
      title="Progress"
      description="Track lessons, quiz scores, and topics studied."
    >
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Lessons', value: intel?.weeklySummary.lessonsGenerated ?? stats.lessonsGenerated },
          {
            label: 'Best Quiz',
            value: intel?.weeklySummary.averageScore
              ? `${intel.weeklySummary.averageScore}%`
              : stats.quizScore
                ? `${stats.quizScore}%`
                : '—',
          },
          { label: 'Streak', value: `${streak} days` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl"
          >
            <p className="text-2xl font-bold text-indigo-400">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
          <h2 className="mb-4 font-semibold">Lessons Over Time</h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lessonsOverTime.length ? lessonsOverTime : defaultLessons}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#1a1f3a',
                    border: '1px solid #2d3748',
                  }}
                />
                <Line type="monotone" dataKey="lessons" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
          <h2 className="mb-4 font-semibold">Quiz Scores</h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quizScores.length ? quizScores : defaultQuizzes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="attempt" stroke="#94a3b8" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#1a1f3a',
                    border: '1px solid #2d3748',
                  }}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl lg:col-span-2">
          <h2 className="mb-4 font-semibold">Topics Studied</h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicsStudied.length ? topicsStudied : defaultTopics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="topic" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#1a1f3a',
                    border: '1px solid #2d3748',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {intel && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 backdrop-blur-xl">
              <h2 className="mb-3 font-semibold text-red-300">Weak topics</h2>
              {intel.weakTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No weak topics yet.</p>
              ) : (
                <ul className="space-y-2">
                  {intel.weakTopics.map((t) => (
                    <li
                      key={t.topic}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{t.topic}</span>
                      <span className="text-red-400">{t.avgScore}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 backdrop-blur-xl">
              <h2 className="mb-3 font-semibold text-green-300">Strong topics</h2>
              {intel.strongTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No strong topics yet.</p>
              ) : (
                <ul className="space-y-2">
                  {intel.strongTopics.map((t) => (
                    <li
                      key={t.topic}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{t.topic}</span>
                      <span className="text-green-400">{t.avgScore}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {intel.studyNext && (
            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6 backdrop-blur-xl">
              <h2 className="font-semibold text-indigo-300">Study next</h2>
              <p className="mt-2 text-sm">
                Focus on <strong>{intel.studyNext.topic}</strong> (avg{' '}
                {intel.studyNext.avgScore}%) — you have related ingested content.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
            <h2 className="mb-3 font-semibold">Weekly summary</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold text-indigo-400">
                  {intel.weeklySummary.lessonsGenerated}
                </p>
                <p className="text-xs text-muted-foreground">Lessons</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">
                  {intel.weeklySummary.quizzesTaken}
                </p>
                <p className="text-xs text-muted-foreground">Quizzes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {intel.weeklySummary.averageScore ?? '—'}
                  {intel.weeklySummary.averageScore != null && '%'}
                </p>
                <p className="text-xs text-muted-foreground">Avg score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">
                  {intel.weeklySummary.flashcardsReviewed}
                </p>
                <p className="text-xs text-muted-foreground">Cards reviewed</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
