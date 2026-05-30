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
  Database,
} from 'lucide-react';
import { useIngest, type IngestedResource } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';

type TabId = 'url' | 'text' | 'file' | 'audio';

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const inputStyle = {
  background: 'rgba(20,27,36,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#F0F4F8',
};

const textareaClass =
  'w-full resize-none rounded-xl p-4 text-sm outline-none transition-colors focus:border-[#7C6AF5]/60 focus:ring-2 focus:ring-[#7C6AF5]/20';

const gradientButtonStyle = {
  background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)',
  border: 'none',
  color: '#ffffff',
};

export default function IngestionPage() {
  const {
    ingestUrl,
    ingestText,
    ingestFile,
    transcribeAudio,
    listResources,
    deleteResource,
    loading,
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
      toast.error("Couldn't process that content. Check the URL or try pasting the text directly.");
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
      toast.error("Couldn't process that content. Check the URL or try pasting the text directly.");
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
      toast.error("Couldn't process that content. Check the URL or try pasting the text directly.");
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
      toast.error("Couldn't process that content. Check the URL or try pasting the text directly.");
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
      toast.error("Couldn't process that content. Check the URL or try pasting the text directly.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResource(id);
      toast.success('Resource deleted');
      await refresh();
    } catch {
      toast.error("Couldn't delete that resource. Please try again.");
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
      <div className="grid min-w-0 gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-w-0 rounded-2xl p-4 sm:p-6"
          style={cardStyle}
        >
          <div className="mb-7">
            <div
              className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(124,106,245,0.12)' }}
            >
              <Upload className="h-5 w-5" style={{ color: '#7C6AF5' }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>Add learning material</h2>
            <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
              Bring in sources, notes, files, or media transcripts for the rest of the app.
            </p>
          </div>

          <div
            className="mb-6 flex min-w-0 gap-2 overflow-x-auto rounded-2xl p-1 sm:grid sm:grid-cols-4 sm:overflow-visible"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex min-h-[44px] min-w-max shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors sm:min-w-0"
                style={
                  activeTab === tab.id
                    ? { background: 'rgba(124,106,245,0.16)', color: '#F0F4F8', border: '1px solid rgba(124,106,245,0.24)' }
                    : { color: '#8B9AB0', border: '1px solid transparent' }
                }
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.id === 'file' ? 'File' : tab.id === 'audio' ? 'Media' : tab.label}
                </span>
              </button>
            ))}
          </div>

          {loading && (
            <div
              className="mb-6 rounded-2xl p-4"
              style={{ background: 'rgba(124,106,245,0.08)', border: '1px solid rgba(124,106,245,0.18)' }}
            >
              <div className="flex items-center gap-3 text-sm font-medium" style={{ color: '#F0F4F8' }}>
                <span>Processing your content...</span>
                <span className="flex items-center gap-1">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 animate-bounce rounded-full"
                      style={{ background: '#7C6AF5', animationDelay: `${dot * 150}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <label className="text-sm font-medium" style={{ color: '#8B9AB0' }}>Learning Resource URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="min-h-[44px]"
                style={inputStyle}
              />
              <Button
                onClick={handleUrlIngest}
                disabled={loading}
                className="min-h-[44px] w-full"
                style={gradientButtonStyle}
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
              <label className="text-sm font-medium" style={{ color: '#8B9AB0' }}>Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My study notes"
                className="min-h-[44px]"
                style={inputStyle}
              />
              <label className="text-sm font-medium" style={{ color: '#8B9AB0' }}>Content</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your learning material..."
                className={`${textareaClass} h-48`}
                style={inputStyle}
              />
              <p className="text-xs" style={{ color: '#4A5568' }}>
                Minimum 51 characters ({text.length} entered)
              </p>
              <Button
                onClick={handleTextIngest}
                disabled={loading}
                className="min-h-[44px] w-full"
                style={gradientButtonStyle}
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
              <label className="text-sm font-medium" style={{ color: '#8B9AB0' }}>PDF, TXT, or DOCX (max 10MB)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx"
                className="block w-full rounded-xl border p-2 text-sm file:mr-4 file:min-h-[40px] file:rounded-lg file:border-0 file:bg-[#7C6AF5] file:px-4 file:py-2 file:text-white"
                style={{ ...inputStyle, borderColor: 'rgba(255,255,255,0.06)' }}
                onChange={handleFileSelect}
              />
              {fileName && (
                <p className="text-sm" style={{ color: '#7C6AF5' }}>
                  <Upload className="mr-1 inline h-4 w-4" />
                  {fileName}
                  {uploadProgress > 0 && ` · ${uploadProgress}%`}
                </p>
              )}
              <label className="text-sm font-medium" style={{ color: '#8B9AB0' }}>Title (optional)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="min-h-[44px]"
                style={inputStyle}
              />
              <Button
                onClick={handleFileIngest}
                disabled={loading || !selectedFile}
                className="min-h-[44px] w-full"
                style={gradientButtonStyle}
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
              <label className="text-sm font-medium" style={{ color: '#8B9AB0' }}>
                MP3, MP4, WAV, M4A, WEBM (max 25MB)
              </label>
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.mp4,.wav,.m4a,.webm,audio/*,video/*"
                className="block w-full rounded-xl border p-2 text-sm file:mr-4 file:min-h-[40px] file:rounded-lg file:border-0 file:bg-[#7C6AF5] file:px-4 file:py-2 file:text-white"
                style={{ ...inputStyle, borderColor: 'rgba(255,255,255,0.06)' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setAudioFile(f || null);
                  setTranscribedText('');
                }}
              />
              {audioFile && (
                <p className="text-sm" style={{ color: '#7C6AF5' }}>{audioFile.name}</p>
              )}
              <Button
                onClick={handleTranscribe}
                disabled={transcribing || loading || !audioFile}
                variant="outline"
                className="min-h-[44px] w-full"
                style={{ background: 'rgba(124,106,245,0.08)', border: '1px solid rgba(124,106,245,0.22)', color: '#F0F4F8' }}
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
                  <label className="text-sm font-medium" style={{ color: '#8B9AB0' }}>Transcription preview</label>
                  <textarea
                    readOnly
                    value={transcribedText}
                    className={`${textareaClass} h-40`}
                    style={inputStyle}
                  />
                  <Button
                    onClick={handleConfirmIngestTranscript}
                    disabled={loading}
                    className="min-h-[44px] w-full"
                    style={gradientButtonStyle}
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="min-w-0 rounded-2xl p-4 sm:p-6"
          style={cardStyle}
        >
          <div className="mb-5 flex items-start gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(91,141,245,0.12)' }}
            >
              <Database className="h-5 w-5" style={{ color: '#5B8DF5' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>Ingested Resources</h2>
              <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>Your active knowledge base for lessons, chat, and quizzes.</p>
            </div>
          </div>
          {resources.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-sm"
              style={{ background: 'rgba(255,255,255,0.03)', color: '#8B9AB0', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              No resources yet. Ingest content to power lessons and chat.
            </div>
          ) : (
            <ul className="space-y-3">
              {resources.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start justify-between gap-3 rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  whileHover={{ borderColor: 'rgba(124,106,245,0.22)', background: 'rgba(20,27,36,0.72)' }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words" style={{ color: '#F0F4F8' }}>{r.title}</p>
                    <p className="break-words text-xs" style={{ color: '#8B9AB0' }}>
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
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </AppShell>
  );
}
