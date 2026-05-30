'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { providerHeaders, providerPayload } from '@/lib/ai-settings';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, FileSearch, Loader2, Target, Upload, XCircle } from 'lucide-react';

type PaperAnalysis = {
  id: string;
  exam_type: string;
  title: string;
  analysis: {
    summary?: string;
    questionPatterns?: { type: string; frequency: number; skills?: string[]; markingHints?: string[] }[];
    markingSchemeSignals?: string[];
    highYieldTopics?: { topic: string; reason: string }[];
    practicePlan?: { questionType: string; drill: string; why: string }[];
  };
  created_at: string;
};

type Weakness = { questionType: string; attempts: number; accuracy: number };

const cardStyle = {
  background: 'rgba(13,17,23,0.82)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const inputStyle = {
  background: 'rgba(20,27,36,0.88)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#F0F4F8',
};

export default function PastPaperIntelPage() {
  const [examType, setExamType] = useState('KCSE');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [analyses, setAnalyses] = useState<PaperAnalysis[]>([]);
  const [weaknesses, setWeaknesses] = useState<Weakness[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = analyses.find((analysis) => analysis.id === selectedId) || analyses[0] || null;

  const load = useCallback(async () => {
    const res = await fetch('/api/past-paper-intel');
    const data = await res.json();
    if (res.ok) {
      setAnalyses(data.analyses || []);
      setWeaknesses(data.trackedWeaknesses || []);
      setSelectedId((current) => current || data.analyses?.[0]?.id || null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const analyze = async () => {
    if (!file && text.trim().length < 80) {
      toast.error('Upload a paper or paste at least 80 characters');
      return;
    }
    setLoading(true);
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append('file', file);
        form.append('examType', examType);
        form.append('title', title || file.name);
        res = await fetch('/api/past-paper-intel', {
          method: 'POST',
          headers: { ...providerHeaders() },
          body: form,
        });
      } else {
        res = await fetch('/api/past-paper-intel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...providerHeaders() },
          body: JSON.stringify({ ...providerPayload(), examType, title: title || `${examType} paper`, text }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      await load();
      setSelectedId(data.id);
      setText('');
      setFile(null);
      toast.success('Past paper intelligence ready');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const trackAttempt = async (questionType: string, correct: boolean) => {
    if (!selected) return;
    const res = await fetch('/api/past-paper-intel', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisId: selected.id, questionType, correct }),
    });
    if (res.ok) {
      toast.success(correct ? 'Marked as strong' : 'Tracked as a struggle');
      await load();
    }
  };

  return (
    <AppShell
      title="Past Paper Intelligence"
      description="Upload KCSE, WASSCE, or JAMB papers to extract question patterns, marking signals, and tracked weak question types."
    >
      <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="mb-4 flex items-center gap-3">
            <FileSearch className="h-5 w-5" style={{ color: '#A99BFF' }} />
            <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>Analyze a paper</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={examType} onChange={(e) => setExamType(e.target.value.toUpperCase())} placeholder="KCSE, WASSCE, JAMB" className="min-h-[44px]" style={inputStyle} />
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Paper title" className="min-h-[44px]" style={inputStyle} />
          </div>
          <input
            type="file"
            accept=".pdf,.txt,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-3 block w-full rounded-xl border p-2 text-sm file:mr-4 file:min-h-[40px] file:rounded-lg file:border-0 file:bg-[#7C6AF5] file:px-4 file:py-2 file:text-white"
            style={inputStyle}
          />
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Or paste the past paper text and marking scheme here..." className="mt-3 min-h-44 resize-none" style={inputStyle} />
          <Button onClick={analyze} disabled={loading} className="mt-4 min-h-[44px] text-white" style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Analyze paper
          </Button>
        </div>

        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="mb-4 flex items-center gap-3">
            <Target className="h-5 w-5" style={{ color: '#F87171' }} />
            <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>Tracked struggles</h2>
          </div>
          {weaknesses.length === 0 ? (
            <p className="text-sm" style={{ color: '#8B9AB0' }}>Mark question types as correct or missed to build your pattern profile.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weaknesses.slice(0, 8)}>
                  <XAxis dataKey="questionType" stroke="#4A5568" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#4A5568" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="#F87171" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          {analyses.map((analysis) => (
            <button key={analysis.id} type="button" onClick={() => setSelectedId(analysis.id)} className="w-full rounded-2xl p-4 text-left" style={{ ...cardStyle, border: selected?.id === analysis.id ? '1px solid rgba(124,106,245,0.35)' : cardStyle.border }}>
              <p className="font-semibold" style={{ color: '#F0F4F8' }}>{analysis.title}</p>
              <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>{analysis.exam_type} / {new Date(analysis.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>

        {selected ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h2 className="text-lg font-bold" style={{ color: '#F0F4F8' }}>{selected.title}</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: '#8B9AB0' }}>{selected.analysis.summary}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {(selected.analysis.questionPatterns || []).map((pattern) => (
                <div key={pattern.type} className="rounded-2xl p-5" style={cardStyle}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>{pattern.type}</h3>
                      <p className="text-xs" style={{ color: '#8B9AB0' }}>Frequency: {pattern.frequency}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" className="min-h-[40px] min-w-[40px]" onClick={() => trackAttempt(pattern.type, true)}><CheckCircle2 className="h-4 w-4 text-green-400" /></Button>
                      <Button size="icon" variant="ghost" className="min-h-[40px] min-w-[40px]" onClick={() => trackAttempt(pattern.type, false)}><XCircle className="h-4 w-4 text-red-400" /></Button>
                    </div>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: '#A99BFF' }}>Skills</p>
                  <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>{pattern.skills?.join(', ') || 'Not specified'}</p>
                  <p className="mt-3 text-xs font-semibold" style={{ color: '#34D399' }}>Marking hints</p>
                  <ul className="mt-1 space-y-1 text-sm" style={{ color: '#8B9AB0' }}>
                    {(pattern.markingHints || []).map((hint) => <li key={hint}>{hint}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="mb-3 text-sm font-semibold" style={{ color: '#F0F4F8' }}>High-yield topics and practice plan</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {(selected.analysis.highYieldTopics || []).map((item) => (
                    <div key={item.topic} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>{item.topic}</p>
                      <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>{item.reason}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {(selected.analysis.practicePlan || []).map((item) => (
                    <div key={item.questionType} className="rounded-xl p-3" style={{ background: 'rgba(124,106,245,0.07)', border: '1px solid rgba(124,106,245,0.16)' }}>
                      <p className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>{item.questionType}</p>
                      <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>{item.drill} / {item.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="rounded-2xl p-8 text-center" style={cardStyle}>
            <p className="text-sm" style={{ color: '#8B9AB0' }}>Analyze a past paper to see question patterns.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
