'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { useChat } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export default function TutorPage() {
  const { streamChat, loading, error } = useChat();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      content:
        "Hi! I'm your AI tutor. Ask me anything about your ingested content—I'll use RAG to find relevant chunks and explain clearly.",
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };
    const aiId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: aiId, role: 'ai', content: '' },
    ]);
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
            prev.map((m) =>
              m.id === aiId ? { ...m, content: m.content + chunk } : m
            )
          );
        },
        history
      );
      logActivity({ type: 'chat', title: query.slice(0, 60) });
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? {
                ...m,
                content: error || 'Something went wrong. Check your API key.',
              }
            : m
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
      <div className="flex h-[calc(100vh-12rem)] flex-col rounded-2xl border border-white/[0.15] bg-white/[0.06] backdrop-blur-xl">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'ml-auto bg-indigo-600/80 text-white'
                  : 'mr-auto border border-white/10 bg-background/60'
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'ai' && !msg.content && loading && (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              )}
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/10 p-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your content..."
              className="border-white/10 bg-background/50"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
