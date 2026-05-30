'use client';

import React from 'react';
import { FileText, Quote } from 'lucide-react';

export type SourceCitation = {
  id: string;
  number: number;
  chunkId: string;
  resourceId: string;
  title: string;
  type: string;
  snippet: string;
};

const panelStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
};

export function SourceCitations({
  sources,
  title = 'Sources',
}: {
  sources?: SourceCitation[];
  title?: string;
}) {
  if (!sources?.length) return null;

  return (
    <section className="rounded-2xl p-4" style={panelStyle}>
      <div className="mb-3 flex items-center gap-2">
        <Quote className="h-4 w-4" style={{ color: '#7C6AF5' }} />
        <h3 className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>
          {title}
        </h3>
      </div>
      <div className="space-y-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="rounded-xl p-3"
            style={{ background: 'rgba(13,17,23,0.62)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="mb-1 flex min-w-0 items-center gap-2">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: 'rgba(124,106,245,0.14)', color: '#A99BFF' }}
              >
                {source.number}
              </span>
              <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: '#5B8DF5' }} />
              <p className="min-w-0 truncate text-sm font-medium" style={{ color: '#F0F4F8' }}>
                {source.title}
              </p>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px]" style={{ background: 'rgba(255,255,255,0.05)', color: '#8B9AB0' }}>
                {source.type}
              </span>
            </div>
            <p className="pl-8 text-xs leading-relaxed" style={{ color: '#8B9AB0' }}>
              {source.snippet}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
