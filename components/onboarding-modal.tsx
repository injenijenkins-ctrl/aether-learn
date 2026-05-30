'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, BrainCircuit, HelpCircle, Layers3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const steps = [
  {
    title: 'Welcome to AetherLearn',
    description:
      'Your personal AI learning OS. Turn any content into lessons, quizzes, flashcards, and a personal tutor.',
    button: 'Get Started',
  },
  {
    title: 'Add Your Content',
    description:
      'Paste a URL, upload a file, or type your notes. AetherLearn turns it into a personal knowledge base.',
    button: 'Next',
  },
  {
    title: 'Choose How to Learn',
    description:
      'Generate lessons, take quizzes, study flashcards, or chat with your AI tutor.',
    button: 'Start Learning',
  },
];

const features = [
  { label: 'AI Tutor', icon: BrainCircuit },
  { label: 'Lessons', icon: BookOpen },
  { label: 'Quizzes', icon: HelpCircle },
  { label: 'Flashcards', icon: Layers3 },
];

export function OnboardingModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (localStorage.getItem('aetherlearn-onboarded') !== 'true') {
      setOpen(true);
    }
  }, []);

  const finishOnboarding = () => {
    localStorage.setItem('aetherlearn-onboarded', 'true');
    setOpen(false);
    router.push('/ingestion');
  };

  const handlePrimaryAction = () => {
    if (step === steps.length - 1) {
      finishOnboarding();
      return;
    }

    setStep((current) => current + 1);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) finishOnboarding();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[480px] overflow-hidden border p-10 shadow-2xl sm:rounded-[24px]"
        style={{
          background: '#0D1117',
          borderColor: 'rgba(124,106,245,0.3)',
          color: '#F0F4F8',
        }}
      >
        <button
          type="button"
          onClick={finishOnboarding}
          className="absolute right-6 top-6 text-sm font-medium underline-offset-4 transition-colors hover:text-white hover:underline"
          style={{ color: '#8B9AB0' }}
        >
          Skip
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex min-h-[420px] flex-col items-center text-center"
          >
            <div className="mb-8 flex min-h-[150px] items-center justify-center">
              {step === 0 && <LogoMark />}
              {step === 1 && <IngestionIllustration />}
              {step === 2 && <FeatureGrid />}
            </div>

            <DialogTitle className="text-3xl font-bold tracking-normal" style={{ color: '#F0F4F8' }}>
              {steps[step].title}
            </DialogTitle>
            <DialogDescription className="mt-4 text-base leading-7" style={{ color: '#8B9AB0' }}>
              {steps[step].description}
            </DialogDescription>

            <div className="mt-auto w-full pt-10">
              <Button
                type="button"
                onClick={handlePrimaryAction}
                className="min-h-[48px] w-full rounded-xl text-sm font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)',
                  border: 'none',
                }}
              >
                {steps[step].button}
              </Button>

              <div className="mt-6 flex items-center justify-center gap-2">
                {steps.map((item, index) => (
                  <span
                    key={item.title}
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: index === step ? 24 : 8,
                      background: index === step ? '#7C6AF5' : 'rgba(139,154,176,0.28)',
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function LogoMark() {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.08, duration: 0.3 }}
      className="flex h-28 w-28 items-center justify-center rounded-[32px] text-6xl font-black"
      style={{
        background: 'linear-gradient(135deg, rgba(124,106,245,0.2) 0%, rgba(91,141,245,0.12) 100%)',
        border: '1px solid rgba(124,106,245,0.32)',
        color: '#7C6AF5',
        boxShadow: '0 24px 80px rgba(124,106,245,0.22)',
      }}
    >
      A
    </motion.div>
  );
}

function IngestionIllustration() {
  return (
    <svg
      width="260"
      height="150"
      viewBox="0 0 260 150"
      fill="none"
      role="img"
      aria-label="Content flowing into AetherLearn"
    >
      <rect x="12" y="24" width="84" height="102" rx="18" fill="#141B24" stroke="rgba(255,255,255,0.08)" />
      <rect x="28" y="45" width="52" height="8" rx="4" fill="#7C6AF5" opacity="0.8" />
      <rect x="28" y="65" width="40" height="6" rx="3" fill="#8B9AB0" opacity="0.45" />
      <rect x="28" y="82" width="52" height="6" rx="3" fill="#8B9AB0" opacity="0.3" />
      <path d="M102 75H153" stroke="#7C6AF5" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 8" />
      <path d="M146 65L157 75L146 85" stroke="#7C6AF5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="164" y="16" width="84" height="118" rx="22" fill="rgba(124,106,245,0.12)" stroke="rgba(124,106,245,0.32)" />
      <circle cx="206" cy="62" r="22" fill="url(#onboardingGlow)" />
      <path d="M195 91H217" stroke="#F0F4F8" strokeWidth="5" strokeLinecap="round" />
      <path d="M188 105H224" stroke="#8B9AB0" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
      <defs>
        <linearGradient id="onboardingGlow" x1="184" y1="40" x2="228" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C6AF5" />
          <stop offset="1" stopColor="#5B8DF5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FeatureGrid() {
  return (
    <div className="grid w-full max-w-[260px] grid-cols-2 gap-3">
      {features.map((feature, index) => (
        <motion.div
          key={feature.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <feature.icon className="mx-auto h-6 w-6" style={{ color: '#7C6AF5' }} />
          <p className="mt-3 text-xs font-semibold" style={{ color: '#F0F4F8' }}>
            {feature.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
