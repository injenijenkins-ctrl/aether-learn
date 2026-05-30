'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  FileText,
  Layers3,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type IngestedResource, useIngest } from '@/hooks/use-lumina';

type CourseColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose';

type CourseBookResource = IngestedResource;

type CourseBook = {
  id: string;
  title: string;
  description: string | null;
  color: CourseColor;
  goal: string | null;
  created_at: string;
  resources: CourseBookResource[];
  resourceCount: number;
  chunkCount: number;
};

const cardStyle = {
  background: 'rgba(13,17,23,0.82)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const inputStyle = {
  background: 'rgba(20,27,36,0.88)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#F0F4F8',
};

const colorStyles: Record<CourseColor, { bg: string; fg: string; border: string }> = {
  violet: {
    bg: 'rgba(124,106,245,0.14)',
    fg: '#A99BFF',
    border: 'rgba(124,106,245,0.32)',
  },
  blue: {
    bg: 'rgba(91,141,245,0.14)',
    fg: '#7FA8FF',
    border: 'rgba(91,141,245,0.32)',
  },
  emerald: {
    bg: 'rgba(52,211,153,0.12)',
    fg: '#34D399',
    border: 'rgba(52,211,153,0.28)',
  },
  amber: {
    bg: 'rgba(251,191,36,0.12)',
    fg: '#FBBF24',
    border: 'rgba(251,191,36,0.28)',
  },
  rose: {
    bg: 'rgba(248,113,113,0.12)',
    fg: '#F87171',
    border: 'rgba(248,113,113,0.28)',
  },
};

const courseColors: CourseColor[] = ['violet', 'blue', 'emerald', 'amber', 'rose'];

function getCourseAccent(color: CourseColor) {
  return colorStyles[color] || colorStyles.violet;
}

export default function CourseBooksPage() {
  const { listResources } = useIngest();
  const [courseBooks, setCourseBooks] = useState<CourseBook[]>([]);
  const [resources, setResources] = useState<IngestedResource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [color, setColor] = useState<CourseColor>('violet');
  const [search, setSearch] = useState('');
  const [resourceDraft, setResourceDraft] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingResources, setSavingResources] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const selectedCourseBook = useMemo(
    () => courseBooks.find((courseBook) => courseBook.id === selectedId) || courseBooks[0] || null,
    [courseBooks, selectedId]
  );

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return resources;
    return resources.filter((resource) => resource.title.toLowerCase().includes(query));
  }, [resources, search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [courseBookRes, resourceList] = await Promise.all([
        fetch('/api/course-books'),
        listResources(),
      ]);

      const courseBookData = await courseBookRes.json();
      if (!courseBookRes.ok) {
        throw new Error(courseBookData.error || 'Failed to load course books');
      }

      const loadedCourseBooks = (courseBookData.courseBooks || []) as CourseBook[];
      setCourseBooks(loadedCourseBooks);
      setResources(resourceList);
      setSelectedId((current) => current || loadedCourseBooks[0]?.id || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load course books');
      setCourseBooks([]);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [listResources]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (resourcesOpen && selectedCourseBook) {
      setResourceDraft(selectedCourseBook.resources.map((resource) => resource.id));
      setSearch('');
    }
  }, [resourcesOpen, selectedCourseBook]);

  const createCourseBook = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error('Enter a course book title');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/course-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim(),
          goal: goal.trim(),
          color,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create course book');

      const courseBook = data.courseBook as CourseBook;
      setCourseBooks((prev) => [courseBook, ...prev]);
      setSelectedId(courseBook.id);
      setTitle('');
      setDescription('');
      setGoal('');
      setColor('violet');
      setCreateOpen(false);
      toast.success('Course book created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create course book');
    } finally {
      setCreating(false);
    }
  };

  const toggleResource = (resourceId: string) => {
    setResourceDraft((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const saveResources = async () => {
    if (!selectedCourseBook) return;

    setSavingResources(true);
    try {
      const res = await fetch(`/api/course-books/${selectedCourseBook.id}/resources`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceIds: resourceDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update resources');

      const updated = data.courseBook as CourseBook;
      setCourseBooks((prev) =>
        prev.map((courseBook) => (courseBook.id === updated.id ? updated : courseBook))
      );
      setResourcesOpen(false);
      toast.success('Course book updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update course book');
    } finally {
      setSavingResources(false);
    }
  };

  return (
    <AppShell
      title="Course Books"
      description="Group sources into focused course workspaces for learning, revision, and assessment."
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex min-h-[40px] w-fit items-center gap-2 rounded-full px-3 text-sm"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#8B9AB0' }}
        >
          <Layers3 className="h-4 w-4" style={{ color: '#7C6AF5' }} />
          {courseBooks.length} {courseBooks.length === 1 ? 'course book' : 'course books'} / {resources.length} sources
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              className="min-h-[44px] text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Course Book
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/[0.08] text-white" style={{ background: '#0D1117' }}>
            <DialogHeader>
              <DialogTitle>Create course book</DialogTitle>
              <DialogDescription style={{ color: '#8B9AB0' }}>
                Give this subject a home before attaching sources.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Organic Chemistry"
                className="min-h-[44px]"
                style={inputStyle}
              />
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Lecture notes, textbook chapters, and problem sets"
                className="min-h-24 resize-none"
                style={inputStyle}
              />
              <Input
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Goal, e.g. prepare for final exam"
                className="min-h-[44px]"
                style={inputStyle}
              />
              <div className="flex flex-wrap gap-2">
                {courseColors.map((option) => {
                  const accent = getCourseAccent(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-label={`${option} course color`}
                      onClick={() => setColor(option)}
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105"
                      style={{
                        background: accent.bg,
                        border: `1px solid ${color === option ? accent.fg : accent.border}`,
                      }}
                    >
                      {color === option && <Check className="h-4 w-4" style={{ color: accent.fg }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={createCourseBook}
                disabled={creating || !title.trim()}
                className="min-h-[44px] text-white"
                style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl" style={cardStyle}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#7C6AF5' }} />
        </div>
      ) : courseBooks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl p-8 text-center"
          style={cardStyle}
        >
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(124,106,245,0.12)' }}
          >
            <BookMarked className="h-7 w-7" style={{ color: '#7C6AF5' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#F0F4F8' }}>
            Create your first course book
          </p>
          <p className="mt-1 max-w-sm text-sm" style={{ color: '#8B9AB0' }}>
            Course books organize your sources into subjects so lessons, tests, and group study can become course-aware.
          </p>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-5 min-h-[44px] text-white"
            style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Course Book
          </Button>
        </motion.div>
      ) : (
        <div className="grid min-w-0 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3">
            {courseBooks.map((courseBook, index) => {
              const accent = getCourseAccent(courseBook.color);
              const active = selectedCourseBook?.id === courseBook.id;

              return (
                <motion.button
                  key={courseBook.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => setSelectedId(courseBook.id)}
                  className="w-full rounded-2xl p-4 text-left transition-all"
                  style={{
                    ...cardStyle,
                    border: active ? `1px solid ${accent.border}` : cardStyle.border,
                    background: active ? 'rgba(20,27,36,0.9)' : cardStyle.background,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
                    >
                      <BookMarked className="h-5 w-5" style={{ color: accent.fg }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold" style={{ color: '#F0F4F8' }}>
                        {courseBook.title}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>
                        {courseBook.resourceCount} sources / {courseBook.chunkCount} chunks
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {selectedCourseBook && (
            <motion.div
              key={selectedCourseBook.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-w-0 rounded-2xl p-5 sm:p-6"
              style={cardStyle}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div
                    className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{
                      background: getCourseAccent(selectedCourseBook.color).bg,
                      border: `1px solid ${getCourseAccent(selectedCourseBook.color).border}`,
                    }}
                  >
                    <BookOpen className="h-6 w-6" style={{ color: getCourseAccent(selectedCourseBook.color).fg }} />
                  </div>
                  <h2 className="break-words text-2xl font-bold" style={{ color: '#F0F4F8' }}>
                    {selectedCourseBook.title}
                  </h2>
                  {selectedCourseBook.description && (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: '#8B9AB0' }}>
                      {selectedCourseBook.description}
                    </p>
                  )}
                  {selectedCourseBook.goal && (
                    <p
                      className="mt-4 rounded-xl px-4 py-3 text-sm"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#F0F4F8' }}
                    >
                      <span style={{ color: '#8B9AB0' }}>Goal: </span>
                      {selectedCourseBook.goal}
                    </p>
                  )}
                </div>

                <Dialog open={resourcesOpen} onOpenChange={setResourcesOpen}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      className="min-h-[44px] shrink-0 text-white"
                      style={{ background: 'rgba(124,106,245,0.16)', border: '1px solid rgba(124,106,245,0.26)' }}
                    >
                      <Layers3 className="mr-2 h-4 w-4" />
                      Manage Sources
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl border-white/[0.08] text-white" style={{ background: '#0D1117' }}>
                    <DialogHeader>
                      <DialogTitle>Manage sources</DialogTitle>
                      <DialogDescription style={{ color: '#8B9AB0' }}>
                        Attach ingested resources to this course book.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#8B9AB0' }} />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search sources"
                        className="min-h-[44px] pl-10"
                        style={inputStyle}
                      />
                    </div>

                    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                      {filteredResources.length === 0 ? (
                        <div
                          className="rounded-2xl p-5 text-sm"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#8B9AB0' }}
                        >
                          No sources found. Add content from Ingestion first.
                        </div>
                      ) : (
                        filteredResources.map((resource) => {
                          const checked = resourceDraft.includes(resource.id);
                          return (
                            <button
                              key={resource.id}
                              type="button"
                              onClick={() => toggleResource(resource.id)}
                              className="flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
                              style={{ border: '1px solid rgba(255,255,255,0.06)', background: checked ? 'rgba(124,106,245,0.12)' : 'rgba(255,255,255,0.03)' }}
                            >
                              <span
                                className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', checked && 'border-transparent')}
                                style={{
                                  background: checked ? '#7C6AF5' : 'transparent',
                                  borderColor: checked ? '#7C6AF5' : 'rgba(255,255,255,0.18)',
                                }}
                              >
                                {checked && <Check className="h-3.5 w-3.5 text-white" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium" style={{ color: '#F0F4F8' }}>
                                  {resource.title}
                                </span>
                                <span className="block text-xs" style={{ color: '#8B9AB0' }}>
                                  {resource.type} / {resource.chunkCount} chunks
                                </span>
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        onClick={saveResources}
                        disabled={savingResources}
                        className="min-h-[44px] text-white"
                        style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}
                      >
                        {savingResources ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Save Sources
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: 'Sources', value: selectedCourseBook.resourceCount },
                  { label: 'Chunks', value: selectedCourseBook.chunkCount },
                  { label: 'Created', value: new Date(selectedCourseBook.created_at).toLocaleDateString() },
                  { label: 'Color', value: selectedCourseBook.color },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <p className="text-xs" style={{ color: '#8B9AB0' }}>{item.label}</p>
                    <p className="mt-1 truncate text-sm font-semibold capitalize" style={{ color: '#F0F4F8' }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { href: `/lessons?course=${selectedCourseBook.id}`, label: 'Generate Lesson', icon: Sparkles },
                  { href: `/quizzes?course=${selectedCourseBook.id}`, label: 'Quiz Course', icon: FileText },
                  { href: `/exams?course=${selectedCourseBook.id}`, label: 'Practice Exam', icon: BookOpen },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <Button
                      type="button"
                      className="min-h-[44px] w-full justify-between"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#F0F4F8' }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <action.icon className="h-4 w-4" style={{ color: '#7C6AF5' }} />
                        {action.label}
                      </span>
                      <ArrowRight className="h-4 w-4" style={{ color: '#8B9AB0' }} />
                    </Button>
                  </Link>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold" style={{ color: '#F0F4F8' }}>
                  Course Sources
                </h3>
                {selectedCourseBook.resources.length === 0 ? (
                  <div
                    className="rounded-2xl p-5 text-sm"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#8B9AB0' }}
                  >
                    No sources attached yet. Add resources to make this course book useful across lessons and tests.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedCourseBook.resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="min-w-0 rounded-xl p-4"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <p className="truncate text-sm font-medium" style={{ color: '#F0F4F8' }}>
                          {resource.title}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>
                          {resource.type} / {resource.chunkCount} chunks
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AppShell>
  );
}
