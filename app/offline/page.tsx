'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { AudioLearningControls } from '@/components/audio-learning-controls';
import { deleteOfflineItem, getOfflineItems, type OfflineItem } from '@/lib/offline-store';
import { Download, Trash2, Wifi, WifiOff } from 'lucide-react';

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

export default function OfflinePage() {
  const [items, setItems] = useState<OfflineItem[]>([]);
  const [online, setOnline] = useState(true);

  const refresh = () => setItems(getOfflineItems());

  useEffect(() => {
    refresh();
    setOnline(navigator.onLine);
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const remove = (id: string) => {
    deleteOfflineItem(id);
    refresh();
  };

  return (
    <AppShell
      title="Offline Study"
      description="Downloaded lessons, notes, flashcards, and audio-ready study material for when your connection drops."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
          style={{ background: online ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)', color: online ? '#34D399' : '#FBBF24' }}
        >
          {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {online ? 'Connected and syncing' : 'Offline mode'}
        </span>
        <span className="text-sm" style={{ color: '#8B9AB0' }}>
          {items.length} saved item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={cardStyle}>
          <Download className="mx-auto mb-4 h-8 w-8" style={{ color: '#7C6AF5' }} />
          <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>Nothing saved offline yet</p>
          <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
            Open a lesson or note and tap Save offline.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="rounded-2xl p-5"
              style={cardStyle}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase"
                    style={{ background: 'rgba(124,106,245,0.12)', color: '#A99BFF' }}
                  >
                    {item.type}
                  </span>
                  <h2 className="mt-3 text-sm font-semibold" style={{ color: '#F0F4F8' }}>{item.title}</h2>
                  <p className="mt-1 text-xs" style={{ color: '#4A5568' }}>
                    Saved {new Date(item.savedAt).toLocaleString()}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(item.id)} style={{ color: '#F87171' }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#8B9AB0' }}>
                {item.content}
              </p>
              <div className="mt-4">
                <AudioLearningControls title={item.title} text={item.content} />
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
