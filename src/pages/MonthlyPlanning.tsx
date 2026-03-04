import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Euro,
  Users, FileText, Trash2, Edit, Eye, Send, CalendarDays, CheckCircle,
  Copy, FileSignature, Loader2, Banknote, Play, XCircle, Ticket, Mail,
  UserCheck, UserX,
} from 'lucide-react';
import SendContractConfirmDialog from '@/components/SendContractConfirmDialog';

const MONTH_NAMES: Record<string, string[]> = {
  nl: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const WEEKDAY_NAMES: Record<string, string[]> = {
  nl: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};
const CATEGORIES = ['Bar', 'Logistiek', 'Catering', 'Onderhoud', 'Administratie', 'Kantine', 'Jeugdwerking', 'Evenement', 'Schoonmaak', 'Andere'];

interface MonthlyPlan {
  id: string;
  club_id: string;
  year: number;
  month: number;
  title: string;
  description: string | null;
  status: string;
  contract_template_id: string | null;
  created_at: string;
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

interface Enrollment {
  id: string;
  volunteer_id: string;
  contract_status: string;
  approval_status: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}

interface DaySignupClub {
  id: string;
  enrollment_id: string;
  plan_task_id: string;
  volunteer_id: string;
  status: string;
  checked_in_at: string | null;
  hour_status: string;
  volunteer_reported_hours: number | null;
  club_reported_hours: number | null;
  volunteer_approved: boolean;
  club_approved: boolean;
  final_hours: number | null;
  final_amount: number | null;
  ticket_barcode: string | null;
  volunteer_name?: string;
  volunteer_email?: string;
}

const MonthlyPlanning = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const now = new Date();
  
  // Read initial month from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const initialYear = urlParams.get('y') ? Number(urlParams.get('y')) : now.getFullYear();
  const initialMonth = urlParams.get('m') ? Number(urlParams.get('m')) : now.getMonth() + 1;
  
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [clubId, setClubId] = useState<string | null>(null);
  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [daySignups, setDaySignups] = useState<DaySignupClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<PlanTask | null>(null);
  const [contractTemplates, setContractTemplates] = useState<{ id: string; name: string }[]>([]);
  const [copyingTasks, setCopyingTasks] = useState(false);
  const [generatingPayout, setGeneratingPayout] = useState(false);
  const [contractVolunteer, setContractVolunteer] = useState<Enrollment | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoDeleteLoading, setDemoDeleteLoading] = useState(false);
  const [generatingTicketIds, setGeneratingTicketIds] = useState<Set<string>>(new Set());
  const [sendingTicketEmailIds, setSendingTicketEmailIds] = useState<Set<string>>(new Set());
  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '', category: 'Algemeen', description: '', location: '',
    start_time: '09:00', end_time: '17:00', compensation_type: 'daily',
    daily_rate: '25', hourly_rate: '5', estimated_hours: '8', spots_available: '3',
  });

  // Load club
  useEffect(() => {
    const loadClub = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/club-login'); return; }
      const { data: club } = await supabase.from('clubs').select('id').eq('owner_id', user.id).maybeSingle();
      if (!club) {
        const { data: member } = await supabase.from('club_members').select('club_id').eq('user_id', user.id).limit(1).maybeSingle();
        if (member) setClubId(member.club_id);
      } else {
        setClubId(club.id);
      }
    };
    loadClub();
  }, [navigate]);

  // Load plan + tasks + enrollments + templates when club/month changes
  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      setLoading(true);
      const [planRes, templatesRes] = await Promise.all([
        supabase.from('monthly_plans').select('*').eq('club_id', clubId).eq('year', viewYear).eq('month', viewMonth).maybeSingle(),
        supabase.from('contract_templates').select('id, name').eq('club_id', clubId),
      ]);

      if (templatesRes.data) setContractTemplates(templatesRes.data);

      if (planRes.data) {
        const p = planRes.data as unknown as MonthlyPlan;
        setPlan(p);
        const [tasksRes, enrollRes] = await Promise.all([
          supabase.from('monthly_plan_tasks').select('*').eq('plan_id', p.id).order('task_date').order('start_time'),
          supabase.from('monthly_enrollments').select('id, volunteer_id, contract_status, approval_status, profiles:volunteer_id(full_name, email, avatar_url)').eq('plan_id', p.id),
        ]);
        setTasks((tasksRes.data || []) as unknown as PlanTask[]);
        const enrs = (enrollRes.data || []) as unknown as Enrollment[];
        setEnrollments(enrs);

        // Load day signups for club-side management
        if (enrs.length > 0) {
          const { data: signupsData } = await supabase
            .from('monthly_day_signups')
            .select('*')
            .in('enrollment_id', enrs.map(e => e.id));
          
          // Enrich with volunteer names
          const enriched = (signupsData || []).map((s: any) => {
            const enr = enrs.find(e => e.id === s.enrollment_id);
            return {
              ...s,
              volunteer_name: (enr?.profiles as any)?.full_name || t3('Onbekend', 'Inconnu', 'Unknown'),
              volunteer_email: (enr?.profiles as any)?.email || null,
            };
          });
          setDaySignups(enriched as DaySignupClub[]);
        } else {
          setDaySignups([]);
        }
      } else {
        setPlan(null);
        setTasks([]);
        setEnrollments([]);
        setDaySignups([]);
      }
      setLoading(false);
    };
    load();
  }, [clubId, viewYear, viewMonth]);

  // --- Enrollment approval ---
  const approveEnrollment = async (enrollmentId: string) => {
    const { error } = await supabase.from('monthly_enrollments')
      .update({ approval_status: 'approved' } as any)
      .eq('id', enrollmentId);
    if (error) { toast.error(error.message); return; }
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, approval_status: 'approved' } : e));
    toast.success(t3('Inschrijving goedgekeurd!', 'Inscription approuvée !', 'Enrollment approved!'));
  };

  const rejectEnrollment = async (enrollmentId: string) => {
    const { error } = await supabase.from('monthly_enrollments')
      .update({ approval_status: 'rejected' } as any)
      .eq('id', enrollmentId);
    if (error) { toast.error(error.message); return; }
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, approval_status: 'rejected' } : e));
    toast.success(t3('Inschrijving afgewezen.', 'Inscription refusée.', 'Enrollment rejected.'));
  };

  // --- Day signup assignment ---
  const assignDaySignup = async (signupId: string) => {
    const { error } = await supabase.from('monthly_day_signups')
      .update({ status: 'assigned' })
      .eq('id', signupId);
    if (error) { toast.error(error.message); return; }
    setDaySignups(prev => prev.map(s => s.id === signupId ? { ...s, status: 'assigned' } : s));
    toast.success(t3('Vrijwilliger toegekend aan deze dag!', 'Bénévole attribué à ce jour !', 'Volunteer assigned to this day!'));
  };

  const rejectDaySignup = async (signupId: string) => {
    const { error } = await supabase.from('monthly_day_signups')
      .update({ status: 'rejected' })
      .eq('id', signupId);
    if (error) { toast.error(error.message); return; }
    setDaySignups(prev => prev.map(s => s.id === signupId ? { ...s, status: 'rejected' } : s));
    toast.success(t3('Dag-aanmelding afgewezen.', 'Inscription journalière refusée.', 'Day signup rejected.'));
  };

  // --- Ticket generation for assigned day signups ---
  const generateTicketForSignup = async (signup: DaySignupClub) => {
    if (!clubId || !plan) return;
    const key = signup.id;
    setGeneratingTicketIds(prev => new Set(prev).add(key));
    try {
      const { data, error } = await supabase.functions.invoke('ticketing-generate', {
        body: {
          action: 'create_internal_ticket',
          club_id: clubId,
          event_id: plan.id, // Use plan ID as event reference for monthly planning
          volunteer_id: signup.volunteer_id,
          task_id: signup.plan_task_id,
        },
      });
      if (error) throw error;
      if (data?.success) {
        // Update local barcode from ticket
        const barcode = data.barcode || signup.ticket_barcode;
        setDaySignups(prev => prev.map(s => s.id === signup.id ? { ...s, ticket_barcode: barcode } : s));
        toast.success(t3('Ticket gegenereerd!', 'Ticket généré !', 'Ticket generated!'));
      } else {
        toast.error(data?.error || t3('Ticket genereren mislukt', 'Échec de la génération du ticket', 'Ticket generation failed'));
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setGeneratingTicketIds(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  const sendTicketEmail = async (signup: DaySignupClub) => {
    if (!clubId || !plan || !signup.volunteer_email) return;
    const key = signup.id;
    setSendingTicketEmailIds(prev => new Set(prev).add(key));
    try {
      const { data, error } = await supabase.functions.invoke('ticketing-generate', {
        body: {
          action: 'send_ticket_email_invite',
          club_id: clubId,
          event_id: plan.id,
          volunteer_id: signup.volunteer_id,
          task_id: signup.plan_task_id,
          email: signup.volunteer_email,
          volunteer_name: signup.volunteer_name,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(t3('Ticket per e-mail verstuurd!', 'Ticket envoyé par e-mail !', 'Ticket sent by email!'));
      } else {
        toast.error(data?.error || t3('Versturen mislukt', 'Échec de l\'envoi', 'Sending failed'));
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setSendingTicketEmailIds(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  const createPlan = async () => {
    if (!clubId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('monthly_plans').insert({
      club_id: clubId,
      year: viewYear,
      month: viewMonth,
      title: `${MONTH_NAMES[language]?.[viewMonth - 1] || MONTH_NAMES.nl[viewMonth - 1]} ${viewYear}`,
      created_by: user.id,
      status: 'draft',
    }).select().single();
    if (error) { toast.error(t3('Kon plan niet aanmaken', 'Impossible de créer le plan', 'Could not create plan')); return; }
    setPlan(data as unknown as MonthlyPlan);
    toast.success(t3('Maandplan aangemaakt!', 'Plan mensuel créé !', 'Monthly plan created!'));
  };

  const addOrUpdateTask = async () => {
    if (!plan) return;
    const payload = {
      plan_id: plan.id,
      task_date: selectedDate!,
      title: taskForm.title,
      category: taskForm.category,
      description: taskForm.description || null,
      location: taskForm.location || null,
      start_time: taskForm.start_time || null,
      end_time: taskForm.end_time || null,
      compensation_type: taskForm.compensation_type,
      daily_rate: taskForm.compensation_type === 'daily' ? Number(taskForm.daily_rate) : null,
      hourly_rate: taskForm.compensation_type === 'hourly' ? Number(taskForm.hourly_rate) : null,
      estimated_hours: taskForm.compensation_type === 'hourly' ? Number(taskForm.estimated_hours) : null,
      spots_available: Number(taskForm.spots_available),
    };

    if (editingTask) {
      const { error } = await supabase.from('monthly_plan_tasks').update(payload).eq('id', editingTask.id);
      if (error) { toast.error(t3('Update mislukt', 'Mise à jour échouée', 'Update failed')); return; }
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...payload } : t));
      toast.success(t3('Taak bijgewerkt', 'Tâche mise à jour', 'Task updated'));
    } else {
      const { data, error } = await supabase.from('monthly_plan_tasks').insert(payload).select().single();
      if (error) { toast.error(t3('Taak toevoegen mislukt', 'Échec de l\'ajout', 'Failed to add task')); return; }
      setTasks(prev => [...prev, data as unknown as PlanTask]);
      toast.success(t3('Taak toegevoegd', 'Tâche ajoutée', 'Task added'));
    }
    setShowAddTask(false);
    setEditingTask(null);
    resetForm();
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('monthly_plan_tasks').delete().eq('id', taskId);
    if (error) { toast.error(t3('Verwijderen mislukt', 'Suppression échouée', 'Delete failed')); return; }
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success(t3('Taak verwijderd', 'Tâche supprimée', 'Task deleted'));
  };

  const publishPlan = async () => {
    if (!plan) return;
    const { error } = await supabase.from('monthly_plans').update({ status: 'published' }).eq('id', plan.id);
    if (error) { toast.error(t3('Publiceren mislukt', 'Publication échouée', 'Publishing failed')); return; }
    setPlan(prev => prev ? { ...prev, status: 'published' } : null);
    toast.success(t3('Maandplan gepubliceerd! Vrijwilligers kunnen zich nu inschrijven.', 'Plan mensuel publié ! Les bénévoles peuvent s\'inscrire.', 'Monthly plan published! Volunteers can now sign up.'));
  };

  const resetForm = () => {
    setTaskForm({
      title: '', category: 'Algemeen', description: '', location: '',
      start_time: '09:00', end_time: '17:00', compensation_type: 'daily',
      daily_rate: '25', hourly_rate: '5', estimated_hours: '8', spots_available: '3',
    });
  };

  // Feature 1: Copy tasks from previous month
  const copyPreviousMonth = async () => {
    if (!plan || !clubId) return;
    setCopyingTasks(true);
    try {
      const prevM = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevY = viewMonth === 1 ? viewYear - 1 : viewYear;
      const { data: prevPlan } = await supabase.from('monthly_plans').select('id').eq('club_id', clubId).eq('year', prevY).eq('month', prevM).maybeSingle();
      if (!prevPlan) { toast.error(t3('Geen plan gevonden voor de vorige maand', 'Aucun plan trouvé pour le mois précédent', 'No plan found for previous month')); setCopyingTasks(false); return; }
      const { data: prevTasks } = await supabase.from('monthly_plan_tasks').select('*').eq('plan_id', prevPlan.id);
      if (!prevTasks || prevTasks.length === 0) { toast.error(t3('Geen taken gevonden in de vorige maand', 'Aucune tâche trouvée le mois précédent', 'No tasks found in previous month')); setCopyingTasks(false); return; }

      const newDaysInMonth = getDaysInMonth(viewYear, viewMonth);
      const newTasks = prevTasks.map((t: any) => {
        const oldDate = new Date(t.task_date);
        const dayNum = oldDate.getDate();
        if (dayNum > newDaysInMonth) return null;
        const newDate = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const { id, created_at, plan_id, ...rest } = t;
        return { ...rest, plan_id: plan.id, task_date: newDate };
      }).filter(Boolean);

      if (newTasks.length === 0) { toast.error(t3('Geen taken konden worden gekopieerd', 'Aucune tâche n\'a pu être copiée', 'No tasks could be copied')); setCopyingTasks(false); return; }
      const { data: inserted, error } = await supabase.from('monthly_plan_tasks').insert(newTasks).select();
      if (error) throw error;
      setTasks(prev => [...prev, ...(inserted as unknown as PlanTask[])]);
      toast.success(`${inserted!.length} ${t3('taken gekopieerd van', 'tâches copiées de', 'tasks copied from')} ${MONTH_NAMES[language]?.[prevM - 1] || MONTH_NAMES.nl[prevM - 1]}`);
    } catch (err: any) { toast.error(err.message || t3('Kopiëren mislukt', 'Copie échouée', 'Copy failed')); }
    setCopyingTasks(false);
  };

  // Feature 2: Generate monthly payout
  const generateMonthlyPayout = async () => {
    if (!plan || !clubId) return;
    setGeneratingPayout(true);
    try {
      const confirmedSignups = daySignups.filter(ds => ds.hour_status === 'confirmed');
      if (confirmedSignups.length === 0) { toast.error(t3('Geen bevestigde uren gevonden', 'Aucune heure confirmée trouvée', 'No confirmed hours found')); setGeneratingPayout(false); return; }
      const byVolunteer: Record<string, { enrollment_id: string; total_days: number; total_hours: number; total_amount: number }> = {};
      for (const ds of confirmedSignups) {
        const enr = enrollments.find(e => e.id === ds.enrollment_id);
        if (!enr) continue;
        if (!byVolunteer[ds.volunteer_id]) byVolunteer[ds.volunteer_id] = { enrollment_id: enr.id, total_days: 0, total_hours: 0, total_amount: 0 };
        byVolunteer[ds.volunteer_id].total_days += 1;
        byVolunteer[ds.volunteer_id].total_hours += ds.final_hours || 0;
        byVolunteer[ds.volunteer_id].total_amount += ds.final_amount || 0;
      }
      const { data: existing } = await supabase.from('monthly_payouts').select('id').eq('plan_id', plan.id);
      if (existing && existing.length > 0) { toast.error(t3('Maandafrekening bestaat al voor dit plan', 'Le décompte mensuel existe déjà', 'Monthly settlement already exists for this plan')); setGeneratingPayout(false); return; }
      const payoutRows = Object.entries(byVolunteer).map(([volunteerId, data]) => ({
        club_id: clubId, plan_id: plan.id, enrollment_id: data.enrollment_id,
        volunteer_id: volunteerId, total_days: data.total_days, total_hours: data.total_hours,
        total_amount: data.total_amount, status: 'pending',
      }));
      const { error } = await supabase.from('monthly_payouts').insert(payoutRows);
      if (error) throw error;
      toast.success(t3(`Maandafrekening gegenereerd voor ${payoutRows.length} vrijwilliger(s)`, `Décompte mensuel généré pour ${payoutRows.length} bénévole(s)`, `Monthly settlement generated for ${payoutRows.length} volunteer(s)`));
    } catch (err: any) { toast.error(err.message || t3('Genereren mislukt', 'Échec de la génération', 'Generation failed')); }
    setGeneratingPayout(false);
  };

  const exportToSepa = () => navigate('/sepa-payouts');

  const openEditTask = (task: PlanTask) => {
    setEditingTask(task);
    setSelectedDate(task.task_date);
    setTaskForm({
      title: task.title, category: task.category, description: task.description || '',
      location: task.location || '', start_time: task.start_time || '09:00', end_time: task.end_time || '17:00',
      compensation_type: task.compensation_type, daily_rate: String(task.daily_rate || 25),
      hourly_rate: String(task.hourly_rate || 5), estimated_hours: String(task.estimated_hours || 8),
      spots_available: String(task.spots_available),
    });
    setShowAddTask(true);
  };

  // Calendar helpers
  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const getFirstDayOfWeek = (y: number, m: number) => { const d = new Date(y, m - 1, 1).getDay(); return d === 0 ? 6 : d - 1; };
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getTasksForDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.task_date === dateStr);
  };

  const prevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const totalAmount = tasks.reduce((sum, t) => {
    if (t.compensation_type === 'daily' && t.daily_rate) return sum + t.daily_rate * t.spots_available;
    if (t.compensation_type === 'hourly' && t.hourly_rate && t.estimated_hours) return sum + t.hourly_rate * t.estimated_hours * t.spots_available;
    return sum;
  }, 0);

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = {
      Bar: 'bg-amber-500/20 text-amber-700', Logistiek: 'bg-blue-500/20 text-blue-700',
      Catering: 'bg-orange-500/20 text-orange-700', Onderhoud: 'bg-green-500/20 text-green-700',
      Administratie: 'bg-purple-500/20 text-purple-700', Kantine: 'bg-rose-500/20 text-rose-700',
      Jeugdwerking: 'bg-cyan-500/20 text-cyan-700', Evenement: 'bg-indigo-500/20 text-indigo-700',
      Schoonmaak: 'bg-teal-500/20 text-teal-700',
    };
    return map[cat] || 'bg-muted text-muted-foreground';
  };

  const approvalBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600 text-[10px]">{t3('Goedgekeurd', 'Approuvé', 'Approved')}</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-[10px]">{t3('Afgewezen', 'Refusé', 'Rejected')}</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{t3('Wacht op goedkeuring', 'En attente d\'approbation', 'Awaiting approval')}</Badge>;
    }
  };

  // Pending day signups (for assignment section)
  const pendingDaySignups = daySignups.filter(ds => ds.status === 'pending');
  const assignedDaySignups = daySignups.filter(ds => ds.status === 'assigned');

  return (
    <ClubPageLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-primary" />
               {t3('Maandplanning', 'Planning mensuel', 'Monthly planning')}
             </h1>
             <p className="text-sm text-muted-foreground mt-1">
               {t3('Plan dagelijkse taken en vergoed vrijwilligers met één maandcontract', 'Planifiez les tâches quotidiennes et rémunérez les bénévoles avec un contrat mensuel', 'Plan daily tasks and compensate volunteers with one monthly contract')}
            </p>
          </div>
          <div className="flex gap-2">
            {plan && plan.title.includes('Demo Maandplan') ? (
              <Button variant="destructive" size="sm" disabled={demoDeleteLoading} onClick={async () => {
                setDemoDeleteLoading(true);
                try {
                  const res = await supabase.functions.invoke('monthly-planning-demo', { body: { club_id: clubId, action: 'delete' } });
                  if (res.error) throw new Error(res.error.message);
                  toast.success(t3('Demo data verwijderd!', 'Données de démo supprimées !', 'Demo data deleted!'));
                  setTimeout(() => window.location.reload(), 1000);
                } catch (err: any) { toast.error(err.message); }
                setDemoDeleteLoading(false);
              }}>
                {demoDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                {t3('Demo wissen', 'Supprimer démo', 'Delete demo')}
              </Button>
            ) : !plan ? (
              <Button variant="outline" size="sm" disabled={demoLoading} onClick={async () => {
                setDemoLoading(true);
                try {
                  const res = await supabase.functions.invoke('monthly-planning-demo', { body: { club_id: clubId, action: 'create' } });
                  if (res.error) throw new Error(res.error.message);
                  toast.success(t3('Demo maandplan aangemaakt! Pagina wordt herladen...', 'Plan de démo créé ! La page se recharge...', 'Demo plan created! Page reloading...'));
                  setTimeout(() => window.location.reload(), 2000);
                } catch (err: any) { toast.error(err.message); }
                setDemoLoading(false);
              }}>
                {demoLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {t3('Start demo', 'Lancer démo', 'Start demo')}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="text-center">
            <h2 className="text-xl font-bold">{MONTH_NAMES[language]?.[viewMonth - 1] || MONTH_NAMES.nl[viewMonth - 1]} {viewYear}</h2>
            {plan && (
              <Badge variant={plan.status === 'published' ? 'default' : 'secondary'} className="mt-1">
                {plan.status === 'published' ? t3('Gepubliceerd', 'Publié', 'Published') : t3('Concept', 'Brouillon', 'Draft')}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        {/* Stats row */}
        {plan && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">{t3('Taken gepland', 'Tâches planifiées', 'Tasks planned')}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{enrollments.length}</p>
              <p className="text-xs text-muted-foreground">{t3('Inschrijvingen', 'Inscriptions', 'Enrollments')}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{new Set(tasks.map(t => t.task_date)).size}</p>
              <p className="text-xs text-muted-foreground">{t3('Actieve dagen', 'Jours actifs', 'Active days')}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">€{totalAmount.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Budget (max)</p>
            </CardContent></Card>
          </div>
        )}

        {/* Create plan or show calendar */}
        {!plan && !loading ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t3(`Nog geen maandplan voor ${MONTH_NAMES.nl[viewMonth - 1]}`, `Pas encore de plan mensuel pour ${MONTH_NAMES.fr[viewMonth - 1]}`, `No monthly plan for ${MONTH_NAMES.en[viewMonth - 1]} yet`)}</h3>
             <p className="text-sm text-muted-foreground mb-6">
               {t3('Maak een maandplan aan om dagelijkse taken in te plannen en vrijwilligers uit te nodigen.', 'Créez un plan mensuel pour planifier les tâches quotidiennes et inviter des bénévoles.', 'Create a monthly plan to schedule daily tasks and invite volunteers.')}
             </p>
             <Button onClick={createPlan} size="lg"><Plus className="w-4 h-4 mr-2" /> {t3('Maandplan aanmaken', 'Créer un plan mensuel', 'Create monthly plan')}</Button>
          </Card>
        ) : plan ? (
          <>
            {/* Calendar grid */}
            <Card>
              <CardContent className="p-2 sm:p-4">
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {(WEEKDAY_NAMES[language] || WEEKDAY_NAMES.nl).map(d => (
                    <div key={d} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                  ))}
                  {calendarDays.map((day, i) => {
                    if (day === null) return <div key={`e-${i}`} className="bg-background p-2 min-h-[80px]" />;
                    const dayTasks = getTasksForDay(day);
                    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = day === now.getDate() && viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();
                    const isPast = new Date(dateStr) < new Date(now.toISOString().split('T')[0]);
                    return (
                      <div key={day} className={`bg-background p-1.5 min-h-[80px] sm:min-h-[100px] cursor-pointer hover:bg-muted/50 transition-colors relative ${isToday ? 'ring-2 ring-primary ring-inset' : ''} ${isPast ? 'opacity-60' : ''}`}
                        onClick={() => { if (plan.status !== 'published' || !isPast) { setSelectedDate(dateStr); resetForm(); setEditingTask(null); setShowAddTask(true); } }}>
                        <span className={`text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : 'text-foreground'}`}>{day}</span>
                        <div className="mt-1 space-y-0.5">
                          {dayTasks.slice(0, 3).map(t => (
                            <div key={t.id} className={`text-[10px] sm:text-xs px-1 py-0.5 rounded truncate ${categoryColor(t.category)}`}
                              onClick={(e) => { e.stopPropagation(); openEditTask(t); }}>{t.title}</div>
                          ))}
                          {dayTasks.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} {t3('meer', 'plus', 'more')}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 items-center">
              {plan.status === 'draft' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <Button variant="outline" onClick={copyPreviousMonth} disabled={copyingTasks}>
                    {copyingTasks ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                    {t3('Kopieer vorige maand', 'Copier le mois précédent', 'Copy previous month')}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">{t3('Contractsjabloon:', 'Modèle de contrat :', 'Contract template:')}</Label>
                    <Select value={plan.contract_template_id || ''} onValueChange={async (v) => {
                      await supabase.from('monthly_plans').update({ contract_template_id: v || null }).eq('id', plan.id);
                      setPlan(prev => prev ? { ...prev, contract_template_id: v || null } : null);
                      toast.success(t3('Sjabloon gekoppeld', 'Modèle lié', 'Template linked'));
                    }}>
                      <SelectTrigger className="w-[200px]"><SelectValue placeholder={t3('Kies sjabloon...', 'Choisir modèle...', 'Choose template...')} /></SelectTrigger>
                      <SelectContent>{contractTemplates.map(ct => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {tasks.length > 0 && <Button onClick={publishPlan}><Send className="w-4 h-4 mr-2" /> {t3('Publiceer maandplan', 'Publier le plan mensuel', 'Publish monthly plan')}</Button>}
                </div>
              )}
              {plan.status === 'published' && (
                <Badge variant="outline" className="text-sm py-2 px-4">
                  <Users className="w-4 h-4 mr-1" /> {enrollments.length} {t3('vrijwilliger(s) ingeschreven', 'bénévole(s) inscrit(s)', 'volunteer(s) enrolled')}
                </Badge>
              )}
            </div>

            {/* Tasks list */}
            {tasks.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t3('Alle taken deze maand', 'Toutes les tâches ce mois', 'All tasks this month')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.map(t => {
                      const d = new Date(t.task_date);
                      return (
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <div className="text-center min-w-[40px]">
                             <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(language === 'fr' ? 'fr-BE' : language === 'en' ? 'en-GB' : 'nl-BE', { weekday: 'short' })}</p>
                            <p className="text-lg font-bold text-foreground">{d.getDate()}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{t.title}</span>
                              <Badge variant="outline" className={`text-[10px] ${categoryColor(t.category)}`}>{t.category}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {t.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.start_time}–{t.end_time}</span>}
                              {t.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</span>}
                               <span className="flex items-center gap-1"><Euro className="w-3 h-3" />{t.compensation_type === 'daily' ? `€${t.daily_rate}/${t3('dag', 'jour', 'day')}` : `€${t.hourly_rate}/${t3('u', 'h', 'h')}`}</span>
                               <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.spots_available} {t3('plaatsen', 'places', 'spots')}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTask(t)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTask(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enrollments with approval flow */}
            {enrollments.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> {t3('Ingeschreven vrijwilligers', 'Bénévoles inscrits', 'Enrolled volunteers')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {enrollments.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {((e.profiles as any)?.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{(e.profiles as any)?.full_name || (e.profiles as any)?.email || t3('Onbekend', 'Inconnu', 'Unknown')}</p>
                          <p className="text-xs text-muted-foreground">{(e.profiles as any)?.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {approvalBadge(e.approval_status)}
                          {e.approval_status === 'approved' && (
                            <Badge variant={e.contract_status === 'signed' ? 'default' : 'secondary'}>
                              {e.contract_status === 'signed' ? t3('Contract getekend', 'Contrat signé', 'Contract signed') : e.contract_status === 'sent' ? t3('Verstuurd', 'Envoyé', 'Sent') : t3('Wacht op contract', 'En attente du contrat', 'Awaiting contract')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {e.approval_status === 'pending' && (
                            <>
                               <Button size="sm" variant="outline" className="gap-1 text-green-700" onClick={() => approveEnrollment(e.id)}>
                                 <UserCheck className="w-3.5 h-3.5" /> {t3('Goedkeuren', 'Approuver', 'Approve')}
                               </Button>
                               <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => rejectEnrollment(e.id)}>
                                 <UserX className="w-3.5 h-3.5" /> {t3('Afwijzen', 'Refuser', 'Reject')}
                              </Button>
                            </>
                          )}
                          {e.approval_status === 'approved' && plan?.contract_template_id && e.contract_status !== 'signed' && (
                            <Button size="sm" variant="outline" onClick={() => setContractVolunteer(e)}>
                              <FileSignature className="w-3.5 h-3.5 mr-1" />
                              {e.contract_status === 'sent' ? t3('Opnieuw', 'Renvoyer', 'Resend') : 'Contract'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pending day signups - club must confirm/assign */}
            {pendingDaySignups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" /> {t3('Dag-aanmeldingen te bevestigen', 'Inscriptions journalières à confirmer', 'Day signups to confirm')} ({pendingDaySignups.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pendingDaySignups.map(ds => {
                      const task = tasks.find(t => t.id === ds.plan_task_id);
                      if (!task) return null;
                      const d = new Date(task.task_date);
                      return (
                        <div key={ds.id} className="flex items-center gap-3 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/10">
                          <div className="text-center min-w-[40px]">
                             <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(language === 'fr' ? 'fr-BE' : language === 'en' ? 'en-GB' : 'nl-BE', { weekday: 'short' })}</p>
                            <p className="text-lg font-bold">{d.getDate()}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{ds.volunteer_name} — {task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.start_time}–{task.end_time} · {task.location || ''}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                             <Button size="sm" variant="outline" className="gap-1 text-green-700" onClick={() => assignDaySignup(ds.id)}>
                               <UserCheck className="w-3.5 h-3.5" /> {t3('Toekennen', 'Attribuer', 'Assign')}
                             </Button>
                             <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => rejectDaySignup(ds.id)}>
                               <UserX className="w-3.5 h-3.5" /> {t3('Afwijzen', 'Refuser', 'Reject')}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assigned day signups - ticket generation */}
            {assignedDaySignups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-primary" /> {t3('Toegekende dag-aanmeldingen', 'Inscriptions journalières attribuées', 'Assigned day signups')} ({assignedDaySignups.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {assignedDaySignups.map(ds => {
                      const task = tasks.find(t => t.id === ds.plan_task_id);
                      if (!task) return null;
                      const d = new Date(task.task_date);
                      const hasTicket = !!ds.ticket_barcode;
                      return (
                        <div key={ds.id} className="flex items-center gap-3 p-3 rounded-lg border">
                          <div className="text-center min-w-[40px]">
                             <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(language === 'fr' ? 'fr-BE' : language === 'en' ? 'en-GB' : 'nl-BE', { weekday: 'short' })}</p>
                            <p className="text-lg font-bold">{d.getDate()}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{ds.volunteer_name} — {task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className="bg-green-600 text-[10px]">{t3('Toegekend', 'Attribué', 'Assigned')}</Badge>
                              {hasTicket && <Badge variant="outline" className="text-[10px]">Ticket: {ds.ticket_barcode}</Badge>}
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {!hasTicket && (
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => generateTicketForSignup(ds)} disabled={generatingTicketIds.has(ds.id)}>
                                {generatingTicketIds.has(ds.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                                 {t3('Ticket genereren', 'Générer ticket', 'Generate ticket')}
                              </Button>
                            )}
                            {hasTicket && ds.volunteer_email && (
                              <Button size="sm" variant="outline" className="gap-1" onClick={() => sendTicketEmail(ds)} disabled={sendingTicketEmailIds.has(ds.id)}>
                                {sendingTicketEmailIds.has(ds.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                                E-mail ticket
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hour confirmations - club side */}
            {daySignups.filter(ds => ds.checked_in_at && ds.volunteer_approved && !ds.club_approved).length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Uren bevestigen</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">Deze vrijwilligers hebben hun uren gerapporteerd. Bevestig of pas aan.</p>
                  <div className="space-y-2">
                    {daySignups.filter(ds => ds.checked_in_at && ds.volunteer_approved && !ds.club_approved).map(ds => {
                      const task = tasks.find(t => t.id === ds.plan_task_id);
                      if (!task) return null;
                      const d = new Date(task.task_date);
                      return (
                        <div key={ds.id} className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-900/10">
                          <div className="text-center min-w-[40px]">
                            <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString('nl-BE', { weekday: 'short' })}</p>
                            <p className="text-lg font-bold">{d.getDate()}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{ds.volunteer_name} — {task.title}</p>
                            <p className="text-xs text-muted-foreground">Gerapporteerd: <strong>{ds.volunteer_reported_hours}u</strong></p>
                          </div>
                          <Button size="sm" variant="outline" onClick={async () => {
                            const finalHours = ds.volunteer_reported_hours!;
                            let finalAmount = 0;
                            if (task.compensation_type === 'daily') finalAmount = task.daily_rate || 0;
                            else finalAmount = finalHours * (task.hourly_rate || 0);
                            await supabase.from('monthly_day_signups').update({ club_reported_hours: finalHours, club_approved: true, final_hours: finalHours, final_amount: finalAmount, hour_status: 'confirmed' }).eq('id', ds.id);
                            toast.success(`${ds.volunteer_name}: ${finalHours}u bevestigd (€${finalAmount.toFixed(2)})`);
                            setDaySignups(prev => prev.map(s => s.id === ds.id ? { ...s, club_approved: true, final_hours: finalHours, final_amount: finalAmount, hour_status: 'confirmed' } : s));
                          }}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Akkoord ({ds.volunteer_reported_hours}u)
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirmed hours summary + payout */}
            {daySignups.filter(ds => ds.hour_status === 'confirmed').length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Euro className="w-4 h-4 text-primary" /> Maandafrekening</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={generateMonthlyPayout} disabled={generatingPayout}>
                        {generatingPayout ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Banknote className="w-3.5 h-3.5 mr-1" />}
                        Genereer afrekening
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportToSepa}>
                        <Euro className="w-3.5 h-3.5 mr-1" /> SEPA export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {daySignups.filter(ds => ds.hour_status === 'confirmed').map(ds => {
                      const task = tasks.find(t => t.id === ds.plan_task_id);
                      return (
                        <div key={ds.id} className="flex items-center justify-between p-2 rounded border text-sm">
                          <span>{ds.volunteer_name} — {task?.title || '?'}</span>
                          <span className="font-medium text-green-600">{ds.final_hours}u · €{(ds.final_amount || 0).toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between p-2 mt-2 rounded bg-muted font-semibold text-sm">
                      <span>Totaal</span>
                      <span>€{daySignups.filter(ds => ds.hour_status === 'confirmed').reduce((s, ds) => s + (ds.final_amount || 0), 0).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Taak bewerken' : 'Taak toevoegen'}</DialogTitle>
            <DialogDescription>
              {selectedDate && new Date(selectedDate).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Titel *</Label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="bv. Bar openen, Materiaal opruimen..." /></div>
            <div>
              <Label>Categorie</Label>
              <Select value={taskForm.category} onValueChange={v => setTaskForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="time" value={taskForm.start_time} onChange={e => setTaskForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div><Label>Einde</Label><Input type="time" value={taskForm.end_time} onChange={e => setTaskForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            <div><Label>Locatie</Label><Input value={taskForm.location} onChange={e => setTaskForm(f => ({ ...f, location: e.target.value }))} placeholder="bv. Clubhuis, Veld 3..." /></div>
            <div>
              <Label>Vergoeding</Label>
              <Select value={taskForm.compensation_type} onValueChange={v => setTaskForm(f => ({ ...f, compensation_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Dagvergoeding (vast bedrag)</SelectItem>
                  <SelectItem value="hourly">Uurloon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {taskForm.compensation_type === 'daily' ? (
              <div><Label>Dagvergoeding (€)</Label><Input type="number" value={taskForm.daily_rate} onChange={e => setTaskForm(f => ({ ...f, daily_rate: e.target.value }))} /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Uurloon (€)</Label><Input type="number" value={taskForm.hourly_rate} onChange={e => setTaskForm(f => ({ ...f, hourly_rate: e.target.value }))} /></div>
                <div><Label>Geschatte uren</Label><Input type="number" value={taskForm.estimated_hours} onChange={e => setTaskForm(f => ({ ...f, estimated_hours: e.target.value }))} /></div>
              </div>
            )}
            <div><Label>Aantal plaatsen</Label><Input type="number" value={taskForm.spots_available} onChange={e => setTaskForm(f => ({ ...f, spots_available: e.target.value }))} /></div>
            <div><Label>Beschrijving</Label><Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Extra info over de taak..." rows={2} /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddTask(false)}>Annuleren</Button>
              <Button className="flex-1" onClick={addOrUpdateTask} disabled={!taskForm.title}>{editingTask ? 'Opslaan' : 'Toevoegen'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract send dialog */}
      {contractVolunteer && plan?.contract_template_id && (
        <SendContractConfirmDialog
          open={!!contractVolunteer}
          onOpenChange={(open) => { if (!open) setContractVolunteer(null); }}
          volunteer={{
            id: contractVolunteer.volunteer_id,
            full_name: (contractVolunteer.profiles as any)?.full_name || null,
            email: (contractVolunteer.profiles as any)?.email || null,
          }}
          task={{
            id: plan.id,
            title: plan.title,
            task_date: `${plan.year}-${String(plan.month).padStart(2, '0')}-01`,
            location: null,
            contract_template_id: plan.contract_template_id,
          }}
          clubId={clubId || undefined}
          language="nl"
          onSent={async () => {
            await supabase.from('monthly_enrollments').update({ contract_status: 'sent' }).eq('id', contractVolunteer.id);
            setEnrollments(prev => prev.map(e => e.id === contractVolunteer.id ? { ...e, contract_status: 'sent' } : e));
            setContractVolunteer(null);
          }}
        />
      )}
    </ClubPageLayout>
  );
};

export default MonthlyPlanning;
