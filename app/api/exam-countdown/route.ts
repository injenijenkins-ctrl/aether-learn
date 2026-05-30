import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getSupabase } from '@/lib/supabase';
import { getUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ScheduleDay = {
  id: string;
  date: string;
  dayLabel: string;
  topics: string[];
  minutes: number;
  tasks: string[];
};

function daysBetweenInclusive(start: Date, end: Date) {
  const startDay = new Date(start.toISOString().slice(0, 10));
  const endDay = new Date(end.toISOString().slice(0, 10));
  return Math.max(1, Math.ceil((endDay.getTime() - startDay.getTime()) / 86_400_000));
}

function buildSchedule(input: {
  examDate: string;
  dailyMinutes: number;
  topics: string;
  completedIds?: string[];
}): ScheduleDay[] {
  const topics = input.topics
    .split(',')
    .map((topic) => topic.trim())
    .filter(Boolean);
  const completed = new Set(input.completedIds || []);
  const today = new Date();
  const examDate = new Date(input.examDate);
  const days = daysBetweenInclusive(today, examDate);
  const schedule: ScheduleDay[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayTopics = topics.length
      ? [topics[i % topics.length], topics[(i + 1) % topics.length]].filter((v, idx, arr) => arr.indexOf(v) === idx)
      : ['General revision'];
    const isFinalStretch = days - i <= 3;
    const id = date.toISOString().slice(0, 10);

    schedule.push({
      id,
      date: id,
      dayLabel: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      topics: dayTopics,
      minutes: input.dailyMinutes,
      tasks: completed.has(id)
        ? ['Completed']
        : [
            isFinalStretch ? 'Timed past-paper drill' : 'Learn or revise core concept',
            'Active recall without notes',
            'Flashcards or mistake review',
          ],
    });
  }

  return schedule;
}

function mapPlan(row: Record<string, any>) {
  return {
    id: row.id,
    examName: row.exam_name,
    examDate: row.exam_date,
    dailyMinutes: row.daily_minutes,
    topics: row.topics,
    reminderChannel: row.reminder_channel,
    reminderTime: row.reminder_time,
    schedule: row.schedule_json,
    completed: row.completed_json || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  try {
    const userId = await getUserId();
    const { data, error } = await getSupabase()
      .from('exam_countdowns')
      .select('*')
      .eq('user_id', userId)
      .order('exam_date', { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ plans: (data || []).map(mapPlan) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load exam countdowns';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json() as {
      examName?: string;
      examDate?: string;
      dailyMinutes?: number;
      topics?: string;
      reminderChannel?: string;
      reminderTime?: string;
    };

    if (!body.examName?.trim() || !body.examDate || !body.topics?.trim()) {
      return NextResponse.json({ error: 'examName, examDate, and topics are required' }, { status: 400 });
    }

    const schedule = buildSchedule({
      examDate: body.examDate,
      dailyMinutes: body.dailyMinutes || 45,
      topics: body.topics,
    });
    const now = new Date().toISOString();
    const row = {
      id: nanoid(),
      user_id: userId,
      exam_name: body.examName.trim(),
      exam_date: body.examDate,
      daily_minutes: body.dailyMinutes || 45,
      topics: body.topics.trim(),
      reminder_channel: body.reminderChannel || 'browser',
      reminder_time: body.reminderTime || '18:00',
      schedule_json: schedule,
      completed_json: [],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await getSupabase()
      .from('exam_countdowns')
      .insert(row)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ plan: mapPlan(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create exam countdown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json() as { id?: string; completedDayId?: string };
    if (!body.id || !body.completedDayId) {
      return NextResponse.json({ error: 'id and completedDayId are required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: existing, error: fetchError } = await supabase
      .from('exam_countdowns')
      .select('*')
      .eq('id', body.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw new Error(fetchError.message);
    if (!existing) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const completed = Array.from(new Set([...(existing.completed_json || []), body.completedDayId]));
    const schedule = buildSchedule({
      examDate: existing.exam_date,
      dailyMinutes: existing.daily_minutes,
      topics: existing.topics,
      completedIds: completed,
    });

    const { data, error } = await supabase
      .from('exam_countdowns')
      .update({
        completed_json: completed,
        schedule_json: schedule,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ plan: mapPlan(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update exam countdown';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
