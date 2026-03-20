import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VolunteerBriefingsList } from '@/components/VolunteerBriefingView';
import { sendPushToClub } from '@/lib/sendPush';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Language } from '@/i18n/translations';
import { useComplianceData } from '@/hooks/useComplianceData';
import {
  Calendar, CalendarDays, Clock, MapPin, Euro, CheckCircle,
  ChevronLeft, ChevronRight, FileSignature, Users, AlertTriangle,
  Loader2, QrCode, XCircle, Hourglass, CalendarCheck, FileText,
  ClipboardList,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & types
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<Language, string[]> = {
  nl: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

interface MonthlyPlan {
  id: string;
  club_id: string;
  year: number;
  month: number;
  title: string;
  status: string;
  clubs?: { name: string; logo_url: string | null };
}

interface PlanTask {
  id: string;
  plan_id: string;
  task_date: string;
  title: string;
  category: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  compensation_type: string;
  daily_rate: number | null;
  hourly_rate: number | null;
  estimated_hours: number | null;
  spots_available: number;
}

interface DaySignup {
  id: string;
  plan_task_id: string;
  status: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  hour_status: string;
  volunteer_reported_hours: number | null;
  club_reported_hours: number | null;
  volunteer_approved: boolean;
  club_approved: boolean;
  final_hours: number | null;
  final_amount: number | null;
  ticket_barcode: string | null;
  dispute_status: string;
  dispute_escalated_at: string | null;
  club_reported_checkout: string | null;
  volunteer_reported_checkout: string | null;
}

interface Enrollment {
  id: string;
  plan_id: string;
  contract_status: string;
  approval_status: string;
}

// Regular task types (from tasks table, not monthly plans)
interface ClubTask {
  id: string;
  title: string;
  task_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  club_id: string;
  max_volunteers: number | null;
  description: string | null;
  clubs?: { name: string; logo_url: string | null };
}

interface MyTaskSignup {
  id: string;
  task_id: string;
  status: string;
  tasks?: {
    id: string;
    title: string;
    task_date: string | null;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    clubs?: { name: string; logo_url: string | null };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const labels: Record<Language, Record<string, string>> = {
  nl: {
    title: 'Maandplanning',
    subtitle: 'Bekijk jouw planning en open taken bij je club',
    noPlans: 'Geen gepubliceerde maandplannen gevonden',
    enroll: 'Inschrijven voor deze maand',
    enrolled: 'Ingeschreven',
    signUp: 'Aanmelden',
    signedUp: 'Aangemeld',
    available: 'beschikbaar',
    yourSchedule: 'Jouw planning',
    availableTasks: 'Beschikbare taken',
    day: 'dag',
    hour: 'uur',
    checkedIn: 'Ingecheckt',
    pending: 'Wacht op check-in',
    confirmHours: 'Uren bevestigen',
    hoursConfirmed: 'Uren bevestigd',
    reportHours: 'Hoeveel uur heb je gewerkt?',
    submit: 'Bevestigen',
    notCheckedIn: 'Niet ingecheckt — geen vergoeding mogelijk',
    complianceWarning: '⚠️ Let op: je nadert het jaarlijkse plafond van €3.233,91',
    complianceBlocked: '🚫 Je hebt het jaarlijks maximum bereikt. Inschrijven is geblokkeerd.',
    ticket: 'Dagticket',
    monthTotal: 'Geschat maandtotaal',
    waitingApproval: 'Wacht op goedkeuring van de club',
    approved: 'Goedgekeurd',
    rejected: 'Afgewezen',
    waitingAssignment: 'Wacht op bevestiging van de club',
    assigned: 'Toegekend',
    contractRequired: 'Je contract moet eerst getekend zijn voordat je je kunt aanmelden voor dagen.',
    approvalRequired: 'Je inschrijving moet eerst goedgekeurd worden door de club.',
    // Planning toggle
    mySignups: 'Mijn Inschrijvingen',
    openTasks: 'Open Taken',
    mySignupsDesc: 'Taken waar je al voor aangemeld bent',
    openTasksDesc: 'Beschikbare taken bij jouw club',
    // Regular club tasks
    openClubTasks: 'Open taken bij jouw club',
    noOpenTasks: 'Geen open taken gevonden bij jouw club.',
    noMySignups: 'Je bent nog niet aangemeld voor taken.',
    myRegularTasks: 'Mijn aangemelde taken',
    noClubMembership: 'Je bent nog geen lid van een club.',
    signUpConfirm: 'Aanmelden',
    buddyAlso: 'Gezellig samen met',
    buddyAlsoSuffix: '!',
    // Briefings tab
    briefings: 'Mijn Briefings',
    planning: 'Planning',
  },
  fr: {
    title: 'Planning mensuel',
    subtitle: 'Consultez votre planning et les tâches ouvertes dans votre club',
    noPlans: 'Aucun plan mensuel publié',
    enroll: "S'inscrire pour ce mois",
    enrolled: 'Inscrit',
    signUp: "S'inscrire",
    signedUp: 'Inscrit',
    available: 'disponible(s)',
    yourSchedule: 'Votre planning',
    availableTasks: 'Tâches disponibles',
    day: 'jour',
    hour: 'heure',
    checkedIn: 'Enregistré',
    pending: "En attente d'enregistrement",
    confirmHours: 'Confirmer les heures',
    hoursConfirmed: 'Heures confirmées',
    reportHours: "Combien d'heures avez-vous travaillé ?",
    submit: 'Confirmer',
    notCheckedIn: 'Non enregistré — pas de remboursement possible',
    complianceWarning: '⚠️ Attention: vous approchez du plafond annuel de €3.233,91',
    complianceBlocked: '🚫 Vous avez atteint le maximum annuel. Inscription bloquée.',
    ticket: 'Ticket journalier',
    monthTotal: 'Total mensuel estimé',
    waitingApproval: "En attente d'approbation du club",
    approved: 'Approuvé',
    rejected: 'Rejeté',
    waitingAssignment: 'En attente de confirmation du club',
    assigned: 'Attribué',
    contractRequired: "Votre contrat doit d'abord être signé avant de pouvoir vous inscrire.",
    approvalRequired: "Votre inscription doit d'abord être approuvée par le club.",
    mySignups: 'Mes Inscriptions',
    openTasks: 'Tâches Ouvertes',
    mySignupsDesc: 'Tâches auxquelles vous êtes déjà inscrit',
    openTasksDesc: 'Tâches disponibles dans votre club',
    openClubTasks: 'Tâches ouvertes dans votre club',
    noOpenTasks: 'Aucune tâche ouverte dans votre club.',
    noMySignups: "Vous n'êtes pas encore inscrit à des tâches.",
    myRegularTasks: 'Mes tâches inscrites',
    noClubMembership: "Vous n'êtes pas encore membre d'un club.",
    signUpConfirm: "S'inscrire",
    buddyAlso: 'Super avec',
    buddyAlsoSuffix: ' !',
    briefings: 'Mes Briefings',
    planning: 'Planning',
  },
  en: {
    title: 'Monthly Planning',
    subtitle: 'View your schedule and open tasks at your club',
    noPlans: 'No published monthly plans found',
    enroll: 'Enroll for this month',
    enrolled: 'Enrolled',
    signUp: 'Sign up',
    signedUp: 'Signed up',
    available: 'available',
    yourSchedule: 'Your schedule',
    availableTasks: 'Available tasks',
    day: 'day',
    hour: 'hour',
    checkedIn: 'Checked in',
    pending: 'Awaiting check-in',
    confirmHours: 'Confirm hours',
    hoursConfirmed: 'Hours confirmed',
    reportHours: 'How many hours did you work?',
    submit: 'Confirm',
    notCheckedIn: 'Not checked in — no reimbursement possible',
    complianceWarning: '⚠️ Warning: you are approaching the annual cap of €3,233.91',
    complianceBlocked: '🚫 You have reached the annual maximum. Enrollment blocked.',
    ticket: 'Day ticket',
    monthTotal: 'Estimated monthly total',
    waitingApproval: 'Waiting for club approval',
    approved: 'Approved',
    rejected: 'Rejected',
    waitingAssignment: 'Waiting for club confirmation',
    assigned: 'Assigned',
    contractRequired: 'Your contract must be signed before you can sign up for days.',
    approvalRequired: 'Your enrollment must be approved by the club first.',
    mySignups: 'My Sign-ups',
    openTasks: 'Open Tasks',
    mySignupsDesc: 'Tasks you are already signed up for',
    openTasksDesc: 'Available tasks at your club',
    openClubTasks: 'Open tasks at your club',
    noOpenTasks: 'No open tasks found at your club.',
    noMySignups: 'You are not signed up for any tasks yet.',
    myRegularTasks: 'My signed-up tasks',
    noClubMembership: 'You are not a member of any club yet.',
    signUpConfirm: 'Sign up',
    buddyAlso: 'Fun together with',
    buddyAlsoSuffix: '!',
    briefings: 'My Briefings',
    planning: 'Planning',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface VolunteerMonthlyTabProps {
  language: Language;
  userId: string;
  clubId?: string;
}

type SubView = 'planning' | 'briefings';
type PlanView = 'mine' | 'open';

const YEARLY_CAP = 3233.91;

const VolunteerMonthlyTab = ({ language, userId }: VolunteerMonthlyTabProps) => {
  const l = labels[language];

  // Sub-view: Planning or Briefings
  const [subView, setSubView] = useState<SubView>('planning');
  // Plan view toggle: My sign-ups or Open tasks
  const [planView, setPlanView] = useState<PlanView>('mine');

  // Monthly plan data
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [plans, setPlans] = useState<MonthlyPlan[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [daySignups, setDaySignups] = useState<DaySignup[]>([]);
  const [loading, setLoading] = useState(true);

  // Regular tasks (from tasks table)
  const [clubTasks, setClubTasks] = useState<ClubTask[]>([]);
  const [myTaskSignups, setMyTaskSignups] = useState<MyTaskSignup[]>([]);
  const [loadingClubTasks, setLoadingClubTasks] = useState(false);
  const [signingUpTaskId, setSigningUpTaskId] = useState<string | null>(null);
  const [buddyTaskIds, setBuddyTaskIds] = useState<Set<string>>(new Set());
  const [buddyName, setBuddyName] = useState<string | null>(null);

  // Dialog state
  const [showHoursDialog, setShowHoursDialog] = useState(false);
  const [selectedSignup, setSelectedSignup] = useState<DaySignup | null>(null);
  const [selectedTask, setSelectedTask] = useState<PlanTask | null>(null);
  const [hoursInput, setHoursInput] = useState('');
  const [showTicket, setShowTicket] = useState<string | null>(null);

  const { data: complianceData } = useComplianceData(userId);
  const totalEarned = complianceData?.totalIncome ?? 0;
  const compliancePercentage = (totalEarned / YEARLY_CAP) * 100;
  const isBlocked = totalEarned >= YEARLY_CAP;
  const isWarning = compliancePercentage >= 80 && !isBlocked;

  useEffect(() => { loadData(); }, [viewYear, viewMonth, userId]);
  useEffect(() => { loadClubTaskData(); }, [userId]);

  // ── Monthly plan data ──────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    const { data: plansData } = await supabase
      .from('monthly_plans').select('*, clubs(name, logo_url)')
      .eq('year', viewYear).eq('month', viewMonth).eq('status', 'published');

    const plansList = (plansData || []) as unknown as MonthlyPlan[];
    setPlans(plansList);

    if (plansList.length > 0) {
      const planIds = plansList.map(p => p.id);
      const [tasksRes, enrollRes] = await Promise.all([
        supabase.from('monthly_plan_tasks').select('*').in('plan_id', planIds).order('task_date').order('start_time'),
        supabase.from('monthly_enrollments').select('*').in('plan_id', planIds).eq('volunteer_id', userId),
      ]);
      setTasks((tasksRes.data || []) as unknown as PlanTask[]);
      const enrs = (enrollRes.data || []) as unknown as Enrollment[];
      setEnrollments(enrs);

      if (enrs.length > 0) {
        const { data: signups } = await supabase.from('monthly_day_signups').select('*').in('enrollment_id', enrs.map(e => e.id)).eq('volunteer_id', userId);
        setDaySignups((signups || []) as unknown as DaySignup[]);
      } else { setDaySignups([]); }
    } else { setTasks([]); setEnrollments([]); setDaySignups([]); }
    setLoading(false);
  };

  // ── Regular club task data ─────────────────────────────────────────────────

  const loadClubTaskData = async () => {
    setLoadingClubTasks(true);
    // My regular task signups
    const { data: signupData } = await supabase
      .from('task_signups')
      .select('id, task_id, status, tasks(id, title, task_date, start_time, end_time, location, clubs(name, logo_url))')
      .eq('volunteer_id', userId)
      .order('created_at', { ascending: false });
    setMyTaskSignups((signupData || []) as unknown as MyTaskSignup[]);

    // Open tasks at volunteer's clubs
    const { data: memberships } = await supabase
      .from('club_memberships')
      .select('club_id')
      .eq('volunteer_id', userId)
      .eq('status', 'actief');

    if (!memberships?.length) { setClubTasks([]); setLoadingClubTasks(false); return; }

    const clubIds = memberships.map(m => m.club_id);
    const signedUpTaskIds = new Set((signupData || []).map((s: any) => s.task_id));

    const today = new Date().toISOString().split('T')[0];
    const { data: openTasks } = await supabase
      .from('tasks')
      .select('id, title, task_date, start_time, end_time, location, club_id, max_volunteers, description, clubs(name, logo_url)')
      .in('club_id', clubIds)
      .gte('task_date', today)
      .order('task_date');

    const filteredClubTasks = ((openTasks || []) as unknown as ClubTask[]).filter(t => !signedUpTaskIds.has(t.id));
    setClubTasks(filteredClubTasks);

    // ── Phase 3: buddy highlight + sort ──────────────────────────────────────
    const { data: buddyRows } = await supabase
      .from('volunteer_buddies')
      .select('requester_id, receiver_id, status')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted')
      .limit(1);

    if (buddyRows && buddyRows.length > 0) {
      const row = buddyRows[0];
      const buddyId = row.requester_id === userId ? row.receiver_id : row.requester_id;

      // Fetch buddy's name
      const { data: buddyProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', buddyId)
        .single();
      setBuddyName(buddyProfile?.full_name || null);

      const openTaskIds = filteredClubTasks.map(t => t.id);
      if (openTaskIds.length > 0) {
        const { data: buddySignups } = await supabase
          .from('task_signups')
          .select('task_id')
          .eq('volunteer_id', buddyId)
          .in('task_id', openTaskIds);
        const ids = new Set((buddySignups || []).map((s: any) => s.task_id));
        setBuddyTaskIds(ids);

        // Sort: buddy tasks first, then by task_date
        if (ids.size > 0) {
          setClubTasks([
            ...filteredClubTasks.filter(t => ids.has(t.id)),
            ...filteredClubTasks.filter(t => !ids.has(t.id)),
          ]);
        }
      } else {
        setBuddyTaskIds(new Set());
      }
    } else {
      setBuddyName(null);
      setBuddyTaskIds(new Set());
    }

    setLoadingClubTasks(false);
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const enrollInPlan = async (planId: string) => {
    if (isBlocked) { toast.error(l.complianceBlocked); return; }
    const { error } = await supabase.from('monthly_enrollments').insert({ plan_id: planId, volunteer_id: userId });
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'nl' ? 'Ingeschreven! Wacht op goedkeuring van de club.' : 'Enrolled! Waiting for club approval.');
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      sendPushToClub({ clubId: plan.club_id, title: '📋 Nieuwe inschrijving', message: `${profile?.full_name || 'Een vrijwilliger'} heeft zich ingeschreven voor "${plan.title}".`, url: '/command-center', type: 'new_enrollment' });
    }
    loadData();
  };

  const signUpForDay = async (enrollmentId: string, planTaskId: string) => {
    const { error } = await supabase.from('monthly_day_signups').insert({
      enrollment_id: enrollmentId,
      plan_task_id: planTaskId,
      volunteer_id: userId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'nl' ? 'Aangemeld! Wacht op bevestiging van de club.' : 'Signed up! Waiting for club confirmation.');
    const task = tasks.find(t => t.id === planTaskId);
    const plan = plans.find(p => task && p.id === task.plan_id);
    if (plan) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      sendPushToClub({ clubId: plan.club_id, title: '📅 Nieuwe dag-aanmelding', message: `${profile?.full_name || 'Een vrijwilliger'} heeft zich aangemeld voor ${task?.title || 'een taak'}.`, url: '/command-center', type: 'new_day_signup' });
    }
    loadData();
  };

  const signUpForClubTask = async (taskId: string) => {
    if (isBlocked) { toast.error(l.complianceBlocked); return; }
    setSigningUpTaskId(taskId);
    const { error } = await supabase.from('task_signups').insert({
      task_id: taskId,
      volunteer_id: userId,
      status: 'pending',
    });
    setSigningUpTaskId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'nl' ? '🎉 Aangemeld! De club neemt contact met je op.' : language === 'fr' ? '🎉 Inscrit !' : '🎉 Signed up!');
    const task = clubTasks.find(t => t.id === taskId);
    if (task) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      sendPushToClub({
        clubId: task.club_id,
        title: language === 'nl' ? '🎉 Nieuwe aanmelding' : 'New signup',
        message: `${profile?.full_name || 'Een vrijwilliger'} heeft zich aangemeld voor "${task.title}".`,
        url: '/command-center',
        type: 'new_signup',
      });
    }
    loadClubTaskData();
  };

  const submitHours = async () => {
    if (!selectedSignup || !hoursInput) return;
    const hours = Number(hoursInput);
    if (isNaN(hours) || hours <= 0) return;
    const { error } = await supabase.from('monthly_day_signups')
      .update({ volunteer_reported_hours: hours, volunteer_approved: true, hour_status: 'volunteer_reported' })
      .eq('id', selectedSignup.id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'nl' ? 'Uren gerapporteerd!' : 'Hours reported!');
    const task = tasks.find(t => t.id === selectedSignup.plan_task_id);
    const plan = plans.find(p => task && p.id === task.plan_id);
    if (plan) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      sendPushToClub({ clubId: plan.club_id, title: '⏰ Uren gerapporteerd', message: `${profile?.full_name || 'Een vrijwilliger'} rapporteerde ${hours}u.`, url: '/monthly-planning', type: 'hours_reported' });
    }
    setShowHoursDialog(false); setSelectedSignup(null); setHoursInput('');
    loadData();
  };

  const confirmCheckout = async (agree: boolean) => {
    if (!selectedSignup) return;
    if (agree) {
      const hours = selectedSignup.club_reported_hours || 0;
      const task = tasks.find(t => t.id === selectedSignup.plan_task_id);
      const rate = task?.hourly_rate || 0;
      const finalAmount = hours * rate;
      await supabase.from('monthly_day_signups').update({
        volunteer_approved: true, volunteer_reported_hours: hours,
        volunteer_reported_checkout: selectedSignup.club_reported_checkout,
        final_hours: hours, final_amount: finalAmount,
        hour_status: 'confirmed', dispute_status: 'none',
      } as any).eq('id', selectedSignup.id);
      toast.success(language === 'nl' ? `Akkoord: ${hours.toFixed(1)}u — €${finalAmount.toFixed(2)}` : `Agreed: ${hours.toFixed(1)}h — €${finalAmount.toFixed(2)}`);
    } else {
      await supabase.from('monthly_day_signups').update({
        dispute_status: 'open', hour_status: 'disputed',
      } as any).eq('id', selectedSignup.id);
      toast.info(language === 'nl' ? 'Geschil geopend. Bespreek via chat met de club.' : 'Dispute opened. Discuss via chat with the club.');
    }
    setSelectedSignup(null);
    loadData();
  };

  const submitDisputeHours = async () => {
    if (!selectedSignup || !hoursInput) return;
    const hours = Number(hoursInput);
    if (isNaN(hours) || hours <= 0) return;
    await supabase.from('monthly_day_signups').update({
      volunteer_reported_hours: hours, volunteer_approved: true,
      volunteer_reported_checkout: new Date().toISOString(),
    } as any).eq('id', selectedSignup.id);
    toast.success(language === 'nl' ? 'Jouw uren ingediend voor het geschil.' : 'Your hours submitted for the dispute.');
    setShowHoursDialog(false); setSelectedSignup(null); setHoursInput('');
    loadData();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const prevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      Bar: 'bg-amber-500/20 text-amber-700', Logistiek: 'bg-blue-500/20 text-blue-700',
      Catering: 'bg-orange-500/20 text-orange-700', Onderhoud: 'bg-green-500/20 text-green-700',
      Administratie: 'bg-purple-500/20 text-purple-700', Kantine: 'bg-rose-500/20 text-rose-700',
      Jeugdwerking: 'bg-cyan-500/20 text-cyan-700',
    };
    return map[cat] || 'bg-muted text-muted-foreground';
  };

  const isSignedUp = (taskId: string) => daySignups.some(ds => ds.plan_task_id === taskId);
  const getSignup = (taskId: string) => daySignups.find(ds => ds.plan_task_id === taskId);
  const tasksByDate = tasks.reduce<Record<string, PlanTask[]>>((acc, t) => {
    if (!acc[t.task_date]) acc[t.task_date] = [];
    acc[t.task_date].push(t);
    return acc;
  }, {});
  const mySignedUpTasks = tasks.filter(t => isSignedUp(t.id));
  const estimatedMonthTotal = mySignedUpTasks.reduce((sum, t) => {
    if (t.compensation_type === 'daily' && t.daily_rate) return sum + t.daily_rate;
    if (t.compensation_type === 'hourly' && t.hourly_rate && t.estimated_hours) return sum + t.hourly_rate * t.estimated_hours;
    return sum;
  }, 0);

  const canSignUpForDays = (enrollment: Enrollment) =>
    enrollment.approval_status === 'approved' && enrollment.contract_status === 'signed';

  const enrollmentStatusMessage = (enrollment: Enrollment) => {
    if (enrollment.approval_status === 'pending') return { icon: Hourglass, text: l.waitingApproval, color: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' };
    if (enrollment.approval_status === 'rejected') return { icon: XCircle, text: l.rejected, color: 'border-destructive/50 bg-destructive/10 text-destructive' };
    if (enrollment.approval_status === 'approved' && enrollment.contract_status !== 'signed') return { icon: FileSignature, text: l.contractRequired, color: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200' };
    return null;
  };

  const signupStatusBadge = (signup: DaySignup) => {
    if (signup.status === 'assigned') return <Badge className="bg-green-600 text-[10px]">{l.assigned}</Badge>;
    if (signup.status === 'rejected') return <Badge variant="destructive" className="text-[10px]">{l.rejected}</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{l.waitingAssignment}</Badge>;
  };

  const regularSignupStatusBadge = (status: string) => {
    if (status === 'assigned') return <Badge className="bg-green-600 text-[10px]">{l.assigned}</Badge>;
    if (status === 'rejected') return <Badge variant="destructive" className="text-[10px]">{l.rejected}</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{l.waitingAssignment}</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          {language === 'nl' ? 'Kalender' : language === 'fr' ? 'Calendrier' : 'Calendar'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{l.subtitle}</p>
      </div>

      {/* Top-level sub-view tabs: Planning | Briefings */}
      <div className="flex gap-2 border-b border-border pb-0">
        {([
          { view: 'planning' as SubView, label: l.planning, Icon: CalendarDays },
          { view: 'briefings' as SubView, label: l.briefings, Icon: FileText },
        ]).map(({ view, label, Icon }) => (
          <button
            key={view}
            onClick={() => setSubView(view)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              subView === view
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── PLANNING SUB-VIEW ────────────────────────────────────────────── */}
      {subView === 'planning' && (
        <>
          {/* Compliance banners */}
          {isWarning && (
            <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">{l.complianceWarning} ({compliancePercentage.toFixed(0)}% — €{totalEarned.toFixed(2)} / €{YEARLY_CAP})</span>
              </CardContent>
            </Card>
          )}
          {isBlocked && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                <span className="text-sm text-destructive">{l.complianceBlocked}</span>
              </CardContent>
            </Card>
          )}

          {/* ── BIG TOGGLE: Mijn Inschrijvingen | Open Taken ──────────────── */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted rounded-2xl">
            <button
              onClick={() => setPlanView('mine')}
              className={`flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-xl font-semibold text-base transition-all min-h-[80px] ${
                planView === 'mine'
                  ? 'bg-card shadow-md text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarCheck className={`w-7 h-7 ${planView === 'mine' ? 'text-primary' : ''}`} />
              <span className="text-sm font-semibold leading-tight text-center">{l.mySignups}</span>
            </button>
            <button
              onClick={() => setPlanView('open')}
              className={`flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-xl font-semibold text-base transition-all min-h-[80px] ${
                planView === 'open'
                  ? 'bg-card shadow-md text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ClipboardList className={`w-7 h-7 ${planView === 'open' ? 'text-primary' : ''}`} />
              <span className="text-sm font-semibold leading-tight text-center">{l.openTasks}</span>
            </button>
          </div>

          {/* Month navigator (only relevant for monthly plan section) */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={prevMonth} className="h-11 w-11"><ChevronLeft className="w-5 h-5" /></Button>
            <h2 className="text-lg font-bold">{MONTH_NAMES[language][viewMonth - 1]} {viewYear}</h2>
            <Button variant="outline" size="icon" onClick={nextMonth} className="h-11 w-11"><ChevronRight className="w-5 h-5" /></Button>
          </div>

          {/* ── MIJN INSCHRIJVINGEN ──────────────────────────────────────── */}
          {planView === 'mine' && (
            <>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                </div>
              ) : (
                <>
                  {/* Monthly plan day signups */}
                  {plans.map(plan => {
                    const enrollment = enrollments.find(e => e.plan_id === plan.id);
                    const planMyTasks = mySignedUpTasks.filter(t => t.plan_id === plan.id);
                    if (!enrollment || planMyTasks.length === 0) return null;

                    return (
                      <div key={plan.id} className="space-y-3">
                        {/* Plan header */}
                        <PlanHeader plan={plan} enrollment={enrollment} l={l} onEnroll={() => {}} isBlocked={isBlocked} hideEnroll />

                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{l.yourSchedule}</CardTitle>
                              <span className="text-xs text-muted-foreground">{l.monthTotal}: <strong className="text-foreground">€{estimatedMonthTotal.toFixed(2)}</strong></span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {planMyTasks.map(t => {
                              const d = new Date(t.task_date);
                              const signup = getSignup(t.id);
                              const isPast = d < new Date(new Date().toISOString().split('T')[0]);
                              const isHourly = t.compensation_type === 'hourly';
                              const needsCheckoutConfirm = signup?.hour_status === 'checkout_pending' && !signup.volunteer_approved && isHourly;
                              const needsHourReport = isPast && signup?.checked_in_at && !signup.volunteer_approved && !needsCheckoutConfirm && t.compensation_type !== 'hourly';
                              const needsDisputeInput = signup?.dispute_status === 'escalated' && !signup.volunteer_reported_hours;
                              const notCheckedIn = isPast && !signup?.checked_in_at;

                              return (
                                <div key={t.id} className={`flex items-center gap-3 p-4 rounded-xl border ${notCheckedIn ? 'bg-destructive/5 border-destructive/20' : 'bg-primary/5 border-transparent'}`}>
                                  <div className="text-center min-w-[44px]">
                                    <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(language === 'nl' ? 'nl-BE' : 'fr-BE', { weekday: 'short' })}</p>
                                    <p className="text-xl font-bold">{d.getDate()}</p>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-base">{t.title}</span>
                                      <Badge variant="outline" className={`text-[10px] ${categoryColor(t.category)}`}>{t.category}</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                      {t.start_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{t.start_time}–{t.end_time}</span>}
                                      {t.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{t.location}</span>}
                                      <span className="flex items-center gap-1"><Euro className="w-3.5 h-3.5" />{t.compensation_type === 'daily' ? `€${t.daily_rate}/${l.day}` : `€${t.hourly_rate}/${l.hour}`}</span>
                                    </div>
                                    {notCheckedIn && (
                                      <p className="text-sm text-destructive mt-1.5 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {l.notCheckedIn}</p>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    {signup && signupStatusBadge(signup)}
                                    {signup?.checked_in_at ? (
                                      <Badge variant="default" className="bg-green-600 text-[10px]"><CheckCircle className="w-3 h-3 mr-0.5" />{l.checkedIn}</Badge>
                                    ) : !isPast && signup?.status === 'assigned' && signup?.ticket_barcode ? (
                                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowTicket(signup.ticket_barcode)}>
                                        <QrCode className="w-3 h-3 mr-1" /> {l.ticket}
                                      </Button>
                                    ) : null}
                                    {needsCheckoutConfirm && (
                                      <div className="flex flex-col gap-1">
                                        <p className="text-[10px] text-muted-foreground">{language === 'nl' ? `Club: ${signup!.club_reported_hours?.toFixed(1)}u` : `Club: ${signup!.club_reported_hours?.toFixed(1)}h`}</p>
                                        <div className="flex gap-1">
                                          <Button size="sm" variant="outline" className="h-8 text-xs text-green-700 min-h-[32px]" onClick={() => { setSelectedSignup(signup!); confirmCheckout(true); }}>
                                            <CheckCircle className="w-3 h-3 mr-0.5" /> {language === 'nl' ? 'Akkoord' : 'OK'}
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-8 text-xs text-destructive min-h-[32px]" onClick={() => { setSelectedSignup(signup!); confirmCheckout(false); }}>
                                            <XCircle className="w-3 h-3 mr-0.5" /> {language === 'nl' ? 'Betwist' : 'No'}
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                    {needsDisputeInput && (
                                      <Button size="sm" variant="outline" className="h-8 text-xs text-destructive min-h-[32px]" onClick={() => { setSelectedSignup(signup!); setSelectedTask(t); setHoursInput(''); setShowHoursDialog(true); }}>
                                        <AlertTriangle className="w-3 h-3 mr-1" /> {language === 'nl' ? 'Uren invoeren' : 'Enter hours'}
                                      </Button>
                                    )}
                                    {needsHourReport && (
                                      <Button size="sm" variant="outline" className="h-8 text-xs min-h-[32px]" onClick={() => { setSelectedSignup(signup!); setSelectedTask(t); setHoursInput(String(t.estimated_hours || '')); setShowHoursDialog(true); }}>
                                        <Clock className="w-3 h-3 mr-1" /> {l.confirmHours}
                                      </Button>
                                    )}
                                    {signup?.dispute_status === 'open' && (
                                      <Badge variant="destructive" className="text-[10px]">{language === 'nl' ? 'Geschil open' : 'Dispute'}</Badge>
                                    )}
                                    {signup?.volunteer_approved && signup?.hour_status === 'confirmed' && (
                                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">
                                        <CheckCircle className="w-3 h-3 mr-0.5" /> {signup.final_hours ? `${signup.final_hours.toFixed(1)}u ✓` : l.hoursConfirmed}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}

                  {/* Regular task signups */}
                  {loadingClubTasks ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : myTaskSignups.length > 0 ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-primary" />
                          {l.myRegularTasks}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {myTaskSignups.map(signup => {
                          const task = signup.tasks;
                          if (!task) return null;
                          return (
                            <div key={signup.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-base text-foreground">{task.title}</p>
                                  {regularSignupStatusBadge(signup.status)}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                  {task.task_date && (
                                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(task.task_date)}</span>
                                  )}
                                  {task.start_time && (
                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{task.start_time}</span>
                                  )}
                                  {task.location && (
                                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{task.location}</span>
                                  )}
                                </div>
                                {(task as any).clubs?.name && (
                                  <p className="text-xs text-muted-foreground mt-1">{(task as any).clubs.name}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ) : null}

                  {/* Empty state if nothing at all */}
                  {plans.every(p => !enrollments.find(e => e.plan_id === p.id) || mySignedUpTasks.filter(t => t.plan_id === p.id).length === 0) && myTaskSignups.length === 0 && !loadingClubTasks && (
                    <div className="text-center py-16 text-muted-foreground">
                      <CalendarCheck className="w-14 h-14 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">{l.noMySignups}</p>
                      <p className="text-sm mt-1">{language === 'nl' ? 'Ga naar "Open Taken" om je in te schrijven.' : language === 'fr' ? 'Consultez "Tâches Ouvertes" pour vous inscrire.' : 'Go to "Open Tasks" to sign up.'}</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── OPEN TAKEN ─────────────────────────────────────────────────── */}
          {planView === 'open' && (
            <>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                </div>
              ) : (
                <>
                  {/* Monthly plan open tasks (within enrolled plans) */}
                  {plans.map(plan => {
                    const enrollment = enrollments.find(e => e.plan_id === plan.id);
                    if (!enrollment) {
                      return (
                        <div key={plan.id} className="space-y-3">
                          <PlanHeader plan={plan} enrollment={undefined} l={l} onEnroll={() => enrollInPlan(plan.id)} isBlocked={isBlocked} />
                        </div>
                      );
                    }
                    const statusMsg = enrollmentStatusMessage(enrollment);
                    const planTasks = tasks.filter(t => t.plan_id === plan.id);

                    return (
                      <div key={plan.id} className="space-y-3">
                        <PlanHeader plan={plan} enrollment={enrollment} l={l} onEnroll={() => enrollInPlan(plan.id)} isBlocked={isBlocked} />

                        {statusMsg && (
                          <Card className={statusMsg.color}>
                            <CardContent className="p-4 flex items-center gap-3 text-sm">
                              <statusMsg.icon className="w-4 h-4 shrink-0" />
                              <span>{statusMsg.text}</span>
                            </CardContent>
                          </Card>
                        )}

                        {planTasks.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">{l.availableTasks}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {!canSignUpForDays(enrollment) && (
                                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-sm flex items-center gap-2">
                                  {enrollment.approval_status !== 'approved' ? (
                                    <><Hourglass className="w-4 h-4 text-amber-600 shrink-0" /><span className="text-amber-800 dark:text-amber-200">{l.approvalRequired}</span></>
                                  ) : (
                                    <><FileSignature className="w-4 h-4 text-amber-600 shrink-0" /><span className="text-amber-800 dark:text-amber-200">{l.contractRequired}</span></>
                                  )}
                                </div>
                              )}
                              {Object.entries(tasksByDate)
                                .filter(([_, ts]) => ts.some(t => t.plan_id === plan.id))
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([date, dateTasks]) => {
                                  const d = new Date(date);
                                  const isPast = d < new Date(new Date().toISOString().split('T')[0]);
                                  const blocked = !canSignUpForDays(enrollment);
                                  return (
                                    <div key={date} className={isPast ? 'opacity-50' : ''}>
                                      <p className="text-sm font-semibold text-muted-foreground mb-2 capitalize">
                                        {d.toLocaleDateString(language === 'nl' ? 'nl-BE' : 'fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                                      </p>
                                      <div className="space-y-2">
                                        {dateTasks.filter(t => t.plan_id === plan.id && !isSignedUp(t.id)).map(t => (
                                          <div key={t.id} className="flex items-center gap-3 p-4 rounded-xl border hover:bg-muted/30 transition-colors">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-base">{t.title}</span>
                                                <Badge variant="outline" className={`text-[10px] ${categoryColor(t.category)}`}>{t.category}</Badge>
                                              </div>
                                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                                {t.start_time && <span><Clock className="w-3.5 h-3.5 inline mr-0.5" />{t.start_time}–{t.end_time}</span>}
                                                {t.location && <span><MapPin className="w-3.5 h-3.5 inline mr-0.5" />{t.location}</span>}
                                                <span><Euro className="w-3.5 h-3.5 inline mr-0.5" />{t.compensation_type === 'daily' ? `€${t.daily_rate}` : `€${t.hourly_rate}/u`}</span>
                                                <span><Users className="w-3.5 h-3.5 inline mr-0.5" />{t.spots_available} {l.available}</span>
                                              </div>
                                            </div>
                                            {!isPast && !blocked && (
                                              <Button size="sm" className="shrink-0 min-h-[44px] px-4 rounded-xl" onClick={() => signUpForDay(enrollment.id, t.id)}>
                                                {l.signUp}
                                              </Button>
                                            )}
                                            {!isPast && blocked && (
                                              <Button size="sm" variant="outline" className="shrink-0 min-h-[44px] px-4 rounded-xl opacity-50" disabled>{l.signUp}</Button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  })}

                  {/* Open regular club tasks */}
                  {loadingClubTasks ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : clubTasks.length > 0 ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-primary" />
                          {l.openClubTasks}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {clubTasks.map(task => {
                          const isSigningUp = signingUpTaskId === task.id;
                          const buddyJoining = buddyTaskIds.has(task.id);
                          return (
                            <div key={task.id} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${buddyJoining ? 'border-2 border-pink-400 bg-pink-50 dark:bg-pink-950/20 shadow-sm' : 'border bg-card hover:bg-muted/30'}`}>
                              {/* Club logo */}
                              <div className="shrink-0 mt-0.5">
                                {task.clubs?.logo_url ? (
                                  <img src={task.clubs.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    {(task.clubs?.name || '?')[0]}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base text-foreground">{task.title}</p>
                                {buddyJoining && (
                                  <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full bg-pink-100 border border-pink-300 text-pink-800 text-sm font-bold">
                                    <span>🧡</span>
                                    <span>{l.buddyAlso} {buddyName || '…'}{l.buddyAlsoSuffix}</span>
                                  </div>
                                )}
                                <div>
                                {task.clubs?.name && (
                                  <p className="text-sm text-primary font-medium mt-0.5">{task.clubs.name}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
                                  {task.task_date && (
                                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(task.task_date)}</span>
                                  )}
                                  {task.start_time && (
                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{task.start_time}{task.end_time ? `–${task.end_time}` : ''}</span>
                                  )}
                                  {task.location && (
                                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{task.location}</span>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
                                )}
                                </div>{/* close wrapping div */}
                              </div>
                              <Button
                                size="sm"
                                className="shrink-0 min-h-[48px] px-5 rounded-xl font-semibold self-start"
                                onClick={() => signUpForClubTask(task.id)}
                                disabled={isSigningUp || isBlocked}
                              >
                                {isSigningUp ? <Loader2 className="w-4 h-4 animate-spin" /> : l.signUpConfirm}
                              </Button>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ) : !loadingClubTasks && plans.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Calendar className="w-14 h-14 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">{l.noOpenTasks}</p>
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}

          {/* Hours dialog */}
          <Dialog open={showHoursDialog} onOpenChange={setShowHoursDialog}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> {l.confirmHours}</DialogTitle>
                <DialogDescription>
                  {selectedTask?.title} — {selectedTask && new Date(selectedTask.task_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">{l.reportHours}</label>
                  <Input type="number" step="0.5" min="0.5" max="24" value={hoursInput} onChange={e => setHoursInput(e.target.value)} className="mt-1 h-12 text-base" />
                </div>
                {selectedSignup?.dispute_status === 'escalated' && selectedSignup?.club_reported_hours && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                    {language === 'nl' ? `Club rapporteerde: ${selectedSignup.club_reported_hours.toFixed(1)}u. Voer jouw uren in. Het gemiddelde wordt na 48u automatisch toegepast.` : `Club reported: ${selectedSignup.club_reported_hours.toFixed(1)}h. Enter your hours. Average will be applied after 48h.`}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setShowHoursDialog(false)}>Annuleren</Button>
                  <Button className="flex-1 h-12" onClick={selectedSignup?.dispute_status === 'escalated' ? submitDisputeHours : submitHours} disabled={!hoursInput || Number(hoursInput) <= 0}>{l.submit}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Ticket QR dialog */}
          <Dialog open={!!showTicket} onOpenChange={() => setShowTicket(null)}>
            <DialogContent className="sm:max-w-xs text-center">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-center gap-2"><QrCode className="w-5 h-5 text-primary" /> {l.ticket}</DialogTitle>
              </DialogHeader>
              {showTicket && (
                <div className="flex flex-col items-center gap-4 py-4">
                  <QRCodeSVG value={showTicket} size={200} />
                  <p className="text-xs font-mono text-muted-foreground">{showTicket}</p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ── BRIEFINGS SUB-VIEW ────────────────────────────────────────────── */}
      {subView === 'briefings' && userId && (
        <VolunteerBriefingsList language={language} userId={userId} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Plan header card
// ─────────────────────────────────────────────────────────────────────────────

interface PlanHeaderProps {
  plan: MonthlyPlan;
  enrollment?: Enrollment;
  l: Record<string, string>;
  onEnroll: () => void;
  isBlocked: boolean;
  hideEnroll?: boolean;
}

const PlanHeader = ({ plan, enrollment, l, onEnroll, isBlocked, hideEnroll }: PlanHeaderProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {plan.clubs?.logo_url ? (
            <img src={plan.clubs.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
              {(plan.clubs?.name || '?')[0]}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate">{plan.clubs?.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{plan.title}</p>
          </div>
        </div>
        {!hideEnroll && (
          enrollment ? (
            enrollment.approval_status === 'approved' ? (
              <Badge variant="default" className="bg-green-600 shrink-0">{l.approved}</Badge>
            ) : enrollment.approval_status === 'rejected' ? (
              <Badge variant="destructive" className="shrink-0">{l.rejected}</Badge>
            ) : (
              <Badge variant="secondary" className="shrink-0">{l.waitingApproval}</Badge>
            )
          ) : (
            <Button size="sm" onClick={onEnroll} disabled={isBlocked} className="shrink-0 min-h-[44px] rounded-xl">
              <FileSignature className="w-4 h-4 mr-1.5" /> {l.enroll}
            </Button>
          )
        )}
        {hideEnroll && enrollment && (
          enrollment.approval_status === 'approved' ? (
            <Badge variant="default" className="bg-green-600 shrink-0">{l.approved}</Badge>
          ) : enrollment.approval_status === 'rejected' ? (
            <Badge variant="destructive" className="shrink-0">{l.rejected}</Badge>
          ) : (
            <Badge variant="secondary" className="shrink-0">{l.waitingApproval}</Badge>
          )
        )}
      </div>
    </CardContent>
  </Card>
);

export default VolunteerMonthlyTab;
