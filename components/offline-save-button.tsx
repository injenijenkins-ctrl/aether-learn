'use client';

import { useEffect, useState } from 'react';
import { Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isOfflineItemSaved, saveOfflineItem, type OfflineItemType } from '@/lib/offline-store';

type OfflineSaveButtonProps = {
  id: string;
  type: OfflineItemType;
  title: string;
  content: string;
};

export function OfflineSaveButton({ id, type, title, content }: OfflineSaveButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isOfflineItemSaved(id));
  }, [id]);

  const save = () => {
    saveOfflineItem({ id, type, title, content });
    setSaved(true);
  };

  return (
    <Button
      type="button"
      onClick={save}
      className="min-h-[40px]"
      style={{
        background: saved ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
        border: saved ? '1px solid rgba(52,211,153,0.24)' : '1px solid rgba(255,255,255,0.08)',
        color: saved ? '#34D399' : '#F0F4F8',
      }}
    >
      {saved ? <Check className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
      {saved ? 'Saved offline' : 'Save offline'}
    </Button>
  );
}
