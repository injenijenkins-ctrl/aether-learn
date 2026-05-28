'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedBackground } from '@/components/animated-background';
import { ArrowRight, Code2, Zap, BookOpen, Brain } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

const features = [
  { icon: Code2, label: 'Any Content', desc: 'URL, PDF, text, audio' },
  { icon: Zap, label: 'RAG + Any LLM', desc: 'OpenAI, Groq, Ollama…' },
  { icon: BookOpen, label: 'Smart Lessons', desc: 'Adaptive depth' },
  { icon: Brain, label: 'AI Tutor', desc: 'Streaming chat' },
];

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#080B11' }}>
      <AnimatedBackground />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5"
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
          >
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span
            className="text-lg font-bold"
            style={{
              background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            AetherLearn
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4"
        >
          <Link
            href="/ingestion"
            className="text-sm font-medium transition-colors"
            style={{ color: '#8B9AB0' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F4F8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8B9AB0')}
          >
            Add Content
          </Link>
          <Link href="/dashboard">
            <motion.span
              className="inline-flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
              whileHover={{ opacity: 0.9, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.span>
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <motion.div
        className="relative z-10 flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-6 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-6">
          <span
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{
              background: 'rgba(124,106,245,0.12)',
              border: '1px solid rgba(124,106,245,0.25)',
              color: '#7C6AF5',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: '#7C6AF5' }}
            />
            Your Personal AI Learning OS
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="mb-5 text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl"
        >
          <span className="block" style={{ color: '#F0F4F8' }}>Learn Anything</span>
          <span
            className="block"
            style={{
              background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            With Your AI Tutor
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="mb-10 max-w-xl text-base leading-relaxed md:text-lg"
          style={{ color: '#8B9AB0' }}
        >
          Paste URLs or raw text. AetherLearn chunks, embeds, and retrieves the best
          context — then teaches you with lessons, quizzes, and live chat via your AI provider.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="mb-16 flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard">
            <motion.span
              className="inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
              whileHover={{ opacity: 0.9, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </motion.span>
          </Link>
          <Link href="/ingestion">
            <motion.span
              className="inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-semibold"
              style={{
                background: 'rgba(20,27,36,0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#F0F4F8',
                backdropFilter: 'blur(12px)',
              }}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)', scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              Add Content
            </motion.span>
          </Link>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={itemVariants}
          className="grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4"
        >
          {features.map((f, idx) => (
            <motion.div
              key={idx}
              className="flex flex-col items-center gap-2 rounded-xl p-4 text-center"
              style={{
                background: 'rgba(13,17,23,0.7)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
              }}
              whileHover={{
                borderColor: 'rgba(124,106,245,0.3)',
                background: 'rgba(20,27,36,0.8)',
                scale: 1.03,
              }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: 'rgba(124,106,245,0.15)' }}
              >
                <f.icon className="h-4 w-4" style={{ color: '#7C6AF5' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>{f.label}</span>
              <span className="text-xs" style={{ color: '#8B9AB0' }}>{f.desc}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
