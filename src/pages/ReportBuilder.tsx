import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
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
import { PageSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format, subMonths, parseISO, isWithinInterval, isSameMonth, getDay } from 'date-fns';
import { nl } from 'date-fns/locale';
// jsPDF and html2canvas are lazy-loaded when needed for PDF export
import Logo from '@/components/Logo';
import { useLanguage } from '@/i18n/LanguageContext';
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
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
  const { userId, clubId: ctxClubId, clubInfo, loading: contextLoading } = useClubContext();
  const t3 = (nlS: string, fr: string, en: string) => language === 'nl' ? nlS : language === 'fr' ? fr : en;
  const [widgets, setWidgets] = useState<ReportWidget[]>([
    { id: genId(), type: 'title', data: { text: 'Bestuursrapport', subtitle: format(new Date(), 'MMMM yyyy', { locale: nl }) } },
  ]);
  const [history, setHistory] = useState<ReportWidget[][]>([]);
  const [exporting, setExporting] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Pick up AI summary from ReportingDashboard if available
  useEffect(() => {
    const saved = localStorage.getItem('report-ai-summary');
    if (saved) {
      localStorage.removeItem('report-ai-summary');
      setWidgets(prev => [...prev, { id: genId(), type: 'text', data: { text: saved } }]);
    }
  }, []);

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

  // ── Init (uses ClubContext — no manual auth calls) ────────────
  useEffect(() => {
    if (contextLoading) return;
    if (!userId) { navigate('/club-login'); return; }
    if (ctxClubId && clubInfo) {
      setClubId(ctxClubId);
      setClubName((clubInfo as any).name || '');
      setClubLogo((clubInfo as any).logo_url || null);
    }
  }, [contextLoading, userId, ctxClubId, clubInfo]);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      setLoading(true);
      const [tasksRes, eventsRes, signupsRes, paymentsRes, ticketsRes, hourConfsRes, sepaRes,
        sigReqRes, partnersRes, partnerMembersRes, partnerAssignRes] = await Promise.all([
        supabase.from('tasks').select('id,title,club_id,event_id,task_date,spots_available,compensation_type,hourly_rate,expense_amount,location,status').eq('club_id', clubId).limit(1000),
        supabase.from('events').select('id,title,event_date,club_id').eq('club_id', clubId).order('event_date', { ascending: false }).limit(500),
        supabase.from('task_signups').select('id,task_id,volunteer_id,status,signed_up_at').limit(5000),
        supabase.from('volunteer_payments').select('id,task_id,volunteer_id,amount,status,paid_at').eq('club_id', clubId).limit(5000),
        supabase.from('volunteer_tickets').select('id,task_id,volunteer_id,status').eq('club_id', clubId).limit(5000),
        supabase.from('hour_confirmations').select('id,task_id,volunteer_id,status,final_hours').limit(5000),
        supabase.from('sepa_batch_items').select('id,task_id,amount').limit(2000),
        supabase.from('signature_requests').select('id,task_id,status').limit(2000),
        supabase.from('external_partners').select('id,name,category').eq('club_id', clubId).limit(200),
        supabase.from('partner_members').select('id,partner_id,user_id').limit(2000),
        supabase.from('partner_task_assignments').select('id,task_id,partner_member_id').limit(5000),
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

  // ── Build AI data summary (condensed — token-safe) ────────────
  const buildDataSummary = useCallback(() => {
    const k = chartDataSets.kpis;
    const cd = chartDataSets;
    const top5Events = cd.signupsPerEvent.slice(0, 5).map(e =>
      `${e.name}: ${e.Toegewezen}t ${e.Ingecheckt}in`
    ).join('; ');
    const top5Vols = cd.topVolunteers.slice(0, 5).map(v =>
      `${v.name}: ${v.Taken}t €${v.Verdiend.toFixed(0)}`
    ).join('; ');
    const monthlySpend = cd.monthlySpending.slice(-6).map(m =>
      `${m.month}:€${m.Bedrag}`
    ).join(' ');
    return [
      `Club: ${clubName}`,
      `KPIs: ${k.totalVolunteers} vrijwilligers | ${k.totalTasks} taken | ${k.totalAssigned} toewijzingen | opkomst ${k.attendanceRate}% | bezetting ${k.fillRate}%`,
      `Financieel: uitbetaald €${k.totalPaid.toFixed(0)} | openstaand €${k.totalPending.toFixed(0)}`,
      `Contracten: ${k.contractsSigned}/${k.contractsTotal} ondertekend | partner medewerkers: ${k.partnerMembers}`,
      `Top-5 evenementen: ${top5Events || 'geen data'}`,
      `Top-5 vrijwilligers: ${top5Vols || 'geen data'}`,
      `Maandelijkse uitgaven (laatste 6m): ${monthlySpend || 'geen data'}`,
      `Vergoedingstypes: ${cd.compensationType.map(c => `${c.name}:${c.value}`).join(', ')}`,
      `No-show: ${cd.noShowRate.map(n => `${n.name}:${n.value}`).join(' / ')}`,
      `Partners: ${partners.slice(0, 5).map((p: any) => p.name).join(', ') || 'geen'}`,
    ].join('\n');
  }, [chartDataSets, clubName, partners]);

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
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');

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
  const chartTooltip = {
    contentStyle: { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' },
    labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600 },
    itemStyle: { color: 'hsl(var(--muted-foreground))' },
  };
  const chartGrid = { strokeDasharray: '4 4', stroke: 'hsl(var(--border))', strokeOpacity: 0.4 };
  const axisProps = { axisLine: false as const, tickLine: false as const };

  const renderChart = (chartKey: string, chartType: string, customData?: any[], customKeys?: string[]) => {
    const data = customData || (chartDataSets as any)[chartKey] || [];
    if (!data.length) return (
      <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
        <BarChart3 className="w-6 h-6 mr-2 opacity-30" />
        Geen data beschikbaar
      </div>
    );

    const keys = customKeys || Object.keys(data[0]).filter(k => k !== 'name' && k !== 'month');
    const xKey = data[0].month !== undefined ? 'month' : 'name';

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <RechartsPie>
            <Pie data={data} cx="50%" cy="50%" outerRadius={90} innerRadius={36} dataKey={keys[0] || 'value'} nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
              {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip {...chartTooltip} />
          </RechartsPie>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid {...chartGrid} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} {...axisProps} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} {...axisProps} />
            <Tooltip {...chartTooltip} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {keys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              {keys.map((key, i) => (
                <linearGradient key={key} id={`rb-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid {...chartGrid} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} {...axisProps} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} {...axisProps} />
            <Tooltip {...chartTooltip} />
            {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {keys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} fill={`url(#rb-grad-${i})`} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid {...chartGrid} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} {...axisProps} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} {...axisProps} />
          <Tooltip {...chartTooltip} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {keys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // ── Render single widget (Notion-style block editor) ─────────
  const renderWidget = (w: ReportWidget, isExporting = false) => {
    // Invisible toolbar — slides in on block hover
    const toolbar = !isExporting && (
      <div className="absolute -top-3 right-2 flex items-center gap-0.5 bg-card border border-border rounded-lg shadow-md px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150 z-20">
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => moveWidget(w.id, 'up')}><MoveUp className="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md" onClick={() => moveWidget(w.id, 'down')}><MoveDown className="h-3 w-3" /></Button>
        <div className="w-px h-3 bg-border mx-0.5" />
        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeWidget(w.id)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    );

    switch (w.type) {
      case 'title':
        return (
          <div className="group relative py-5">
            {toolbar}
            {!isExporting ? (
              <div className="space-y-1.5">
                <Input
                  className="text-2xl font-bold text-center border-none shadow-none bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/30"
                  value={w.data.text || ''} onChange={e => updateWidget(w.id, { text: e.target.value })}
                  placeholder="Rapport titel..." />
                <Input
                  className="text-center text-muted-foreground border-none shadow-none bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/30 text-sm"
                  value={w.data.subtitle || ''} onChange={e => updateWidget(w.id, { subtitle: e.target.value })}
                  placeholder="Ondertitel of periode..." />
              </div>
            ) : (
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">{w.data.text}</h1>
                {w.data.subtitle && <p className="text-sm text-muted-foreground mt-1">{w.data.subtitle}</p>}
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="group relative py-2">
            {toolbar}
            {!isExporting ? (
              <Textarea
                className="min-h-[72px] border border-dashed border-border/60 bg-transparent focus:border-primary/40 rounded-lg resize-none text-sm placeholder:text-muted-foreground/40 focus-visible:ring-0"
                value={w.data.text || ''}
                onChange={e => updateWidget(w.id, { text: e.target.value })}
                placeholder="Typ hier je tekst of analyse..." />
            ) : (
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{w.data.text}</div>
            )}
          </div>
        );

      case 'logo':
        return (
          <div className="group relative py-5 flex justify-center">
            {toolbar}
            {clubLogo ? (
              <img src={clubLogo} alt={clubName} className="h-16 object-contain" crossOrigin="anonymous" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {clubName.charAt(0)}
                </div>
                <span className="font-bold text-base text-foreground">{clubName}</span>
              </div>
            )}
          </div>
        );

      case 'signature':
        return (
          <div className="group relative py-5">
            {toolbar}
            <div className="flex justify-between items-end gap-6 px-2">
              <div className="flex-1 space-y-1">
                {!isExporting ? (
                  <>
                    <Input className="border-x-0 border-t-0 border-b border-border/60 rounded-none shadow-none bg-transparent px-0 focus-visible:ring-0 text-sm" value={w.data.name || ''}
                      onChange={e => updateWidget(w.id, { name: e.target.value })} placeholder={t3('Naam ondertekenaar', 'Nom du signataire', 'Signer name')} />
                    <Input className="border-x-0 border-t-0 border-b border-border/60 rounded-none shadow-none bg-transparent px-0 focus-visible:ring-0 text-xs text-muted-foreground" value={w.data.role || ''}
                      onChange={e => updateWidget(w.id, { role: e.target.value })} placeholder={t3('Functie', 'Fonction', 'Role')} />
                  </>
                ) : (
                  <>
                    <p className="font-medium text-sm">{w.data.name || '_______________'}</p>
                    {w.data.role && <p className="text-xs text-muted-foreground">{w.data.role}</p>}
                  </>
                )}
              </div>
              <div className="flex-1 text-center">
                <div className="border-b border-foreground/20 mb-1 h-10" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t3('Handtekening', 'Signature', 'Signature')}</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm font-medium">{format(new Date(), 'dd MMMM yyyy', { locale: nl })}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t3('Datum', 'Date', 'Date')}</p>
              </div>
            </div>
          </div>
        );

      case 'chart': {
        const chartLabel = PRESET_CHARTS.find(c => c.key === w.data.chartKey)?.label || w.data.chartKey;
        return (
          <div className="group relative py-2">
            {toolbar}
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="px-5 pt-4 pb-1 border-b border-border/50">
                <p className="text-sm font-semibold text-foreground">{chartLabel}</p>
              </div>
              <div className="p-4">
                {renderChart(w.data.chartKey, w.data.chartType)}
              </div>
            </div>
          </div>
        );
      }

      case 'ai-chart':
        return (
          <div className="group relative py-2">
            {toolbar}
            <div className="border border-primary/20 rounded-xl overflow-hidden bg-gradient-to-br from-card to-primary/[0.02]">
              <div className="px-5 pt-4 pb-1 border-b border-primary/10 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <p className="text-sm font-semibold text-foreground">{w.data.title || 'AI Grafiek'}</p>
                {w.data.prompt && <span className="text-[10px] text-muted-foreground ml-auto truncate max-w-[200px]">{w.data.prompt}</span>}
              </div>
              <div className="p-4">
                {renderChart('', w.data.chartType, w.data.data, w.data.dataKeys)}
              </div>
            </div>
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
        const visibleKeys: string[] = w.data.visibleKpis || ALL_KPIS.map(kpi => kpi.key);
        const visibleKpis = ALL_KPIS.filter(kpi => visibleKeys.includes(kpi.key));
        const removeKpi = (key: string) => {
          updateWidget(w.id, { visibleKpis: visibleKeys.filter(k => k !== key) });
        };
        const colClass = visibleKpis.length <= 4 ? `grid-cols-${Math.min(visibleKpis.length, 4)}` : 'grid-cols-4';
        return (
          <div className="group relative py-2">
            {toolbar}
            <div className={`grid grid-cols-2 md:${colClass} gap-3`}>
              {visibleKpis.map(item => (
                <div key={item.key} className="relative border border-border rounded-xl p-4 text-center bg-card hover:border-primary/30 transition-colors">
                  {!isExporting && (
                    <button
                      className="absolute top-1.5 right-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => removeKpi(item.key)}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                  <p className="text-2xl font-bold tabular-nums text-foreground">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'spacer':
        return (
          <div className="group relative py-3">
            {toolbar}
            <Separator className="opacity-40" />
          </div>
        );

      default:
        return null;
    }
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <ClubPageLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <PageNavTabs tabs={[
          { label: t3('Rapporten', 'Rapports', 'Reports'), path: '/reporting' },
          { label: 'Analytics', path: '/analytics' },
          { label: t3('Rapport Builder', 'Rapport Builder', 'Report Builder'), path: '/report-builder' },
          { label: 'Audit Log', path: '/audit-log' },
        ]} />
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border/60 flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t3('Nog geen blokken. Voeg je eerste widget toe.', 'Aucun bloc. Ajoutez votre premier widget.', 'No blocks yet. Add your first widget.')}
            </p>
            <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t3('Widget toevoegen', 'Ajouter un widget', 'Add widget')}
            </Button>
          </motion.div>
        ) : (
          <div ref={canvasRef} className="bg-background rounded-xl border border-border p-8 space-y-0.5 min-h-[400px]">
            {widgets.map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="group relative rounded-lg hover:bg-muted/20 px-2 transition-colors"
              >
                {renderWidget(w)}
              </motion.div>
            ))}
          </div>
        )}
      </main>
      </div>
    </ClubPageLayout>
  );
};

export default ReportBuilder;
