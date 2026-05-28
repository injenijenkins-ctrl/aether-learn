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

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const tooltipStyle = {
  background: '#141B24',
  border: '1px solid rgba(124,106,245,0.2)',
  borderRadius: '10px',
  color: '#F0F4F8',
  fontSize: 12,
};

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
    activity.filter((a) => a.type === 'lesson').forEach((a) => {
      const day = a.timestamp.slice(0, 10);
      days[day] = (days[day] || 0) + 1;
    });
    return Object.entries(days).slice(0, 7).reverse().map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
      lessons: count,
    }));
  }, [activity]);

  const quizScores = useMemo(() => {
    return activity
      .filter((a) => a.type === 'quiz' && a.meta?.score != null)
      .slice(0, 6).reverse()
      .map((a, i) => ({ attempt: `#${i + 1}`, score: a.meta?.score as number }));
  }, [activity]);

  const topicsStudied = useMemo(() => {
    const counts: Record<string, number> = {};
    activity.forEach((a) => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return Object.entries(counts).map(([topic, count]) => ({ topic, count }));
  }, [activity]);

  const defaultLessons = [
    { date: 'Mon', lessons: 1 }, { date: 'Tue', lessons: 2 },
    { date: 'Wed', lessons: 0 }, { date: 'Thu', lessons: 3 }, { date: 'Fri', lessons: 1 },
  ];
  const defaultQuizzes = [{ attempt: '#1', score: 60 }, { attempt: '#2', score: 80 }];
  const defaultTopics = [{ topic: 'ingest', count: 2 }, { topic: 'lesson', count: 3 }, { topic: 'chat', count: 5 }];

  const streak = intel?.streak ?? stats.streak;

  const summaryStats = [
    { label: 'Lessons', value: intel?.weeklySummary.lessonsGenerated ?? stats.lessonsGenerated, color: '#7C6AF5' },
    {
      label: 'Best Quiz',
      value: intel?.weeklySummary.averageScore ? `${intel.weeklySummary.averageScore}%` : stats.quizScore ? `${stats.quizScore}%` : '—',
      color: '#34D399',
    },
    { label: 'Streak', value: `${streak} days`, color: '#FBBF24' },
  ];

  return (
    <AppShell title="Progress" description="Track lessons, quiz scores, and topics studied.">
      {/* Summary stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryStats.map((s) => (
          <div key={s.label} className="rounded-2xl p-5" style={cardStyle}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-0.5 text-xs" style={{ color: '#8B9AB0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl p-6" style={cardStyle}>
          <h2 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>Lessons Over Time</h2>
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lessonsOverTime.length ? lessonsOverTime : defaultLessons}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" stroke="#4A5568" fontSize={11} tickLine={false} />
                <YAxis stroke="#4A5568" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="lessons" stroke="#7C6AF5" strokeWidth={2} dot={{ fill: '#7C6AF5', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={cardStyle}>
          <h2 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>Quiz Scores</h2>
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quizScores.length ? quizScores : defaultQuizzes}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="attempt" stroke="#4A5568" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#4A5568" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" fill="#7C6AF5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl p-6 lg:col-span-2" style={cardStyle}>
          <h2 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>Topics Studied</h2>
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicsStudied.length ? topicsStudied : defaultTopics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="topic" stroke="#4A5568" fontSize={11} tickLine={false} />
                <YAxis stroke="#4A5568" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#5B8DF5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Intel panels */}
      {intel && (
        <div className="mt-8 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}
            >
              <h2 className="mb-3 text-sm font-semibold" style={{ color: '#F87171' }}>Weak topics</h2>
              {intel.weakTopics.length === 0 ? (
                <p className="text-xs" style={{ color: '#4A5568' }}>No weak topics yet.</p>
              ) : (
                <ul className="space-y-2">
                  {intel.weakTopics.map((t) => (
                    <li key={t.topic} className="flex items-center justify-between text-sm">
                      <span style={{ color: '#F0F4F8' }}>{t.topic}</span>
                      <span style={{ color: '#F87171' }}>{t.avgScore}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}
            >
              <h2 className="mb-3 text-sm font-semibold" style={{ color: '#34D399' }}>Strong topics</h2>
              {intel.strongTopics.length === 0 ? (
                <p className="text-xs" style={{ color: '#4A5568' }}>No strong topics yet.</p>
              ) : (
                <ul className="space-y-2">
                  {intel.strongTopics.map((t) => (
                    <li key={t.topic} className="flex items-center justify-between text-sm">
                      <span style={{ color: '#F0F4F8' }}>{t.topic}</span>
                      <span style={{ color: '#34D399' }}>{t.avgScore}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {intel.studyNext && (
            <div
              className="rounded-2xl p-5"
              style={{ background: 'rgba(124,106,245,0.08)', border: '1px solid rgba(124,106,245,0.2)' }}
            >
              <h2 className="text-sm font-semibold" style={{ color: '#7C6AF5' }}>Study next</h2>
              <p className="mt-2 text-sm" style={{ color: '#8B9AB0' }}>
                Focus on <strong style={{ color: '#F0F4F8' }}>{intel.studyNext.topic}</strong> (avg{' '}
                {intel.studyNext.avgScore}%) — you have related ingested content.
              </p>
            </div>
          )}

          <div className="rounded-2xl p-5" style={cardStyle}>
            <h2 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>Weekly summary</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Lessons', value: intel.weeklySummary.lessonsGenerated, color: '#7C6AF5' },
                { label: 'Quizzes', value: intel.weeklySummary.quizzesTaken, color: '#5B8DF5' },
                {
                  label: 'Avg score',
                  value: intel.weeklySummary.averageScore != null ? `${intel.weeklySummary.averageScore}%` : '—',
                  color: '#34D399',
                },
                { label: 'Cards reviewed', value: intel.weeklySummary.flashcardsReviewed, color: '#FBBF24' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="mt-0.5 text-xs" style={{ color: '#8B9AB0' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
