'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Syne } from 'next/font/google';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChevronDown,
  FileText,
  Github,
  GraduationCap,
  Layers,
  Linkedin,
  Twitter,
  Users,
} from 'lucide-react';

const syne = Syne({ subsets: ['latin'], variable: '--font-syne' });

const features = [
  {
    icon: BookOpen,
    title: 'RAG-Powered Tutor',
    desc: 'Add any content and get a tutor that knows it inside out',
  },
  {
    icon: GraduationCap,
    title: 'AI Lessons',
    desc: 'Structured lessons generated from your content at your depth level',
  },
  {
    icon: Brain,
    title: 'Smart Quizzes',
    desc: 'Test your knowledge with AI-generated multiple choice questions',
  },
  {
    icon: Layers,
    title: 'Spaced Repetition',
    desc: 'Flashcards powered by the SM-2 algorithm so you never forget',
  },
  {
    icon: FileText,
    title: 'Exam Generator',
    desc: 'Practice with unlimited past-paper style exams on any topic',
  },
  {
    icon: Users,
    title: 'Group Study Rooms',
    desc: 'Study together with classmates sharing one AI tutor',
  },
];

const steps = [
  ['01', 'Add Your Content', 'Paste a URL, upload a document, or type your notes'],
  ['02', 'Choose How to Learn', 'Generate lessons, take quizzes, chat with your AI tutor'],
  ['03', 'Track Your Progress', 'See your streak, quiz scores, and growth over time'],
];

const africaFeatures = [
  'M-Pesa payments (coming soon)',
  'Swahili support (coming soon)',
  'Works on low data',
  'Offline mode (coming soon)',
  'Priced in KES',
];

const pricing = [
  {
    name: 'Free',
    price: '0 KES/month',
    features: ['20 AI requests/day', 'All core features', 'Lessons quizzes flashcards', 'Community support'],
    button: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '800 KES/month',
    features: ['Unlimited AI requests', 'Everything in Free', 'Group study rooms', 'Exam generator', 'Priority support'],
    button: 'Upgrade to Pro',
    popular: true,
  },
];

const testimonials = [
  {
    quote:
      'AetherLearn helped me ace my BCOM finals. I just pasted my notes and it generated perfect revision questions.',
    name: 'Amina K.',
    meta: 'UoN Year 3',
    initials: 'AK',
  },
  {
    quote:
      'The group study rooms are amazing. My whole study group uses it now and we all improved our grades.',
    name: 'Brian M.',
    meta: 'Strathmore University',
    initials: 'BM',
  },
  {
    quote:
      'Finally an AI learning tool that understands African students. The M-Pesa support is going to be a game changer.',
    name: 'Faith W.',
    meta: 'Maseno University',
    initials: 'FW',
  },
];

const universities = [
  'University of Nairobi',
  'Strathmore University',
  'USIU Africa',
  'Maseno University',
  'Kenyatta University',
];

const sectionFade = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

function Logo() {
  return (
    <Link href="/" className="flex h-16 shrink-0 items-center gap-2.5">
      <span
        className={`${syne.className} flex h-9 w-9 items-center justify-center rounded-[10px] text-base font-extrabold text-white`}
        style={{ background: 'linear-gradient(135deg, #7C6AF5, #5B8DF5)' }}
      >
        A
      </span>
      <span className="text-base font-bold text-white">AetherLearn</span>
    </Link>
  );
}

function MotionSection({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.section
      initial={prefersReducedMotion ? false : 'hidden'}
      whileInView={prefersReducedMotion ? undefined : 'visible'}
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionFade}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
      className={className}
      id={id}
    >
      {children}
    </motion.section>
  );
}

function SpotlightCard({
  children,
  className = '',
  elevated = false,
}: {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  function onMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--y', `${event.clientY - rect.top}px`);
  }

  return (
    <div
      onMouseMove={onMouseMove}
      className={`spotlight-card ${elevated ? 'spotlight-card-pro' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

function HeroHeadline() {
  const words = ['Learn', 'Anything.', 'Master', 'Everything.'];
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.h1
      className={`${syne.className} mx-auto max-w-5xl text-center font-extrabold leading-[1.05] tracking-[-0.04em] text-[#F8FAFC]`}
      style={{ fontSize: 'clamp(52px, 7vw, 80px)' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      initial={prefersReducedMotion ? false : 'hidden'}
      animate={prefersReducedMotion ? undefined : 'visible'}
    >
      {words.map((word, index) => (
        <React.Fragment key={word}>
          <motion.span
            className={word === 'Master' ? 'hero-gradient-word inline-block' : 'inline-block'}
            variants={{
              hidden: { opacity: 0, y: 40 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          >
            {word}
          </motion.span>
          {index === 1 ? <br className="hidden sm:block" /> : ' '}
        </React.Fragment>
      ))}
    </motion.h1>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { status } = useSession();
  const prefersReducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [router, status]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (status === 'authenticated') return null;

  return (
    <main className={`${syne.variable} obsidian-page min-h-screen overflow-hidden text-white`}>
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        ::selection {
          background: rgba(124, 106, 245, 0.3);
          color: white;
        }

        a, button, textarea, input {
          transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
        }

        a:focus-visible,
        button:focus-visible,
        textarea:focus-visible,
        input:focus-visible {
          outline: 2px solid rgba(124, 106, 245, 0.9);
          outline-offset: 2px;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.45; }
          50% { transform: translateY(9px); opacity: 1; }
        }

        @keyframes timeline-grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        @keyframes timeline-grow-y {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }

        @keyframes africa-float {
          0%, 100% { transform: translateY(-8px); }
          50% { transform: translateY(8px); }
        }

        @keyframes sonar-pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }

        @keyframes organic-drift-one {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(30px, 18px, 0) scale(1.04); }
        }

        @keyframes organic-drift-two {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-24px, -16px, 0) scale(1.03); }
        }

        @keyframes organic-drift-three {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-14px, 22px, 0) scale(1.06); }
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }

        .obsidian-page {
          position: relative;
          background: #06080F;
          color: #F8FAFC;
        }

        .obsidian-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            linear-gradient(rgba(124,106,245,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,106,245,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, black 40%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, black 40%, transparent 100%);
        }

        .obsidian-page::after {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.85;
          mix-blend-mode: screen;
        }

        .nav-link {
          position: relative;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -7px;
          width: 100%;
          height: 2px;
          transform: scaleX(0);
          transform-origin: left;
          background: linear-gradient(90deg, #7C6AF5, #5B8DF5);
          transition: transform 0.35s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .nav-link:hover::after {
          transform: scaleX(1);
        }

        .hero-gradient-word {
          background: linear-gradient(135deg, #A78BFA, #60A5FA, #34D399);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .spotlight-card {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.06);
          background:
            radial-gradient(300px circle at var(--x, 50%) var(--y, 50%), rgba(124,106,245,0.08), transparent 70%),
            linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          will-change: transform;
          transition:
            transform 0.45s cubic-bezier(0.23, 1, 0.32, 1),
            border-color 0.45s cubic-bezier(0.23, 1, 0.32, 1),
            box-shadow 0.45s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .spotlight-card:hover {
          border-color: rgba(124,106,245,0.35);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(124,106,245,0.15);
        }

        .spotlight-card-pro {
          background:
            radial-gradient(300px circle at var(--x, 50%) var(--y, 50%), rgba(124,106,245,0.08), transparent 70%),
            linear-gradient(135deg, rgba(124,106,245,0.07), rgba(255,255,255,0.015));
        }

        .timeline-line::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 1px;
          transform: scaleY(0);
          transform-origin: top;
          background: linear-gradient(180deg, #7C6AF5, #5B8DF5, #14B8A6);
          animation: timeline-grow-y 1.25s cubic-bezier(0.23, 1, 0.32, 1) forwards;
        }

        @media (min-width: 768px) {
          .timeline-line::before {
            left: 0;
            right: 0;
            top: 50%;
            bottom: auto;
            width: auto;
            height: 1px;
            transform: scaleX(0);
            transform-origin: left;
            background: linear-gradient(90deg, #7C6AF5, #5B8DF5, #14B8A6);
            animation-name: timeline-grow;
          }
        }

        .pro-gradient-border {
          position: relative;
          isolation: isolate;
          border: 1px solid transparent;
          background: rgba(124,106,245,0.05);
        }

        .pro-gradient-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          z-index: -1;
          border-radius: 17px;
          background: linear-gradient(135deg, #7C6AF5, #5B8DF5, #14B8A6);
        }

        .pro-gradient-border::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          border-radius: 16px;
          background: #0A0D16;
        }
      `}</style>

      <svg className="pointer-events-none fixed inset-0 z-[1] h-full w-full" viewBox="0 0 1440 1200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <filter id="organic-orb" x="-40%" y="-40%" width="180%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="8" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="55" />
            <feGaussianBlur stdDeviation="42" />
          </filter>
        </defs>
        <circle
          cx="150"
          cy="135"
          r="300"
          fill="#7C6AF5"
          opacity="0.15"
          filter="url(#organic-orb)"
          style={{ animation: prefersReducedMotion ? undefined : 'organic-drift-one 14s ease-in-out infinite' }}
        />
        <circle
          cx="1280"
          cy="1010"
          r="250"
          fill="#3B6FD4"
          opacity="0.10"
          filter="url(#organic-orb)"
          style={{ animation: prefersReducedMotion ? undefined : 'organic-drift-two 16s ease-in-out infinite' }}
        />
        <circle
          cx="1040"
          cy="520"
          r="150"
          fill="#14B8A6"
          opacity="0.06"
          filter="url(#organic-orb)"
          style={{ animation: prefersReducedMotion ? undefined : 'organic-drift-three 18s ease-in-out infinite' }}
        />
      </svg>

      <nav
        className="fixed top-0 z-50 h-16 w-full border-b border-white/[0.06] transition-[background,box-shadow] duration-300"
        style={{
          backdropFilter: 'blur(24px) saturate(180%)',
          background: scrolled ? 'rgba(6,8,15,0.82)' : 'rgba(6,8,15,0.7)',
          boxShadow: scrolled ? '0 12px 40px rgba(0,0,0,0.28)' : 'none',
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
          <Logo />
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="nav-link text-sm font-medium text-[#64748B] transition-colors hover:text-[#E2E8F0]">
              Features
            </a>
            <a href="#pricing" className="nav-link text-sm font-medium text-[#64748B] transition-colors hover:text-[#E2E8F0]">
              Pricing
            </a>
            <a href="#universities" className="nav-link text-sm font-medium text-[#64748B] transition-colors hover:text-[#E2E8F0]">
              For Universities
            </a>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-[#F0F4F8] hover:border-white/25 sm:inline-flex sm:px-4"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-[8px] px-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,106,245,0.3)] sm:px-5"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
            >
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Get Started Free</span>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 flex min-h-screen items-center px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="mx-auto flex max-w-6xl flex-col items-center text-center"
        >
          <div className="mb-6 inline-flex items-center rounded-full border border-[#7C6AF5]/40 bg-[#7C6AF5]/[0.08] px-4 py-1.5 text-[13px] font-medium text-[#D8D2FF]">
            Built for African Students
            <span className="mx-2 h-1.5 w-1.5 rounded-full bg-[#7C6AF5]" style={{ animation: 'pulse-dot 2s infinite' }} />
            🌍
          </div>
          <HeroHeadline />
          <div className="mt-7 h-px w-[60px] bg-gradient-to-r from-[#7C6AF5] to-transparent" />
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="mt-7 max-w-3xl text-lg font-light leading-8 text-[#94A3B8] md:text-xl"
          >
            Turn any content into lessons, quizzes, flashcards, and a personal AI tutor. No credit card required.
          </motion.p>
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.58, ease: [0.23, 1, 0.32, 1] }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/login"
              className="inline-flex h-[52px] items-center justify-center rounded-[12px] px-7 text-[15px] font-semibold text-white shadow-[0_18px_50px_rgba(124,106,245,0.28)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(124,106,245,0.45)]"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
            >
              Start Learning Free
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.015] px-7 text-[15px] font-semibold text-[#F0F4F8] hover:bg-white/[0.04]"
            >
              See How It Works
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1 }}
            transition={{ duration: 0.65, delay: 0.72, ease: [0.23, 1, 0.32, 1] }}
            className="mt-5 text-[13px] text-[#475569]"
          >
            <span className="text-[#34D399]">✓</span> Free • <span className="text-[#34D399]">✓</span> No credit card • <span className="text-[#34D399]">✓</span> 20 AI requests/day
          </motion.p>
        </motion.div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#64748B]" style={{ animation: 'scroll-bounce 2s ease-in-out infinite' }}>
          <ChevronDown className="h-6 w-6" />
        </div>
      </section>

      <MotionSection className="relative z-10 border-y border-white/[0.06] py-6">
        <div
          className="mx-auto flex max-w-7xl overflow-hidden"
          style={{ maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)' }}
        >
          <div className="flex min-w-full shrink-0 items-center justify-around gap-8 whitespace-nowrap text-sm text-[#94A3B8]" style={{ animation: 'marquee 25s linear infinite' }}>
            {[...universities, ...universities].map((name, index) => (
              <span key={`${name}-${index}`} className="inline-flex items-center gap-8">
                <span>{index === 0 ? 'Trusted by students at ' : ''}{name}</span>
                <span className="text-[#7C6AF5]">·</span>
              </span>
            ))}
          </div>
          <div className="flex min-w-full shrink-0 items-center justify-around gap-8 whitespace-nowrap text-sm text-[#94A3B8]" style={{ animation: 'marquee 25s linear infinite' }} aria-hidden="true">
            {[...universities, ...universities].map((name, index) => (
              <span key={`${name}-repeat-${index}`} className="inline-flex items-center gap-8">
                <span>{name}</span>
                <span className="text-[#7C6AF5]">·</span>
              </span>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection id="features" className="relative z-10 px-4 py-20 sm:px-6 md:py-[120px] lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <h2 className={`${syne.className} text-[clamp(32px,4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em] text-[#F8FAFC]`}>
              Everything you need to learn smarter
            </h2>
            <p className="mt-4 text-lg font-light text-[#94A3B8]">One platform for all your learning needs</p>
          </div>
          <motion.div
            variants={staggerContainer}
            initial={prefersReducedMotion ? false : 'hidden'}
            whileInView={prefersReducedMotion ? undefined : 'visible'}
            viewport={{ once: true, margin: '-50px' }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={cardIn}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              >
                <SpotlightCard className="h-full p-5 sm:p-7">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#7C6AF5]/20 bg-gradient-to-br from-[#7C6AF5]/20 to-[#5B8DF5]/10">
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-[#F8FAFC] sm:text-lg">{feature.title}</h3>
                  <p className="mt-3 text-sm font-light leading-6 text-[#94A3B8]">{feature.desc}</p>
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </MotionSection>

      <MotionSection id="how-it-works" className="relative z-10 px-4 py-20 sm:px-6 md:py-[120px] lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className={`${syne.className} text-[clamp(32px,4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em] text-[#F8FAFC]`}>
              From content to mastery in 3 steps
            </h2>
          </div>
          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
            initial={prefersReducedMotion ? false : 'hidden'}
            whileInView={prefersReducedMotion ? undefined : 'visible'}
            viewport={{ once: true, amount: 0.25 }}
            className="timeline-line relative grid gap-8 md:grid-cols-3"
          >
            {steps.map(([number, title, desc]) => (
              <motion.div
                key={number}
                variants={cardIn}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className="relative z-10"
              >
                <SpotlightCard className="h-full p-7">
                  <div className={`${syne.className} pointer-events-none absolute right-5 top-3 text-7xl font-extrabold leading-none text-white/[0.08]`}>
                    {number}
                  </div>
                  <div className="relative">
                    <p className={`${syne.className} text-xl font-bold text-[#7C6AF5]`}>{number}</p>
                    <h3 className="mt-6 text-lg font-semibold text-[#F8FAFC]">{title}</h3>
                    <p className="mt-3 text-sm font-light leading-6 text-[#94A3B8]">{desc}</p>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </MotionSection>

      <MotionSection id="universities" className="relative z-10 px-4 py-20 sm:px-6 md:py-[120px] lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[16px] border border-[#7C6AF5]/15 bg-gradient-to-br from-[#7C6AF5]/[0.05] to-[#5B8DF5]/[0.02] p-6 md:p-10 lg:p-12">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <h2 className={`${syne.className} text-[clamp(32px,4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em] text-[#F8FAFC]`}>
                Built for Africa. Priced for Africa.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-light leading-7 text-[#94A3B8]">
                We understand that most students in Kenya and across Africa do not have international credit cards.
                AetherLearn supports M-Pesa payments and is priced in KES.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {africaFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-[#F8FAFC]">
                    <span className="text-[#34D399]">✦</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
            <div className="group flex items-center justify-center">
              <svg
                viewBox="0 0 300 330"
                className="h-[300px] w-full max-w-xs opacity-[0.12] transition-[filter] group-hover:drop-shadow-[0_0_20px_rgba(124,106,245,0.3)]"
                aria-hidden="true"
                style={{ animation: prefersReducedMotion ? undefined : 'africa-float 6s ease-in-out infinite' }}
              >
                <path
                  d="M151 14C124 21 102 39 93 63c-8 22-28 22-39 39-16 25 0 52 11 75 8 17 4 32 17 47 14 16 39 8 51 25 11 16 4 43 24 55 20 13 35-11 45-27 11-18 26-31 25-54-1-17 14-31 11-48-4-24-30-32-34-55-4-21 16-36 7-57-9-24-32-52-60-45Z"
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M116 76c20 11 32 27 38 49m-12 63c23-3 42 4 60 21m-93 13c16 8 27 21 32 39"
                  fill="none"
                  stroke="#14B8A6"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </MotionSection>

      <MotionSection id="pricing" className="relative z-10 px-4 py-20 sm:px-6 md:py-[120px] lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <h2 className={`${syne.className} text-[clamp(32px,4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em] text-[#F8FAFC]`}>
              Simple, honest pricing
            </h2>
            <div className="mx-auto mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm text-[#94A3B8]">
              <button type="button" className="rounded-full bg-white/10 px-4 py-2 text-white">Monthly</button>
              <button type="button" className="rounded-full px-4 py-2">Annual <span className="ml-1 text-[#34D399]">20% off</span></button>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {pricing.map((plan) => (
              <SpotlightCard
                key={plan.name}
                elevated={plan.popular}
                className={`${plan.popular ? 'pro-gradient-border' : 'border-white/[0.08]'} relative h-full p-7`}
              >
                {plan.popular && (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#7C6AF5] to-[#5B8DF5] px-4 py-1.5 text-xs font-bold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-[#F8FAFC]">{plan.name}</h3>
                <p className={`${syne.className} mt-4 text-5xl font-extrabold tracking-[-0.04em] text-white`}>{plan.price}</p>
                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm font-light text-[#94A3B8]">
                      <span className="text-[#34D399]">✦</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-[10px] text-sm font-bold text-white"
                  style={{
                    background: plan.popular
                      ? 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)'
                      : 'rgba(255,255,255,0.06)',
                    border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {plan.button}
                </Link>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection className="relative z-10 px-4 py-20 sm:px-6 md:py-[120px] lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <h2 className={`${syne.className} text-[clamp(32px,4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em] text-[#F8FAFC]`}>
              What students are saying
            </h2>
          </div>
          <motion.div
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
            initial={prefersReducedMotion ? false : 'hidden'}
            whileInView={prefersReducedMotion ? undefined : 'visible'}
            viewport={{ once: true, amount: 0.25 }}
            className="grid gap-4 lg:grid-cols-3"
          >
            {testimonials.map((item) => (
              <motion.div key={item.name} variants={cardIn} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}>
                <SpotlightCard className="relative h-full p-7">
                  <div className={`${syne.className} pointer-events-none absolute left-5 top-0 text-[80px] font-extrabold leading-none text-[#7C6AF5]/15`}>
                    &ldquo;
                  </div>
                  <div className="relative">
                    <div className="mb-5 flex gap-1 text-[#FBBF24]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <span key={index}>★</span>
                      ))}
                    </div>
                    <p className="text-sm font-light leading-7 text-[#F8FAFC]">&ldquo;{item.quote}&rdquo;</p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#7C6AF5]/30 bg-gradient-to-br from-[#7C6AF5]/30 to-[#5B8DF5]/30 text-sm font-bold text-[#EDE9FE]">
                        {item.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-[#94A3B8]">{item.meta}</p>
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </MotionSection>

      <section className="relative z-10 overflow-hidden px-4 py-20 text-center sm:px-6 md:py-[120px] lg:px-8" style={{ background: 'linear-gradient(135deg, #1a1040 0%, #0f1a35 50%, #0a1525 100%)' }}>
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C6AF5]/20 blur-3xl" />
        <div className="relative mx-auto max-w-4xl">
          <h2 className={`${syne.className} text-[clamp(32px,4vw,48px)] font-bold leading-[1.08] tracking-[-0.02em] text-white`}>
            Start learning smarter today
          </h2>
          <p className="mt-4 text-lg font-light text-white/80">Join thousands of African students using AI to master their subjects</p>
          <div className="relative mx-auto mt-8 inline-flex">
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-[120px] w-[120px] rounded-full border border-[#7C6AF5]/15" style={{ animation: 'sonar-pulse 2.4s ease-out infinite' }} />
            <Link
              href="/login"
              className="relative inline-flex h-[52px] items-center justify-center rounded-[10px] bg-white px-8 text-sm font-bold text-[#06080F] hover:bg-[#F1F5F9]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-4 py-12 sm:px-6 lg:px-8">
        <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7C6AF5]/30 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-4 text-sm font-light text-[#94A3B8]">The AI learning OS for African students</p>
          </div>
          <div className="flex flex-wrap content-start gap-x-6 gap-y-3 text-sm text-[#94A3B8]">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#universities" className="hover:text-white">For Universities</a>
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
          </div>
          <div className="flex gap-4 md:justify-end">
            {[
              { icon: Twitter, label: 'Twitter/X' },
              { icon: Github, label: 'GitHub' },
              { icon: Linkedin, label: 'LinkedIn' },
            ].map((social) => (
              <a
                key={social.label}
                href="#"
                aria-label={social.label}
                className="flex h-10 w-10 items-center justify-center text-[#475569] hover:-translate-y-0.5 hover:text-[#7C6AF5]"
              >
                <social.icon className="h-6 w-6" />
              </a>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/[0.06] pt-6 text-sm font-light text-[#94A3B8]">
          Copyright 2026 AetherLearn • Made with ❤️ in Kenya 🇰🇪
        </div>
      </footer>
    </main>
  );
}
