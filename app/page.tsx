'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedBackground } from '@/components/animated-background';
import { Button } from '@/components/ui/button';
import { ArrowRight, Code2, Zap, BookOpen, Brain } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: 'easeOut' as const },
  },
};

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedBackground />

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-xl font-bold text-transparent">
            AetherLearn
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <Link
            href="/ingestion"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Ingest
          </Link>
          <Link href="/dashboard">
            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
              Get Started
            </Button>
          </Link>
        </motion.div>
      </nav>

      <motion.div
        className="relative z-10 flex min-h-[calc(100vh-200px)] flex-col items-center justify-center px-6 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="mb-6 inline-block rounded-full border border-white/[0.15] bg-white/[0.08] px-4 py-2 backdrop-blur-xl"
        >
          <span className="text-sm text-indigo-300">Your Personal AI Learning OS</span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="mb-6 text-5xl font-bold leading-tight md:text-7xl"
        >
          <span className="block">Learn Anything</span>
          <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            With Your AI Tutor
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mb-12 max-w-2xl text-lg text-muted-foreground"
        >
          Paste URLs or raw text. AetherLearn chunks, embeds, and retrieves the best
          context—then teaches you with lessons, quizzes, and live chat via your AI provider.
        </motion.p>

        <motion.div variants={itemVariants} className="mb-16 flex flex-col gap-4 sm:flex-row">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-12 bg-gradient-to-r from-indigo-600 to-purple-600 px-8 hover:from-indigo-700 hover:to-purple-700"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/ingestion">
            <Button
              size="lg"
              variant="outline"
              className="h-12 border border-white/[0.15] bg-white/[0.08] px-8 backdrop-blur-xl hover:bg-white/[0.1]"
            >
              Add Content
            </Button>
          </Link>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-4"
        >
          {[
            { icon: Code2, label: 'Any Content' },
            { icon: Zap, label: 'RAG + Any LLM' },
            { icon: BookOpen, label: 'Smart Lessons' },
            { icon: Brain, label: 'Adaptive Tutor' },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.15] bg-white/[0.08] p-4 backdrop-blur-xl"
              whileHover={{ scale: 1.05 }}
            >
              <feature.icon className="h-6 w-6 text-indigo-400" />
              <span className="text-sm">{feature.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
