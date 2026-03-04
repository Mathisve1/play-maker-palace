import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Plus, GripVertical, Trash2, Type, Image, PenLine, BarChart3,
  PieChart, TrendingUp, Download, Bot, Sparkles, Loader2, MoveUp, MoveDown,
  FileText, LayoutDashboard, Undo2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, subMonths, parseISO, isWithinInterval, isSameMonth, getDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Logo from '@/components/Logo';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))', '#10b981', '#f59e0b', '#8b5cf6',
  '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#ec4899', '#06b6d4',
];

// ── Widget types ─────────────────────────────────────────────
type WidgetType = 'title' | 'text' | 'logo' | 'signature' | 'chart' | 'ai-chart' | 'spacer' | 'kpi-grid';

interface ReportWidget {
  id: string;
  type: WidgetType;
  data: Record<string, any>;
}

// ── Preset chart options ────────────────────────────────────
const PRESET_CHARTS = [
  { key: 'signupsPerEvent', label: 'Aanmeldingen per evenement', chartType: 'bar' },
  { key: 'monthlySpending', label: 'Maandelijkse uitgaven', chartType: 'area' },
  { key: 'topVolunteers', label: 'Top 10 vrijwilligers', chartType: 'bar' },
  { key: 'noShowRate', label: 'Opkomst vs no-show', chartType: 'pie' },
  { key: 'compensationType', label: 'Vergoedingstype verdeling', chartType: 'pie' },
  { key: 'dayOfWeek', label: 'Taken per dag van de week', chartType: 'bar' },
  { key: 'monthlyTrend', label: 'Maandelijkse trend', chartType: 'line' },
  { key: 'volunteersPerEvent', label: 'Vrijwilligers per evenement', chartType: 'bar' },
];

const genId = () => Math.random().toString(36).slice(2, 10);

const ReportBuilder = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const { language } = useLanguage();
  const t3 = (nlS: string, fr: string, en: string) => language === 'nl' ? nlS : language === 'fr' ? fr : en;
  const [widgets, setWidgets] = useState<ReportWidget[]>([
    { id: genId(), type: 'title', data: { text: 'Bestuursrapport', subtitle: format(new Date(), 'MMMM yyyy', { locale: nl }) } },
  ]);
  const [history, setHistory] = useState<ReportWidget[][]>([]);
  const [exporting, setExporting] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-30), widgets.map(w => ({ ...w, data: { ...w.data } }))]);
  }, [widgets]);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setWidgets(last);
      return prev.slice(0, -1);
    });
  }, []);

  // AI state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Raw data (same pattern as ReportingDashboard)
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [hourConfs, setHourConfs] = useState<any[]>([]);
  const [sepaItems, setSepaItems] = useState<any[]>([]);
  const [signatureRequests, setSignatureRequests] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerMembers, setPartnerMembers] = useState<any[]>([]);
  const [partnerTaskAssignments, setPartnerTaskAssignments] = useState<any[]>([]);

  // ── Init & data loading ───────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }
      const { data: clubs } = await supabase.from('clubs').select('id, name, logo_url').eq('owner_id', session.user.id).limit(1);
      let club = clubs?.[0];
      if (!club) {
        const { data: members } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id).limit(1);
        if (members?.[0]) {
          const { data: c } = await supabase.from('clubs').select('id, name, logo_url').eq('id', members[0].club_id).single();
          club = c;
        }
      }
      if (!club) { navigate('/club-dashboard'); return; }
      setClubId(club.id);
      setClubName(club.name);
      setClubLogo(club.logo_url);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      setLoading(true);
      const [tasksRes, eventsRes, signupsRes, paymentsRes, ticketsRes, hourConfsRes, sepaRes,
        sigReqRes, partnersRes, partnerMembersRes, partnerAssignRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('club_id', clubId),
        supabase.from('events').select('*').eq('club_id', clubId),
        supabase.from('task_signups').select('*'),
        supabase.from('volunteer_payments').select('*').eq('club_id', clubId),
        supabase.from('volunteer_tickets').select('*').eq('club_id', clubId),
        supabase.from('hour_confirmations').select('*'),
        supabase.from('sepa_batch_items').select('*'),
        supabase.from('signature_requests').select('*'),
        supabase.from('external_partners').select('*').eq('club_id', clubId),
        supabase.from('partner_members').select('*'),
        supabase.from('partner_task_assignments').select('*'),
      ]);

      const taskData = tasksRes.data || [];
      setTasks(taskData);
      setEvents(eventsRes.data || []);
      setPayments(paymentsRes.data || []);
      setTickets(ticketsRes.data || []);
      setPartners(partnersRes.data || []);

      const taskIds = new Set(taskData.map((t: any) => t.id));
      setSignups((signupsRes.data || []).filter((s: any) => taskIds.has(s.task_id)));
      setHourConfs((hourConfsRes.data || []).filter((h: any) => taskIds.has(h.task_id)));
      setSepaItems((sepaRes.data || []).filter((s: any) => taskIds.has(s.task_id)));
      setSignatureRequests((sigReqRes.data || []).filter((s: any) => taskIds.has(s.task_id)));
      setPartnerTaskAssignments((partnerAssignRes.data || []).filter((a: any) => taskIds.has(a.task_id)));
      const partnerIds = new Set((partnersRes.data || []).map((p: any) => p.id));
      setPartnerMembers((partnerMembersRes.data || []).filter((m: any) => partnerIds.has(m.partner_id)));

      const volIds = [...new Set((signupsRes.data || []).filter((s: any) => taskIds.has(s.task_id)).map((s: any) => s.volunteer_id))];
      if (volIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', volIds);
        setProfiles(profs || []);
      }
      setLoading(false);
    };
    load();
  }, [clubId]);

  // ── Computed data for charts ──────────────────────────────
  const taskMap = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t])), [tasks]);
  const eventMap = useMemo(() => Object.fromEntries(events.map(e => [e.id, e])), [events]);
  const profileMap = useMemo(() => Object.fromEntries(profiles.map(p => [p.id, p])), [profiles]);

  const chartDataSets = useMemo(() => {
    const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
    const filteredPayments = payments.filter((p: any) => p.status === 'paid' || p.status === 'succeeded');

    // Signups per event
    const signupsPerEvent = events.slice(0, 15).map((e: any) => {
      const eTasks = tasks.filter((t: any) => t.event_id === e.id);
      const eTaskIds = new Set(eTasks.map((t: any) => t.id));
      const assigned = signups.filter((s: any) => eTaskIds.has(s.task_id) && s.status === 'assigned').length;
      const checkedIn = tickets.filter((tk: any) => eTaskIds.has(tk.task_id) && tk.status === 'checked_in').length;
      return { name: e.title?.slice(0, 20) || '?', Toegewezen: assigned, Ingecheckt: checkedIn };
    });

    // Monthly spending
    const monthlyMap: Record<string, number> = {};
    filteredPayments.filter((p: any) => p.paid_at).forEach((p: any) => {
      const m = format(parseISO(p.paid_at), 'yyyy-MM');
      monthlyMap[m] = (monthlyMap[m] || 0) + Number(p.amount);
    });
    const monthlySpending = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b)).map(([month, Bedrag]) => ({ month, Bedrag: Math.round(Bedrag * 100) / 100 }));

    // Top volunteers
    const volMap = new Map<string, { name: string; Taken: number; Verdiend: number }>();
    signups.filter((s: any) => s.status === 'assigned').forEach((s: any) => {
      const p = profileMap[s.volunteer_id];
      if (!volMap.has(s.volunteer_id)) volMap.set(s.volunteer_id, { name: p?.full_name?.slice(0, 15) || '?', Taken: 0, Verdiend: 0 });
      volMap.get(s.volunteer_id)!.Taken++;
    });
    filteredPayments.forEach((p: any) => {
      const v = volMap.get(p.volunteer_id);
      if (v) v.Verdiend += Number(p.amount);
    });
    const topVolunteers = [...volMap.values()].sort((a, b) => b.Taken - a.Taken).slice(0, 10);

    // No-show rate
    const totalAssigned = signups.filter(s => s.status === 'assigned').length;
    const totalCheckedIn = tickets.filter(t => t.status === 'checked_in').length;
    const noShowRate = [
      { name: 'Aanwezig', value: totalCheckedIn },
      { name: 'No-show', value: Math.max(0, totalAssigned - totalCheckedIn) },
    ];

    // Compensation type
    const compMap: Record<string, number> = {};
    tasks.forEach((t: any) => {
      const label = t.compensation_type === 'hourly' ? 'Uurloon' : 'Vast bedrag';
      compMap[label] = (compMap[label] || 0) + 1;
    });
    const compensationType = Object.entries(compMap).map(([name, value]) => ({ name, value }));

    // Day of week
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    tasks.forEach((t: any) => { if (t.task_date) dayCounts[getDay(parseISO(t.task_date))]++; });
    const dayOfWeek = DAY_NAMES.map((name, i) => ({ name, Taken: dayCounts[i] }));

    // Monthly trend
    const trendMap: Record<string, { month: string; Aanmeldingen: number; Ingecheckt: number }> = {};
    signups.forEach((s: any) => {
      const task = taskMap[s.task_id];
      if (!task?.task_date) return;
      const m = format(parseISO(task.task_date), 'yyyy-MM');
      if (!trendMap[m]) trendMap[m] = { month: m, Aanmeldingen: 0, Ingecheckt: 0 };
      trendMap[m].Aanmeldingen++;
    });
    tickets.forEach((t: any) => {
      const task = taskMap[t.task_id];
      if (!task?.task_date || t.status !== 'checked_in') return;
      const m = format(parseISO(task.task_date), 'yyyy-MM');
      if (trendMap[m]) trendMap[m].Ingecheckt++;
    });
    const monthlyTrend = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month));

    // Volunteers per event
    const volunteersPerEvent = events.slice(0, 10).map((e: any) => {
      const eTasks = tasks.filter((t: any) => t.event_id === e.id);
      const eTaskIds = new Set(eTasks.map((t: any) => t.id));
      const totalSlots = eTasks.reduce((s: number, t: any) => s + (t.spots_available || 0), 0);
      const assigned = signups.filter((s: any) => eTaskIds.has(s.task_id) && s.status === 'assigned').length;
      return { name: e.title?.slice(0, 18) || '?', Vrijwilligers: assigned, Bezetting: totalSlots > 0 ? Math.round((assigned / totalSlots) * 100) : 0 };
    });

    // KPIs
    const totalPaid = filteredPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalPending = payments.filter(p => p.status === 'pending').reduce((s: number, p: any) => s + Number(p.amount), 0);
    const totalSepa = sepaItems.reduce((s: number, item: any) => s + Number(item.amount), 0);
    const contractsSigned = signatureRequests.filter(s => s.status === 'completed').length;

    return {
      signupsPerEvent, monthlySpending, topVolunteers, noShowRate, compensationType,
      dayOfWeek, monthlyTrend, volunteersPerEvent,
      kpis: {
        totalTasks: tasks.length, totalVolunteers: [...new Set(signups.map(s => s.volunteer_id))].length,
        totalAssigned, totalCheckedIn, totalPaid, totalPending, totalSepa,
        attendanceRate: totalAssigned > 0 ? Math.round((totalCheckedIn / totalAssigned) * 100) : 0,
        fillRate: (() => { const slots = tasks.reduce((s: number, t: any) => s + (t.spots_available || 0), 0); return slots > 0 ? Math.round((totalAssigned / slots) * 100) : 0; })(),
        contractsSigned, contractsTotal: signatureRequests.length,
        partnerMembers: partnerTaskAssignments.length,
      },
    };
  }, [tasks, events, signups, payments, tickets, sepaItems, signatureRequests, partnerTaskAssignments, profileMap, taskMap]);

  // ── Build AI data summary ──────────────────────────────────
  const buildDataSummary = useCallback(() => {
    const k = chartDataSets.kpis;
    const cd = chartDataSets;
    return [
      `Club: ${clubName}`,
      `Totaal taken: ${k.totalTasks}`, `Totaal vrijwilligers: ${k.totalVolunteers}`,
      `Totaal uitbetaald: €${k.totalPaid.toFixed(2)}`, `Openstaand: €${k.totalPending.toFixed(2)}`,
      `Opkomst: ${k.attendanceRate}%`, `Bezetting: ${k.fillRate}%`,
      `Contracten ondertekend: ${k.contractsSigned}/${k.contractsTotal}`,
      `Partner medewerkers ingezet: ${k.partnerMembers}`,
      '',
      'EVENEMENTEN MET AANMELDINGEN:',
      ...cd.signupsPerEvent.map(e => `- ${e.name}: ${e.Toegewezen} toegewezen, ${e.Ingecheckt} ingecheckt`),
      '',
      'MAANDELIJKSE UITGAVEN:',
      ...cd.monthlySpending.map(m => `- ${m.month}: €${m.Bedrag}`),
      '',
      'TOP VRIJWILLIGERS:',
      ...cd.topVolunteers.map(v => `- ${v.name}: ${v.Taken} taken, €${v.Verdiend.toFixed(0)} verdiend`),
      '',
      'OPKOMST:',
      ...cd.noShowRate.map(n => `- ${n.name}: ${n.value}`),
      '',
      'VERGOEDINGSTYPE:',
      ...cd.compensationType.map(c => `- ${c.name}: ${c.value} taken`),
      '',
      'TAKEN PER DAG VAN DE WEEK:',
      ...cd.dayOfWeek.map(d => `- ${d.name}: ${d.Taken} taken`),
      '',
      'MAANDTREND:',
      ...cd.monthlyTrend.map(m => `- ${m.month}: ${m.Aanmeldingen} aanmeldingen, ${m.Ingecheckt} ingecheckt`),
      '',
      'VRIJWILLIGERS PER EVENEMENT:',
      ...cd.volunteersPerEvent.map(e => `- ${e.name}: ${e.Vrijwilligers} vrijwilligers, ${e.Bezetting}% bezetting`),
      '',
      'TAKEN DETAILS (eerste 30):',
      ...tasks.slice(0, 30).map((t: any) => `- "${t.title}" | ${t.task_date ? format(parseISO(t.task_date), 'dd/MM/yyyy') : 'geen datum'} | ${t.compensation_type} | ${t.hourly_rate ? '€' + t.hourly_rate + '/u' : t.expense_amount ? '€' + t.expense_amount + ' vast' : 'gratis'} | ${t.spots_available || 0} spots | locatie: ${t.location || '?'}`),
      '',
      'BETALINGEN DETAILS (eerste 30):',
      ...payments.slice(0, 30).map((p: any) => {
        const vol = profileMap[p.volunteer_id];
        const task = taskMap[p.task_id];
        return `- €${Number(p.amount).toFixed(2)} aan ${vol?.full_name || '?'} voor "${task?.title || '?'}" | status: ${p.status} | ${p.paid_at ? format(parseISO(p.paid_at), 'dd/MM/yyyy') : 'niet betaald'}`;
      }),
      '',
      'PARTNERS:',
      ...partners.map((p: any) => `- ${p.name} (${p.category})`),
    ].join('\n');
  }, [chartDataSets, clubName, tasks, payments, partners, profileMap, taskMap]);

  // ── Widget management ─────────────────────────────────────
  const addWidget = (type: WidgetType, data: Record<string, any> = {}) => {
    pushHistory();
    setWidgets(prev => [...prev, { id: genId(), type, data }]);
    setAddDialogOpen(false);
  };

  const removeWidget = (id: string) => { pushHistory(); setWidgets(prev => prev.filter(w => w.id !== id)); };

  const updateWidget = (id: string, data: Record<string, any>) => {
    pushHistory();
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, data: { ...w.data, ...data } } : w));
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    pushHistory();
    setWidgets(prev => {
      const idx = prev.findIndex(w => w.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

  // ── AI chart generation ───────────────────────────────────
  const extractSseContent = (raw: string) => {
    let content = '';
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.replace(/^data:\s*/, '');
      if (!payload || payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        const message = parsed?.choices?.[0]?.message?.content;
        if (typeof delta === 'string') content += delta;
        else if (typeof message === 'string') content += message;
      } catch {
        // ignore malformed SSE chunks
      }
    }
    return content;
  };

  const toFiniteNumber = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const normalized = value.replace(',', '.').trim();
      const n = Number(normalized);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const normalizeAiChartConfig = (raw: any) => {
    const rawType = String(raw?.chartType || raw?.chart_type || raw?.type || 'bar').toLowerCase();
    const chartType = rawType === 'doughnut' ? 'pie' : (['bar', 'pie', 'line', 'area'].includes(rawType) ? rawType : 'bar');
    const title = String(raw?.title || raw?.name || 'AI Grafiek');

    // Format A: { data: [{ name, ...numbers }], dataKeys: [] }
    if (Array.isArray(raw?.data) && raw.data.length > 0 && typeof raw.data[0] === 'object') {
      const data = raw.data.map((row: any) => {
        const normalizedRow: Record<string, any> = { ...row };
        Object.keys(normalizedRow).forEach((key) => {
          if (key !== 'name' && key !== 'month') normalizedRow[key] = toFiniteNumber(normalizedRow[key]);
        });
        if (normalizedRow.name === undefined && normalizedRow.month === undefined) {
          normalizedRow.name = 'Item';
        }
        return normalizedRow;
      });
      const dataKeys = (Array.isArray(raw?.dataKeys) ? raw.dataKeys : Array.isArray(raw?.data_keys) ? raw.data_keys : [])
        .map((k: any) => String(k))
        .filter(Boolean);
      const fallbackKeys = Object.keys(data[0] || {}).filter(k => k !== 'name' && k !== 'month');
      return { title, chartType, data, dataKeys: dataKeys.length ? dataKeys : fallbackKeys };
    }

    // Format B (Chart.js-like): { labels: [], datasets: [{ label, data: [] }] }
    if (Array.isArray(raw?.labels) && Array.isArray(raw?.datasets) && raw.labels.length > 0 && raw.datasets.length > 0) {
      const dataKeys = raw.datasets.map((ds: any, i: number) => String(ds?.label || `Waarde ${i + 1}`));
      const data = raw.labels.map((label: any, idx: number) => {
        const row: Record<string, any> = { name: String(label) };
        raw.datasets.forEach((ds: any, i: number) => {
          row[dataKeys[i]] = toFiniteNumber(ds?.data?.[idx]);
        });
        return row;
      });
      return { title, chartType, data, dataKeys };
    }

    // Format C: { labels: [], values: [] }
    if (Array.isArray(raw?.labels) && Array.isArray(raw?.values) && raw.labels.length === raw.values.length) {
      const data = raw.labels.map((label: any, i: number) => ({ name: String(label), value: toFiniteNumber(raw.values[i]) }));
      return { title, chartType, data, dataKeys: ['value'] };
    }

    return { title, chartType, data: [], dataKeys: [] };
  };

  const extractJsonObject = (rawText: string) => {
    const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('Geen geldig JSON ontvangen');
      }
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
  };

  const generateAiChart = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const response = await supabase.functions.invoke('reporting-ai', {
        body: {
          question: `Je MOET de data uit de DATA SAMENVATTING gebruiken om een grafiek te maken. Gebruik de echte cijfers uit de samenvatting, verzin GEEN data.

Genereer een JSON object met exact deze structuur:
- "title": korte Nederlandse titel voor de grafiek
- "chartType": "bar", "pie", "line" of "area"  
- "data": array van objecten, elk met "name" (string) en minstens één numeriek veld
- "dataKeys": array van de numerieke veldnamen die in data zitten

Gebruikersvraag: ${aiPrompt}

BELANGRIJK: Gebruik ALLEEN echte data uit de samenvatting. Antwoord ALLEEN met geldig JSON, geen markdown, geen uitleg, geen backticks.`,
          dataSummary: buildDataSummary(),
        },
      });

      if (response.error) throw response.error;

      let text = '';
      if (response.data instanceof ReadableStream) {
        const reader = response.data.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let rawSse = '';
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (!value) continue;
          rawSse += decoder.decode(value, { stream: true });
        }
        rawSse += decoder.decode();
        text = extractSseContent(rawSse);
      } else if (typeof response.data === 'string') {
        text = extractSseContent(response.data) || response.data;
      } else if (response.data && typeof response.data === 'object') {
        const message = (response.data as any)?.choices?.[0]?.message?.content;
        text = typeof message === 'string' ? message : JSON.stringify(response.data);
      } else {
        text = String(response.data || '');
      }

      const rawChartConfig = extractJsonObject(text);
      const chartConfig = normalizeAiChartConfig(rawChartConfig);

      if (!chartConfig.data.length || !chartConfig.dataKeys.length) {
        throw new Error('AI gaf geen bruikbare grafiekdata terug');
      }

      addWidget('ai-chart', {
        title: chartConfig.title,
        chartType: chartConfig.chartType,
        data: chartConfig.data,
        dataKeys: chartConfig.dataKeys,
        prompt: aiPrompt,
      });
      setAiPrompt('');
      toast.success(t3('AI grafiek toegevoegd!', 'Graphique IA ajouté !', 'AI chart added!'));
    } catch (e: any) {
      console.error('AI chart error:', e);
      toast.error(t3('Kon geen grafiek genereren. Probeer een andere vraag.', 'Impossible de générer le graphique. Essayez une autre question.', 'Could not generate chart. Try a different question.'));
    } finally {
      setAiLoading(false);
    }
  };

  // ── PDF Export ─────────────────────────────────────────────
  const exportToPdf = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        logging: false, windowWidth: 900,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgW, imgH);
      heightLeft -= (pdfH - 20);

      while (heightLeft > 0) {
        position = -(pdfH - 20) + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position - (imgH - heightLeft - (pdfH - 20)), imgW, imgH);
        heightLeft -= (pdfH - 20);
      }

      pdf.save(`rapport-${clubName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success(t3('PDF gedownload!', 'PDF téléchargé !', 'PDF downloaded!'));
    } catch (e) {
      console.error(e);
      toast.error(t3('PDF export mislukt', 'Échec de l\'export PDF', 'PDF export failed'));
    } finally {
      setExporting(false);
    }
  };

  // ── Render chart ──────────────────────────────────────────
  const renderChart = (chartKey: string, chartType: string, customData?: any[], customKeys?: string[]) => {
    const data = customData || (chartDataSets as any)[chartKey] || [];
    if (!data.length) return <p className="text-sm text-muted-foreground text-center py-8">Geen data beschikbaar</p>;

    const keys = customKeys || Object.keys(data[0]).filter(k => k !== 'name' && k !== 'month');
    const xKey = data[0].month !== undefined ? 'month' : 'name';

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <RechartsPie>
            <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey={keys[0] || 'value'} nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </RechartsPie>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {keys.length > 1 && <Legend />}
            {keys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {keys.length > 1 && <Legend />}
            {keys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.3} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {keys.length > 1 && <Legend />}
          {keys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ── Render single widget ──────────────────────────────────
  const renderWidget = (w: ReportWidget, isExporting = false) => {
    const controls = !isExporting && (
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveWidget(w.id, 'up')}><MoveUp className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveWidget(w.id, 'down')}><MoveDown className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeWidget(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    );

    switch (w.type) {
      case 'title':
        return (
          <div className="group relative py-6 text-center">
            {controls}
            {!isExporting ? (
              <div className="space-y-2">
                <Input className="text-2xl font-bold text-center border-none shadow-none bg-transparent"
                  value={w.data.text || ''} onChange={e => updateWidget(w.id, { text: e.target.value })}
                  placeholder="Rapport titel..." />
                <Input className="text-center text-muted-foreground border-none shadow-none bg-transparent"
                  value={w.data.subtitle || ''} onChange={e => updateWidget(w.id, { subtitle: e.target.value })}
                  placeholder="Ondertitel..." />
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold">{w.data.text}</h1>
                {w.data.subtitle && <p className="text-muted-foreground mt-1">{w.data.subtitle}</p>}
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="group relative py-3">
            {controls}
            {!isExporting ? (
              <Textarea className="min-h-[80px] border-dashed" value={w.data.text || ''}
                onChange={e => updateWidget(w.id, { text: e.target.value })}
                placeholder="Typ hier je tekst... (Markdown wordt ondersteund)" />
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">{w.data.text}</div>
            )}
          </div>
        );

      case 'logo':
        return (
          <div className="group relative py-4 flex justify-center">
            {controls}
            {clubLogo ? (
              <img src={clubLogo} alt={clubName} className="h-20 object-contain" crossOrigin="anonymous" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {clubName.charAt(0)}
                </div>
                <span className="font-bold text-lg">{clubName}</span>
              </div>
            )}
          </div>
        );

      case 'signature':
        return (
          <div className="group relative py-6">
            {controls}
            <div className="flex justify-between items-end gap-8 px-4">
              <div className="flex-1 space-y-1">
                {!isExporting ? (
                  <Input className="border-none border-b shadow-none bg-transparent" value={w.data.name || ''}
                    onChange={e => updateWidget(w.id, { name: e.target.value })} placeholder={t3('Naam ondertekenaar', 'Nom du signataire', 'Signer name')} />
                ) : <p className="font-medium">{w.data.name || '_______________'}</p>}
                {!isExporting ? (
                  <Input className="border-none border-b shadow-none bg-transparent text-sm" value={w.data.role || ''}
                    onChange={e => updateWidget(w.id, { role: e.target.value })} placeholder={t3('Functie', 'Fonction', 'Role')} />
                ) : <p className="text-sm text-muted-foreground">{w.data.role}</p>}
              </div>
              <div className="flex-1 text-center">
                <div className="border-b border-foreground/30 pb-1 mb-1 h-12" />
                <p className="text-xs text-muted-foreground">{t3('Handtekening', 'Signature', 'Signature')}</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm">{format(new Date(), 'dd MMMM yyyy', { locale: nl })}</p>
                <p className="text-xs text-muted-foreground">{t3('Datum', 'Date', 'Date')}</p>
              </div>
            </div>
          </div>
        );

      case 'chart':
        return (
          <div className="group relative py-3">
            {controls}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {PRESET_CHARTS.find(c => c.key === w.data.chartKey)?.label || w.data.chartKey}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart(w.data.chartKey, w.data.chartType)}
              </CardContent>
            </Card>
          </div>
        );

      case 'ai-chart':
        return (
          <div className="group relative py-3">
            {controls}
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">{w.data.title || 'AI Grafiek'}</CardTitle>
                </div>
                {w.data.prompt && <p className="text-xs text-muted-foreground">Vraag: {w.data.prompt}</p>}
              </CardHeader>
              <CardContent>
                {renderChart('', w.data.chartType, w.data.data, w.data.dataKeys)}
              </CardContent>
            </Card>
          </div>
        );

      case 'kpi-grid': {
        const k = chartDataSets.kpis;
        const ALL_KPIS = [
          { key: 'totalTasks', label: 'Taken', value: k.totalTasks },
          { key: 'totalVolunteers', label: 'Vrijwilligers', value: k.totalVolunteers },
          { key: 'attendanceRate', label: 'Opkomst', value: `${k.attendanceRate}%` },
          { key: 'fillRate', label: 'Bezetting', value: `${k.fillRate}%` },
          { key: 'totalPaid', label: 'Uitbetaald', value: `€${k.totalPaid.toFixed(0)}` },
          { key: 'totalPending', label: 'Openstaand', value: `€${k.totalPending.toFixed(0)}` },
          { key: 'contracts', label: 'Contracten', value: `${k.contractsSigned}/${k.contractsTotal}` },
          { key: 'partnerMembers', label: 'Partners', value: k.partnerMembers },
        ];
        const visibleKeys: string[] = w.data.visibleKpis || ALL_KPIS.map(k => k.key);
        const visibleKpis = ALL_KPIS.filter(kpi => visibleKeys.includes(kpi.key));
        const removeKpi = (key: string) => {
          const next = visibleKeys.filter(k => k !== key);
          updateWidget(w.id, { visibleKpis: next });
        };
        return (
          <div className="group relative py-3">
            {controls}
            <div className={`grid grid-cols-2 ${visibleKpis.length <= 4 ? 'md:grid-cols-' + Math.min(visibleKpis.length, 4) : 'md:grid-cols-4'} gap-3`}>
              {visibleKpis.map(item => (
                <Card key={item.key} className="relative">
                  {!isExporting && (
                    <Button variant="ghost" size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      onClick={() => removeKpi(item.key)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      }

      case 'spacer':
        return (
          <div className="group relative py-2">
            {controls}
            <Separator />
          </div>
        );

      default:
        return null;
    }
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/reporting')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
              {t3('Rapport Builder', 'Rapport Builder', 'Report Builder')}
              </h1>
              <p className="text-xs text-muted-foreground">{t3('Stel je eigen bestuursrapport samen', 'Composez votre propre rapport', 'Build your own board report')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={history.length === 0} onClick={undo}>
              <Undo2 className="h-4 w-4 mr-1" /> {t3('Ongedaan', 'Annuler', 'Undo')}
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Widget</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t3('Widget toevoegen', 'Ajouter un widget', 'Add widget')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {/* Basic widgets */}
                  <div>
                    <p className="text-sm font-medium mb-2">{t3('Basis', 'De base', 'Basic')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => addWidget('title', { text: t3('Nieuwe titel', 'Nouveau titre', 'New title'), subtitle: '' })}>
                        <Type className="h-4 w-4 mr-2" /> {t3('Titel', 'Titre', 'Title')}
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => addWidget('text', { text: '' })}>
                        <FileText className="h-4 w-4 mr-2" /> {t3('Tekstveld', 'Champ texte', 'Text field')}
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => addWidget('logo')}>
                        <Image className="h-4 w-4 mr-2" /> {t3('Club logo', 'Logo du club', 'Club logo')}
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => addWidget('signature', { name: '', role: '' })}>
                        <PenLine className="h-4 w-4 mr-2" /> {t3('Handtekening', 'Signature', 'Signature')}
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => addWidget('kpi-grid')}>
                        <BarChart3 className="h-4 w-4 mr-2" /> {t3('KPI overzicht', 'Aperçu KPI', 'KPI overview')}
                      </Button>
                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => addWidget('spacer')}>
                        <GripVertical className="h-4 w-4 mr-2" /> {t3('Scheidingslijn', 'Séparateur', 'Divider')}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Preset charts */}
                  <div>
                    <p className="text-sm font-medium mb-2">{t3('Grafieken', 'Graphiques', 'Charts')}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {PRESET_CHARTS.map(chart => (
                        <Button key={chart.key} variant="outline" className="justify-start h-auto py-3"
                          onClick={() => addWidget('chart', { chartKey: chart.key, chartType: chart.chartType })}>
                          {chart.chartType === 'pie' ? <PieChart className="h-4 w-4 mr-2" /> :
                           chart.chartType === 'line' ? <TrendingUp className="h-4 w-4 mr-2" /> :
                           <BarChart3 className="h-4 w-4 mr-2" />}
                          {chart.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* AI chart generation */}
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-primary" /> AI Grafiek
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {t3('Beschrijf welke data je in een grafiek wilt zien en AI maakt hem voor je.', 'Décrivez les données souhaitées et l\'IA créera le graphique.', 'Describe the data you want and AI will create the chart for you.')}
                    </p>
                    <div className="flex gap-2">
                      <Input placeholder="Bv: 'Toon hoeveel we per evenement uitgeven'" value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && generateAiChart()} />
                      <Button onClick={generateAiChart} disabled={aiLoading || !aiPrompt.trim()}>
                        {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {['Uitgaven per evenement', 'Beste vrijwilligers qua opkomst', 'Verdeling uurloon vs vast'].map(q => (
                        <Badge key={q} variant="outline" className="cursor-pointer text-xs hover:bg-accent"
                          onClick={() => { setAiPrompt(q); }}>
                          {q}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={exportToPdf} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
              PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Canvas */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {widgets.length === 0 ? (
          <div className="text-center py-20">
            <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t3('Voeg widgets toe om je rapport samen te stellen', 'Ajoutez des widgets pour composer votre rapport', 'Add widgets to build your report')}</p>
            <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t3('Eerste widget toevoegen', 'Ajouter le premier widget', 'Add first widget')}
            </Button>
          </div>
        ) : (
          <div ref={canvasRef} className="bg-background rounded-lg border p-6 space-y-1 min-h-[400px]">
            {widgets.map(w => (
              <div key={w.id}>{renderWidget(w)}</div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReportBuilder;
