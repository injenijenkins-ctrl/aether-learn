'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { TopNav } from '@/components/top-nav';
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
    <div className="flex min-h-screen" style={{ background: '#080B11' }}>
      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileOpen}
        onToggle={setSidebarOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(8,11,17,0.7)', backdropFilter: 'blur(4px)' }}
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          sidebarOpen ? 'md:ml-64' : 'md:ml-20',
          'ml-0'
        )}
      >
        <TopNav sidebarOpen={sidebarOpen} onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto pt-16">
          <div className="px-4 py-8 md:px-8 md:py-10">
            {(title || description) && (
              <div className="mb-8">
                {title && (
                  <h1 className="text-2xl font-bold md:text-3xl" style={{ color: '#F0F4F8' }}>
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1.5 text-sm" style={{ color: '#8B9AB0' }}>
                    {description}
                  </p>
                )}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
