import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, BarChart3, Download, Filter, Loader2, PieChart, TrendingUp, Users,
  Calendar, Euro, AlertTriangle, CheckCircle2, XCircle, ClipboardCheck, Send,
  Bot, Sparkles, CreditCard, Hash, Target, Percent, Clock, MapPin
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, subMonths, isWithinInterval, parseISO, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

// ── Types ───────────────────────────────────────────────────────
interface VolunteerReport {
  id: string; name: string; email: string | null;
  totalSignups: number; totalAssigned: number; totalCheckedIn: number;
  noShows: number; totalEarned: number; tasksWorked: string[]; eventsWorked: string[];
}

interface TaskReport {
  id: string; title: string; eventTitle: string | null; date: string | null;
  totalSlots: number; signups: number; assigned: number; checkedIn: number;
  noShows: number; compensation: string; totalPaid: number; location: string | null;
}

interface EventReport {
  id: string; title: string; date: string | null;
  totalTasks: number; totalVolunteers: number; checkedIn: number; fillRate: number;
  totalPaid: number; topTask: string | null;
}

type ChartType = 'bar' | 'line' | 'pie' | 'area';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))', 'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))', '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
];

const ReportingDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);

  // Raw data
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [hourConfs, setHourConfs] = useState<any[]>([]);
  const [sepaItems, setSepaItems] = useState<any[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState<Date>(subMonths(new Date(), 3));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('all');
  const [selectedCompType, setSelectedCompType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [chartType, setChartType] = useState<ChartType>('bar');

  // AI
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  // ── Init ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }
      const { data: clubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id).limit(1);
      let cid = clubs?.[0]?.id;
      if (!cid) {
        const { data: members } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id).limit(1);
        cid = members?.[0]?.club_id;
      }
      if (!cid) { navigate('/club-dashboard'); return; }
      setClubId(cid);
    })();
  }, [navigate]);

  // ── Load data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      setLoading(true);
      const [tasksRes, eventsRes, signupsRes, paymentsRes, ticketsRes, hourConfsRes, sepaRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('club_id', clubId),
        supabase.from('events').select('*').eq('club_id', clubId),
        supabase.from('task_signups').select('*'),
        supabase.from('volunteer_payments').select('*').eq('club_id', clubId),
        supabase.from('volunteer_tickets').select('*').eq('club_id', clubId),
        supabase.from('hour_confirmations').select('*'),
        supabase.from('sepa_batch_items').select('*'),
      ]);

      const taskData = tasksRes.data || [];
      setTasks(taskData);
      setEvents(eventsRes.data || []);
      setPayments(paymentsRes.data || []);
      setTickets(ticketsRes.data || []);

      const taskIds = new Set(taskData.map((t: any) => t.id));
      const clubSignups = (signupsRes.data || []).filter((s: any) => taskIds.has(s.task_id));
      setSignups(clubSignups);
      const clubHourConfs = (hourConfsRes.data || []).filter((h: any) => taskIds.has(h.task_id));
      setHourConfs(clubHourConfs);
      const clubSepa = (sepaRes.data || []).filter((s: any) => taskIds.has(s.task_id));
      setSepaItems(clubSepa);

      const volIds = [...new Set(clubSignups.map((s: any) => s.volunteer_id))];
      if (volIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', volIds);
        setProfiles(profs || []);
      }
      setLoading(false);
    };
    load();
  }, [clubId]);

  // ── Derived data ───────────────────────────────────────────────
  const taskMap = useMemo(() => Object.fromEntries(tasks.map((t: any) => [t.id, t])), [tasks]);
  const eventMap = useMemo(() => Object.fromEntries(events.map((e: any) => [e.id, e])), [events]);
  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p: any) => [p.id, p])), [profiles]);

  // Unique locations for filter
  const uniqueLocations = useMemo(() => {
    const locs = new Set(tasks.map((t: any) => t.location).filter(Boolean));
    return [...locs].sort();
  }, [tasks]);

  // Date + multi-filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      const d = t.task_date ? parseISO(t.task_date) : null;
      if (d && !isWithinInterval(d, { start: dateFrom, end: dateTo })) return false;
      if (selectedEventId !== 'all' && t.event_id !== selectedEventId) return false;
      if (selectedCompType !== 'all' && t.compensation_type !== selectedCompType) return false;
      if (selectedLocation !== 'all' && t.location !== selectedLocation) return false;
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      return true;
    });
  }, [tasks, dateFrom, dateTo, selectedEventId, selectedCompType, selectedLocation, selectedStatus]);

  const filteredTaskIds = useMemo(() => new Set(filteredTasks.map((t: any) => t.id)), [filteredTasks]);

  const filteredSignups = useMemo(() => {
    return signups.filter((s: any) => {
      if (!filteredTaskIds.has(s.task_id)) return false;
      if (selectedVolunteerId !== 'all' && s.volunteer_id !== selectedVolunteerId) return false;
      return true;
    });
  }, [signups, filteredTaskIds, selectedVolunteerId]);

  const filteredPayments = useMemo(() =>
    payments.filter((p: any) => filteredTaskIds.has(p.task_id)),
    [payments, filteredTaskIds]
  );

  // ── Volunteer reports ──────────────────────────────────────────
  const volunteerReports: VolunteerReport[] = useMemo(() => {
    const map = new Map<string, VolunteerReport>();
    filteredSignups.forEach((s: any) => {
      const p = profileMap[s.volunteer_id];
      if (!map.has(s.volunteer_id)) {
        map.set(s.volunteer_id, {
          id: s.volunteer_id, name: p?.full_name || 'Onbekend', email: p?.email || null,
          totalSignups: 0, totalAssigned: 0, totalCheckedIn: 0, noShows: 0,
          totalEarned: 0, tasksWorked: [], eventsWorked: [],
        });
      }
      const r = map.get(s.volunteer_id)!;
      r.totalSignups++;
      if (s.status === 'assigned') {
        r.totalAssigned++;
        const task = taskMap[s.task_id];
        if (task) {
          r.tasksWorked.push(task.title);
          if (task.event_id && eventMap[task.event_id]) r.eventsWorked.push(eventMap[task.event_id].title);
        }
      }
    });
    tickets.forEach((t: any) => {
      if (!filteredTaskIds.has(t.task_id)) return;
      const r = map.get(t.volunteer_id);
      if (r && t.status === 'checked_in') r.totalCheckedIn++;
    });
    filteredPayments.forEach((p: any) => {
      const r = map.get(p.volunteer_id);
      if (r && p.status === 'paid') r.totalEarned += Number(p.amount);
    });
    map.forEach(r => {
      r.noShows = Math.max(0, r.totalAssigned - r.totalCheckedIn);
      r.eventsWorked = [...new Set(r.eventsWorked)];
    });
    let results = Array.from(map.values());
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(r => r.name.toLowerCase().includes(q) || (r.email && r.email.toLowerCase().includes(q)));
    }
    return results.sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [filteredSignups, profileMap, taskMap, eventMap, tickets, filteredPayments, filteredTaskIds, searchQuery]);

  // ── Task reports ───────────────────────────────────────────────
  const taskReports: TaskReport[] = useMemo(() => {
    return filteredTasks.map((t: any) => {
      const tSignups = signups.filter((s: any) => s.task_id === t.id);
      const assigned = tSignups.filter((s: any) => s.status === 'assigned');
      const tTickets = tickets.filter((tk: any) => tk.task_id === t.id);
      const checkedIn = tTickets.filter((tk: any) => tk.status === 'checked_in').length;
      const tPayments = payments.filter((p: any) => p.task_id === t.id && p.status === 'paid');
      const event = t.event_id ? eventMap[t.event_id] : null;
      return {
        id: t.id, title: t.title, eventTitle: event?.title || null, date: t.task_date,
        totalSlots: t.spots_available || 0, signups: tSignups.length, assigned: assigned.length,
        checkedIn, noShows: Math.max(0, assigned.length - checkedIn),
        compensation: t.compensation_type === 'hourly' ? `€${t.hourly_rate}/u` : `€${t.expense_amount || 0}`,
        totalPaid: tPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0),
        location: t.location,
      };
    }).sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredTasks, signups, tickets, payments, eventMap]);

  // ── Event reports ──────────────────────────────────────────────
  const eventReports: EventReport[] = useMemo(() => {
    const filtered = events.filter((e: any) => {
      const d = e.event_date ? parseISO(e.event_date) : null;
      if (d && !isWithinInterval(d, { start: dateFrom, end: dateTo })) return false;
      if (selectedEventId !== 'all' && e.id !== selectedEventId) return false;
      return true;
    });
    return filtered.map((e: any) => {
      const eTasks = tasks.filter((t: any) => t.event_id === e.id);
      const eTaskIds = new Set(eTasks.map((t: any) => t.id));
      const eSignups = signups.filter((s: any) => eTaskIds.has(s.task_id) && s.status === 'assigned');
      const eTickets = tickets.filter((tk: any) => eTaskIds.has(tk.task_id) && tk.status === 'checked_in');
      const totalSlots = eTasks.reduce((s: number, t: any) => s + (t.spots_available || 0), 0);
      const ePaid = payments.filter((p: any) => eTaskIds.has(p.task_id) && p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount), 0);
      // Most popular task in event
      const taskSignupCounts = eTasks.map((t: any) => ({
        title: t.title,
        count: signups.filter((s: any) => s.task_id === t.id).length,
      })).sort((a: any, b: any) => b.count - a.count);

      return {
        id: e.id, title: e.title, date: e.event_date,
        totalTasks: eTasks.length, totalVolunteers: eSignups.length,
        checkedIn: eTickets.length,
        fillRate: totalSlots > 0 ? Math.round((eSignups.length / totalSlots) * 100) : 0,
        totalPaid: ePaid,
        topTask: taskSignupCounts[0]?.title || null,
      };
    }).sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [events, tasks, signups, tickets, payments, dateFrom, dateTo, selectedEventId]);

  // ── KPIs (extended) ───────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalVolunteers = volunteerReports.length;
    const totalTasks = filteredTasks.length;
    const totalAssigned = volunteerReports.reduce((s, r) => s + r.totalAssigned, 0);
    const totalCheckedIn = volunteerReports.reduce((s, r) => s + r.totalCheckedIn, 0);
    const totalNoShows = volunteerReports.reduce((s, r) => s + r.noShows, 0);
    const totalPaid = filteredPayments.filter(p => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalPending = filteredPayments.filter(p => p.status === 'pending').reduce((s: number, p: any) => s + Number(p.amount), 0);
    const attendanceRate = totalAssigned > 0 ? Math.round((totalCheckedIn / totalAssigned) * 100) : 0;
    const avgPerVolunteer = totalVolunteers > 0 ? Math.round(totalAssigned / totalVolunteers * 10) / 10 : 0;
    const totalSepa = sepaItems.filter(s => filteredTaskIds.has(s.task_id)).reduce((sum: number, s: any) => sum + Number(s.amount), 0);
    const totalSlots = filteredTasks.reduce((s: number, t: any) => s + (t.spots_available || 0), 0);
    const fillRate = totalSlots > 0 ? Math.round((totalAssigned / totalSlots) * 100) : 0;

    // This month spending
    const now = new Date();
    const thisMonthPaid = filteredPayments
      .filter((p: any) => p.status === 'paid' && p.paid_at && isSameMonth(parseISO(p.paid_at), now))
      .reduce((s: number, p: any) => s + Number(p.amount), 0);

    // Avg cost per task
    const avgCostPerTask = totalTasks > 0 ? Math.round(totalPaid / totalTasks * 100) / 100 : 0;

    return {
      totalVolunteers, totalTasks, totalAssigned, totalCheckedIn, totalNoShows,
      totalPaid, totalPending, attendanceRate, avgPerVolunteer, totalSepa,
      fillRate, thisMonthPaid, avgCostPerTask, totalSlots,
    };
  }, [volunteerReports, filteredTasks, filteredPayments, sepaItems, filteredTaskIds]);

  // ── Chart data ─────────────────────────────────────────────────
  const signupsPerEventChart = useMemo(() =>
    eventReports.slice(0, 15).map(e => ({
      name: e.title.length > 20 ? e.title.slice(0, 18) + '…' : e.title,
      Toegewezen: e.totalVolunteers, Ingecheckt: e.checkedIn,
    })), [eventReports]);

  const compensationPieData = useMemo(() => {
    const byType: Record<string, number> = {};
    filteredTasks.forEach((t: any) => {
      const label = t.compensation_type === 'hourly' ? 'Uurloon' : 'Vast bedrag';
      byType[label] = (byType[label] || 0) + 1;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [filteredTasks]);

  const monthlyTrendData = useMemo(() => {
    const months: Record<string, { month: string; signups: number; checkedIn: number; paid: number }> = {};
    filteredSignups.forEach((s: any) => {
      const task = taskMap[s.task_id];
      if (!task?.task_date) return;
      const m = format(parseISO(task.task_date), 'yyyy-MM');
      if (!months[m]) months[m] = { month: m, signups: 0, checkedIn: 0, paid: 0 };
      months[m].signups++;
    });
    tickets.forEach((t: any) => {
      const task = taskMap[t.task_id];
      if (!task?.task_date || !filteredTaskIds.has(t.task_id)) return;
      const m = format(parseISO(task.task_date), 'yyyy-MM');
      if (months[m] && t.status === 'checked_in') months[m].checkedIn++;
    });
    filteredPayments.forEach((p: any) => {
      if (p.status !== 'paid') return;
      const task = taskMap[p.task_id];
      if (!task?.task_date) return;
      const m = format(parseISO(task.task_date), 'yyyy-MM');
      if (months[m]) months[m].paid += Number(p.amount);
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredSignups, tickets, filteredPayments, taskMap, filteredTaskIds]);

  const topVolunteersChart = useMemo(() =>
    volunteerReports.slice(0, 10).map(v => ({
      name: v.name.length > 15 ? v.name.slice(0, 13) + '…' : v.name,
      Taken: v.totalAssigned, Verdiend: v.totalEarned,
    })), [volunteerReports]);

  const noShowRateChart = useMemo(() => {
    const total = kpis.totalAssigned;
    if (total === 0) return [];
    return [
      { name: 'Aanwezig', value: kpis.totalCheckedIn },
      { name: 'No-show', value: kpis.totalNoShows },
      { name: 'Onbekend', value: Math.max(0, total - kpis.totalCheckedIn - kpis.totalNoShows) },
    ];
  }, [kpis]);

  const monthlySpendingChart = useMemo(() => {
    const months: Record<string, number> = {};
    filteredPayments.filter((p: any) => p.status === 'paid' && p.paid_at).forEach((p: any) => {
      const m = format(parseISO(p.paid_at), 'yyyy-MM');
      months[m] = (months[m] || 0) + Number(p.amount);
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, bedrag]) => ({ month, Bedrag: Math.round(bedrag * 100) / 100 }));
  }, [filteredPayments]);

  const volunteersByEventChart = useMemo(() => {
    return eventReports.slice(0, 10).map(e => ({
      name: e.title.length > 18 ? e.title.slice(0, 16) + '…' : e.title,
      Vrijwilligers: e.totalVolunteers,
      Bezetting: e.fillRate,
    }));
  }, [eventReports]);

  // ── AI data summary ───────────────────────────────────────────
  const buildDataSummary = () => {
    const lines = [
      `Periode: ${format(dateFrom, 'dd/MM/yyyy')} - ${format(dateTo, 'dd/MM/yyyy')}`,
      `Totaal taken: ${kpis.totalTasks}`,
      `Totaal vrijwilligers: ${kpis.totalVolunteers}`,
      `Totaal toewijzingen: ${kpis.totalAssigned}`,
      `Totaal ingecheckt: ${kpis.totalCheckedIn}`,
      `Totaal no-shows: ${kpis.totalNoShows}`,
      `Opkomstpercentage: ${kpis.attendanceRate}%`,
      `Totaal uitbetaald: €${kpis.totalPaid.toFixed(2)}`,
      `Openstaande betalingen: €${kpis.totalPending.toFixed(2)}`,
      `SEPA uitbetalingen: €${kpis.totalSepa.toFixed(2)}`,
      `Gemiddeld per taak: €${kpis.avgCostPerTask.toFixed(2)}`,
      `Bezettingsgraad: ${kpis.fillRate}%`,
      `Deze maand uitbetaald: €${kpis.thisMonthPaid.toFixed(2)}`,
      `Totaal beschikbare plaatsen: ${kpis.totalSlots}`,
      '',
      'TOP 10 VRIJWILLIGERS:',
      ...volunteerReports.slice(0, 10).map(v =>
        `- ${v.name}: ${v.totalAssigned} taken, ${v.totalCheckedIn} ingecheckt, ${v.noShows} no-shows, €${v.totalEarned.toFixed(2)} verdiend, evenementen: ${v.eventsWorked.join(', ') || 'geen'}`
      ),
      '',
      'EVENEMENTEN:',
      ...eventReports.map(e =>
        `- ${e.title} (${e.date ? format(parseISO(e.date), 'dd/MM/yyyy') : 'geen datum'}): ${e.totalTasks} taken, ${e.totalVolunteers} vrijwilligers, ${e.checkedIn} ingecheckt, bezetting ${e.fillRate}%, €${e.totalPaid.toFixed(2)} uitbetaald, populairste taak: ${e.topTask || 'n.v.t.'}`
      ),
      '',
      'TAKEN (recent):',
      ...taskReports.slice(0, 20).map(t =>
        `- ${t.title} (${t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '?'}): ${t.assigned}/${t.totalSlots} plaatsen, ${t.checkedIn} ingecheckt, ${t.noShows} no-shows, ${t.compensation}, €${t.totalPaid.toFixed(2)} uitbetaald, locatie: ${t.location || 'onbekend'}`
      ),
      '',
      'MAANDELIJKSE UITGAVEN:',
      ...monthlySpendingChart.map(m => `- ${m.month}: €${m.Bedrag.toFixed(2)}`),
    ];
    return lines.join('\n');
  };

  // ── AI chat ───────────────────────────────────────────────────
  const handleAiQuestion = async () => {
    if (!aiQuestion.trim() || aiLoading) return;
    const question = aiQuestion.trim();
    setAiQuestion('');
    setAiMessages(prev => [...prev, { role: 'user', content: question }]);
    setAiLoading(true);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reporting-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ question, dataSummary: buildDataSummary() }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Fout' }));
        toast.error(err.error || 'AI fout');
        setAiLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let assistantSoFar = '';
      let textBuffer = '';

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setAiMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      let done = false;
      while (!done) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { done = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch { textBuffer = line + '\n' + textBuffer; break; }
        }
      }
    } catch (e) {
      toast.error('AI assistent fout');
      console.error(e);
    }
    setAiLoading(false);
  };

  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  // ── Date picker ────────────────────────────────────────────────
  const DatePicker = ({ date, onChange, label }: { date: Date; onChange: (d: Date) => void; label: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start text-left font-normal gap-2", !date && "text-muted-foreground")}>
          <Calendar className="w-4 h-4" />
          {format(date, 'dd MMM yyyy', { locale: nl })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent mode="single" selected={date} onSelect={(d) => d && onChange(d)} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );

  // ── Chart renderer ─────────────────────────────────────────────
  const renderChart = (data: any[], dataKeys: string[], xKey: string) => {
    if (!data.length) return <p className="text-sm text-muted-foreground text-center py-8">Geen data beschikbaar</p>;
    switch (chartType) {
      case 'line':
        return (<ResponsiveContainer width="100%" height={300}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} /><Legend />{dataKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />)}</LineChart></ResponsiveContainer>);
      case 'area':
        return (<ResponsiveContainer width="100%" height={300}><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} /><Legend />{dataKeys.map((k, i) => <Area key={k} type="monotone" dataKey={k} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />)}</AreaChart></ResponsiveContainer>);
      case 'pie':
        return (<ResponsiveContainer width="100%" height={300}><RechartsPie><Pie data={data.map((d) => ({ name: d[xKey], value: d[dataKeys[0]] || 0 }))} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></RechartsPie></ResponsiveContainer>);
      default:
        return (<ResponsiveContainer width="100%" height={300}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" /><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} /><Legend />{dataKeys.map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}</BarChart></ResponsiveContainer>);
    }
  };

  // ── CSV export ─────────────────────────────────────────────────
  const exportCSV = (rows: Record<string, any>[], filename: string) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(';'), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Quick presets for AI ───────────────────────────────────────
  const aiPresets = [
    'Hoeveel hebben we deze maand uitgegeven?',
    'Welke vrijwilliger heeft de meeste no-shows?',
    'Op welk evenement zetten we de meeste vrijwilligers in?',
    'Wat is ons gemiddeld opkomstpercentage per evenement?',
    'Hoeveel taken hadden we deze periode?',
    'Wie zijn onze meest actieve vrijwilligers?',
    'Welke taken zijn het minst bezet?',
    'Geef een overzicht van onze maandelijkse kosten',
  ];

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/club-dashboard')} className="text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <Logo />
          <h1 className="text-lg font-bold text-foreground ml-2">Rapportering</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Filters ─────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Van</label>
                <DatePicker date={dateFrom} onChange={setDateFrom} label="Van" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tot</label>
                <DatePicker date={dateTo} onChange={setDateTo} label="Tot" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Evenement</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger><SelectValue placeholder="Alle evenementen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle evenementen</SelectItem>
                    {events.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Vrijwilliger</label>
                <Select value={selectedVolunteerId} onValueChange={setSelectedVolunteerId}>
                  <SelectTrigger><SelectValue placeholder="Alle vrijwilligers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle vrijwilligers</SelectItem>
                    {profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Vergoedingstype</label>
                <Select value={selectedCompType} onValueChange={setSelectedCompType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle types</SelectItem>
                    <SelectItem value="fixed">Vast bedrag</SelectItem>
                    <SelectItem value="hourly">Uurloon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Locatie</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle locaties</SelectItem>
                    {uniqueLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Taakstatus</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle statussen</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Gesloten</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Grafiektype</label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Staafdiagram</SelectItem>
                    <SelectItem value="line">Lijndiagram</SelectItem>
                    <SelectItem value="area">Vlakdiagram</SelectItem>
                    <SelectItem value="pie">Taartdiagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Zoek op naam of e-mail..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-xs" />
              <Button variant="outline" size="sm" onClick={() => {
                setDateFrom(subMonths(new Date(), 3)); setDateTo(new Date());
                setSelectedEventId('all'); setSelectedVolunteerId('all');
                setSelectedCompType('all'); setSelectedLocation('all');
                setSelectedStatus('all'); setSearchQuery('');
              }}>Reset</Button>
            </div>
          </CardContent>
        </Card>

        {/* ── KPI Cards (extended) ────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { icon: Users, label: 'Vrijwilligers', value: kpis.totalVolunteers, color: 'text-primary' },
            { icon: Hash, label: 'Taken', value: kpis.totalTasks, color: 'text-primary' },
            { icon: ClipboardCheck, label: 'Toewijzingen', value: kpis.totalAssigned, color: 'text-primary' },
            { icon: CheckCircle2, label: 'Ingecheckt', value: kpis.totalCheckedIn, color: 'text-emerald-500' },
            { icon: XCircle, label: 'No-shows', value: kpis.totalNoShows, color: 'text-destructive' },
            { icon: Percent, label: 'Opkomst', value: `${kpis.attendanceRate}%`, color: 'text-primary' },
            { icon: Target, label: 'Bezetting', value: `${kpis.fillRate}%`, color: 'text-primary' },
            { icon: Euro, label: 'Uitbetaald', value: `€${kpis.totalPaid.toFixed(0)}`, color: 'text-primary' },
            { icon: CreditCard, label: 'Deze maand', value: `€${kpis.thisMonthPaid.toFixed(0)}`, color: 'text-primary' },
            { icon: Clock, label: '€/taak gem.', value: `€${kpis.avgCostPerTask.toFixed(0)}`, color: 'text-primary' },
          ].map((kpi, i) => (
            <Card key={i}><CardContent className="pt-4 pb-3 text-center">
              <kpi.icon className={cn("w-5 h-5 mx-auto mb-1", kpi.color)} />
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-4 h-4" />Overzicht</TabsTrigger>
            <TabsTrigger value="volunteers" className="gap-1.5"><Users className="w-4 h-4" />Vrijwilligers</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5"><Calendar className="w-4 h-4" />Taken</TabsTrigger>
            <TabsTrigger value="events" className="gap-1.5"><PieChart className="w-4 h-4" />Evenementen</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5"><Bot className="w-4 h-4" />AI Assistent</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card><CardHeader><CardTitle className="text-base">Maandelijkse trend</CardTitle></CardHeader>
                <CardContent>{renderChart(monthlyTrendData, ['signups', 'checkedIn'], 'month')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Maandelijkse uitgaven (€)</CardTitle></CardHeader>
                <CardContent>{renderChart(monthlySpendingChart, ['Bedrag'], 'month')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Per evenement</CardTitle></CardHeader>
                <CardContent>{renderChart(signupsPerEventChart, ['Toegewezen', 'Ingecheckt'], 'name')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Opkomst overzicht</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie><Pie data={noShowRateChart} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {noShowRateChart.map((_, i) => <Cell key={i} fill={[COLORS[1], COLORS[4], COLORS[3]][i]} />)}
                    </Pie><Tooltip /><Legend /></RechartsPie>
                  </ResponsiveContainer>
                </CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Top vrijwilligers</CardTitle></CardHeader>
                <CardContent>{renderChart(topVolunteersChart, ['Taken', 'Verdiend'], 'name')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Vrijwilligers per evenement</CardTitle></CardHeader>
                <CardContent>{renderChart(volunteersByEventChart, ['Vrijwilligers', 'Bezetting'], 'name')}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Vergoedingstype verdeling</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPie><Pie data={compensationPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {compensationPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie><Tooltip /><Legend /></RechartsPie>
                  </ResponsiveContainer>
                </CardContent></Card>
            </div>
          </TabsContent>

          {/* VOLUNTEERS */}
          <TabsContent value="volunteers" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(volunteerReports.map(v => ({
                Naam: v.name, Email: v.email || '', Inschrijvingen: v.totalSignups, Toegewezen: v.totalAssigned,
                Ingecheckt: v.totalCheckedIn, NoShows: v.noShows, Verdiend: `€${v.totalEarned.toFixed(2)}`,
                Evenementen: v.eventsWorked.join(', '),
              })), 'vrijwilligers-rapport')}>
                <Download className="w-4 h-4" /> Exporteer CSV
              </Button>
            </div>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Naam</TableHead><TableHead>E-mail</TableHead>
                <TableHead className="text-center">Inschrijvingen</TableHead><TableHead className="text-center">Toegewezen</TableHead>
                <TableHead className="text-center">Ingecheckt</TableHead><TableHead className="text-center">No-shows</TableHead>
                <TableHead className="text-right">Verdiend</TableHead><TableHead>Evenementen</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {volunteerReports.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen data gevonden</TableCell></TableRow>
                ) : volunteerReports.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{v.email || '—'}</TableCell>
                    <TableCell className="text-center">{v.totalSignups}</TableCell>
                    <TableCell className="text-center">{v.totalAssigned}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{v.totalCheckedIn}</Badge></TableCell>
                    <TableCell className="text-center">{v.noShows > 0 ? <Badge variant="destructive">{v.noShows}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell className="text-right font-medium">€{v.totalEarned.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{v.eventsWorked.join(', ') || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div></CardContent></Card>
          </TabsContent>

          {/* TASKS */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(taskReports.map(t => ({
                Taak: t.title, Evenement: t.eventTitle || '', Datum: t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '',
                Locatie: t.location || '', Plaatsen: t.totalSlots, Inschrijvingen: t.signups, Toegewezen: t.assigned,
                Ingecheckt: t.checkedIn, NoShows: t.noShows, Vergoeding: t.compensation, Uitbetaald: `€${t.totalPaid.toFixed(2)}`,
              })), 'taken-rapport')}>
                <Download className="w-4 h-4" /> Exporteer CSV
              </Button>
            </div>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Taak</TableHead><TableHead>Evenement</TableHead><TableHead>Datum</TableHead><TableHead>Locatie</TableHead>
                <TableHead className="text-center">Plaatsen</TableHead><TableHead className="text-center">Inschrijvingen</TableHead>
                <TableHead className="text-center">Toegewezen</TableHead><TableHead className="text-center">Ingecheckt</TableHead>
                <TableHead className="text-center">No-shows</TableHead><TableHead>Vergoeding</TableHead><TableHead className="text-right">Uitbetaald</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {taskReports.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Geen data gevonden</TableCell></TableRow>
                ) : taskReports.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell className="text-muted-foreground">{t.eventTitle || '—'}</TableCell>
                    <TableCell className="text-sm">{t.date ? format(parseISO(t.date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.location || '—'}</TableCell>
                    <TableCell className="text-center">{t.totalSlots}</TableCell>
                    <TableCell className="text-center">{t.signups}</TableCell>
                    <TableCell className="text-center">{t.assigned}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{t.checkedIn}</Badge></TableCell>
                    <TableCell className="text-center">{t.noShows > 0 ? <Badge variant="destructive">{t.noShows}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell className="text-sm">{t.compensation}</TableCell>
                    <TableCell className="text-right font-medium">€{t.totalPaid.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div></CardContent></Card>
          </TabsContent>

          {/* EVENTS */}
          <TabsContent value="events" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCSV(eventReports.map(e => ({
                Evenement: e.title, Datum: e.date ? format(parseISO(e.date), 'dd/MM/yyyy') : '',
                Taken: e.totalTasks, Vrijwilligers: e.totalVolunteers, Ingecheckt: e.checkedIn,
                'Bezetting %': `${e.fillRate}%`, Uitbetaald: `€${e.totalPaid.toFixed(2)}`,
                'Populairste taak': e.topTask || '',
              })), 'evenementen-rapport')}>
                <Download className="w-4 h-4" /> Exporteer CSV
              </Button>
            </div>
            <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead>Evenement</TableHead><TableHead>Datum</TableHead>
                <TableHead className="text-center">Taken</TableHead><TableHead className="text-center">Vrijwilligers</TableHead>
                <TableHead className="text-center">Ingecheckt</TableHead><TableHead className="text-center">Bezetting</TableHead>
                <TableHead className="text-right">Uitbetaald</TableHead><TableHead>Populairste taak</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {eventReports.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen data gevonden</TableCell></TableRow>
                ) : eventReports.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell className="text-sm">{e.date ? format(parseISO(e.date), 'dd/MM/yyyy') : '—'}</TableCell>
                    <TableCell className="text-center">{e.totalTasks}</TableCell>
                    <TableCell className="text-center">{e.totalVolunteers}</TableCell>
                    <TableCell className="text-center"><Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300">{e.checkedIn}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant={e.fillRate >= 80 ? 'default' : e.fillRate >= 50 ? 'secondary' : 'destructive'}>{e.fillRate}%</Badge></TableCell>
                    <TableCell className="text-right font-medium">€{e.totalPaid.toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.topTask || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div></CardContent></Card>
          </TabsContent>

          {/* AI ASSISTANT */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Rapportage Assistent
                </CardTitle>
                <p className="text-sm text-muted-foreground">Stel een vraag over je club data en de AI filtert en analyseert het voor jou.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick presets */}
                <div className="flex flex-wrap gap-2">
                  {aiPresets.map((preset, i) => (
                    <Button key={i} variant="outline" size="sm" className="text-xs"
                      onClick={() => { setAiQuestion(preset); }}>
                      {preset}
                    </Button>
                  ))}
                </div>

                {/* Chat messages */}
                <div className="border border-border rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto bg-muted/30 space-y-3">
                  {aiMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                      <Bot className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm">Stel een vraag om te beginnen...</p>
                      <p className="text-xs mt-1">Bijv. "Hoeveel hebben we deze maand uitgegeven?"</p>
                    </div>
                  )}
                  {aiMessages.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border text-foreground'
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyseren...
                      </div>
                    </div>
                  )}
                  <div ref={aiEndRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Stel je vraag... bijv. 'Welke vrijwilliger werkte het meest?'"
                    value={aiQuestion}
                    onChange={e => setAiQuestion(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiQuestion(); } }}
                    className="min-h-[44px] max-h-[100px] resize-none"
                    rows={1}
                  />
                  <Button onClick={handleAiQuestion} disabled={aiLoading || !aiQuestion.trim()} size="icon" className="shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ReportingDashboard;
