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
import { OnboardingModal } from '@/components/onboarding-modal';
import { StudyCompanionPanel } from '@/components/study-companion-widget';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  GraduationCap,
  HelpCircle,
  Target,
  Upload,
  Wand2,
  Zap,
} from 'lucide-react';
import { getActivity, getStats, refreshActivity } from '@/lib/activity-store';
import { useIngest, type IngestedResource } from '@/hooks/use-lumina';

type ProgressSnapshot = {
  studyNext?: { topic: string; avgScore: number } | null;
  weeklySummary?: {
    lessonsGenerated: number;
    quizzesTaken: number;
    averageScore: number | null;
    flashcardsReviewed: number;
  };
};

type FocusAction = {
  href: string;
  icon: typeof Upload;
  label: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
};

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

const studySprints = [
  {
    id: 'daily',
    label: 'Daily Sprint',
    title: 'Understand, test, and retain',
    duration: '25 min',
    steps: [
      { title: 'Ask for a simple explanation', href: '/tutor', icon: Wand2 },
      { title: 'Generate one focused lesson', href: '/lessons', icon: BookOpen },
      { title: 'Review due flashcards', href: '/flashcards', icon: Flame },
    ],
  },
  {
    id: 'exam',
    label: 'Exam Drill',
    title: 'Practice under pressure',
    duration: '45 min',
    steps: [
      { title: 'Find weak spots', href: '/progress', icon: Target },
      { title: 'Take a practice exam', href: '/exams', icon: HelpCircle },
      { title: 'Ask the tutor to fix mistakes', href: '/tutor', icon: Wand2 },
    ],
  },
  {
    id: 'capture',
    label: 'Capture Loop',
    title: 'Turn raw material into memory',
    duration: '15 min',
    steps: [
      { title: 'Add a source or notes', href: '/ingestion', icon: Upload },
      { title: 'Create a summary note', href: '/notes', icon: BookMarked },
      { title: 'Generate flashcards', href: '/flashcards', icon: Flame },
    ],
  },
] as const;

export default function DashboardPage() {
  const { listResources } = useIngest();
  const [resources, setResources] = useState<IngestedResource[]>([]);
  const [stats, setStats] = useState(getStats());
  const [dueCount, setDueCount] = useState(0);
  const [progress, setProgress] = useState<ProgressSnapshot | null>(null);
  const [courseBookCount, setCourseBookCount] = useState(0);
  const [activeSprintId, setActiveSprintId] = useState<(typeof studySprints)[number]['id']>('daily');
  const activity = getActivity().slice(0, 6);
  const activeSprint = studySprints.find((sprint) => sprint.id === activeSprintId) ?? studySprints[0];

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      const [resourceResult, progressResult, reviewResult, courseBookResult] =
        await Promise.allSettled([
          listResources(),
          fetch('/api/progress').then((res) => res.json()),
          fetch('/api/flashcards/review').then((res) => res.json()),
          fetch('/api/course-books').then((res) => res.json()),
        ]);

      if (!alive) return;

      if (resourceResult.status === 'fulfilled') setResources(resourceResult.value);
      else setResources([]);

      if (progressResult.status === 'fulfilled') setProgress(progressResult.value);
      else setProgress(null);

      if (reviewResult.status === 'fulfilled') setDueCount(reviewResult.value.due?.length || 0);
      else setDueCount(0);

      if (courseBookResult.status === 'fulfilled') {
        setCourseBookCount(courseBookResult.value.courseBooks?.length || 0);
      } else {
        setCourseBookCount(0);
      }

      await refreshActivity();
      if (alive) setStats(getStats());
    }

    loadDashboard();
    return () => { alive = false; };
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
      href: '/journey',
      icon: GraduationCap,
      title: 'Learning Journey',
      desc: 'Guided teach → flashcards → quiz',
      color: '#A99BFF',
      bg: 'rgba(124,106,245,0.12)',
    },
    {
      href: '/course-books',
      icon: BookMarked,
      title: 'Course Books',
      desc: 'Organize subjects',
      color: '#A99BFF',
      bg: 'rgba(124,106,245,0.12)',
    },
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

  const focusActions: FocusAction[] = [];

  if (resources.length === 0) {
    focusActions.push({
      href: '/ingestion',
      icon: Upload,
      label: 'Start here',
      title: 'Add your first source',
      desc: 'Upload a file, paste notes, or ingest a URL.',
      color: '#7C6AF5',
      bg: 'rgba(124,106,245,0.12)',
    });
  }

  if (resources.length > 0 && courseBookCount === 0) {
    focusActions.push({
      href: '/course-books',
      icon: BookMarked,
      label: 'Organize',
      title: 'Create a course book',
      desc: 'Group sources into a subject workspace.',
      color: '#A99BFF',
      bg: 'rgba(124,106,245,0.12)',
    });
  }

  if (dueCount > 0) {
    focusActions.push({
      href: '/flashcards',
      icon: Flame,
      label: 'Due now',
      title: `${dueCount} flashcard${dueCount === 1 ? '' : 's'} due`,
      desc: 'Review these before learning new material.',
      color: '#FBBF24',
      bg: 'rgba(251,191,36,0.12)',
    });
  }

  if (progress?.studyNext) {
    focusActions.push({
      href: `/quizzes?topic=${encodeURIComponent(progress.studyNext.topic)}`,
      icon: HelpCircle,
      label: 'Weak spot',
      title: progress.studyNext.topic,
      desc: `Average score ${progress.studyNext.avgScore}%. Practice this next.`,
      color: '#F87171',
      bg: 'rgba(248,113,113,0.12)',
    });
  }

  if (resources.length > 0) {
    focusActions.push({
      href: '/lessons',
      icon: BookOpen,
      label: 'Keep learning',
      title: 'Generate the next lesson',
      desc: 'Turn your sources into a guided explanation.',
      color: '#34D399',
      bg: 'rgba(52,211,153,0.12)',
    });
  }

  const visibleFocusActions = focusActions.slice(0, 3);

  return (
    <AppShell
      title="Dashboard"
      description="Your learning command center — ingest content, learn, and track progress."
    >
      <OnboardingModal />

      <StudyCompanionPanel />

      {/* Welcome banner for new users */}
      {resources.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex min-w-0 flex-col gap-4 rounded-2xl p-4 sm:p-6 md:flex-row md:items-center md:justify-between"
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
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shrink-0"
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

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(124,106,245,0.14) 0%, rgba(20,27,36,0.9) 52%, rgba(52,211,153,0.08) 100%)',
          border: '1px solid rgba(124,106,245,0.18)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <Clock3 className="h-4 w-4" style={{ color: '#A99BFF' }} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#A99BFF' }}>
                Guided study
              </span>
            </div>
            <h2 className="text-lg font-bold sm:text-xl" style={{ color: '#F0F4F8' }}>
              Start a study sprint
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: '#8B9AB0' }}>
              Pick a focused loop and move through the right tools in order. It keeps momentum high when you only have a few minutes.
            </p>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
              {studySprints.map((sprint) => {
                const active = sprint.id === activeSprintId;
                return (
                  <button
                    key={sprint.id}
                    type="button"
                    onClick={() => setActiveSprintId(sprint.id)}
                    className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold"
                    style={
                      active
                        ? { background: 'rgba(240,244,248,0.12)', borderColor: 'rgba(255,255,255,0.18)', color: '#F0F4F8' }
                        : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#8B9AB0' }
                    }
                  >
                    {sprint.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 rounded-2xl p-4" style={{ background: 'rgba(8,11,17,0.42)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>{activeSprint.title}</h3>
                <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>{activeSprint.duration} recommended flow</p>
              </div>
              <span
                className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.22)' }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                3 steps
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {activeSprint.steps.map((step, index) => (
                <Link key={step.href} href={step.href}>
                  <motion.div
                    className="group flex h-full min-h-[118px] flex-col rounded-xl p-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    whileHover={{ background: 'rgba(255,255,255,0.065)', borderColor: 'rgba(124,106,245,0.24)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: '#A99BFF' }}>0{index + 1}</span>
                      <step.icon className="h-4 w-4" style={{ color: '#7C6AF5' }} />
                    </div>
                    <p className="flex-1 text-sm font-medium leading-snug" style={{ color: '#F0F4F8' }}>{step.title}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#7C6AF5' }}>
                      Open
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {visibleFocusActions.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl p-4 sm:p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(13,17,23,0.92) 0%, rgba(20,27,36,0.86) 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>
                Today's Focus
              </h2>
              <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
                Your next best steps based on what is in the app right now.
              </p>
            </div>
            {progress?.weeklySummary && (
              <span
                className="w-fit rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ background: 'rgba(91,141,245,0.12)', color: '#7FA8FF', border: '1px solid rgba(91,141,245,0.22)' }}
              >
                {progress.weeklySummary.quizzesTaken} quizzes / {progress.weeklySummary.flashcardsReviewed} reviews this week
              </span>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {visibleFocusActions.map((action, index) => (
              <Link key={`${action.href}-${action.title}`} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="group flex h-full min-h-[132px] flex-col rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
                  whileHover={{ borderColor: 'rgba(124,106,245,0.26)', background: 'rgba(255,255,255,0.055)' }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: action.bg, color: action.color }}
                    >
                      {action.label}
                    </span>
                    <action.icon className="h-4 w-4" style={{ color: action.color }} />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>
                    {action.title}
                  </h3>
                  <p className="mt-1 flex-1 text-xs leading-relaxed" style={{ color: '#8B9AB0' }}>
                    {action.desc}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium" style={{ color: '#7C6AF5' }}>
                    Continue
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
              className="min-w-0 rounded-2xl p-4 sm:p-5"
            style={cardStyle}
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: card.bg }}
            >
              <card.icon className="h-5 w-5" style={{ color: card.color }} />
            </div>
            <p className="break-words text-xl font-bold sm:text-2xl" style={{ color: '#F0F4F8' }}>{card.value}</p>
            <p className="mt-0.5 text-xs" style={{ color: '#8B9AB0' }}>{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action, i) => (
          <Link key={action.href} href={action.href}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 + i * 0.07 }}
              className="group h-full min-h-[44px] cursor-pointer rounded-2xl p-5"
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
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart */}
        <div className="min-w-0 rounded-2xl p-4 sm:p-6" style={cardStyle}>
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
        <div className="min-w-0 rounded-2xl p-4 sm:p-6" style={cardStyle}>
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
                  className="flex min-h-[44px] min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <span className="min-w-0 break-words" style={{ color: '#F0F4F8' }}>{item.title}</span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs capitalize"
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
                className="min-w-0 rounded-xl p-4"
                style={{
                  background: 'rgba(13,17,23,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p className="break-words text-sm font-medium" style={{ color: '#F0F4F8' }}>{r.title}</p>
                <p className="mt-0.5 text-xs" style={{ color: '#4A5568' }}>
                  {r.type} · {r.chunkCount} chunks
                </p>
              </div>
            ))}
          </div>
          <Link href="/ingestion" className="mt-4 inline-block">
            <motion.span
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-4 text-xs font-medium"
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
