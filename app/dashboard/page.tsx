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

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

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
      color: '#7C6AF5',
      bg: 'rgba(124,106,245,0.12)',
    },
    {
      label: 'Lessons Generated',
      value: stats.lessonsGenerated,
      icon: BookOpen,
      color: '#5B8DF5',
      bg: 'rgba(91,141,245,0.12)',
    },
    {
      label: 'Last Quiz Score',
      value: stats.quizScore ? `${stats.quizScore}%` : '—',
      icon: HelpCircle,
      color: '#34D399',
      bg: 'rgba(52,211,153,0.12)',
    },
    {
      label: 'Day Streak',
      value: stats.streak,
      icon: Flame,
      color: '#FBBF24',
      bg: 'rgba(251,191,36,0.12)',
    },
  ];

  const quickActions = [
    {
      href: '/ingestion',
      icon: Zap,
      title: 'Ingest Content',
      desc: 'URL, PDF, text, or audio',
      color: '#7C6AF5',
      bg: 'rgba(124,106,245,0.12)',
    },
    {
      href: '/tutor',
      icon: Wand2,
      title: 'AI Tutor',
      desc: 'Chat with RAG context',
      color: '#5B8DF5',
      bg: 'rgba(91,141,245,0.12)',
    },
    {
      href: '/lessons',
      icon: BookOpen,
      title: 'Generate Lesson',
      desc: 'Structured explanations',
      color: '#34D399',
      bg: 'rgba(52,211,153,0.12)',
    },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Your learning command center — ingest content, learn, and track progress."
    >
      {/* Welcome banner for new users */}
      {resources.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(124,106,245,0.12) 0%, rgba(91,141,245,0.08) 100%)',
            border: '1px solid rgba(124,106,245,0.2)',
          }}
        >
          <div className="space-y-1">
            <h2 className="text-base font-bold" style={{ color: '#F0F4F8' }}>
              Welcome to AetherLearn! 👋
            </h2>
            <p className="text-sm" style={{ color: '#8B9AB0' }}>
              Start by adding some content — paste a URL, upload a file, or type your notes.
            </p>
          </div>
          <Link href="/ingestion">
            <motion.span
              className="inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
              whileHover={{ opacity: 0.9 }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.span>
          </Link>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-2xl p-5"
            style={cardStyle}
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: card.bg }}
            >
              <card.icon className="h-5 w-5" style={{ color: card.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: '#F0F4F8' }}>{card.value}</p>
            <p className="mt-0.5 text-xs" style={{ color: '#8B9AB0' }}>{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {quickActions.map((action, i) => (
          <Link key={action.href} href={action.href}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 + i * 0.07 }}
              className="group h-full rounded-2xl p-5 cursor-pointer"
              style={cardStyle}
              whileHover={{
                borderColor: 'rgba(124,106,245,0.25)',
                background: 'rgba(20,27,36,0.9)',
              }}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: action.bg }}
              >
                <action.icon className="h-5 w-5" style={{ color: action.color }} />
              </div>
              <h3 className="font-semibold text-sm" style={{ color: '#F0F4F8' }}>{action.title}</h3>
              <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>{action.desc}</p>
              <ArrowRight
                className="mt-3 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: '#7C6AF5' }}
              />
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <h2 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>
            Weekly Learning Activity
          </h2>
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C6AF5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C6AF5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" stroke="#4A5568" fontSize={11} tickLine={false} />
                <YAxis stroke="#4A5568" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#141B24',
                    border: '1px solid rgba(124,106,245,0.2)',
                    borderRadius: '10px',
                    color: '#F0F4F8',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="lessons"
                  stroke="#7C6AF5"
                  strokeWidth={2}
                  fill="url(#colorLessons)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <h2 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>
            Recent Activity
          </h2>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm" style={{ color: '#4A5568' }}>
                No activity yet. Ingest content or generate a lesson to get started.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <span style={{ color: '#F0F4F8' }}>{item.title}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs capitalize"
                    style={{
                      background: 'rgba(124,106,245,0.12)',
                      color: '#7C6AF5',
                    }}
                  >
                    {item.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Ingested Resources */}
      {resources.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>
            Ingested Resources
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {resources.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(13,17,23,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>{r.title}</p>
                <p className="mt-0.5 text-xs" style={{ color: '#4A5568' }}>
                  {r.type} · {r.chunkCount} chunks
                </p>
              </div>
            ))}
          </div>
          <Link href="/ingestion" className="mt-4 inline-block">
            <motion.span
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-medium"
              style={{
                background: 'rgba(124,106,245,0.1)',
                border: '1px solid rgba(124,106,245,0.2)',
                color: '#7C6AF5',
              }}
              whileHover={{ background: 'rgba(124,106,245,0.18)' }}
            >
              View all resources
              <ArrowRight className="h-3 w-3" />
            </motion.span>
          </Link>
        </div>
      )}
    </AppShell>
  );
}
