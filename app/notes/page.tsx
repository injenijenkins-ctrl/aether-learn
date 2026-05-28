'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Sparkles, Trash2, Pencil } from 'lucide-react';
import { useLearn, type Summary } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';
import { providerHeaders, providerPayload } from '@/lib/ai-settings';

interface SavedNote {
  id: string;
  query: string;
  summary: Summary;
  createdAt: string;
}

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

export default function NotesPage() {
  const { generateSummary, loading } = useLearn();
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<SavedNote[]>([]);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data.notes || []);
    } catch { setNotes([]); }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleSummarize = async () => {
    if (!query.trim()) { toast.error('Enter a topic'); return; }
    try {
      const summary = await generateSummary(query.trim());
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify({ ...providerPayload(), title: query.trim(), query: query.trim(), summary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadNotes();
      logActivity({ type: 'summary', title: query.slice(0, 60) });
      setQuery('');
      toast.success('Note saved');
    } catch { toast.error('Failed to generate summary'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await loadNotes();
      toast.success('Note deleted');
    } catch { toast.error('Failed to delete note'); }
  };

  return (
    <AppShell
      title="Notes"
      description="AI summaries saved in your database from your ingested knowledge base."
    >
      {/* Input bar */}
      <div className="mb-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Topic to summarize..."
          className="min-h-[44px]"
          style={{ background: 'rgba(20,27,36,0.8)', border: '1px solid rgba(255,255,255,0.06)', color: '#F0F4F8' }}
          onKeyDown={(e) => e.key === 'Enter' && handleSummarize()}
        />
        <Button
          onClick={handleSummarize}
          disabled={loading}
          className="min-h-[44px] shrink-0 text-white"
          style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Summarize
        </Button>
      </div>

      {/* Notes grid */}
      {notes.length === 0 ? (
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
            <Pencil className="h-7 w-7" style={{ color: '#7C6AF5' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>No notes yet</p>
          <p className="mt-1 text-xs max-w-xs" style={{ color: '#4A5568' }}>
            Start capturing your thoughts and insights.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-5"
              style={cardStyle}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs" style={{ color: '#4A5568' }}>
                  {new Date(note.createdAt).toLocaleString()}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[36px] min-w-[36px] shrink-0 -mt-1 -mr-1"
                  style={{ color: '#F87171' }}
                  onClick={() => handleDelete(note.id)}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="mt-1 text-sm font-semibold" style={{ color: '#F0F4F8' }}>{note.query}</h3>
              <p className="mt-2 text-sm" style={{ color: '#7C6AF5' }}>{note.summary?.oneLiner}</p>
              <ul className="mt-3 space-y-1">
                {note.summary?.keyPoints?.slice(0, 5).map((p, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs" style={{ color: '#8B9AB0' }}>
                    <span style={{ color: '#5B8DF5', marginTop: 2 }}>•</span>
                    {p}
                  </li>
                ))}
              </ul>
              <div
                className="mt-4 rounded-xl p-3 text-xs"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="font-semibold" style={{ color: '#F0F4F8' }}>Takeaway: </span>
                <span style={{ color: '#8B9AB0' }}>{note.summary?.coreTakeaway}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 text-xs" style={{ color: '#4A5568' }}>
        <Plus className="h-3.5 w-3.5" />
        Notes are stored securely in your Supabase database.
      </div>
    </AppShell>
  );
}
