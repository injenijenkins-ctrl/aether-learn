'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2, Plus, Users } from 'lucide-react';

type RoomSummary = {
  id: string;
  name: string;
  invite_code: string;
  hostName: string;
  memberCount: number;
  created_at: string;
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

export default function StudyRoomsPage() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load rooms');
      setRooms(data.rooms || []);
    } catch {
      toast.error('Failed to load study rooms');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const createStudyRoom = async () => {
    const roomName = name.trim();
    if (!roomName) {
      toast.error('Enter a room name');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');
      setOpen(false);
      setName('');
      toast.success('Study room created');
      await loadRooms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell
      title="Study Rooms"
      description="Create shared AI study spaces and invite classmates with a short code."
    >
      <div className="mb-6 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="min-h-[44px] text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent
            className="border-white/[0.08] text-white"
            style={{ background: '#0D1117' }}
          >
            <DialogHeader>
              <DialogTitle>Create study room</DialogTitle>
              <DialogDescription style={{ color: '#8B9AB0' }}>
                Name the room so your classmates recognize the session.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Biology midterm review"
              className="min-h-[44px]"
              style={inputStyle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') createStudyRoom();
              }}
            />
            <DialogFooter>
              <Button
                type="button"
                onClick={createStudyRoom}
                disabled={creating || !name.trim()}
                className="min-h-[44px] text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl" style={cardStyle}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#7C6AF5' }} />
        </div>
      ) : rooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl p-8 text-center"
          style={cardStyle}
        >
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(124,106,245,0.12)' }}
          >
            <Users className="h-7 w-7" style={{ color: '#7C6AF5' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>
            No study rooms yet. Create one and invite your classmates.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex min-h-[210px] flex-col rounded-2xl p-5"
              style={cardStyle}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-base font-semibold" style={{ color: '#F0F4F8' }}>
                    {room.name}
                  </h2>
                  <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>
                    Hosted by {room.hostName}
                  </p>
                </div>
                <div
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ background: 'rgba(124,106,245,0.12)', color: '#7C6AF5' }}
                >
                  {room.invite_code}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm" style={{ color: '#8B9AB0' }}>
                  <Users className="h-4 w-4" style={{ color: '#5B8DF5' }} />
                  {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                </div>
                <Link href={`/study-rooms/${room.id}`}>
                  <Button
                    className="min-h-[44px] text-white"
                    style={{ background: 'rgba(124,106,245,0.16)', border: '1px solid rgba(124,106,245,0.22)' }}
                  >
                    Enter Room
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
