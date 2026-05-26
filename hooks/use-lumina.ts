'use client';

import { useCallback, useState } from 'react';
import { providerHeaders, providerPayload } from '@/lib/ai-settings';

export interface IngestedResource {
  id: string;
  title: string;
  type: 'url' | 'text' | 'file' | 'audio';
  chunkCount: number;
  createdAt: string;
}

export type LessonDepth = 'beginner' | 'deeper' | 'real_world' | 'simpler';

export interface Lesson {
  title: string;
  explanation: string;
  keyPoints: string[];
  commonMistakes: string[];
  depth: string;
}

export interface Summary {
  oneLiner: string;
  keyPoints: string[];
  coreTakeaway: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: string;
  options: string[];
  correctAnswer: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
}

function withProvider<T extends Record<string, unknown>>(data: T) {
  return { ...data, ...providerPayload() };
}

export function useIngest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingestUrl = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ingest/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify(withProvider({ url })),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ingest URL');
      return data as IngestedResource;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ingest failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const ingestText = useCallback(async (text: string, title: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ingest/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify(withProvider({ text, title })),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ingest text');
      return data as IngestedResource;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ingest failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const ingestFile = useCallback(async (file: File, title?: string) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);

      const res = await fetch('/api/ingest/file', {
        method: 'POST',
        headers: { ...providerHeaders() },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ingest file');
      return data as IngestedResource;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'File ingest failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const transcribeAudio = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'transcribe');

      const res = await fetch('/api/ingest/audio', {
        method: 'POST',
        headers: { ...providerHeaders() },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed');
      return data as { text: string; filename: string };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transcription failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const ingestAudioText = useCallback(
    async (file: File, title?: string) => {
      setLoading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('action', 'ingest');
        if (title) formData.append('title', title);

        const res = await fetch('/api/ingest/audio', {
          method: 'POST',
          headers: { ...providerHeaders() },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Audio ingest failed');
        return data as IngestedResource;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Audio ingest failed';
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const listResources = useCallback(async () => {
    const res = await fetch('/api/ingest/list');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to list resources');
    return (data.resources || []) as IngestedResource[];
  }, []);

  const deleteResource = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ingest/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ingestUrl,
    ingestText,
    ingestFile,
    transcribeAudio,
    ingestAudioText,
    listResources,
    deleteResource,
    loading,
    error,
  };
}

export function useLearn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateLesson = useCallback(
    async (
      query: string,
      depth: LessonDepth = 'beginner',
      userLevel?: 'beginner' | 'intermediate' | 'advanced'
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/learn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...providerHeaders() },
          body: JSON.stringify(withProvider({ query, depth, userLevel })),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate lesson');
        return data as Lesson;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Lesson failed';
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const generateSummary = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/learn/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify(withProvider({ query })),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarize');
      return data as Summary;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Summary failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateFlashcards = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/learn/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify(withProvider({ query })),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate flashcards');
      return (data.cards || []) as FlashcardItem[];
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Flashcards failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateQuiz = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/learn/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify(withProvider({ query })),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz');
      return data as Quiz;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Quiz failed';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveQuizResult = useCallback(
    async (topic: string, score: number, total: number) => {
      try {
        await fetch('/api/learn/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...providerHeaders() },
          body: JSON.stringify(withProvider({ query: topic, score, total })),
        });
      } catch {
        // non-blocking
      }
    },
    []
  );

  return {
    generateLesson,
    generateSummary,
    generateFlashcards,
    generateQuiz,
    saveQuizResult,
    loading,
    error,
  };
}

export function useChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamChat = useCallback(
    async (
      query: string,
      onChunk: (chunk: string) => void,
      messages?: { role: 'user' | 'assistant'; content: string }[]
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...providerHeaders() },
          body: JSON.stringify(withProvider({ query, messages })),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Chat stream failed');
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          onChunk(decoder.decode(value, { stream: true }));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Chat failed';
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { streamChat, loading, error };
}
