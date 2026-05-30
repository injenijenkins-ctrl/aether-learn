'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { providerHeaders, providerPayload } from '@/lib/ai-settings';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Copy, Loader2, Send, Sparkles, Users } from 'lucide-react';

type Room = {
  id: string;
  name: string;
  host_id: string;
  invite_code: string;
};

type Member = {
  id: string;
  user_id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type Message = {
  id: string;
  room_id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
  userName?: string | null;
  userImage?: string | null;
};

type HostCredits = {
  credits: number;
  is_pro: boolean;
};

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

function initials(name?: string | null) {
  return (name || 'A').slice(0, 1).toUpperCase();
}

export default function StudyRoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = params.id;
  const bottomRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hostCredits, setHostCredits] = useState<HostCredits | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const memberMap = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members]
  );

  const loadRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load room');
      setRoom(data.room);
      setMembers(data.members || []);
      setMessages(data.messages || []);
      setHostCredits(data.hostCredits || null);
    } catch {
      toast.error('Failed to load study room');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (!roomId) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`room_messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((message) => message.id === incoming.id)) return prev;
            const member = memberMap.get(incoming.user_id);
            return [
              ...prev,
              {
                ...incoming,
                userName: incoming.role === 'assistant' ? 'AetherLearn' : member?.name || member?.email || 'Learner',
                userImage: member?.image || null,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberMap, roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const copyInviteCode = async () => {
    if (!room) return;
    await navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    toast.success('Invite code copied');
    window.setTimeout(() => setCopied(false), 1400);
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput('');
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify({ ...providerPayload(), content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      setMessages((prev) => {
        const incoming = [data.message, data.aiMessage].filter(Boolean) as Message[];
        const next = [...prev];
        for (const message of incoming) {
          if (!next.some((existing) => existing.id === message.id)) {
            next.push({
              ...message,
              userName:
                message.role === 'assistant'
                  ? 'AetherLearn'
                  : message.userName || memberMap.get(message.user_id)?.name || 'Learner',
            });
          }
        }
        return next.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      if (typeof data.credits === 'number') {
        setHostCredits((prev) => prev ? { ...prev, credits: data.credits } : prev);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Study Room">
        <div className="flex min-h-[420px] items-center justify-center rounded-2xl" style={cardStyle}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#7C6AF5' }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={room?.name || 'Study Room'} description="Collaborate with classmates and your shared AI tutor.">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(124,106,245,0.12)' }}
          >
            <Users className="h-5 w-5" style={{ color: '#7C6AF5' }} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: '#F0F4F8' }}>
              {room?.name}
            </p>
            <p className="text-xs" style={{ color: '#8B9AB0' }}>
              Invite code {room?.invite_code}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={copyInviteCode}
          className="min-h-[44px] text-white"
          style={{ background: 'rgba(124,106,245,0.16)', border: '1px solid rgba(124,106,245,0.22)' }}
        >
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Copy Code
        </Button>
      </div>

      {hostCredits && !hostCredits.is_pro && hostCredits.credits <= 5 && (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.22)', color: '#FBBF24' }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Host credits are running low. AI room replies use the host account credits.
        </div>
      )}

      <div className="grid min-h-[calc(100vh-16rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl"
          style={cardStyle}
        >
          <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                <Sparkles className="mb-3 h-8 w-8" style={{ color: '#7C6AF5' }} />
                <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>
                  Start the room conversation.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isAi = message.role === 'assistant';
                const member = memberMap.get(message.user_id);
                const name = isAi ? 'AetherLearn' : message.userName || member?.name || member?.email || 'Learner';
                return (
                  <div key={message.id} className={cn('max-w-[92%] sm:max-w-[82%]', isAi ? 'mr-auto' : 'ml-auto')}>
                    <div className={cn('mb-1.5 flex items-center gap-2', isAi ? 'justify-start' : 'justify-end')}>
                      <span className="text-xs font-medium" style={{ color: isAi ? '#7C6AF5' : '#8B9AB0' }}>
                        {name}
                      </span>
                    </div>
                    <div
                      className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                      style={
                        isAi
                          ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#F0F4F8' }
                          : { background: 'linear-gradient(135deg, rgba(124,106,245,0.25) 0%, rgba(91,141,245,0.2) 100%)', border: '1px solid rgba(124,106,245,0.3)', color: '#F0F4F8' }
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            {sending && (
              <div className="mr-auto max-w-[82%]">
                <div
                  className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: '#7C6AF5' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: '#7C6AF5', animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: '#7C6AF5', animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex gap-2 p-3 sm:p-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask the room AI or share a thought..."
              disabled={sending}
              className="min-h-[44px] min-w-0 flex-1"
              style={inputStyle}
            />
            <Button
              type="submit"
              disabled={sending || !input.trim()}
              className="min-h-[44px] min-w-[44px] text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-4"
          style={cardStyle}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>
            Members
          </h2>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    {member.image ? <AvatarImage src={member.image} alt={member.name || 'Member'} /> : null}
                    <AvatarFallback
                      className="text-xs text-white"
                      style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
                    >
                      {initials(member.name || member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                    style={{ background: '#34D399', border: '2px solid #0D1117' }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: '#F0F4F8' }}>
                    {member.name || member.email || 'Learner'}
                  </p>
                  <p className="truncate text-xs" style={{ color: '#4A5568' }}>
                    {member.user_id === room?.host_id ? 'Host' : 'Online'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.aside>
      </div>
    </AppShell>
  );
}
