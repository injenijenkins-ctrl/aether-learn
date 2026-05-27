'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Bell, Settings, Menu, Sun, Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  excerpt: string;
  href: string;
}

interface TopNavProps {
  sidebarOpen?: boolean;
  onMenuClick?: () => void;
}

export function TopNav({ sidebarOpen = true, onMenuClick }: TopNavProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [isByoKey, setIsByoKey] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setOpen(true);
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    // Check BYO key on mount
    try {
      const providerStr = localStorage.getItem('aetherlearn-ai-provider');
      if (providerStr) {
        const providerObj = JSON.parse(providerStr);
        if (providerObj && typeof providerObj.apiKey === 'string' && providerObj.apiKey.trim() !== '') {
          setIsByoKey(true);
        }
      }
    } catch (e) {
      console.error('Failed to parse aetherlearn-ai-provider from localStorage', e);
    }

    // Fetch credits
    async function fetchCredits() {
      try {
        const res = await fetch('/api/credits');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.credits === 'number') {
            setCredits(data.credits);
          }
        }
      } catch (e) {
        console.error('Failed to fetch credits', e);
      }
    }

    fetchCredits();
  }, [isLoggedIn]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'fixed top-0 right-0 z-20 flex h-16 items-center justify-between border-b border-border px-4 backdrop-blur-xl bg-white/[0.06] md:px-6',
        sidebarOpen ? 'md:left-64' : 'md:left-20',
        'left-0'
      )}
    >
      <button
        type="button"
        onClick={onMenuClick}
        className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-white/10 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        ref={containerRef}
        className="relative mx-2 flex max-w-md flex-1 md:max-w-lg"
      >
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search lessons, notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setOpen(true)}
            className="min-h-[44px] border-white/10 bg-background/50 pl-10"
          />
        </div>
        {open && results.length > 0 && (
          <ul className="absolute top-full z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-white/15 bg-background/95 shadow-xl backdrop-blur-xl">
            {results.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <button
                  type="button"
                  className="min-h-[44px] w-full px-4 py-3 text-left hover:bg-white/10"
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                    router.push(r.href);
                  }}
                >
                  <span className="text-xs font-medium text-indigo-400">{r.type}</span>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {r.excerpt}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <motion.button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="hidden min-h-[44px] min-w-[44px] rounded-lg p-2 transition-colors hover:bg-white/10 sm:inline-flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </motion.button>

        {isLoggedIn && (isByoKey || credits !== null) && (
          <Link href="/settings" className="flex items-center">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border backdrop-blur-md transition-colors cursor-pointer",
                isByoKey
                  ? "bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25"
                  : credits! < 5
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                  : credits! < 10
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
              )}
            >
              {isByoKey ? 'Unlimited' : `${credits} credits`}
            </motion.span>
          </Link>
        )}

        <motion.button
          type="button"
          className="relative hidden min-h-[44px] min-w-[44px] rounded-lg p-2 transition-colors hover:bg-white/10 sm:inline-flex"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        </motion.button>

        <Link href="/settings">
          <motion.span
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors hover:bg-white/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="h-5 w-5" />
          </motion.span>
        </Link>
      </div>
    </motion.header>
  );
}
