import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { sendPush } from '@/lib/sendPush';

export interface MonthlyPlan {
  id: string; club_id: string; year: number; month: number; title: string;
  description: string | null; status: string; contract_template_id: string | null; created_at: string;
}
export interface PlanTask {
  id: string; plan_id: string; task_date: string; title: string; category: string;
  description: string | null; location: string | null; start_time: string | null;
  end_time: string | null; compensation_type: string; daily_rate: number | null;
  hourly_rate: number | null; estimated_hours: number | null; spots_available: number;
}
export interface Enrollment {
  id: string; volunteer_id: string; contract_status: string; approval_status: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}
export interface DaySignupClub {
  id: string; enrollment_id: string; plan_task_id: string; volunteer_id: string;
  status: string; checked_in_at: string | null; checked_out_at: string | null;
  hour_status: string; volunteer_reported_hours: number | null; club_reported_hours: number | null;
  volunteer_approved: boolean; club_approved: boolean; final_hours: number | null;
  final_amount: number | null; ticket_barcode: string | null;
  dispute_status: string; dispute_escalated_at: string | null;
  club_reported_checkout: string | null; volunteer_reported_checkout: string | null;
  volunteer_name?: string; volunteer_email?: string;
}

export function useMonthlyPlanData(viewYear: number, viewMonth: number, t3: (nl: string, fr: string, en: string) => string) {
  const { clubId: contextClubId } = useClubContext();
  const [clubId, setClubId] = useState<string | null>(null);
  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [daySignups, setDaySignups] = useState<DaySignupClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractTemplates, setContractTemplates] = useState<{ id: string; name: string }[]>([]);
  const [generatingTicketIds, setGeneratingTicketIds] = useState<Set<string>>(new Set());
  const [sendingTicketEmailIds, setSendingTicketEmailIds] = useState<Set<string>>(new Set());
  const [checkingOutIds, setCheckingOutIds] = useState<Set<string>>(new Set());

  useEffect(() => { if (contextClubId) setClubId(contextClubId); }, [contextClubId]);

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
          const { data: signupsData } = await supabase.from('monthly_day_signups').select('*').in('enrollment_id', enrs.map(e => e.id));
          const enriched = (signupsData || []).map((s: any) => {
            const enr = enrs.find(e => e.id === s.enrollment_id);
            return { ...s, volunteer_name: (enr?.profiles as any)?.full_name || t3('Onbekend', 'Inconnu', 'Unknown'), volunteer_email: (enr?.profiles as any)?.email || null };
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
    if (enr) sendPush({ userId: enr.volunteer_id, title: '✅ Inschrijving goedgekeurd', message: 'Je inschrijving is goedgekeurd!', url: '/dashboard', type: 'enrollment_approved' });
  };

  const rejectEnrollment = async (enrollmentId: string) => {
    const { error } = await supabase.from('monthly_enrollments').update({ approval_status: 'rejected' }).eq('id', enrollmentId);
    if (error) { toast.error(error.message); return; }
    const enr = enrollments.find(e => e.id === enrollmentId);
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, approval_status: 'rejected' } : e));
    toast.success(t3('Inschrijving afgewezen.', 'Inscription refusée.', 'Enrollment rejected.'));
    if (enr) sendPush({ userId: enr.volunteer_id, title: '❌ Inschrijving afgewezen', message: 'Je maandelijkse inschrijving is helaas afgewezen.', url: '/dashboard', type: 'enrollment_rejected' });
  };

  const assignDaySignup = async (signupId: string) => {
    const { error } = await supabase.from('monthly_day_signups').update({ status: 'assigned' }).eq('id', signupId);
    if (error) { toast.error(error.message); return; }
    const ds = daySignups.find(s => s.id === signupId);
    setDaySignups(prev => prev.map(s => s.id === signupId ? { ...s, status: 'assigned' } : s));
    toast.success(t3('Vrijwilliger toegekend aan deze dag!', 'Bénévole attribué à ce jour !', 'Volunteer assigned to this day!'));
    if (ds) sendPush({ userId: ds.volunteer_id, title: '✅ Dag toegekend', message: 'Je dag-aanmelding is bevestigd!', url: '/dashboard', type: 'day_assigned' });
  };

  const rejectDaySignup = async (signupId: string) => {
    const { error } = await supabase.from('monthly_day_signups').update({ status: 'rejected' }).eq('id', signupId);
    if (error) { toast.error(error.message); return; }
    setDaySignups(prev => prev.map(s => s.id === signupId ? { ...s, status: 'rejected' } : s));
    toast.success(t3('Dag-aanmelding afgewezen.', 'Inscription journalière refusée.', 'Day signup rejected.'));
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
        sendPush({ userId: signup.volunteer_id, title: '🎫 Ticket ontvangen', message: 'Je ticket is klaar!', url: '/dashboard', type: 'ticket_generated' });
      } else toast.error(data?.error || t3('Ticket genereren mislukt', 'Échec', 'Failed'));
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
      if (data?.success) toast.success(t3('Ticket per e-mail verstuurd!', 'Ticket envoyé par e-mail !', 'Ticket sent by email!'));
      else toast.error(data?.error || t3('Versturen mislukt', 'Échec', 'Failed'));
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
      } else toast.error(data?.error || 'Checkout failed');
    } catch (e: any) { toast.error(e.message); }
    setCheckingOutIds(prev => { const n = new Set(prev); n.delete(signup.id); return n; });
  };

  const escalateDispute = async (signup: DaySignupClub) => {
    const now = new Date().toISOString();
    await supabase.from('monthly_day_signups').update({ dispute_status: 'escalated', dispute_escalated_at: now }).eq('id', signup.id);
    setDaySignups(prev => prev.map(s => s.id === signup.id ? { ...s, dispute_status: 'escalated', dispute_escalated_at: now } : s));
    toast.success(t3('Geschil geëscaleerd.', 'Litige escaladé.', 'Dispute escalated.'));
    sendPush({ userId: signup.volunteer_id, title: '⚠️ Geschil geëscaleerd', message: 'Het geschil over je uren is geëscaleerd.', url: '/dashboard', type: 'dispute_escalated' });
  };

  const resolveDispute = async (signup: DaySignupClub, task: PlanTask) => {
    const clubH = signup.club_reported_hours || 0;
    const volH = signup.volunteer_reported_hours || 0;
    let maxHours = 24;
    if (task.start_time && task.end_time) {
      const [sh, sm] = task.start_time.split(':').map(Number);
      const [eh, em] = task.end_time.split(':').map(Number);
      maxHours = (eh * 60 + em - sh * 60 - sm) / 60;
    }
    const avgHours = Math.min((clubH + volH) / 2, maxHours);
    const finalAmount = avgHours * (task.hourly_rate || 0);
    await supabase.from('monthly_day_signups').update({
      final_hours: avgHours, final_amount: finalAmount, hour_status: 'confirmed', dispute_status: 'resolved',
      club_approved: true, volunteer_approved: true,
    } as any).eq('id', signup.id);
    setDaySignups(prev => prev.map(s => s.id === signup.id ? {
      ...s, final_hours: avgHours, final_amount: finalAmount, hour_status: 'confirmed', dispute_status: 'resolved',
      club_approved: true, volunteer_approved: true,
    } : s));
    toast.success(`${signup.volunteer_name}: ${avgHours.toFixed(1)}${t3('u', 'h', 'h')} — €${finalAmount.toFixed(2)}`);
  };

  const handleConfirmHours = async (ds: DaySignupClub, task: PlanTask) => {
    const finalHours = ds.volunteer_reported_hours!;
    let finalAmount = 0;
    if (task.compensation_type === 'daily') finalAmount = task.daily_rate || 0;
    else finalAmount = finalHours * (task.hourly_rate || 0);
    await supabase.from('monthly_day_signups').update({ club_reported_hours: finalHours, club_approved: true, final_hours: finalHours, final_amount: finalAmount, hour_status: 'confirmed' }).eq('id', ds.id);
    toast.success(`${ds.volunteer_name}: ${finalHours}${t3('u', 'h', 'h')} ${t3('bevestigd', 'confirmé', 'confirmed')} (€${finalAmount.toFixed(2)})`);
    setDaySignups(prev => prev.map(s => s.id === ds.id ? { ...s, club_approved: true, final_hours: finalHours, final_amount: finalAmount, hour_status: 'confirmed' } : s));
    sendPush({ userId: ds.volunteer_id, title: '✅ Uren bevestigd', message: `Je uren (${finalHours}u — €${finalAmount.toFixed(2)}) zijn bevestigd.`, url: '/dashboard', type: 'hours_confirmed' });
  };

  const pendingDaySignups = daySignups.filter(ds => ds.status === 'pending');
  const assignedDaySignups = daySignups.filter(ds => ds.status === 'assigned');

  const totalAmount = tasks.reduce((sum, t) => {
    if (t.compensation_type === 'daily' && t.daily_rate) return sum + t.daily_rate * t.spots_available;
    if (t.compensation_type === 'hourly' && t.hourly_rate && t.estimated_hours) return sum + t.hourly_rate * t.estimated_hours * t.spots_available;
    return sum;
  }, 0);

  return {
    clubId, plan, setPlan, tasks, setTasks, enrollments, setEnrollments,
    daySignups, setDaySignups, loading, contractTemplates, totalAmount,
    pendingDaySignups, assignedDaySignups,
    generatingTicketIds, sendingTicketEmailIds, checkingOutIds,
    approveEnrollment, rejectEnrollment, assignDaySignup, rejectDaySignup,
    generateTicketForSignup, sendTicketEmail, checkoutSignup,
    escalateDispute, resolveDispute, handleConfirmHours,
  };
}
