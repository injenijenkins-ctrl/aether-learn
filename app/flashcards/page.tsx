'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SourceCitations, type SourceCitation } from '@/components/source-citations';
import { ChevronLeft, ChevronRight, Loader2, RotateCw, Sparkles, Layers } from 'lucide-react';
import { useLearn, type FlashcardItem } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';
import type { ReviewQuality } from '@/lib/sm2';

interface ReviewRow {
  id: string;
  cardId: string;
  front: string;
  back: string;
  topic?: string;
}

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const creditLimitMessage =
  "You've used all your free requests for today. Your credits reset in a few hours. Add your API key in Settings for unlimited access.";

function isCreditLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    message.includes('429') ||
    normalized.includes('free requests') ||
    normalized.includes('credits') ||
    normalized.includes('api key')
  );
}

export default function FlashcardsPage() {
  const { generateFlashcards, loading } = useLearn();
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [reviewMap, setReviewMap] = useState<Record<string, string>>({});
  const [dueCards, setDueCards] = useState<ReviewRow[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<'browse' | 'due'>('browse');
  const [generationError, setGenerationError] = useState<{ message: string; creditLimit: boolean } | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/flashcards/review');
      const data = await res.json();
      setDueCards(data.due || []);
      const map: Record<string, string> = {};
      for (const row of data.all || []) map[row.cardId] = row.id;
      setReviewMap(map);
    } catch { setDueCards([]); }
  }, []);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error('Enter a topic'); return; }
    setGenerationError(null);
    try {
      const generated = await generateFlashcards(topic.trim());
      setCards(generated.cards);
      setSources(generated.sources || []);
      setIndex(0);
      setFlipped(false);
      setMode('browse');
      for (const card of generated.cards) {
        await fetch('/api/flashcards/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: card.id, front: card.front, back: card.back, topic: topic.trim() }),
        });
      }
      await loadReviews();
      toast.success(`Generated ${generated.cards.length} flashcards`);
    } catch (error) {
      const creditLimit = isCreditLimitError(error);
      const message = creditLimit
        ? creditLimitMessage
        : "Couldn't generate your flashcards. Please try again.";
      setGenerationError({ message, creditLimit });
      toast.error(message);
    }
  };

  const handleReview = async (quality: ReviewQuality) => {
    const list = mode === 'due' ? dueCards : null;
    if (mode === 'due' && list?.[index]) {
      const row = list[index];
      await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: row.id, quality }),
      });
      logActivity({ type: 'flashcard', title: `Reviewed: ${row.front.slice(0, 40)}` });
      await loadReviews();
      setFlipped(false);
      return;
    }
    const card = cards[index];
    if (!card) return;
    const reviewId = reviewMap[card.id];
    if (reviewId) {
      await fetch('/api/flashcards/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, quality }),
      });
      logActivity({ type: 'flashcard', title: `Reviewed: ${card.front.slice(0, 40)}` });
      await loadReviews();
    }
    setFlipped(false);
    if (index < cards.length - 1) setIndex((i) => i + 1);
  };

  const displayCards: { id: string; front: string; back: string }[] =
    mode === 'due' ? dueCards.map((d) => ({ id: d.cardId, front: d.front, back: d.back })) : cards;
  const current = displayCards[index];

  const reviewColors: Record<ReviewQuality, { bg: string; color: string; border: string }> = {
    hard: { bg: 'rgba(248,113,113,0.1)', color: '#F87171', border: 'rgba(248,113,113,0.25)' },
    good: { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'rgba(251,191,36,0.25)' },
    easy: { bg: 'rgba(52,211,153,0.1)', color: '#34D399', border: 'rgba(52,211,153,0.25)' },
  };

  return (
    <AppShell
      title="Flashcards"
      description="Flip cards with spaced repetition (SM-2) powered by your ingested content."
    >
      {/* Due cards banner */}
      {dueCards.length > 0 && (
        <div
          className="mb-8 rounded-2xl p-5"
          style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.2)',
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#FBBF24' }}>Due for review</h2>
              <p className="text-xs mt-0.5" style={{ color: '#8B9AB0' }}>
                {dueCards.length} card{dueCards.length === 1 ? '' : 's'} due today
              </p>
            </div>
            <Button
              className="min-h-[44px] text-sm"
              style={{
                background: 'rgba(251,191,36,0.15)',
                border: '1px solid rgba(251,191,36,0.3)',
                color: '#FBBF24',
              }}
              onClick={() => { setMode('due'); setIndex(0); setFlipped(false); }}
            >
              Study due cards
            </Button>
          </div>
        </div>
      )}

      {/* Generator */}
      <div className="mb-8 max-w-xl space-y-4 rounded-2xl p-6" style={cardStyle}>
        <div>
          <Label htmlFor="topic" style={{ color: '#8B9AB0' }}>Topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Key vocabulary from my notes"
            className="mt-2 min-h-[44px]"
            style={{ background: 'rgba(20,27,36,0.8)', border: '1px solid rgba(255,255,255,0.06)', color: '#F0F4F8' }}
          />
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="min-h-[44px] text-white"
            style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Flashcards
          </Button>
          {mode === 'due' && (
            <Button
              variant="ghost"
              className="min-h-[44px]"
              style={{ color: '#8B9AB0' }}
              onClick={() => { setMode('browse'); setIndex(0); }}
            >
              Back to all
            </Button>
          )}
        </div>
      </div>

      {generationError && (
        <div
          className="mb-8 rounded-2xl p-5"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)' }}
        >
          <p className="text-sm" style={{ color: '#F0F4F8' }}>{generationError.message}</p>
          {generationError.creditLimit && (
            <Link href="/settings" className="mt-4 inline-block">
              <Button
                className="min-h-[40px] text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                Add API Key
              </Button>
            </Link>
          )}
        </div>
      )}

      {loading && (
        <div className="mx-auto max-w-lg">
          <div className="mb-4 flex animate-pulse items-center justify-center gap-2 text-sm font-medium" style={{ color: '#7C6AF5' }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating flashcards...
          </div>
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(124,106,245,0.1) 0%, rgba(91,141,245,0.08) 100%)',
              border: '1px solid rgba(124,106,245,0.2)',
            }}
          >
            <Skeleton className="mx-auto h-5 w-2/3 bg-white/[0.08]" />
            <Skeleton className="mx-auto mt-5 h-4 w-5/6 bg-white/[0.08]" />
            <Skeleton className="mx-auto mt-3 h-4 w-1/2 bg-white/[0.08]" />
          </div>
        </div>
      )}

      {/* Card viewer */}
      {!loading && current && (
        <div className="mx-auto max-w-lg">
          <p className="mb-4 text-center text-xs" style={{ color: '#4A5568' }}>
            Card {index + 1} of {displayCards.length}
            {mode === 'due' && <span style={{ color: '#FBBF24' }}> · Due review</span>}
          </p>

          <motion.div
            className="cursor-pointer"
            style={{ perspective: 1000 }}
            onClick={() => setFlipped(!flipped)}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45 }}
              className="relative min-h-[220px] rounded-2xl"
              style={{
                transformStyle: 'preserve-3d',
                background: 'linear-gradient(135deg, rgba(124,106,245,0.1) 0%, rgba(91,141,245,0.08) 100%)',
                border: '1px solid rgba(124,106,245,0.2)',
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center p-8 text-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <p className="text-base font-semibold" style={{ color: '#F0F4F8' }}>
                  {flipped ? current.back : current.front}
                </p>
              </div>
            </motion.div>
          </motion.div>

          <p className="mt-2 text-center text-xs flex items-center justify-center gap-1" style={{ color: '#4A5568' }}>
            Click to flip <RotateCw className="h-3 w-3" />
          </p>

          {flipped && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(['hard', 'good', 'easy'] as ReviewQuality[]).map((q) => (
                <Button
                  key={q}
                  className="min-h-[44px] capitalize text-sm font-semibold"
                  style={{
                    background: reviewColors[q].bg,
                    border: `1px solid ${reviewColors[q].border}`,
                    color: reviewColors[q].color,
                  }}
                  onClick={() => handleReview(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-5 flex justify-between gap-4">
            <Button
              className="min-h-[44px]"
              style={{ background: 'rgba(20,27,36,0.8)', border: '1px solid rgba(255,255,255,0.06)', color: '#F0F4F8' }}
              disabled={index === 0}
              onClick={() => { setIndex((i) => i - 1); setFlipped(false); }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <Button
              className="min-h-[44px]"
              style={{ background: 'rgba(20,27,36,0.8)', border: '1px solid rgba(255,255,255,0.06)', color: '#F0F4F8' }}
              disabled={index >= displayCards.length - 1}
              onClick={() => { setIndex((i) => i + 1); setFlipped(false); }}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="mt-5">
            <SourceCitations sources={sources} title="Flashcard sources" />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && displayCards.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl p-12 text-center"
          style={cardStyle}
        >
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(124,106,245,0.12)' }}
          >
            <Layers className="h-7 w-7" style={{ color: '#7C6AF5' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>No flashcards yet</p>
          <p className="mt-1 text-xs max-w-xs" style={{ color: '#4A5568' }}>
            Generate flashcards from your content to start studying.
          </p>
        </motion.div>
      )}
    </AppShell>
  );
}
