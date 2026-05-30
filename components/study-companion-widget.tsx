'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, Clock3, Target, X } from 'lucide-react';

type CompanionResponse = {
  profile: {
    totalStudyActions: number;
    streak: number;
    preferredStudyTime: string | null;
    preferredStudyDay: string | null;
    dominantHabit: string | null;
  };
  memory: {
    weakAreas: { topic: string; avgScore: number; attempts: number }[];
    dueFlashcards: number;
    dueTopics: string[];
    recentQuizScore: number | null;
  };
  nudge: {
    title: string;
    message: string;
    href: string;
    cta: string;
    priority: string;
  };
};

async function loadCompanion() {
  const res = await fetch('/api/companion');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load companion');
  return data as CompanionResponse;
}

export function StudyCompanionWidget() {
  const [companion, setCompanion] = useState<CompanionResponse | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;

    loadCompanion()
      .then((data) => {
        if (!alive) return;
        const dismissKey = `aether-companion-dismissed:${data.nudge.priority}:${data.nudge.title}`;
        if (sessionStorage.getItem(dismissKey)) return;
        setCompanion(data);
        window.setTimeout(() => {
          if (alive) setVisible(true);
        }, 900);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  if (!visible || !companion) return null;

  const dismiss = () => {
    sessionStorage.setItem(
      `aether-companion-dismissed:${companion.nudge.priority}:${companion.nudge.title}`,
      'true'
    );
    setVisible(false);
  };

  return (
    <aside
      className="fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-md rounded-2xl p-4 shadow-2xl md:bottom-5 md:left-auto md:right-5"
      style={{
        background: 'linear-gradient(135deg, rgba(13,17,23,0.96), rgba(20,27,36,0.94))',
        border: '1px solid rgba(124,106,245,0.22)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      aria-label="AI study companion nudge"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(124,106,245,0.16)' }}
        >
          <Brain className="h-5 w-5" style={{ color: '#A99BFF' }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>
                {companion.nudge.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: '#8B9AB0' }}>
                {companion.nudge.message}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg hover:bg-white/[0.06]"
              aria-label="Dismiss companion nudge"
            >
              <X className="h-4 w-4" style={{ color: '#8B9AB0' }} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {companion.profile.preferredStudyTime && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#B7C9FF' }}
              >
                <Clock3 className="h-3 w-3" />
                Usually {companion.profile.preferredStudyTime}
              </span>
            )}
            {companion.memory.weakAreas[0] && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{ background: 'rgba(248,113,113,0.1)', color: '#FCA5A5' }}
              >
                <Target className="h-3 w-3" />
                {companion.memory.weakAreas[0].topic}
              </span>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href={companion.nudge.href}
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
              onClick={dismiss}
            >
              {companion.nudge.cta}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border px-4 text-xs font-semibold"
              style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#8B9AB0' }}
              onClick={dismiss}
            >
              View memory
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function StudyCompanionPanel() {
  const [companion, setCompanion] = useState<CompanionResponse | null>(null);

  useEffect(() => {
    loadCompanion().then(setCompanion).catch(() => {});
  }, []);

  if (!companion) return null;

  return (
    <section
      className="mb-8 rounded-2xl p-4 sm:p-6"
      style={{
        background: 'linear-gradient(135deg, rgba(13,17,23,0.92) 0%, rgba(20,27,36,0.86) 100%)',
        border: '1px solid rgba(124,106,245,0.16)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#A99BFF' }}>
            <Brain className="h-4 w-4" />
            AI study companion
          </div>
          <h2 className="text-lg font-bold" style={{ color: '#F0F4F8' }}>Learning memory</h2>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: '#8B9AB0' }}>
            Built from your quizzes, reviews, and study activity across sessions.
          </p>
        </div>
        <Link
          href={companion.nudge.href}
          className="inline-flex min-h-[44px] w-fit items-center justify-center rounded-xl px-4 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
        >
          {companion.nudge.cta}
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4A5568' }}>Pattern</p>
          <p className="mt-2 text-sm font-medium" style={{ color: '#F0F4F8' }}>
            {companion.profile.preferredStudyTime
              ? `You often study around ${companion.profile.preferredStudyTime}.`
              : 'Complete more sessions to reveal your study rhythm.'}
          </p>
          <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>
            {companion.profile.streak > 0 ? `${companion.profile.streak}-day active streak` : 'No active streak yet'}
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4A5568' }}>Weak areas</p>
          {companion.memory.weakAreas.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {companion.memory.weakAreas.slice(0, 3).map((area) => (
                <span
                  key={area.topic}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#FCA5A5' }}
                >
                  {area.topic} · {area.avgScore}%
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm" style={{ color: '#8B9AB0' }}>
              No weak areas detected yet. Take quizzes to train the companion.
            </p>
          )}
        </div>

        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4A5568' }}>Nudge</p>
          <p className="mt-2 text-sm font-medium" style={{ color: '#F0F4F8' }}>{companion.nudge.title}</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: '#8B9AB0' }}>{companion.nudge.message}</p>
        </div>
      </div>
    </section>
  );
}
