'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProviders, signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { AnimatedBackground } from '@/components/animated-background';
import { Button } from '@/components/ui/button';
import { AlertCircle, Brain, Github, Loader2 } from 'lucide-react';

type LoginProvider = {
  id: string;
  name: string;
};

function GoogleIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold"
      style={{ color: '#4285F4' }}
    >
      G
    </span>
  );
}

function ProviderIcon({ id }: { id: string }) {
  if (id === 'github') return <Github className="h-5 w-5" />;
  if (id === 'google') return <GoogleIcon />;
  return <Brain className="h-5 w-5" />;
}

export default function LoginPage() {
  const [providers, setProviders] = useState<LoginProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    getProviders()
      .then((availableProviders) => {
        setProviders(Object.values(availableProviders || {}));
      })
      .catch(() => setProviders([]))
      .finally(() => setLoadingProviders(false));
  }, []);

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
          {loadingProviders ? (
            <div
              className="flex min-h-[96px] items-center justify-center rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Loader2 className="h-5 w-5 animate-spin text-indigo-300" />
            </div>
          ) : providers.length > 0 ? (
            providers.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                className="h-12 min-h-[48px] w-full justify-start gap-3 border-white/15 bg-white/[0.06] px-4 text-white hover:bg-white/[0.1] hover:text-white"
                onClick={() => signIn(provider.id, { callbackUrl: '/dashboard' })}
              >
                <ProviderIcon id={provider.id} />
                <span className="flex-1 text-left">Continue with {provider.name}</span>
              </Button>
            ))
          ) : (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: '#F0F4F8' }}
            >
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <p>
                  No sign-in providers are configured yet. Add Google or GitHub OAuth credentials in the environment.
                </p>
              </div>
            </div>
          )}
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
