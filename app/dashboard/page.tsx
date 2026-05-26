'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BookOpen,
  Flame,
  HelpCircle,
  Upload,
  Wand2,
  Zap,
} from 'lucide-react';
import { getActivity, getStats, refreshActivity } from '@/lib/activity-store';
import { useIngest, type IngestedResource } from '@/hooks/use-lumina';

const chartData = [
  { day: 'Mon', lessons: 2 },
  { day: 'Tue', lessons: 4 },
  { day: 'Wed', lessons: 3 },
  { day: 'Thu', lessons: 6 },
  { day: 'Fri', lessons: 5 },
  { day: 'Sat', lessons: 8 },
  { day: 'Sun', lessons: 4 },
];

export default function DashboardPage() {
  const { listResources } = useIngest();
  const [resources, setResources] = useState<IngestedResource[]>([]);
  const [stats, setStats] = useState(getStats());
  const activity = getActivity().slice(0, 6);

  useEffect(() => {
    listResources()
      .then(setResources)
      .catch(() => setResources([]));
    refreshActivity().then(() => setStats(getStats()));
  }, [listResources]);

  const statCards = [
    {
      label: 'Resources Ingested',
      value: resources.length || stats.resourcesIngested,
      icon: Upload,
      color: 'text-indigo-400',
    },
    {
      label: 'Lessons Generated',
      value: stats.lessonsGenerated,
      icon: BookOpen,
      color: 'text-purple-400',
    },
    {
      label: 'Last Quiz Score',
      value: stats.quizScore ? `${stats.quizScore}%` : '—',
      icon: HelpCircle,
      color: 'text-green-400',
    },
    {
      label: 'Day Streak',
      value: stats.streak,
      icon: Flame,
      color: 'text-orange-400',
    },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Your learning command center — ingest content, learn, and track progress."
    >
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl"
          >
            <card.icon className={`mb-3 h-6 w-6 ${card.color}`} />
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href="/ingestion" className="md:col-span-1">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group h-full rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl"
          >
            <Zap className="mb-4 h-8 w-8 text-indigo-400" />
            <h3 className="font-semibold">Ingest Content</h3>
            <p className="mt-1 text-sm text-muted-foreground">URL or paste text</p>
            <ArrowRight className="mt-4 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.div>
        </Link>
        <Link href="/tutor">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group h-full rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl"
          >
            <Wand2 className="mb-4 h-8 w-8 text-purple-400" />
            <h3 className="font-semibold">AI Tutor</h3>
            <p className="mt-1 text-sm text-muted-foreground">Chat with RAG context</p>
          </motion.div>
        </Link>
        <Link href="/lessons">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="group h-full rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl"
          >
            <BookOpen className="mb-4 h-8 w-8 text-blue-400" />
            <h3 className="font-semibold">Generate Lesson</h3>
            <p className="mt-1 text-sm text-muted-foreground">Structured explanations</p>
          </motion.div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">Weekly Learning Activity</h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#1a1f3a',
                    border: '1px solid #2d3748',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="lessons"
                  stroke="#6366f1"
                  fill="url(#colorLessons)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity yet. Ingest content or generate a lesson to get started.
            </p>
          ) : (
            <ul className="space-y-3">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2 text-sm"
                >
                  <span>{item.title}</span>
                  <span className="text-xs capitalize text-muted-foreground">
                    {item.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {resources.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Ingested Resources</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {resources.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-background/40 p-4"
              >
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.type} · {r.chunkCount} chunks
                </p>
              </div>
            ))}
          </div>
          <Link href="/ingestion" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              View all
            </Button>
          </Link>
        </div>
      )}
    </AppShell>
  );
}
