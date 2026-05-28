'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Wand2 } from 'lucide-react';
import { useChat } from '@/hooks/use-lumina';
import { logActivity } from '@/lib/activity-store';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
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

export default function TutorPage() {
  const { streamChat, loading, error } = useChat();
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
        history
      );
      logActivity({ type: 'chat', title: query.slice(0, 60) });
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, content: error || 'Something went wrong. Check your API key.' } : m
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
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          height: 'calc(100vh - 13rem)',
          ...cardStyle,
        }}
      >
        <div
          className="flex items-center justify-between gap-4 px-4 py-3 md:px-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(124,106,245,0.12)' }}
            >
              <Wand2 className="h-5 w-5" style={{ color: '#7C6AF5' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>AetherLearn Tutor</p>
              <p className="text-xs" style={{ color: '#8B9AB0' }}>Streaming answers with your learning context</p>
            </div>
          </div>
          <div
            className="hidden rounded-full px-3 py-1.5 text-xs font-medium sm:block"
            style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.16)' }}
          >
            Live
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('max-w-[85%]', msg.role === 'user' ? 'ml-auto' : 'mr-auto')}
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
                className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
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
                  <p className="whitespace-pre-wrap">{msg.content}</p>
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
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="p-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your content..."
              className="min-h-[44px]"
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
