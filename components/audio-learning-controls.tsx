'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AudioLearningControlsProps = {
  title: string;
  text: string;
};

export function AudioLearningControls({ title, text }: AudioLearningControlsProps) {
  const [available, setAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  const cleanText = useMemo(
    () => text.replace(/\s+/g, ' ').trim().slice(0, 12000),
    [text]
  );

  useEffect(() => {
    setAvailable(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const play = () => {
    if (!available || !cleanText) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      setSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setPaused(true);
    setSpeaking(false);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setPaused(false);
    setSpeaking(false);
  };

  const downloadTranscript = () => {
    const blob = new Blob([`${title}\n\n${cleanText}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'lesson'}-audio-transcript.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!cleanText) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl p-3"
      style={{ background: 'rgba(91,141,245,0.08)', border: '1px solid rgba(91,141,245,0.16)' }}
    >
      <span className="mr-auto text-xs font-semibold" style={{ color: '#B7C9FF' }}>
        Audio learning mode
      </span>
      <Button
        type="button"
        onClick={play}
        disabled={!available}
        className="min-h-[40px]"
        style={{ background: 'rgba(124,106,245,0.18)', border: '1px solid rgba(124,106,245,0.24)', color: '#F0F4F8' }}
      >
        <Play className="mr-2 h-4 w-4" />
        {paused ? 'Resume' : 'Listen'}
      </Button>
      <Button type="button" variant="ghost" onClick={pause} disabled={!speaking} className="min-h-[40px]" style={{ color: '#8B9AB0' }}>
        <Pause className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" onClick={stop} disabled={!speaking && !paused} className="min-h-[40px]" style={{ color: '#8B9AB0' }}>
        <Square className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" onClick={downloadTranscript} className="min-h-[40px]" style={{ color: '#8B9AB0' }}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}
