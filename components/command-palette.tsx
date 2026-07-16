'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookMarked,
  BookOpen,
  Bookmark,
  Calendar,
  FileText,
  GraduationCap,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  Wand2,
  WifiOff,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

const navGroups = [
  {
    heading: 'Start',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, hint: 'Home' },
      { label: 'Course Books', href: '/course-books', icon: BookMarked, hint: 'Subjects' },
      { label: 'Professor Mode', href: '/professor-mode', icon: Landmark, hint: 'Courses' },
      { label: 'Content Ingestion', href: '/ingestion', icon: Upload, hint: 'Add sources' },
    ],
  },
  {
    heading: 'Learn',
    items: [
      { label: 'Learning Journey', href: '/journey', icon: GraduationCap, hint: 'Guided' },
      { label: 'AI Tutor', href: '/tutor', icon: Wand2, hint: 'Ask' },
      { label: 'Lessons', href: '/lessons', icon: BookOpen, hint: 'Explain' },
      { label: 'Notes', href: '/notes', icon: FileText, hint: 'Summaries' },
    ],
  },
  {
    heading: 'Practice',
    items: [
      { label: 'Quizzes', href: '/quizzes', icon: HelpCircle, hint: 'Test' },
      { label: 'Exams', href: '/exams', icon: FileText, hint: 'Timed' },
      { label: 'Past Paper Intel', href: '/past-paper-intel', icon: Sparkles, hint: 'Patterns' },
      { label: 'Flashcards', href: '/flashcards', icon: Bookmark, hint: 'Review' },
    ],
  },
  {
    heading: 'Plan',
    items: [
      { label: 'Study Plan', href: '/study-plan', icon: Calendar, hint: 'Schedule' },
      { label: 'Exam Countdown', href: '/exam-countdown', icon: Calendar, hint: 'Reminders' },
      { label: 'Study Rooms', href: '/study-rooms', icon: Users, hint: 'Group' },
      { label: 'Progress', href: '/progress', icon: TrendingUp, hint: 'Stats' },
      { label: 'Offline Study', href: '/offline', icon: WifiOff, hint: 'Downloads' },
      { label: 'Settings', href: '/settings', icon: Settings, hint: 'Keys' },
    ],
  },
];

const quickActions = [
  { label: 'Add learning material', href: '/ingestion', icon: Plus, hint: 'Upload, URL, text' },
  { label: 'Generate a lesson', href: '/lessons', icon: Sparkles, hint: 'From sources' },
  { label: 'Start a practice exam', href: '/exams', icon: FileText, hint: 'Assessment' },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const allItems = useMemo(
    () => [...navGroups.flatMap((group) => group.items), ...quickActions],
    []
  );

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm transition-colors hover:bg-white/[0.06] sm:px-3"
        style={{ color: '#8B9AB0', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(20,27,36,0.55)' }}
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Jump</span>
        <span
          className="hidden rounded px-1.5 py-0.5 text-[11px] font-medium lg:inline"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#F0F4F8' }}
        >
          Ctrl K
        </span>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Jump anywhere"
        description="Navigate to any AetherLearn workspace."
        className="border-white/[0.08] bg-[#0D1117] text-white shadow-2xl"
      >
        <CommandInput
          placeholder="Jump to a page or action..."
          className="text-white placeholder:text-[#8B9AB0]"
        />
        <CommandList className="max-h-[420px] bg-[#0D1117] p-2">
          <CommandEmpty className="py-8 text-center text-sm text-[#8B9AB0]">
            No destination found.
          </CommandEmpty>

          <CommandGroup heading="Quick actions" className="[&_[cmdk-group-heading]]:text-[#8B9AB0]">
            {quickActions.map((item) => (
              <CommandItem
                key={item.label}
                value={`${item.label} ${item.hint}`}
                onSelect={() => navigate(item.href)}
                className="min-h-[48px] rounded-lg text-[#F0F4F8] data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-white"
              >
                <item.icon className="h-4 w-4" style={{ color: '#7C6AF5' }} />
                <span>{item.label}</span>
                <CommandShortcut className="hidden text-[#8B9AB0] sm:inline">{item.hint}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator className="my-2 bg-white/[0.06]" />

          {navGroups.map((group) => (
            <CommandGroup
              key={group.heading}
              heading={group.heading}
              className="[&_[cmdk-group-heading]]:text-[#8B9AB0]"
            >
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.hint}`}
                  onSelect={() => navigate(item.href)}
                  className="min-h-[48px] rounded-lg text-[#F0F4F8] data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-white"
                >
                  <item.icon className="h-4 w-4" style={{ color: '#5B8DF5' }} />
                  <span>{item.label}</span>
                  <CommandShortcut className="hidden text-[#8B9AB0] sm:inline">{item.hint}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

export { navGroups };
