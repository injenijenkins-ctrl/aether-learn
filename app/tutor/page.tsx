'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Brain,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquareQuote,
  Send,
  Wand2,
} from 'lucide-react';
import { useChat, type ChatSourceCitation } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: ChatSourceCitation[];
}

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

const tutorModes = [
  {
    id: 'coach',
    label: 'Coach',
    icon: GraduationCap,
    instruction:
      'Teach like an elite private tutor. Start with the core idea, use a concrete example, then give the student one next step.',
  },
  {
    id: 'socratic',
    label: 'Socratic',
    icon: HelpCircle,
    instruction:
      'Use a Socratic style. Ask short guiding questions, reveal hints gradually, and avoid giving the full answer too early.',
  },
  {
    id: 'exam',
    label: 'Exam Prep',
    icon: ClipboardList,
    instruction:
      'Answer like an examiner and revision coach. Emphasize likely test angles, scoring points, and common mistakes.',
  },
  {
    id: 'simple',
    label: 'Simplify',
    icon: Brain,
    instruction:
      'Explain the concept in simple language first, then rebuild toward the technical version with minimal jargon.',
  },
] as const;

const promptStarters = [
  'Explain this like I am learning it for the first time:',
  'Quiz me on the most important ideas from my sources about:',
  'Create a memory trick and a quick recap for:',
  'Show me common exam mistakes for:',
];

const chatCreditLimitMessage =
  "You've used all your free requests for today. Credits reset in a few hours. Go to Settings to add your API key for unlimited access.";

function getFriendlyChatError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  let parsedMessage = rawMessage;

  try {
    const parsed = JSON.parse(rawMessage) as { error?: string };
    if (parsed.error) parsedMessage = parsed.error;
  } catch {
    // Keep the original message for keyword checks only.
  }

  if (
    rawMessage.includes('429') ||
    parsedMessage.toLowerCase().includes('free requests') ||
    parsedMessage.toLowerCase().includes('credits') ||
    parsedMessage.toLowerCase().includes('api key')
  ) {
    return chatCreditLimitMessage;
  }

  return "Couldn't get a response. Please try again.";
}

export default function TutorPage() {
  const { streamChat, loading } = useChat();
  const [selectedMode, setSelectedMode] = useState<(typeof tutorModes)[number]['id']>('coach');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      content:
        "Hi! Ask me anything — I'll teach you from your content, or answer from my own knowledge if you haven't added anything yet.",
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeMode = tutorModes.find((mode) => mode.id === selectedMode) ?? tutorModes[0];

  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get('prompt');
    if (prompt) setInput(prompt);
  }, []);

  const applyStarter = (starter: string) => {
    setInput((current) => current.trim() ? `${starter} ${current.trim()}` : `${starter} `);
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query };
    const aiId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, userMsg, { id: aiId, role: 'ai', content: '' }]);
    setInput('');

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.role !== 'ai' || m.content)
        .slice(-10)
        .map((m) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        }));

      await streamChat(
        query,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => m.id === aiId ? { ...m, content: m.content + chunk } : m)
          );
        },
        history,
        (metadata) => {
          if (!metadata.sources) return;
          setMessages((prev) =>
            prev.map((m) => m.id === aiId ? { ...m, sources: metadata.sources } : m)
          );
        },
        { tutorModeInstruction: activeMode.instruction }
      );
      logActivity({ type: 'chat', title: query.slice(0, 60) });
    } catch (error) {
      const friendlyMessage = getFriendlyChatError(error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, content: friendlyMessage } : m
        )
      );
    }

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AppShell
      title="AI Tutor"
      description="Streaming chat with retrieval-augmented context from your ingested materials."
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-w-0 flex-col overflow-hidden rounded-2xl"
        style={{
          height: 'calc(100vh - 13rem)',
          ...cardStyle,
        }}
      >
        <div
          className="flex items-center justify-between gap-4 px-4 py-3 md:px-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(124,106,245,0.12)' }}
            >
              <Wand2 className="h-5 w-5" style={{ color: '#7C6AF5' }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>AetherLearn Tutor</p>
              <p className="truncate text-xs" style={{ color: '#8B9AB0' }}>Streaming answers with your learning context</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <activeMode.icon className="h-4 w-4" style={{ color: '#34D399' }} />
            <span
              className="rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.16)' }}
            >
              {activeMode.label}
            </span>
          </div>
        </div>

        <div
          className="space-y-3 px-3 py-3 sm:px-4 md:px-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tutorModes.map((mode) => {
              const active = mode.id === selectedMode;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedMode(mode.id)}
                  className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors"
                  style={
                    active
                      ? { background: 'rgba(124,106,245,0.18)', borderColor: 'rgba(124,106,245,0.35)', color: '#F0F4F8' }
                      : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', color: '#8B9AB0' }
                  }
                >
                  <mode.icon className="h-3.5 w-3.5" />
                  {mode.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {promptStarters.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => applyStarter(starter)}
                className="inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-full px-3 text-xs transition-colors hover:bg-white/[0.06]"
                style={{ background: 'rgba(91,141,245,0.09)', color: '#B7C9FF', border: '1px solid rgba(91,141,245,0.16)' }}
              >
                <MessageSquareQuote className="h-3.5 w-3.5" />
                {starter.replace(':', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('min-w-0 max-w-[92%] sm:max-w-[85%]', msg.role === 'user' ? 'ml-auto' : 'mr-auto')}
            >
              {msg.role === 'ai' && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
                  >
                    <Wand2 className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#7C6AF5' }}>AetherLearn</span>
                </div>
              )}
              <div
                className="min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={
                  msg.role === 'user'
                    ? {
                        background: 'linear-gradient(135deg, rgba(124,106,245,0.25) 0%, rgba(91,141,245,0.2) 100%)',
                        border: '1px solid rgba(124,106,245,0.3)',
                        color: '#F0F4F8',
                        boxShadow: '0 12px 30px rgba(91,141,245,0.08)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#F0F4F8',
                      }
                }
              >
                {msg.content ? (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                ) : (
                  msg.role === 'ai' && loading && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full animate-bounce"
                        style={{ background: '#7C6AF5', animationDelay: '0ms' }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full animate-bounce"
                        style={{ background: '#7C6AF5', animationDelay: '150ms' }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full animate-bounce"
                        style={{ background: '#7C6AF5', animationDelay: '300ms' }}
                      />
                    </div>
                  )
                )}
                {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                  <div
                    className="mt-3 space-y-2 rounded-xl p-3"
                    style={{
                      background: 'rgba(124,106,245,0.07)',
                      border: '1px solid rgba(124,106,245,0.14)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#A78BFA' }}>
                      <FileText className="h-3.5 w-3.5" />
                      Sources
                    </div>
                    <div className="space-y-2">
                      {msg.sources.map((source) => (
                        <div key={source.id} className="min-w-0 text-xs leading-relaxed">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-semibold"
                              style={{ background: 'rgba(124,106,245,0.18)', color: '#C4B5FD' }}
                            >
                              {source.number}
                            </span>
                            <span className="truncate font-medium" style={{ color: '#F0F4F8' }}>
                              {source.title}
                            </span>
                            <span className="shrink-0 capitalize" style={{ color: '#4A5568' }}>
                              {source.type}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 break-words pl-7" style={{ color: '#8B9AB0' }}>
                            {source.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="p-3 sm:p-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <form
            className="flex min-w-0 gap-2"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your content..."
              className="min-h-[44px] min-w-0 flex-1"
              style={inputStyle}
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="min-h-[44px] min-w-[44px] text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </motion.div>
    </AppShell>
  );
}
