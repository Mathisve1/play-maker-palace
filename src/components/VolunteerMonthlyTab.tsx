import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendPush, sendPushToClub } from '@/lib/sendPush';
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
  Loader2, QrCode, ShieldCheck, XCircle, Hourglass, CalendarCheck,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import SeasonAvailabilityPicker from '@/components/SeasonAvailabilityPicker';

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

const labels: Record<Language, Record<string, string>> = {
  nl: {
    title: 'Maandplanning',
    subtitle: 'Bekijk beschikbare maandplannen en schrijf je in',
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
  },
  fr: {
    title: 'Planning mensuel',
    subtitle: 'Consultez les plans mensuels et inscrivez-vous',
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
  },
  en: {
    title: 'Monthly Planning',
    subtitle: 'View available monthly plans and sign up',
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
  },
};

interface VolunteerMonthlyTabProps {
  language: Language;
  userId: string;
  clubId?: string;
}

type SubView = 'planning' | 'availability';

const YEARLY_CAP = 3233.91;

const VolunteerMonthlyTab = ({ language, userId, clubId }: VolunteerMonthlyTabProps) => {
  const l = labels[language];
  const [subView, setSubView] = useState<SubView>('planning');
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [plans, setPlans] = useState<MonthlyPlan[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [daySignups, setDaySignups] = useState<DaySignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHoursDialog, setShowHoursDialog] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
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

  const enrollInPlan = async (planId: string) => {
    if (isBlocked) { toast.error(l.complianceBlocked); return; }
    const { error } = await supabase.from('monthly_enrollments').insert({ plan_id: planId, volunteer_id: userId });
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'nl' ? 'Ingeschreven! Wacht op goedkeuring van de club.' : 'Enrolled! Waiting for club approval.');
    // Notify club of new enrollment
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      sendPushToClub({ clubId: plan.club_id, title: '📋 Nieuwe inschrijving', message: `${profile?.full_name || 'Een vrijwilliger'} heeft zich ingeschreven voor "${plan.title}".`, url: '/command-center', type: 'new_enrollment' });
    }
    loadData();
  };

  const signUpForDay = async (enrollmentId: string, planTaskId: string) => {
    // No longer generate barcode client-side - club will generate ticket after assignment
    const { error } = await supabase.from('monthly_day_signups').insert({
      enrollment_id: enrollmentId,
      plan_task_id: planTaskId,
      volunteer_id: userId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'nl' ? 'Aangemeld! Wacht op bevestiging van de club.' : 'Signed up! Waiting for club confirmation.');
    // Notify club of day signup
    const task = tasks.find(t => t.id === planTaskId);
    const plan = plans.find(p => task && p.id === task.plan_id);
    if (plan) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      sendPushToClub({ clubId: plan.club_id, title: '📅 Nieuwe dag-aanmelding', message: `${profile?.full_name || 'Een vrijwilliger'} heeft zich aangemeld voor ${task?.title || 'een taak'}.`, url: '/command-center', type: 'new_day_signup' });
    }
    loadData();
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
      // Volunteer agrees with club's checkout time
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
      // Volunteer disputes — opens dispute
      await supabase.from('monthly_day_signups').update({
        dispute_status: 'open', hour_status: 'disputed',
      } as any).eq('id', selectedSignup.id);
      toast.info(language === 'nl' ? 'Geschil geopend. Bespreek via chat met de club.' : 'Dispute opened. Discuss via chat with the club.');
    }
    setShowCheckoutConfirm(false); setSelectedSignup(null);
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
  const tasksByDate = tasks.reduce<Record<string, PlanTask[]>>((acc, t) => { if (!acc[t.task_date]) acc[t.task_date] = []; acc[t.task_date].push(t); return acc; }, {});
  const mySignedUpTasks = tasks.filter(t => isSignedUp(t.id));
  const estimatedMonthTotal = mySignedUpTasks.reduce((sum, t) => {
    if (t.compensation_type === 'daily' && t.daily_rate) return sum + t.daily_rate;
    if (t.compensation_type === 'hourly' && t.hourly_rate && t.estimated_hours) return sum + t.hourly_rate * t.estimated_hours;
    return sum;
  }, 0);

  // Helper: can volunteer sign up for days?
  const canSignUpForDays = (enrollment: Enrollment) => {
    return enrollment.approval_status === 'approved' && enrollment.contract_status === 'signed';
  };

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

  const subViewLabels = {
    planning: language === 'nl' ? 'Planning' : language === 'fr' ? 'Planning' : 'Planning',
    availability: language === 'nl' ? 'Beschikbaarheid' : language === 'fr' ? 'Disponibilité' : 'Availability',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          {language === 'nl' ? 'Kalender' : language === 'fr' ? 'Calendrier' : 'Calendar'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{l.subtitle}</p>
      </div>

      {/* Sub-view switcher */}
      <div className="flex gap-2 border-b border-border pb-0">
        {(['planning', 'availability'] as SubView[]).map(view => (
          <button
            key={view}
            onClick={() => setSubView(view)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              subView === view
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {view === 'availability' && <CalendarCheck className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
            {view === 'planning' && <CalendarDays className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
            {subViewLabels[view]}
          </button>
        ))}
      </div>

      {/* Availability sub-view */}
      {subView === 'availability' && clubId && (
        <SeasonAvailabilityPicker userId={userId} clubId={clubId} language={language} />
      )}
      {subView === 'availability' && !clubId && (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarCheck className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p>{language === 'nl' ? 'Volg eerst een club om je beschikbaarheid in te stellen.' : language === 'fr' ? 'Suivez d\'abord un club pour définir votre disponibilité.' : 'Follow a club first to set your availability.'}</p>
        </div>
      )}

      {/* Planning sub-view */}
      {subView === 'planning' && (
      <>

      {isWarning && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
            <span className="text-yellow-800 dark:text-yellow-200">{l.complianceWarning} ({compliancePercentage.toFixed(0)}% — €{totalEarned.toFixed(2)} / €{YEARLY_CAP})</span>
          </CardContent>
        </Card>
      )}
      {isBlocked && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-destructive">{l.complianceBlocked}</span>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
        <h2 className="text-lg font-bold">{MONTH_NAMES[language][viewMonth - 1]} {viewYear}</h2>
        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Laden...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{l.noPlans}</p>
        </div>
      ) : (
        plans.map(plan => {
          const enrollment = enrollments.find(e => e.plan_id === plan.id);
          const planTasks = tasks.filter(t => t.plan_id === plan.id);
          const statusMsg = enrollment ? enrollmentStatusMessage(enrollment) : null;

          return (
            <div key={plan.id} className="space-y-4">
              {/* Plan header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {plan.clubs?.logo_url ? (
                        <img src={plan.clubs.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {(plan.clubs?.name || '?')[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{plan.clubs?.name}</h3>
                        <p className="text-xs text-muted-foreground">{plan.title} · {planTasks.length} taken</p>
                      </div>
                    </div>
                    {enrollment ? (
                      <div className="flex items-center gap-2">
                        {enrollment.approval_status === 'approved' ? (
                          <Badge variant="default" className="bg-green-600">{l.approved}</Badge>
                        ) : enrollment.approval_status === 'rejected' ? (
                          <Badge variant="destructive">{l.rejected}</Badge>
                        ) : (
                          <Badge variant="secondary">{l.waitingApproval}</Badge>
                        )}
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => enrollInPlan(plan.id)} disabled={isBlocked}>
                        <FileSignature className="w-4 h-4 mr-1" /> {l.enroll}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Status message */}
              {statusMsg && (
                <Card className={`${statusMsg.color}`}>
                  <CardContent className="p-3 flex items-center gap-2 text-sm">
                    <statusMsg.icon className="w-4 h-4 shrink-0" />
                    <span>{statusMsg.text}</span>
                  </CardContent>
                </Card>
              )}

              {/* My schedule (if enrolled and can see signups) */}
              {enrollment && mySignedUpTasks.filter(t => t.plan_id === plan.id).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{l.yourSchedule}</CardTitle>
                      <span className="text-xs text-muted-foreground">{l.monthTotal}: <strong className="text-foreground">€{estimatedMonthTotal.toFixed(2)}</strong></span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {mySignedUpTasks.filter(t => t.plan_id === plan.id).map(t => {
                      const d = new Date(t.task_date);
                      const signup = getSignup(t.id);
                      const isPast = d < new Date(new Date().toISOString().split('T')[0]);
                      const isHourly = t.compensation_type === 'hourly';
                      const needsCheckoutConfirm = signup?.hour_status === 'checkout_pending' && !signup.volunteer_approved && isHourly;
                      const needsHourReport = isPast && signup?.checked_in_at && !signup.volunteer_approved && !needsCheckoutConfirm && t.compensation_type !== 'hourly';
                      const needsDisputeInput = signup?.dispute_status === 'escalated' && !signup.volunteer_reported_hours;
                      const notCheckedIn = isPast && !signup?.checked_in_at;

                      return (
                        <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${notCheckedIn ? 'bg-destructive/5 border-destructive/20' : 'bg-primary/5'}`}>
                          <div className="text-center min-w-[40px]">
                            <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(language === 'nl' ? 'nl-BE' : 'fr-BE', { weekday: 'short' })}</p>
                            <p className="text-lg font-bold">{d.getDate()}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{t.title}</span>
                              <Badge variant="outline" className={`text-[10px] ${categoryColor(t.category)}`}>{t.category}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {t.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.start_time}–{t.end_time}</span>}
                              {t.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</span>}
                              <span className="flex items-center gap-1"><Euro className="w-3 h-3" />{t.compensation_type === 'daily' ? `€${t.daily_rate}/${l.day}` : `€${t.hourly_rate}/${l.hour}`}</span>
                            </div>
                            {notCheckedIn && (
                              <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {l.notCheckedIn}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {/* Signup status badge */}
                            {signup && signupStatusBadge(signup)}
                            {signup?.checked_in_at ? (
                              <Badge variant="default" className="bg-green-600 text-[10px]"><CheckCircle className="w-3 h-3 mr-0.5" />{l.checkedIn}</Badge>
                            ) : !isPast && signup?.status === 'assigned' ? (
                              <>
                                {signup?.ticket_barcode && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowTicket(signup.ticket_barcode)}>
                                    <QrCode className="w-3 h-3 mr-1" /> {l.ticket}
                                  </Button>
                                )}
                              </>
                            ) : null}
                            {needsCheckoutConfirm && (
                              <div className="flex flex-col gap-1">
                                <p className="text-[10px] text-muted-foreground">{language === 'nl' ? `Club zegt: ${signup!.club_reported_hours?.toFixed(1)}u` : `Club says: ${signup!.club_reported_hours?.toFixed(1)}h`}</p>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" className="h-6 text-[10px] text-green-700" onClick={() => { setSelectedSignup(signup!); confirmCheckout(true); }}>
                                    <CheckCircle className="w-3 h-3 mr-0.5" /> {language === 'nl' ? 'Akkoord' : 'Agree'}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-6 text-[10px] text-destructive" onClick={() => { setSelectedSignup(signup!); confirmCheckout(false); }}>
                                    <XCircle className="w-3 h-3 mr-0.5" /> {language === 'nl' ? 'Betwist' : 'Dispute'}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {needsDisputeInput && (
                              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => {
                                setSelectedSignup(signup!); setSelectedTask(t);
                                setHoursInput(''); setShowHoursDialog(true);
                              }}>
                                <AlertTriangle className="w-3 h-3 mr-1" /> {language === 'nl' ? 'Jouw uren invoeren' : 'Enter your hours'}
                              </Button>
                            )}
                            {needsHourReport && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                                setSelectedSignup(signup!); setSelectedTask(t);
                                setHoursInput(String(t.estimated_hours || '')); setShowHoursDialog(true);
                              }}>
                                <Clock className="w-3 h-3 mr-1" /> {l.confirmHours}
                              </Button>
                            )}
                            {signup?.dispute_status === 'open' && (
                              <Badge variant="destructive" className="text-[10px]">{language === 'nl' ? 'Geschil open' : 'Dispute open'}</Badge>
                            )}
                            {signup?.dispute_status === 'escalated' && (
                              <Badge variant="destructive" className="text-[10px]">⚠️ {language === 'nl' ? 'Geëscaleerd' : 'Escalated'}</Badge>
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
              )}

              {/* Available tasks by date */}
              {enrollment && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{l.availableTasks}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!canSignUpForDays(enrollment) && (
                      <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-sm flex items-center gap-2">
                        {enrollment.approval_status !== 'approved' ? (
                          <>
                            <Hourglass className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-amber-800 dark:text-amber-200">{l.approvalRequired}</span>
                          </>
                        ) : (
                          <>
                            <FileSignature className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-amber-800 dark:text-amber-200">{l.contractRequired}</span>
                          </>
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
                            <p className="text-xs font-semibold text-muted-foreground mb-2 capitalize">
                              {d.toLocaleDateString(language === 'nl' ? 'nl-BE' : 'fr-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <div className="space-y-1.5">
                              {dateTasks.filter(t => t.plan_id === plan.id).map(t => {
                                const signedUp = isSignedUp(t.id);
                                const signup = getSignup(t.id);
                                return (
                                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{t.title}</span>
                                        <Badge variant="outline" className={`text-[10px] ${categoryColor(t.category)}`}>{t.category}</Badge>
                                      </div>
                                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                        {t.start_time && <span><Clock className="w-3 h-3 inline mr-0.5" />{t.start_time}–{t.end_time}</span>}
                                        {t.location && <span><MapPin className="w-3 h-3 inline mr-0.5" />{t.location}</span>}
                                        <span><Euro className="w-3 h-3 inline mr-0.5" />{t.compensation_type === 'daily' ? `€${t.daily_rate}` : `€${t.hourly_rate}/u`}</span>
                                        <span><Users className="w-3 h-3 inline mr-0.5" />{t.spots_available} {l.available}</span>
                                      </div>
                                    </div>
                                    {signedUp ? (
                                      <div className="flex items-center gap-1 shrink-0">
                                        {signup && signupStatusBadge(signup)}
                                      </div>
                                    ) : !isPast && !blocked ? (
                                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => signUpForDay(enrollment.id, t.id)}>
                                        {l.signUp}
                                      </Button>
                                    ) : !isPast && blocked ? (
                                      <Button size="sm" variant="outline" className="shrink-0 opacity-50 cursor-not-allowed" disabled>
                                        {l.signUp}
                                      </Button>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })
      )}

      {/* Hours confirmation dialog */}
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
              <Input type="number" step="0.5" min="0.5" max="24" value={hoursInput} onChange={e => setHoursInput(e.target.value)} className="mt-1" />
            </div>
            {selectedSignup?.dispute_status === 'escalated' && selectedSignup?.club_reported_hours && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                {language === 'nl' ? `Club rapporteerde: ${selectedSignup.club_reported_hours.toFixed(1)}u. Voer jouw uren in. Het gemiddelde wordt na 48u automatisch toegepast.` : `Club reported: ${selectedSignup.club_reported_hours.toFixed(1)}h. Enter your hours. Average will be applied after 48h.`}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowHoursDialog(false)}>Annuleren</Button>
              <Button className="flex-1" onClick={selectedSignup?.dispute_status === 'escalated' ? submitDisputeHours : submitHours} disabled={!hoursInput || Number(hoursInput) <= 0}>{l.submit}</Button>
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
    </div>
  );
};

export default VolunteerMonthlyTab;
