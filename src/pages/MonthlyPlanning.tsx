import { useState, useEffect } from 'react';
import { sendPush } from '@/lib/sendPush';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Euro,
  Users, Trash2, Edit, Send, CalendarDays,
  Copy, Loader2, Play, ArrowRight,
} from 'lucide-react';
import SendContractConfirmDialog from '@/components/SendContractConfirmDialog';
import MonthlyCalendarGrid from '@/components/monthly-planning/MonthlyCalendarGrid';
import MonthlyEnrollmentsList from '@/components/monthly-planning/MonthlyEnrollmentsList';
import MonthlyDaySignups from '@/components/monthly-planning/MonthlyDaySignups';
import MonthlyHourConfirmation from '@/components/monthly-planning/MonthlyHourConfirmation';

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
  id: string; club_id: string; year: number; month: number; title: string;
  description: string | null; status: string; contract_template_id: string | null; created_at: string;
}
interface PlanTask {
  id: string; plan_id: string; task_date: string; title: string; category: string;
  description: string | null; location: string | null; start_time: string | null;
  end_time: string | null; compensation_type: string; daily_rate: number | null;
  hourly_rate: number | null; estimated_hours: number | null; spots_available: number;
}
interface Enrollment {
  id: string; volunteer_id: string; contract_status: string; approval_status: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}
interface DaySignupClub {
  id: string; enrollment_id: string; plan_task_id: string; volunteer_id: string;
  status: string; checked_in_at: string | null; checked_out_at: string | null;
  hour_status: string; volunteer_reported_hours: number | null; club_reported_hours: number | null;
  volunteer_approved: boolean; club_approved: boolean; final_hours: number | null;
  final_amount: number | null; ticket_barcode: string | null;
  dispute_status: string; dispute_escalated_at: string | null;
  club_reported_checkout: string | null; volunteer_reported_checkout: string | null;
  volunteer_name?: string; volunteer_email?: string;
  volunteer_avatar_url?: string | null;
  contract_status?: string;
  season_checkin_count?: number;
}

const MonthlyPlanning = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const now = new Date();
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
  const [copyingToNext, setCopyingToNext] = useState(false);
  const [contractVolunteer, setContractVolunteer] = useState<Enrollment | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoDeleteLoading, setDemoDeleteLoading] = useState(false);
  const [generatingTicketIds, setGeneratingTicketIds] = useState<Set<string>>(new Set());
  const [sendingTicketEmailIds, setSendingTicketEmailIds] = useState<Set<string>>(new Set());
  const [checkingOutIds, setCheckingOutIds] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [looseTasks, setLooseTasks] = useState<any[]>([]);
  const [importingTaskIds, setImportingTaskIds] = useState<Set<string>>(new Set());
  const [taskForm, setTaskForm] = useState({
    title: '', category: 'Algemeen', description: '', location: '',
    start_time: '09:00', end_time: '17:00', compensation_type: 'daily',
    daily_rate: '25', hourly_rate: '5', estimated_hours: '8', spots_available: '3',
  });

  const { clubId: contextClubId } = useClubContext();

  // Sync clubId from context
  useEffect(() => {
    if (contextClubId) setClubId(contextClubId);
  }, [contextClubId]);

  // Load plan + tasks + enrollments
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

        if (enrs.length > 0) {
          const { data: signupsData } = await supabase
            .from('monthly_day_signups').select('*').in('enrollment_id', enrs.map(e => e.id));

          // Fetch season check-in counts for all volunteers in this plan
          const volIds = [...new Set(enrs.map(e => e.volunteer_id))];
          const { data: checkinCounts } = await supabase
            .from('season_checkins')
            .select('volunteer_id')
            .in('volunteer_id', volIds);
          const checkinMap = new Map<string, number>();
          (checkinCounts || []).forEach((c: any) => {
            checkinMap.set(c.volunteer_id, (checkinMap.get(c.volunteer_id) || 0) + 1);
          });

          const enriched = (signupsData || []).map((s: any) => {
            const enr = enrs.find(e => e.id === s.enrollment_id);
            return {
              ...s,
              volunteer_name: (enr?.profiles as any)?.full_name || t3('Onbekend', 'Inconnu', 'Unknown'),
              volunteer_email: (enr?.profiles as any)?.email || null,
              volunteer_avatar_url: (enr?.profiles as any)?.avatar_url || null,
              contract_status: enr?.contract_status || 'none',
              season_checkin_count: checkinMap.get(s.volunteer_id) || 0,
            };
          });
          setDaySignups(enriched as DaySignupClub[]);
        } else { setDaySignups([]); }
      } else { setPlan(null); setTasks([]); setEnrollments([]); setDaySignups([]); }
      setLoading(false);
    };
    load();
  }, [clubId, viewYear, viewMonth]);

  const approveEnrollment = async (enrollmentId: string) => {
    const { error } = await supabase.from('monthly_enrollments').update({ approval_status: 'approved' }).eq('id', enrollmentId);
    if (error) { toast.error(error.message); return; }
    const enr = enrollments.find(e => e.id === enrollmentId);
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, approval_status: 'approved' } : e));
    toast.success(t3('Inschrijving goedgekeurd!', 'Inscription approuvée !', 'Enrollment approved!'));
    if (enr) sendPush({ userId: enr.volunteer_id, title: '✅ Inschrijving goedgekeurd', message: `Je inschrijving is goedgekeurd! Je kunt nu je contract ondertekenen.`, url: '/dashboard', type: 'enrollment_approved', clubId: clubId || undefined });
  };
  const rejectEnrollment = async (enrollmentId: string) => {
    const { error } = await supabase.from('monthly_enrollments').update({ approval_status: 'rejected' }).eq('id', enrollmentId);
    if (error) { toast.error(error.message); return; }
    const enr = enrollments.find(e => e.id === enrollmentId);
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, approval_status: 'rejected' } : e));
    toast.success(t3('Inschrijving afgewezen.', 'Inscription refusée.', 'Enrollment rejected.'));
    if (enr) sendPush({ userId: enr.volunteer_id, title: '❌ Inschrijving afgewezen', message: `Je inschrijving is helaas afgewezen.`, url: '/dashboard', type: 'enrollment_rejected', clubId: clubId || undefined });
  };
  const assignDaySignup = async (signupId: string) => {
    const { error } = await supabase.from('monthly_day_signups').update({ status: 'assigned' }).eq('id', signupId);
    if (error) { toast.error(error.message); return; }
    const ds = daySignups.find(s => s.id === signupId);
    setDaySignups(prev => prev.map(s => s.id === signupId ? { ...s, status: 'assigned' } : s));
    toast.success(t3('Vrijwilliger toegekend aan deze dag!', 'Bénévole attribué à ce jour !', 'Volunteer assigned to this day!'));
    if (ds) sendPush({ userId: ds.volunteer_id, title: '✅ Dag toegekend', message: `Je dag-aanmelding is bevestigd!`, url: '/dashboard', type: 'day_assigned', clubId: clubId || undefined });
  };
  const rejectDaySignup = async (signupId: string) => {
    const { error } = await supabase.from('monthly_day_signups').update({ status: 'rejected' }).eq('id', signupId);
    if (error) { toast.error(error.message); return; }
    const ds = daySignups.find(s => s.id === signupId);
    setDaySignups(prev => prev.map(s => s.id === signupId ? { ...s, status: 'rejected' } : s));
    toast.success(t3('Dag-aanmelding afgewezen.', 'Inscription journalière refusée.', 'Day signup rejected.'));
    if (ds) sendPush({ userId: ds.volunteer_id, title: '❌ Dag-aanmelding afgewezen', message: `Je dag-aanmelding is helaas afgewezen.`, url: '/dashboard', type: 'day_rejected', clubId: clubId || undefined });
  };

  const generateTicketForSignup = async (signup: DaySignupClub) => {
    if (!clubId || !plan) return;
    setGeneratingTicketIds(prev => new Set(prev).add(signup.id));
    try {
      const { data, error } = await supabase.functions.invoke('ticketing-generate', {
        body: { action: 'create_internal_ticket', club_id: clubId, event_id: plan.id, volunteer_id: signup.volunteer_id, task_id: signup.plan_task_id },
      });
      if (error) throw error;
      if (data?.success) {
        setDaySignups(prev => prev.map(s => s.id === signup.id ? { ...s, ticket_barcode: data.barcode || signup.ticket_barcode } : s));
        toast.success(t3('Ticket gegenereerd!', 'Ticket généré !', 'Ticket generated!'));
        sendPush({ userId: signup.volunteer_id, title: '🎫 Ticket ontvangen', message: `Je ticket is klaar! Bekijk het in je dashboard.`, url: '/dashboard', type: 'ticket_generated' });
      } else { toast.error(data?.error || t3('Ticket genereren mislukt', 'Échec de la génération du ticket', 'Ticket generation failed')); }
    } catch (e: any) { toast.error(e.message); }
    setGeneratingTicketIds(prev => { const n = new Set(prev); n.delete(signup.id); return n; });
  };
  const sendTicketEmail = async (signup: DaySignupClub) => {
    if (!clubId || !plan || !signup.volunteer_email) return;
    setSendingTicketEmailIds(prev => new Set(prev).add(signup.id));
    try {
      const { data, error } = await supabase.functions.invoke('ticketing-generate', {
        body: { action: 'send_ticket_email_invite', club_id: clubId, event_id: plan.id, volunteer_id: signup.volunteer_id, task_id: signup.plan_task_id, email: signup.volunteer_email, volunteer_name: signup.volunteer_name },
      });
      if (error) throw error;
      if (data?.success) { toast.success(t3('Ticket per e-mail verstuurd!', 'Ticket envoyé par e-mail !', 'Ticket sent by email!')); }
      else { toast.error(data?.error || t3('Versturen mislukt', 'Échec de l\'envoi', 'Sending failed')); }
    } catch (e: any) { toast.error(e.message); }
    setSendingTicketEmailIds(prev => { const n = new Set(prev); n.delete(signup.id); return n; });
  };

  const checkoutSignup = async (signup: DaySignupClub) => {
    if (!clubId || !plan) return;
    setCheckingOutIds(prev => new Set(prev).add(signup.id));
    try {
      const { data, error } = await supabase.functions.invoke('ticketing-scan', {
        body: { barcode: signup.ticket_barcode, club_id: clubId, action: 'checkout' },
      });
      if (error) throw error;
      if (data?.success) {
        setDaySignups(prev => prev.map(s => s.id === signup.id ? {
          ...s, checked_out_at: data.checked_out_at, hour_status: 'checkout_pending',
          club_reported_hours: data.hours_worked, club_approved: true,
          club_reported_checkout: data.checked_out_at,
        } : s));
        toast.success(`${signup.volunteer_name}: ${t3('uitgecheckt', 'sorti', 'checked out')} (${data.hours_worked?.toFixed(1)}${t3('u', 'h', 'h')})`);
      } else { toast.error(data?.error || 'Checkout failed'); }
    } catch (e: any) { toast.error(e.message); }
    setCheckingOutIds(prev => { const n = new Set(prev); n.delete(signup.id); return n; });
  };

  const escalateDispute = async (signup: DaySignupClub) => {
    const now = new Date().toISOString();
    await supabase.from('monthly_day_signups').update({ dispute_status: 'escalated', dispute_escalated_at: now }).eq('id', signup.id);
    setDaySignups(prev => prev.map(s => s.id === signup.id ? { ...s, dispute_status: 'escalated', dispute_escalated_at: now } : s));
    toast.success(t3('Geschil geëscaleerd. Auto-resolutie in 48u.', 'Litige escaladé. Résolution auto dans 48h.', 'Dispute escalated. Auto-resolve in 48h.'));
    sendPush({ userId: signup.volunteer_id, title: '⚠️ Geschil geëscaleerd', message: 'Het geschil over je uren is geëscaleerd. Na 48u wordt het gemiddelde toegepast.', url: '/dashboard', type: 'dispute_escalated' });
  };

  const resolveDispute = async (signup: DaySignupClub, task: PlanTask) => {
    const clubH = signup.club_reported_hours || 0;
    const volH = signup.volunteer_reported_hours || 0;
    // Calculate max hours from task times
    let maxHours = 24;
    if (task.start_time && task.end_time) {
      const [sh, sm] = task.start_time.split(':').map(Number);
      const [eh, em] = task.end_time.split(':').map(Number);
      maxHours = (eh * 60 + em - sh * 60 - sm) / 60;
    }
    const avgHours = Math.min((clubH + volH) / 2, maxHours);
    const finalAmount = avgHours * (task.hourly_rate || 0);
    
    await supabase.from('monthly_day_signups').update({
      final_hours: avgHours, final_amount: finalAmount,
      hour_status: 'confirmed', dispute_status: 'resolved',
      club_approved: true, volunteer_approved: true,
    } as any).eq('id', signup.id);
    
    setDaySignups(prev => prev.map(s => s.id === signup.id ? {
      ...s, final_hours: avgHours, final_amount: finalAmount,
      hour_status: 'confirmed', dispute_status: 'resolved',
      club_approved: true, volunteer_approved: true,
    } : s));
    toast.success(`${signup.volunteer_name}: ${avgHours.toFixed(1)}${t3('u', 'h', 'h')} (gemiddelde) — €${finalAmount.toFixed(2)}`);
    sendPush({ userId: signup.volunteer_id, title: '✅ Geschil opgelost', message: `Het gemiddelde (${avgHours.toFixed(1)}u — €${finalAmount.toFixed(2)}) is toegepast.`, url: '/dashboard', type: 'dispute_resolved' });
  };

  const loadLooseTasks = async () => {
    if (!clubId) return;
    const { data } = await supabase.from('tasks').select('id, title, task_date, location, compensation_type, hourly_rate, spots_available')
      .eq('club_id', clubId).order('task_date', { ascending: false }).limit(50);
    setLooseTasks(data || []);
    setShowImportDialog(true);
  };

  const importTaskToPlan = async (looseTask: any) => {
    if (!plan) return;
    setImportingTaskIds(prev => new Set(prev).add(looseTask.id));
    const taskDate = looseTask.task_date || `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
    const { data, error } = await supabase.from('monthly_plan_tasks').insert({
      plan_id: plan.id, task_date: taskDate, title: looseTask.title,
      category: 'Andere', location: looseTask.location || null,
      start_time: '09:00', end_time: '17:00',
      compensation_type: looseTask.compensation_type || 'daily',
      daily_rate: 25, hourly_rate: looseTask.hourly_rate || null,
      spots_available: looseTask.spots_available || 3,
    }).select().single();
    if (error) { toast.error(error.message); }
    else {
      setTasks(prev => [...prev, data as unknown as PlanTask]);
      toast.success(`"${looseTask.title}" ${t3('geïmporteerd', 'importé', 'imported')}`);
    }
    setImportingTaskIds(prev => { const n = new Set(prev); n.delete(looseTask.id); return n; });
  };

  const createPlan = async () => {
    if (!clubId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('monthly_plans').insert({
      club_id: clubId, year: viewYear, month: viewMonth,
      title: `${MONTH_NAMES[language]?.[viewMonth - 1] || MONTH_NAMES.nl[viewMonth - 1]} ${viewYear}`,
      created_by: user.id, status: 'draft',
    }).select().single();
    if (error) { toast.error(t3('Kon plan niet aanmaken', 'Impossible de créer le plan', 'Could not create plan')); return; }
    setPlan(data as unknown as MonthlyPlan);
    toast.success(t3('Maandplan aangemaakt!', 'Plan mensuel créé !', 'Monthly plan created!'));
  };

  const addOrUpdateTask = async () => {
    if (!plan) return;
    if (!taskForm.title.trim()) { toast.error(t3('Titel mag niet leeg zijn.', 'Le titre ne peut pas être vide.', 'Title cannot be empty.')); return; }
    const payload = {
      plan_id: plan.id, task_date: selectedDate!, title: taskForm.title, category: taskForm.category,
      description: taskForm.description || null, location: taskForm.location || null,
      start_time: taskForm.start_time || null, end_time: taskForm.end_time || null,
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
    setShowAddTask(false); setEditingTask(null); resetForm();
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
    toast.success(t3('Maandplan gepubliceerd!', 'Plan mensuel publié !', 'Monthly plan published!'));
  };

  const resetForm = () => {
    setTaskForm({ title: '', category: 'Algemeen', description: '', location: '', start_time: '09:00', end_time: '17:00', compensation_type: 'daily', daily_rate: '25', hourly_rate: '5', estimated_hours: '8', spots_available: '3' });
  };

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

  const copyPreviousMonth = async () => {
    if (!plan || !clubId) return;
    setCopyingTasks(true);
    try {
      const prevM = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevY = viewMonth === 1 ? viewYear - 1 : viewYear;
      const { data: prevPlan } = await supabase.from('monthly_plans').select('id').eq('club_id', clubId).eq('year', prevY).eq('month', prevM).maybeSingle();
      if (!prevPlan) { toast.error(t3('Geen plan gevonden voor de vorige maand', 'Aucun plan trouvé pour le mois précédent', 'No plan found for previous month')); setCopyingTasks(false); return; }
      const { data: prevTasks } = await supabase.from('monthly_plan_tasks').select('*').eq('plan_id', prevPlan.id);
      if (!prevTasks?.length) { toast.error(t3('Geen taken gevonden', 'Aucune tâche trouvée', 'No tasks found')); setCopyingTasks(false); return; }
      const newDaysInMonth = getDaysInMonth(viewYear, viewMonth);
      const newTasks = prevTasks.map((t: any) => {
        const dayNum = new Date(t.task_date).getDate();
        if (dayNum > newDaysInMonth) return null;
        const newDate = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const { id, created_at, plan_id, ...rest } = t;
        return { ...rest, plan_id: plan.id, task_date: newDate };
      }).filter(Boolean);
      if (!newTasks.length) { toast.error(t3('Geen taken konden worden gekopieerd', 'Aucune tâche copiée', 'No tasks could be copied')); setCopyingTasks(false); return; }
      const { data: inserted, error } = await supabase.from('monthly_plan_tasks').insert(newTasks).select();
      if (error) throw error;
      setTasks(prev => [...prev, ...(inserted as unknown as PlanTask[])]);
      toast.success(`${inserted!.length} ${t3('taken gekopieerd', 'tâches copiées', 'tasks copied')}`);
    } catch (err: any) { toast.error(err.message); }
    setCopyingTasks(false);
  };

  const generateMonthlyPayout = async () => {
    if (!plan || !clubId) return;
    setGeneratingPayout(true);
    try {
      const confirmedSignups = daySignups.filter(ds => ds.hour_status === 'confirmed');
      if (!confirmedSignups.length) { toast.error(t3('Geen bevestigde uren', 'Aucune heure confirmée', 'No confirmed hours')); setGeneratingPayout(false); return; }
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
      if (existing?.length) { toast.error(t3('Afrekening bestaat al', 'Décompte existe déjà', 'Settlement already exists')); setGeneratingPayout(false); return; }
      const payoutRows = Object.entries(byVolunteer).map(([volunteerId, data]) => ({
        club_id: clubId, plan_id: plan.id, enrollment_id: data.enrollment_id,
        volunteer_id: volunteerId, total_days: data.total_days, total_hours: data.total_hours,
        total_amount: data.total_amount, status: 'pending',
      }));
      const { error } = await supabase.from('monthly_payouts').insert(payoutRows);
      if (error) throw error;
      toast.success(t3(`Afrekening voor ${payoutRows.length} vrijwilliger(s)`, `Décompte pour ${payoutRows.length} bénévole(s)`, `Settlement for ${payoutRows.length} volunteer(s)`));
    } catch (err: any) { toast.error(err.message); }
    setGeneratingPayout(false);
  };

  const openEditTask = (task: PlanTask) => {
    setEditingTask(task); setSelectedDate(task.task_date);
    setTaskForm({
      title: task.title, category: task.category, description: task.description || '',
      location: task.location || '', start_time: task.start_time || '09:00', end_time: task.end_time || '17:00',
      compensation_type: task.compensation_type, daily_rate: String(task.daily_rate || 25),
      hourly_rate: String(task.hourly_rate || 5), estimated_hours: String(task.estimated_hours || 8),
      spots_available: String(task.spots_available),
    });
    setShowAddTask(true);
  };

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

  const prevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const totalAmount = tasks.reduce((sum, t) => {
    if (t.compensation_type === 'daily' && t.daily_rate) return sum + t.daily_rate * t.spots_available;
    if (t.compensation_type === 'hourly' && t.hourly_rate && t.estimated_hours) return sum + t.hourly_rate * t.estimated_hours * t.spots_available;
    return sum;
  }, 0);

  const pendingDaySignups = daySignups.filter(ds => ds.status === 'pending');
  const assignedDaySignups = daySignups.filter(ds => ds.status === 'assigned');
  const rejectedDaySignups = daySignups.filter(ds => ds.status === 'rejected');

  const copyToNextMonth = async () => {
    if (!plan || !clubId || tasks.length === 0) return;
    setCopyingToNext(true);
    try {
      const nextM = viewMonth === 12 ? 1 : viewMonth + 1;
      const nextY = viewMonth === 12 ? viewYear + 1 : viewYear;
      // Check if next month plan exists, create if not
      let { data: nextPlan } = await supabase.from('monthly_plans').select('id').eq('club_id', clubId).eq('year', nextY).eq('month', nextM).maybeSingle();
      if (!nextPlan) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setCopyingToNext(false); return; }
        const { data: created, error: createErr } = await supabase.from('monthly_plans').insert({
          club_id: clubId, year: nextY, month: nextM,
          title: `${MONTH_NAMES[language]?.[nextM - 1] || MONTH_NAMES.nl[nextM - 1]} ${nextY}`,
          created_by: user.id, status: 'draft',
        }).select().single();
        if (createErr) throw createErr;
        nextPlan = created;
      }
      const newDaysInMonth = getDaysInMonth(nextY, nextM);
      const newTasks = tasks.map(t => {
        const dayNum = new Date(t.task_date).getDate();
        if (dayNum > newDaysInMonth) return null;
        const newDate = `${nextY}-${String(nextM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const { id, created_at, plan_id, ...rest } = t as any;
        return { ...rest, plan_id: nextPlan!.id, task_date: newDate };
      }).filter(Boolean);
      if (!newTasks.length) { toast.error(t3('Geen taken konden worden gekopieerd', 'Aucune tâche copiée', 'No tasks could be copied')); setCopyingToNext(false); return; }
      const { data: inserted, error } = await supabase.from('monthly_plan_tasks').insert(newTasks).select();
      if (error) throw error;
      toast.success(`${inserted!.length} ${t3('taken gekopieerd naar', 'tâches copiées vers', 'tasks copied to')} ${MONTH_NAMES[language]?.[nextM - 1] || MONTH_NAMES.nl[nextM - 1]} ${nextY}`);
    } catch (err: any) { toast.error(err.message); }
    setCopyingToNext(false);
  };

  const handleConfirmHours = async (ds: any, task: any) => {
    const finalHours = ds.volunteer_reported_hours!;
    let finalAmount = 0;
    if (task.compensation_type === 'daily') finalAmount = task.daily_rate || 0;
    else finalAmount = finalHours * (task.hourly_rate || 0);
    await supabase.from('monthly_day_signups').update({ club_reported_hours: finalHours, club_approved: true, final_hours: finalHours, final_amount: finalAmount, hour_status: 'confirmed' }).eq('id', ds.id);
    toast.success(`${ds.volunteer_name}: ${finalHours}${t3('u', 'h', 'h')} ${t3('bevestigd', 'confirmé', 'confirmed')} (€${finalAmount.toFixed(2)})`);
    setDaySignups(prev => prev.map(s => s.id === ds.id ? { ...s, club_approved: true, final_hours: finalHours, final_amount: finalAmount, hour_status: 'confirmed' } : s));
    sendPush({ userId: ds.volunteer_id, title: '✅ Uren bevestigd', message: `Je uren (${finalHours}u — €${finalAmount.toFixed(2)}) zijn bevestigd door de club.`, url: '/dashboard', type: 'hours_confirmed' });
  };

  return (
    <ClubPageLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <PageNavTabs tabs={[
          { label: t3('Evenementen & Taken', 'Événements & Tâches', 'Events & Tasks'), path: '/events-manager' },
          { label: 'Planning', path: '/planning' },
          { label: t3('Maandplanning', 'Planification mensuelle', 'Monthly Planning'), path: '/monthly-planning' },
        ]} />
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
                  toast.success(t3('Demo maandplan aangemaakt!', 'Plan de démo créé !', 'Demo plan created!'));
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
            {plan && <Badge variant={plan.status === 'published' ? 'default' : 'secondary'} className="mt-1">{plan.status === 'published' ? t3('Gepubliceerd', 'Publié', 'Published') : t3('Concept', 'Brouillon', 'Draft')}</Badge>}
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        {/* Stats */}
        {plan && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">{tasks.length}</p><p className="text-xs text-muted-foreground">{t3('Taken gepland', 'Tâches planifiées', 'Tasks planned')}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">{enrollments.length}</p><p className="text-xs text-muted-foreground">{t3('Inschrijvingen', 'Inscriptions', 'Enrollments')}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">{new Set(tasks.map(t => t.task_date)).size}</p><p className="text-xs text-muted-foreground">{t3('Actieve dagen', 'Jours actifs', 'Active days')}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">€{totalAmount.toFixed(0)}</p><p className="text-xs text-muted-foreground">Budget (max)</p></CardContent></Card>
          </div>
        )}

        {/* Day signup KPI bar */}
        {plan && daySignups.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">{daySignups.length}</p><p className="text-xs text-muted-foreground">{t3('Totaal ingeschreven', 'Total inscrit', 'Total signed up')}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-green-600">{assignedDaySignups.length}</p><p className="text-xs text-muted-foreground">{t3('Goedgekeurd', 'Approuvé', 'Approved')}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-yellow-600">{pendingDaySignups.length}</p><p className="text-xs text-muted-foreground">{t3('In afwachting', 'En attente', 'Pending')}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-destructive">{rejectedDaySignups.length}</p><p className="text-xs text-muted-foreground">{t3('Afgewezen', 'Refusé', 'Rejected')}</p></CardContent></Card>
          </div>
        )}

        {/* Create plan or show content */}
        {!plan && !loading ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t3(`Nog geen maandplan voor ${MONTH_NAMES.nl[viewMonth - 1]}`, `Pas encore de plan pour ${MONTH_NAMES.fr[viewMonth - 1]}`, `No plan for ${MONTH_NAMES.en[viewMonth - 1]} yet`)}</h3>
            <p className="text-sm text-muted-foreground mb-6">{t3('Maak een maandplan aan om taken in te plannen.', 'Créez un plan mensuel.', 'Create a monthly plan to schedule tasks.')}</p>
            <Button onClick={createPlan} size="lg"><Plus className="w-4 h-4 mr-2" /> {t3('Maandplan aanmaken', 'Créer un plan mensuel', 'Create monthly plan')}</Button>
          </Card>
        ) : plan ? (
          <>
            <MonthlyCalendarGrid
              viewYear={viewYear} viewMonth={viewMonth} tasks={tasks}
              planStatus={plan.status} language={language}
              weekdayNames={WEEKDAY_NAMES[language] || WEEKDAY_NAMES.nl}
              categoryColor={categoryColor}
              onDayClick={(dateStr) => { setSelectedDate(dateStr); resetForm(); setEditingTask(null); setShowAddTask(true); }}
              onTaskClick={openEditTask} t3={t3}
            />

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 items-center">
              {plan.status === 'draft' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <Button variant="outline" onClick={copyPreviousMonth} disabled={copyingTasks}>
                    {copyingTasks ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                    {t3('Kopieer vorige maand', 'Copier le mois précédent', 'Copy previous month')}
                  </Button>
                  <Button variant="outline" onClick={loadLooseTasks}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t3('Importeer taak', 'Importer tâche', 'Import task')}
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
                  {tasks.length > 0 && <Button onClick={publishPlan}><Send className="w-4 h-4 mr-2" /> {t3('Publiceer maandplan', 'Publier', 'Publish')}</Button>}
                </div>
              )}
              {plan.status === 'published' && (
                <Badge variant="outline" className="text-sm py-2 px-4">
                  <Users className="w-4 h-4 mr-1" /> {enrollments.length} {t3('vrijwilliger(s)', 'bénévole(s)', 'volunteer(s)')}
                </Badge>
              )}
              {plan.status === 'published' && tasks.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={copyingToNext}>
                      {copyingToNext ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                      {t3('Kopieer naar volgende maand', 'Copier vers le mois suivant', 'Copy to next month')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t3('Taken kopiëren?', 'Copier les tâches ?', 'Copy tasks?')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t3(
                          `${tasks.length} taken worden gekopieerd naar ${MONTH_NAMES.nl[viewMonth === 12 ? 0 : viewMonth]} ${viewMonth === 12 ? viewYear + 1 : viewYear}. Bestaande taken in die maand blijven behouden. Inschrijvingen worden niet gekopieerd.`,
                          `${tasks.length} tâches seront copiées vers ${MONTH_NAMES.fr[viewMonth === 12 ? 0 : viewMonth]} ${viewMonth === 12 ? viewYear + 1 : viewYear}. Les tâches existantes seront conservées. Les inscriptions ne seront pas copiées.`,
                          `${tasks.length} tasks will be copied to ${MONTH_NAMES.en[viewMonth === 12 ? 0 : viewMonth]} ${viewMonth === 12 ? viewYear + 1 : viewYear}. Existing tasks in that month will be kept. Enrollments will not be copied.`
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t3('Annuleren', 'Annuler', 'Cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={copyToNextMonth}>{t3('Kopiëren', 'Copier', 'Copy')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Tasks list */}
            {tasks.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">{t3('Alle taken deze maand', 'Toutes les tâches', 'All tasks this month')}</CardTitle></CardHeader>
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

            <MonthlyEnrollmentsList
              enrollments={enrollments} plan={plan} language={language} t3={t3}
              onApprove={approveEnrollment} onReject={rejectEnrollment}
              onSendContract={(e) => setContractVolunteer(e)}
            />

            <MonthlyDaySignups
              pendingSignups={pendingDaySignups} assignedSignups={assignedDaySignups}
              tasks={tasks} language={language} generatingTicketIds={generatingTicketIds}
              sendingTicketEmailIds={sendingTicketEmailIds} checkingOutIds={checkingOutIds} t3={t3}
              onAssign={assignDaySignup} onReject={rejectDaySignup}
              onGenerateTicket={generateTicketForSignup} onSendTicketEmail={sendTicketEmail}
              onCheckout={checkoutSignup}
            />

            <MonthlyHourConfirmation
              daySignups={daySignups} tasks={tasks} language={language}
              generatingPayout={generatingPayout} t3={t3}
              onConfirmHours={handleConfirmHours}
              onGeneratePayout={generateMonthlyPayout}
              onExportSepa={() => navigate('/sepa-payouts')}
              onEscalateDispute={escalateDispute}
              onResolveDispute={resolveDispute}
            />
          </>
        ) : null}
      </div>

      {/* Add/Edit Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? t3('Taak bewerken', 'Modifier la tâche', 'Edit task') : t3('Taak toevoegen', 'Ajouter une tâche', 'Add task')}</DialogTitle>
            <DialogDescription>
              {selectedDate && new Date(selectedDate).toLocaleDateString(language === 'fr' ? 'fr-BE' : language === 'en' ? 'en-GB' : 'nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>{t3('Titel', 'Titre', 'Title')} *</Label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div>
              <Label>{t3('Categorie', 'Catégorie', 'Category')}</Label>
              <Select value={taskForm.category} onValueChange={v => setTaskForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t3('Start', 'Début', 'Start')}</Label><Input type="time" value={taskForm.start_time} onChange={e => setTaskForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div><Label>{t3('Einde', 'Fin', 'End')}</Label><Input type="time" value={taskForm.end_time} onChange={e => setTaskForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            <div><Label>{t3('Locatie', 'Lieu', 'Location')}</Label><Input value={taskForm.location} onChange={e => setTaskForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div>
              <Label>{t3('Vergoeding', 'Rémunération', 'Compensation')}</Label>
              <Select value={taskForm.compensation_type} onValueChange={v => setTaskForm(f => ({ ...f, compensation_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t3('Dagvergoeding', 'Indemnité journalière', 'Daily rate')}</SelectItem>
                  <SelectItem value="hourly">{t3('Uurloon', 'Tarif horaire', 'Hourly rate')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {taskForm.compensation_type === 'daily' ? (
              <div><Label>{t3('Dagvergoeding (€)', 'Indemnité (€)', 'Daily rate (€)')}</Label><Input type="number" value={taskForm.daily_rate} onChange={e => setTaskForm(f => ({ ...f, daily_rate: e.target.value }))} /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t3('Uurloon (€)', 'Tarif (€)', 'Hourly rate (€)')}</Label><Input type="number" value={taskForm.hourly_rate} onChange={e => setTaskForm(f => ({ ...f, hourly_rate: e.target.value }))} /></div>
                <div><Label>{t3('Geschatte uren', 'Heures estimées', 'Est. hours')}</Label><Input type="number" value={taskForm.estimated_hours} onChange={e => setTaskForm(f => ({ ...f, estimated_hours: e.target.value }))} /></div>
              </div>
            )}
            <div><Label>{t3('Aantal plaatsen', 'Nombre de places', 'Spots')}</Label><Input type="number" value={taskForm.spots_available} onChange={e => setTaskForm(f => ({ ...f, spots_available: e.target.value }))} /></div>
            <div><Label>{t3('Beschrijving', 'Description', 'Description')}</Label><Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddTask(false)}>{t3('Annuleren', 'Annuler', 'Cancel')}</Button>
              <Button className="flex-1" onClick={addOrUpdateTask} disabled={!taskForm.title.trim()}>{editingTask ? t3('Opslaan', 'Enregistrer', 'Save') : t3('Toevoegen', 'Ajouter', 'Add')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Task Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t3('Bestaande taak importeren', 'Importer une tâche existante', 'Import existing task')}</DialogTitle>
            <DialogDescription>{t3('Selecteer een losse taak om toe te voegen aan dit maandplan.', 'Sélectionnez une tâche à ajouter au plan mensuel.', 'Select a task to add to this monthly plan.')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {looseTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t3('Geen losse taken gevonden.', 'Aucune tâche trouvée.', 'No tasks found.')}</p>
            ) : looseTasks.map(lt => (
              <div key={lt.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{lt.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {lt.task_date ? new Date(lt.task_date).toLocaleDateString(language === 'fr' ? 'fr-BE' : 'nl-BE', { day: 'numeric', month: 'short' }) : '—'}
                    {lt.location && ` · ${lt.location}`}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => importTaskToPlan(lt)} disabled={importingTaskIds.has(lt.id)}>
                  {importingTaskIds.has(lt.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {contractVolunteer && plan?.contract_template_id && (
        <SendContractConfirmDialog
          open={!!contractVolunteer}
          onOpenChange={(open) => { if (!open) setContractVolunteer(null); }}
          volunteer={{ id: contractVolunteer.volunteer_id, full_name: (contractVolunteer.profiles as any)?.full_name || null, email: (contractVolunteer.profiles as any)?.email || null }}
          task={{ id: plan.id, title: plan.title, task_date: `${plan.year}-${String(plan.month).padStart(2, '0')}-01`, location: null, contract_template_id: plan.contract_template_id }}
          clubId={clubId || undefined}
          language={language}
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
