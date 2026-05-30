'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, CalendarClock, CheckCircle2, Clock3, Loader2, MessageCircle, Smartphone } from 'lucide-react';

type ExamPlan = {
  id: string;
  examName: string;
  examDate: string;
  dailyMinutes: number;
  topics: string;
  reminderChannel: string;
  reminderTime: string;
  schedule: {
    id: string;
    date: string;
    dayLabel: string;
    topics: string[];
    minutes: number;
    tasks: string[];
  }[];
  completed: string[];
};

const cardStyle = {
  background: 'rgba(13,17,23,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(16px)',
};

const inputStyle = {
  background: 'rgba(20,27,36,0.8)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#F0F4F8',
};

function daysLeft(examDate: string) {
  const diff = new Date(examDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function ExamCountdownPage() {
  const [plans, setPlans] = useState<ExamPlan[]>([]);
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState('45');
  const [topics, setTopics] = useState('');
  const [reminderChannel, setReminderChannel] = useState('browser');
  const [reminderTime, setReminderTime] = useState('18:00');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/exam-countdown');
    const data = await res.json();
    if (res.ok) setPlans(data.plans || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const enableBrowserReminder = async (plan?: ExamPlan) => {
    if (!('Notification' in window)) {
      toast.error('Chrome notifications are not available in this browser');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notifications were not enabled');
      return;
    }
    const title = plan ? `${plan.examName} study reminder` : 'AetherLearn study reminder';
    const body = plan
      ? `Today: ${plan.schedule[0]?.topics.join(', ') || 'review your plan'}`
      : 'Your daily study reminder is ready.';

    navigator.serviceWorker?.controller?.postMessage({
      type: 'AETHER_NOTIFY',
      title,
      body,
      url: '/exam-countdown',
    });
    new Notification(title, { body });
    toast.success('Browser reminders enabled');
  };

  const createPlan = async () => {
    if (!examName.trim() || !examDate || !topics.trim()) {
      toast.error('Add exam name, date, and topics');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/exam-countdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examName,
          examDate,
          dailyMinutes: parseInt(dailyMinutes, 10) || 45,
          topics,
          reminderChannel,
          reminderTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create countdown');
      setPlans((prev) => [data.plan, ...prev]);
      setExamName('');
      setExamDate('');
      setTopics('');
      toast.success('Exam countdown created');
      if (reminderChannel === 'browser') enableBrowserReminder(data.plan);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create countdown');
    } finally {
      setLoading(false);
    }
  };

  const completeDay = async (plan: ExamPlan, dayId: string) => {
    const res = await fetch('/api/exam-countdown', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: plan.id, completedDayId: dayId }),
    });
    const data = await res.json();
    if (res.ok) {
      setPlans((prev) => prev.map((p) => p.id === plan.id ? data.plan : p));
      toast.success('Schedule adjusted');
    }
  };

  return (
    <AppShell
      title="Exam Countdown"
      description="Set an exam date, generate an adaptive daily schedule, and enable reminders."
    >
      <div className="mb-8 rounded-2xl p-5" style={cardStyle}>
        <div className="mb-5 flex items-center gap-3">
          <CalendarClock className="h-5 w-5" style={{ color: '#A99BFF' }} />
          <h2 className="text-base font-semibold" style={{ color: '#F0F4F8' }}>Create countdown</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="KCSE Biology Paper 2" className="min-h-[44px]" style={inputStyle} />
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="min-h-[44px]" style={inputStyle} />
          <Input type="number" value={dailyMinutes} onChange={(e) => setDailyMinutes(e.target.value)} placeholder="Minutes per day" className="min-h-[44px]" style={inputStyle} />
          <Input value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} placeholder="18:00" className="min-h-[44px]" style={inputStyle} />
        </div>
        <Input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Cell biology, genetics, ecology, past papers" className="mt-3 min-h-[44px]" style={inputStyle} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Select value={reminderChannel} onValueChange={setReminderChannel}>
            <SelectTrigger className="min-h-[44px] sm:w-64" style={inputStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: '#141B24', border: '1px solid rgba(255,255,255,0.08)' }}>
              <SelectItem value="browser">Chrome notification</SelectItem>
              <SelectItem value="whatsapp">WhatsApp-ready</SelectItem>
              <SelectItem value="sms">SMS-ready</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={createPlan} disabled={loading} className="min-h-[44px] text-white" style={{ background: 'linear-gradient(135deg, #7C6AF5 0%, #5B8DF5 100%)', border: 'none' }}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            Create schedule
          </Button>
        </div>
        <p className="mt-3 text-xs" style={{ color: '#8B9AB0' }}>
          WhatsApp/SMS channels are stored as reminder preferences; connect a provider such as Twilio or WhatsApp Cloud API to send them externally.
        </p>
      </div>

      <div className="space-y-6">
        {plans.map((plan) => (
          <motion.section key={plan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5" style={cardStyle}>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#F0F4F8' }}>{plan.examName}</h2>
                <p className="mt-1 text-sm" style={{ color: '#8B9AB0' }}>
                  {daysLeft(plan.examDate)} days left / {plan.dailyMinutes} min per day
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'rgba(124,106,245,0.12)', color: '#A99BFF' }}>
                  <Clock3 className="h-3.5 w-3.5" />
                  {plan.reminderTime}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399' }}>
                  {plan.reminderChannel === 'browser' ? <Bell className="h-3.5 w-3.5" /> : plan.reminderChannel === 'whatsapp' ? <MessageCircle className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                  {plan.reminderChannel}
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {plan.schedule.slice(0, 9).map((day) => {
                const complete = plan.completed.includes(day.id);
                return (
                  <div key={day.id} className="rounded-xl p-4" style={{ background: complete ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>{day.dayLabel}</h3>
                        <p className="mt-1 text-xs" style={{ color: '#A99BFF' }}>{day.topics.join(', ')}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => completeDay(plan, day.id)} disabled={complete} style={{ color: complete ? '#34D399' : '#8B9AB0' }}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <ul className="space-y-1">
                      {day.tasks.map((task) => (
                        <li key={task} className="text-xs" style={{ color: '#8B9AB0' }}>{task}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))}
      </div>
    </AppShell>
  );
}
