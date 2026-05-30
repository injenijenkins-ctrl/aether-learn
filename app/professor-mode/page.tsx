'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type IngestedResource, useIngest } from '@/hooks/use-lumina';
import { providerHeaders, providerPayload } from '@/lib/ai-settings';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, Check, Copy, GraduationCap, Landmark, Loader2, Plus, Send, Upload } from 'lucide-react';

type ProfessorCourse = {
  id: string;
  title: string;
  code: string;
  institution: string | null;
  description: string | null;
  materialCount: number;
  studentCount: number;
  materials: { id: string; title: string; type: string; createdAt: string }[];
};

type Analytics = {
  studentCount: number;
  questionCount: number;
  commonTopics: { topic: string; count: number }[];
  commonMisconceptions: { misconception: string; count: number }[];
  performanceTrends: { attempt: number; topic: string; score: number }[];
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

export default function ProfessorModePage() {
  const { listResources } = useIngest();
  const [courses, setCourses] = useState<ProfessorCourse[]>([]);
  const [resources, setResources] = useState<IngestedResource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [description, setDescription] = useState('');
  const [resourceIds, setResourceIds] = useState<string[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedId) || courses[0] || null,
    [courses, selectedId]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, resourceList] = await Promise.all([
        fetch('/api/professor-courses'),
        listResources(),
      ]);
      const data = await courseRes.json();
      if (!courseRes.ok) throw new Error(data.error || 'Failed to load professor courses');
      setCourses(data.courses || []);
      setResources(resourceList);
      setSelectedId((current) => current || data.courses?.[0]?.id || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load professor mode');
    } finally {
      setLoading(false);
    }
  }, [listResources]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedCourse) return;
    fetch(`/api/professor-courses/analytics?courseId=${selectedCourse.id}`)
      .then((res) => res.json())
      .then((data) => setAnalytics(data.error ? null : data))
      .catch(() => setAnalytics(null));
  }, [selectedCourse]);

  const createCourse = async () => {
    if (!title.trim()) { toast.error('Enter a course title'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/professor-courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, institution, description, resourceIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create course');
      setCourses((prev) => [data.course, ...prev]);
      setSelectedId(data.course.id);
      setTitle('');
      setInstitution('');
      setDescription('');
      setResourceIds([]);
      toast.success('Professor course created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create course');
    } finally {
      setBusy(false);
    }
  };

  const joinCourse = async () => {
    if (!joinCode.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/professor-courses/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join course');
      await loadData();
      setSelectedId(data.course.id);
      setJoinCode('');
      toast.success('Joined course');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join course');
    } finally {
      setBusy(false);
    }
  };

  const askCourseTutor = async () => {
    if (!selectedCourse || !question.trim()) return;
    setBusy(true);
    setAnswer('');
    try {
      const res = await fetch('/api/professor-courses/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...providerHeaders() },
        body: JSON.stringify({ ...providerPayload(), courseId: selectedCourse.id, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Course tutor failed');
      setAnswer(data.answer);
      setQuestion('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Course tutor failed');
    } finally {
      setBusy(false);
    }
  };

  const toggleResource = (id: string) => {
    setResourceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <AppShell
      title="Professor Mode"
      description="Lecturer-approved course materials, student enrollment, scoped AI tutoring, and course analytics."
    >
      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="mb-4 flex items-center gap-3">
            <Landmark className="h-5 w-5" style={{ color: '#A99BFF' }} />
            <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>Create lecturer course</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" className="min-h-[44px]" style={inputStyle} />
            <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="University / school" className="min-h-[44px]" style={inputStyle} />
          </div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Syllabus scope, semester, lecturer notes..." className="mt-3 min-h-24 resize-none" style={inputStyle} />
          <div className="mt-4 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
            {resources.map((resource) => {
              const selected = resourceIds.includes(resource.id);
              return (
                <button key={resource.id} type="button" onClick={() => toggleResource(resource.id)} className="flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-left text-sm" style={{ background: selected ? 'rgba(124,106,245,0.14)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#F0F4F8' }}>
                  {selected ? <Check className="h-4 w-4" style={{ color: '#34D399' }} /> : <Upload className="h-4 w-4" style={{ color: '#8B9AB0' }} />}
                  <span className="truncate">{resource.title}</span>
                </button>
              );
            })}
          </div>
          <Button onClick={createCourse} disabled={busy || !title.trim()} className="mt-4 min-h-[44px] text-white" style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create course
          </Button>
        </div>

        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="mb-4 flex items-center gap-3">
            <GraduationCap className="h-5 w-5" style={{ color: '#34D399' }} />
            <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>Student join</h2>
          </div>
          <p className="mb-4 text-sm" style={{ color: '#8B9AB0' }}>Students enter the course code. The course is paid per course, not per student.</p>
          <div className="flex gap-2">
            <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="COUR-ABCDE" className="min-h-[44px]" style={inputStyle} />
            <Button onClick={joinCourse} disabled={busy || !joinCode.trim()} className="min-h-[44px] text-white" style={{ background: 'rgba(52,211,153,0.16)', border: '1px solid rgba(52,211,153,0.24)' }}>Join</Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl" style={cardStyle}><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-3">
            {courses.map((course) => (
              <button key={course.id} type="button" onClick={() => setSelectedId(course.id)} className="w-full rounded-2xl p-4 text-left" style={{ ...cardStyle, border: selectedCourse?.id === course.id ? '1px solid rgba(124,106,245,0.35)' : cardStyle.border }}>
                <p className="font-semibold" style={{ color: '#F0F4F8' }}>{course.title}</p>
                <p className="mt-1 text-xs" style={{ color: '#8B9AB0' }}>{course.materialCount} materials / {course.studentCount} students</p>
                <p className="mt-3 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs" style={{ background: 'rgba(124,106,245,0.12)', color: '#A99BFF' }}>
                  {course.code}
                  <Copy className="h-3 w-3" />
                </p>
              </button>
            ))}
          </div>

          {selectedCourse && (
            <div className="space-y-6">
              <div className="rounded-2xl p-5" style={cardStyle}>
                <h2 className="text-lg font-bold" style={{ color: '#F0F4F8' }}>{selectedCourse.title}</h2>
                <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>{selectedCourse.description || 'Approved-material course tutor.'}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {selectedCourse.materials.map((material) => (
                    <div key={material.id} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <BookOpen className="mb-2 h-4 w-4" style={{ color: '#7C6AF5' }} />
                      <p className="truncate text-sm" style={{ color: '#F0F4F8' }}>{material.title}</p>
                      <p className="text-xs" style={{ color: '#8B9AB0' }}>{material.type}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="mb-3 text-sm font-semibold" style={{ color: '#F0F4F8' }}>Approved-material tutor</h3>
                <div className="flex gap-2">
                  <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask only from lecturer-approved materials..." className="min-h-[44px]" style={inputStyle} />
                  <Button onClick={askCourseTutor} disabled={busy || !question.trim()} className="min-h-[44px] text-white" style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {answer && <p className="mt-4 whitespace-pre-wrap rounded-xl p-4 text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.03)', color: '#F0F4F8', border: '1px solid rgba(255,255,255,0.06)' }}>{answer}</p>}
              </div>

              {analytics && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl p-5" style={cardStyle}>
                    <h3 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>Topics students ask about most</h3>
                    <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.commonTopics}><XAxis dataKey="topic" stroke="#4A5568" fontSize={10} /><YAxis stroke="#4A5568" fontSize={10} /><Tooltip /><Bar dataKey="count" fill="#7C6AF5" /></BarChart></ResponsiveContainer></div>
                  </div>
                  <div className="rounded-2xl p-5" style={cardStyle}>
                    <h3 className="mb-4 text-sm font-semibold" style={{ color: '#F0F4F8' }}>Performance trends</h3>
                    <div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.performanceTrends}><XAxis dataKey="attempt" stroke="#4A5568" fontSize={10} /><YAxis domain={[0, 100]} stroke="#4A5568" fontSize={10} /><Tooltip /><Line dataKey="score" stroke="#34D399" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
