'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Wand2,
  BookOpen,
  HelpCircle,
  Bookmark,
  FileText,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Calendar,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Upload, label: 'Ingestion', href: '/ingestion' },
  { icon: Wand2, label: 'AI Tutor', href: '/tutor' },
  { icon: BookOpen, label: 'Lessons', href: '/lessons' },
  { icon: HelpCircle, label: 'Quizzes', href: '/quizzes' },
  { icon: Bookmark, label: 'Flashcards', href: '/flashcards' },
  { icon: FileText, label: 'Notes', href: '/notes' },
  { icon: Calendar, label: 'Study Plan', href: '/study-plan' },
  { icon: TrendingUp, label: 'Progress', href: '/progress' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

interface SidebarProps {
  open?: boolean;
  mobileOpen?: boolean;
  onToggle?: (open: boolean) => void;
  onMobileClose?: () => void;
}

export function Sidebar({
  open = true,
  mobileOpen = false,
  onToggle,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <>
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300',
          open ? 'w-64' : 'w-20',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border p-4">
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text font-bold text-transparent">
                AetherLearn
              </span>
            </motion.div>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMobileClose}
              className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-white/10 md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggle?.(!open)}
              className="hidden min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-white/10 md:block"
              aria-label="Toggle sidebar"
            >
              {open ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onMobileClose}>
                <motion.span
                  className={cn(
                    'flex min-h-[44px] items-center gap-3 rounded-lg px-4 py-3 text-sidebar-foreground transition-all',
                    active
                      ? 'bg-sidebar-primary/20 text-sidebar-primary'
                      : 'hover:bg-white/10'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {open && <span className="text-sm font-medium">{item.label}</span>}
                </motion.span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div
            className={cn(
              'flex items-center gap-3',
              open ? 'flex-row' : 'flex-col'
            )}
          >
            <Avatar className="h-9 w-9 shrink-0">
              {user?.image ? (
                <AvatarImage src={user.image} alt={user.name || 'User'} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-xs text-white">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            {open && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user?.name || 'Learner'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email || ''}
                </p>
              </div>
            )}
            {open && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px] shrink-0"
                onClick={() => signOut({ callbackUrl: '/login' })}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}
