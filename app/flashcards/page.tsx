'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function FlashcardsPage() {
  const { generateFlashcards, loading } = useLearn();
  const [topic, setTopic] = useState('');
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [reviewMap, setReviewMap] = useState<Record<string, string>>({});
  const [dueCards, setDueCards] = useState<ReviewRow[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<'browse' | 'due'>('browse');

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/flashcards/review');
      const data = await res.json();
      setDueCards(data.due || []);
      const map: Record<string, string> = {};
      for (const row of data.all || []) {
        map[row.cardId] = row.id;
      }
      setReviewMap(map);
    } catch {
      setDueCards([]);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Enter a topic');
      return;
    }
    try {
      const generated = await generateFlashcards(topic.trim());
      setCards(generated);
      setIndex(0);
      setFlipped(false);
      setMode('browse');

      for (const card of generated) {
        await fetch('/api/flashcards/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: card.id,
            front: card.front,
            back: card.back,
            topic: topic.trim(),
          }),
        });
      }
      await loadReviews();
      toast.success(`Generated ${generated.length} flashcards`);
    } catch {
      toast.error('Failed to generate flashcards');
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
    mode === 'due'
      ? dueCards.map((d) => ({
          id: d.cardId,
          front: d.front,
          back: d.back,
        }))
      : cards;

  const current = displayCards[index];

  return (
    <AppShell
      title="Flashcards"
      description="Flip cards with spaced repetition (SM-2) powered by your ingested content."
    >
      {dueCards.length > 0 && (
        <div className="mb-8 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-orange-300">Due for review</h2>
              <p className="text-sm text-muted-foreground">
                {dueCards.length} card{dueCards.length === 1 ? '' : 's'} due today
              </p>
            </div>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => {
                setMode('due');
                setIndex(0);
                setFlipped(false);
              }}
            >
              Study due cards
            </Button>
          </div>
        </div>
      )}

      <div className="mb-8 max-w-xl space-y-4 rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
        <div>
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Key vocabulary from my notes"
            className="mt-2 min-h-[44px] border-white/10 bg-background/50"
          />
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="min-h-[44px] bg-gradient-to-r from-indigo-600 to-purple-600"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Flashcards
        </Button>
        {mode === 'due' && (
          <Button
            variant="ghost"
            className="min-h-[44px]"
            onClick={() => {
              setMode('browse');
              setIndex(0);
            }}
          >
            Back to all cards
          </Button>
        )}
      </div>

      {current && (
        <div className="mx-auto max-w-lg">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Card {index + 1} of {displayCards.length}
            {mode === 'due' && ' · Due review'}
          </p>
          <motion.div
            className="perspective-1000 cursor-pointer"
            onClick={() => setFlipped(!flipped)}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5 }}
              className="relative min-h-[240px] rounded-2xl border border-white/[0.15] bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-8 backdrop-blur-xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center p-6 text-center"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: flipped ? 'rotateY(180deg)' : 'none',
                }}
              >
                <p className="text-lg font-semibold">
                  {flipped ? current.back : current.front}
                </p>
              </div>
            </motion.div>
          </motion.div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Click to flip · <RotateCw className="inline h-3 w-3" />
          </p>

          {flipped && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(['hard', 'good', 'easy'] as ReviewQuality[]).map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  className="min-h-[44px] capitalize"
                  onClick={() => handleReview(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-between gap-4">
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={index === 0}
              onClick={() => {
                setIndex((i) => i - 1);
                setFlipped(false);
              }}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px]"
              disabled={index >= displayCards.length - 1}
              onClick={() => {
                setIndex((i) => i + 1);
                setFlipped(false);
              }}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {displayCards.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.15] bg-white/[0.08] p-8 text-center backdrop-blur-xl"
        >
          <Layers className="h-12 w-12 text-indigo-400/80 mb-3" />
          <p className="text-sm text-muted-foreground max-w-sm">
            No flashcards yet. Generate flashcards from your content to start studying.
          </p>
        </motion.div>
      )}
    </AppShell>
  );
}
