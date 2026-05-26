'use client';

import React from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { AnimatedBackground } from '@/components/animated-background';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.15] bg-white/[0.08] p-8 backdrop-blur-xl"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to sync your study data across devices
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            className="h-11 min-h-[44px] w-full bg-white text-background hover:bg-white/90"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-[44px] w-full border-white/20"
            onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          >
            Continue with GitHub
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="text-indigo-400 hover:underline">
            Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
