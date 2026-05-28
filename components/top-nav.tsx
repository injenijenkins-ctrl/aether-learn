'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Bell, Settings, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setOpen(true);
    } catch { setResults([]); }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const providerStr = localStorage.getItem('aetherlearn-ai-provider');
      if (providerStr) {
        const providerObj = JSON.parse(providerStr);
        if (providerObj?.apiKey?.trim()) setIsByoKey(true);
      }
    } catch {}

    async function fetchCredits() {
      try {
        const res = await fetch('/api/credits');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.credits === 'number') setCredits(data.credits);
        }
      } catch {}
    }
    fetchCredits();
  }, [isLoggedIn]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const creditsBadge = () => {
    if (!isLoggedIn || (!isByoKey && credits === null)) return null;
    if (isByoKey) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border"
          style={{ background: 'rgba(124,106,245,0.12)', color: '#7C6AF5', borderColor: 'rgba(124,106,245,0.25)' }}>
          ∞ Unlimited
        </span>
      );
    }
    const c = credits!;
    const style =
      c < 5
        ? { background: 'rgba(248,113,113,0.12)', color: '#F87171', borderColor: 'rgba(248,113,113,0.25)' }
        : c < 10
        ? { background: 'rgba(251,191,36,0.12)', color: '#FBBF24', borderColor: 'rgba(251,191,36,0.25)' }
        : { background: 'rgba(52,211,153,0.12)', color: '#34D399', borderColor: 'rgba(52,211,153,0.25)' };
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border" style={style}>
        {c} credits
      </span>
    );
  };

  return (
    <motion.header
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 right-0 z-20 flex h-16 items-center justify-between px-4 md:px-6',
        sidebarOpen ? 'md:left-64' : 'md:left-20',
        'left-0'
      )}
      style={{
        background: 'rgba(8,11,17,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onMenuClick}
        className="min-h-[44px] min-w-[44px] rounded-lg p-2 transition-colors hover:bg-white/[0.06] md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" style={{ color: '#8B9AB0' }} />
      </button>

      {/* Search */}
      <div ref={containerRef} className="relative mx-2 flex max-w-md flex-1 md:max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#4A5568' }} />
          <Input
            placeholder="Search lessons, notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setOpen(true)}
            className="min-h-[44px] pl-10 text-sm"
            style={{
              background: 'rgba(20,27,36,0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#F0F4F8',
            }}
          />
        </div>
        {open && results.length > 0 && (
          <ul
            className="absolute top-full z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl shadow-2xl"
            style={{
              background: '#141B24',
              border: '1px solid rgba(124,106,245,0.2)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {results.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <button
                  type="button"
                  className="min-h-[44px] w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
                  onClick={() => { setOpen(false); setQuery(''); router.push(r.href); }}
                >
                  <span className="text-xs font-semibold" style={{ color: '#7C6AF5' }}>{r.type}</span>
                  <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>{r.title}</p>
                  <p className="line-clamp-1 text-xs" style={{ color: '#8B9AB0' }}>{r.excerpt}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {/* Credits badge */}
        <Link href="/settings" className="flex items-center">
          <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            {creditsBadge()}
          </motion.span>
        </Link>

        {/* Notifications */}
        <motion.button
          type="button"
          className="relative hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06] sm:inline-flex"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" style={{ color: '#8B9AB0' }} />
          <span
            className="absolute right-2 top-2 h-2 w-2 rounded-full"
            style={{ background: '#F87171' }}
          />
        </motion.button>

        {/* Settings */}
        <Link href="/settings">
          <motion.span
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="h-5 w-5" style={{ color: '#8B9AB0' }} />
          </motion.span>
        </Link>
      </div>
    </motion.header>
  );
}
