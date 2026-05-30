'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { StudyCompanionWidget } from '@/components/study-companion-widget';
import { OfflineRuntime } from '@/components/offline-runtime';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function AppShell({ children, title, description }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen overflow-x-hidden" style={{ background: '#080B11' }}>
      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileOpen}
        onToggle={setSidebarOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-all duration-300',
          sidebarOpen ? 'md:ml-64' : 'md:ml-20',
          'ml-0'
        )}
      >
        <TopNav sidebarOpen={sidebarOpen} onMenuClick={() => setMobileOpen(true)} />

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-24 pt-16 md:pb-0">
          <div className="w-full max-w-full px-4 py-6 sm:px-5 md:px-8 md:py-10">
            {(title || description) && (
              <div className="mb-6 min-w-0 md:mb-8">
                {title && (
                  <h1 className="break-words text-2xl font-bold md:text-3xl" style={{ color: '#F0F4F8' }}>
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1.5 max-w-3xl text-sm" style={{ color: '#8B9AB0' }}>
                    {description}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        </main>
        <StudyCompanionWidget />
        <MobileBottomNav />
        <OfflineRuntime />
      </div>
    </div>
  );
}
