'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useLearn, type Summary } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';
import { providerHeaders, providerPayload } from '@/lib/ai-settings';

interface SavedNote {
  id: string;
  query: string;
  summary: Summary;
  createdAt: string;
}

export default function NotesPage() {
  const { generateSummary, loading } = useLearn();
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<SavedNote[]>([]);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSummarize = async () => {
    if (!query.trim()) {
      toast.error('Enter a topic');
      return;
    }
    try {
      const summary = await generateSummary(query.trim());
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...providerHeaders(),
        },
        body: JSON.stringify({
          ...providerPayload(),
          title: query.trim(),
          query: query.trim(),
          summary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadNotes();
      logActivity({ type: 'summary', title: query.slice(0, 60) });
      setQuery('');
      toast.success('Note saved');
    } catch {
      toast.error('Failed to generate summary');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await loadNotes();
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  return (
    <AppShell
      title="Notes"
      description="AI summaries saved in your database from your ingested knowledge base."
    >
      <div className="mb-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Topic to summarize..."
          className="min-h-[44px] border-white/10 bg-background/50"
        />
        <Button
          onClick={handleSummarize}
          disabled={loading}
          className="min-h-[44px] shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Summarize
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-muted-foreground">
          No notes yet. Generate a summary to build your study library.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] shrink-0"
                  onClick={() => handleDelete(note.id)}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
              <h3 className="mt-1 font-semibold">{note.query}</h3>
              <p className="mt-3 text-sm text-indigo-300">{note.summary?.oneLiner}</p>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {note.summary?.keyPoints?.slice(0, 5).map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg bg-background/50 p-3 text-sm">
                <strong className="text-foreground">Takeaway: </strong>
                {note.summary?.coreTakeaway}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Plus className="h-4 w-4" />
        Notes are stored securely in your Supabase database.
      </div>
    </AppShell>
  );
}
