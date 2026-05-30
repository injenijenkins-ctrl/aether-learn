'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { Loader2 } from 'lucide-react';

const cardStyle = {
  background: 'rgba(13,17,23,0.82)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

export default function JoinRoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    async function join() {
      try {
        const res = await fetch(`/api/join/${params.code}`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Join failed');
        router.replace(`/study-rooms/${data.roomId}`);
      } catch {
        setError(true);
      }
    }

    join();
  }, [params.code, router]);

  return (
    <AppShell title="Join Study Room">
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl p-8 text-center" style={cardStyle}>
        {error ? (
          <p className="text-sm font-medium" style={{ color: '#F87171' }}>
            Room not found or no longer active
          </p>
        ) : (
          <>
            <Loader2 className="mb-3 h-6 w-6 animate-spin" style={{ color: '#7C6AF5' }} />
            <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>
              Joining room...
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
