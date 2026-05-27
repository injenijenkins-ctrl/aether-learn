'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Link2,
  FileText,
  Loader2,
  Trash2,
  Zap,
  Upload,
  Mic,
  FileUp,
} from 'lucide-react';
import { useIngest, type IngestedResource } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';

type TabId = 'url' | 'text' | 'file' | 'audio';

export default function IngestionPage() {
  const {
    ingestUrl,
    ingestText,
    ingestFile,
    transcribeAudio,
    listResources,
    deleteResource,
    loading,
    error,
  } = useIngest();
  const [activeTab, setActiveTab] = useState<TabId>('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [resources, setResources] = useState<IngestedResource[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listResources();
      setResources(list);
    } catch {
      setResources([]);
    }
  }, [listResources]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleUrlIngest = async () => {
    if (!url.trim()) {
      toast.error('Enter a URL');
      return;
    }
    try {
      const result = await ingestUrl(url.trim());
      logActivity({ type: 'ingest', title: result.title });
      toast.success(`Ingested "${result.title}" (${result.chunkCount} chunks)`);
      setUrl('');
      await refresh();
    } catch {
      // error handled in hook
    }
  };

  const handleTextIngest = async () => {
    if (text.length <= 50) {
      toast.error('Text must be longer than 50 characters');
      return;
    }
    try {
      const result = await ingestText(text, title || 'Untitled Document');
      logActivity({ type: 'ingest', title: result.title });
      toast.success(`Ingested "${result.title}" (${result.chunkCount} chunks)`);
      setText('');
      setTitle('');
      await refresh();
    } catch {
      // error handled in hook
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    setUploadProgress(0);
  };

  const handleFileIngest = async () => {
    if (!selectedFile) {
      toast.error('Select a file first');
      return;
    }
    setUploadProgress(30);
    try {
      const result = await ingestFile(selectedFile, title || undefined);
      setUploadProgress(100);
      logActivity({ type: 'ingest', title: result.title });
      toast.success(`Ingested "${result.title}" (${result.chunkCount} chunks)`);
      setSelectedFile(null);
      setFileName('');
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refresh();
    } catch {
      setUploadProgress(0);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile) {
      toast.error('Select an audio or video file');
      return;
    }
    setTranscribing(true);
    setTranscribedText('');
    try {
      const result = await transcribeAudio(audioFile);
      setTranscribedText(result.text);
      toast.success('Transcription complete — review and confirm below');
    } catch {
      toast.error('Transcription failed');
    } finally {
      setTranscribing(false);
    }
  };

  const handleConfirmIngestTranscript = async () => {
    if (transcribedText.length <= 50) {
      toast.error('Transcribed text must be longer than 50 characters');
      return;
    }
    try {
      const ingestTitle =
        title || audioFile?.name.replace(/\.[^.]+$/, '') || 'Audio transcript';
      const result = await ingestText(transcribedText, ingestTitle);
      logActivity({ type: 'ingest', title: result.title });
      toast.success(`Ingested "${result.title}" (${result.chunkCount} chunks)`);
      setTranscribedText('');
      setAudioFile(null);
      setTitle('');
      if (audioInputRef.current) audioInputRef.current.value = '';
      await refresh();
    } catch {
      // hook handles error
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResource(id);
      toast.success('Resource deleted');
      await refresh();
    } catch {
      // error in hook
    }
  };

  const tabs: { id: TabId; label: string; icon: typeof Link2 }[] = [
    { id: 'url', label: 'URL', icon: Link2 },
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'file', label: 'Upload File', icon: FileUp },
    { id: 'audio', label: 'Upload Audio/Video', icon: Mic },
  ];

  return (
    <AppShell
      title="Content Ingestion"
      description="Add any content — a website, document, or your own notes — and AetherLearn will turn it into a personal knowledge base you can learn from."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl"
        >
          <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[44px] items-center gap-2 border-b-2 px-3 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.id === 'file' ? 'File' : tab.id === 'audio' ? 'Media' : tab.label}
                </span>
              </button>
            ))}
          </div>

          {activeTab === 'url' && (
            <div className="space-y-4">
              <label className="text-sm font-medium">Learning Resource URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="min-h-[44px] border-white/10 bg-background/50"
              />
              <Button
                onClick={handleUrlIngest}
                disabled={loading}
                className="min-h-[44px] w-full bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Scrape & Ingest
              </Button>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-4">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My study notes"
                className="min-h-[44px] border-white/10 bg-background/50"
              />
              <label className="text-sm font-medium">Content</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your learning material..."
                className="h-48 w-full resize-none rounded-lg border border-white/10 bg-background/50 p-4 text-sm focus:border-indigo-500/50 focus:outline-none"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 51 characters ({text.length} entered)
              </p>
              <Button
                onClick={handleTextIngest}
                disabled={loading}
                className="min-h-[44px] w-full bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Ingest Text
              </Button>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-4">
              <label className="text-sm font-medium">PDF, TXT, or DOCX (max 10MB)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:min-h-[44px] file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white"
                onChange={handleFileSelect}
              />
              {fileName && (
                <p className="text-sm text-indigo-300">
                  <Upload className="mr-1 inline h-4 w-4" />
                  {fileName}
                  {uploadProgress > 0 && ` · ${uploadProgress}%`}
                </p>
              )}
              <label className="text-sm font-medium">Title (optional)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="min-h-[44px] border-white/10 bg-background/50"
              />
              <Button
                onClick={handleFileIngest}
                disabled={loading || !selectedFile}
                className="min-h-[44px] w-full bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Extract & Ingest
              </Button>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-4">
              <label className="text-sm font-medium">
                MP3, MP4, WAV, M4A, WEBM (max 25MB)
              </label>
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.mp4,.wav,.m4a,.webm,audio/*,video/*"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:min-h-[44px] file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setAudioFile(f || null);
                  setTranscribedText('');
                }}
              />
              {audioFile && (
                <p className="text-sm text-indigo-300">{audioFile.name}</p>
              )}
              <Button
                onClick={handleTranscribe}
                disabled={transcribing || loading || !audioFile}
                variant="outline"
                className="min-h-[44px] w-full"
              >
                {transcribing || loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="mr-2 h-4 w-4" />
                )}
                Transcribe with Whisper
              </Button>
              {transcribedText && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Transcription preview</label>
                  <textarea
                    readOnly
                    value={transcribedText}
                    className="h-40 w-full resize-none rounded-lg border border-white/10 bg-background/50 p-4 text-sm"
                  />
                  <Button
                    onClick={handleConfirmIngestTranscript}
                    disabled={loading}
                    className="min-h-[44px] w-full bg-gradient-to-r from-indigo-600 to-purple-600"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Confirm & Ingest
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>

        <div className="rounded-2xl border border-white/[0.15] bg-white/[0.08] p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold">Ingested Resources</h2>
          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No resources yet. Ingest content to power lessons and chat.
            </p>
          ) : (
            <ul className="space-y-3">
              {resources.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-background/40 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-words">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.type} · {r.chunkCount} chunks ·{' '}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px] shrink-0"
                    onClick={() => handleDelete(r.id)}
                    disabled={loading}
                    aria-label="Delete resource"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
