'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { navGroups } from '@/components/command-palette';

interface SidebarProps {
  open?: boolean;
  mobileOpen?: boolean;
  onToggle?: (open: boolean) => void;
  onMobileClose?: () => void;
}

export function Sidebar({ open = true, mobileOpen = false, onToggle, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={onMobileClose}
        />
      )}

      <motion.aside
        initial={false}
        animate={{}}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 max-w-[85vw] flex-col transition-transform duration-300 md:translate-x-0 md:transition-all',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          open ? 'md:w-64' : 'md:w-20'
        )}
        style={{
          background: '#0D1117',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo / header */}
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {(open || mobileOpen) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2.5"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
              >
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span
                className="font-bold text-base"
                style={{
                  background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                AetherLearn
              </span>
            </motion.div>
          )}
          {!open && !mobileOpen && (
            <div
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
            >
              <span className="text-sm font-bold text-white">A</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMobileClose}
              className="min-h-[44px] min-w-[44px] rounded-lg p-2 transition-colors hover:bg-white/[0.06] md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" style={{ color: '#8B9AB0' }} />
            </button>
            <button
              type="button"
              onClick={() => onToggle?.(!open)}
              className="hidden min-h-[44px] min-w-[44px] rounded-lg p-2 transition-colors hover:bg-white/[0.06] md:flex items-center justify-center"
              aria-label="Toggle sidebar"
            >
              {open
                ? <ChevronLeft className="h-4 w-4" style={{ color: '#8B9AB0' }} />
                : <ChevronRight className="h-4 w-4" style={{ color: '#8B9AB0' }} />
              }
            </button>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.heading}>
              {(open || mobileOpen) && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#4A5568' }}>
                  {group.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link key={item.href} href={item.href} onClick={onMobileClose}>
                      <motion.span
                        className={cn(
                          'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                          !open && !mobileOpen && 'justify-center px-2'
                        )}
                        style={
                          active
                            ? {
                                background: 'rgba(124,106,245,0.15)',
                                color: '#7C6AF5',
                                borderLeft: '2px solid #7C6AF5',
                              }
                            : {
                                color: '#8B9AB0',
                                borderLeft: '2px solid transparent',
                              }
                        }
                        whileHover={
                          active
                            ? {}
                            : {
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                color: '#F0F4F8',
                                x: open || mobileOpen ? 2 : 0,
                              }
                        }
                        whileTap={{ scale: 0.98 }}
                        title={!open && !mobileOpen ? item.label : undefined}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {(open || mobileOpen) && <span className="truncate">{item.label}</span>}
                      </motion.span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div
          className="p-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className={cn('flex items-center gap-3', open || mobileOpen ? 'flex-row' : 'flex-col')}>
            <Avatar className="h-8 w-8 shrink-0">
              {user?.image ? <AvatarImage src={user.image} alt={user.name || 'User'} /> : null}
              <AvatarFallback
                className="text-xs text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)' }}
              >
                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            {(open || mobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: '#F0F4F8' }}>
                  {user?.name || 'Learner'}
                </p>
                <p className="truncate text-xs" style={{ color: '#4A5568' }}>
                  {user?.email || ''}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}
