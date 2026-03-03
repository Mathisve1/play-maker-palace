import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Copy, FileSignature, Loader2, Banknote,
} from 'lucide-react';
import SendContractConfirmDialog from '@/components/SendContractConfirmDialog';

const MONTH_NAMES_NL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
const WEEKDAY_NAMES_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
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
  volunteer_name?: string;
}

const MonthlyPlanning = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
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
          supabase.from('monthly_enrollments').select('id, volunteer_id, contract_status, profiles:volunteer_id(full_name, email, avatar_url)').eq('plan_id', p.id),
        ]);
        setTasks((tasksRes.data || []) as unknown as PlanTask[]);
        const enrs = (enrollRes.data || []) as unknown as Enrollment[];
        setEnrollments(enrs);

        // Load day signups for club-side hour management
        if (enrs.length > 0) {
          const { data: signupsData } = await supabase
            .from('monthly_day_signups')
            .select('*')
            .in('enrollment_id', enrs.map(e => e.id));
          
          // Enrich with volunteer names
          const enriched = (signupsData || []).map((s: any) => {
            const enr = enrs.find(e => e.id === s.enrollment_id);
            return { ...s, volunteer_name: (enr?.profiles as any)?.full_name || 'Onbekend' };
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

  const createPlan = async () => {
    if (!clubId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('monthly_plans').insert({
      club_id: clubId,
      year: viewYear,
      month: viewMonth,
      title: `${MONTH_NAMES_NL[viewMonth - 1]} ${viewYear}`,
      created_by: user.id,
      status: 'draft',
    }).select().single();
    if (error) { toast.error('Kon plan niet aanmaken'); return; }
    setPlan(data as unknown as MonthlyPlan);
    toast.success('Maandplan aangemaakt!');
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
      if (error) { toast.error('Update mislukt'); return; }
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...payload } : t));
      toast.success('Taak bijgewerkt');
    } else {
      const { data, error } = await supabase.from('monthly_plan_tasks').insert(payload).select().single();
      if (error) { toast.error('Taak toevoegen mislukt'); return; }
      setTasks(prev => [...prev, data as unknown as PlanTask]);
      toast.success('Taak toegevoegd');
    }
    setShowAddTask(false);
    setEditingTask(null);
    resetForm();
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('monthly_plan_tasks').delete().eq('id', taskId);
    if (error) { toast.error('Verwijderen mislukt'); return; }
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success('Taak verwijderd');
  };

  const publishPlan = async () => {
    if (!plan) return;
    const { error } = await supabase.from('monthly_plans').update({ status: 'published' }).eq('id', plan.id);
    if (error) { toast.error('Publiceren mislukt'); return; }
    setPlan(prev => prev ? { ...prev, status: 'published' } : null);
    toast.success('Maandplan gepubliceerd! Vrijwilligers kunnen zich nu inschrijven.');
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
      // Determine previous month
      const prevM = viewMonth === 1 ? 12 : viewMonth - 1;
      const prevY = viewMonth === 1 ? viewYear - 1 : viewYear;

      // Find previous month's plan
      const { data: prevPlan } = await supabase
        .from('monthly_plans')
        .select('id')
        .eq('club_id', clubId)
        .eq('year', prevY)
        .eq('month', prevM)
        .maybeSingle();

      if (!prevPlan) {
        toast.error('Geen plan gevonden voor de vorige maand');
        setCopyingTasks(false);
        return;
      }

      // Get previous month's tasks
      const { data: prevTasks } = await supabase
        .from('monthly_plan_tasks')
        .select('*')
        .eq('plan_id', prevPlan.id);

      if (!prevTasks || prevTasks.length === 0) {
        toast.error('Geen taken gevonden in de vorige maand');
        setCopyingTasks(false);
        return;
      }

      const newDaysInMonth = getDaysInMonth(viewYear, viewMonth);
      const newTasks = prevTasks
        .map((t: any) => {
          const oldDate = new Date(t.task_date);
          const dayNum = oldDate.getDate();
          if (dayNum > newDaysInMonth) return null; // Skip days that don't exist
          const newDate = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const { id, created_at, plan_id, ...rest } = t;
          return { ...rest, plan_id: plan.id, task_date: newDate };
        })
        .filter(Boolean);

      if (newTasks.length === 0) {
        toast.error('Geen taken konden worden gekopieerd');
        setCopyingTasks(false);
        return;
      }

      const { data: inserted, error } = await supabase.from('monthly_plan_tasks').insert(newTasks).select();
      if (error) throw error;
      setTasks(prev => [...prev, ...(inserted as unknown as PlanTask[])]);
      toast.success(`${inserted!.length} taken gekopieerd van ${MONTH_NAMES_NL[prevM - 1]}`);
    } catch (err: any) {
      toast.error(err.message || 'Kopiëren mislukt');
    }
    setCopyingTasks(false);
  };

  // Feature 2: Generate monthly payout
  const generateMonthlyPayout = async () => {
    if (!plan || !clubId) return;
    setGeneratingPayout(true);
    try {
      const confirmedSignups = daySignups.filter(ds => ds.hour_status === 'confirmed');
      if (confirmedSignups.length === 0) {
        toast.error('Geen bevestigde uren gevonden');
        setGeneratingPayout(false);
        return;
      }

      // Group by volunteer
      const byVolunteer: Record<string, { enrollment_id: string; total_days: number; total_hours: number; total_amount: number }> = {};
      for (const ds of confirmedSignups) {
        const enr = enrollments.find(e => e.id === ds.enrollment_id);
        if (!enr) continue;
        if (!byVolunteer[ds.volunteer_id]) {
          byVolunteer[ds.volunteer_id] = { enrollment_id: enr.id, total_days: 0, total_hours: 0, total_amount: 0 };
        }
        byVolunteer[ds.volunteer_id].total_days += 1;
        byVolunteer[ds.volunteer_id].total_hours += ds.final_hours || 0;
        byVolunteer[ds.volunteer_id].total_amount += ds.final_amount || 0;
      }

      // Check if payouts already exist for this plan
      const { data: existing } = await supabase
        .from('monthly_payouts')
        .select('id')
        .eq('plan_id', plan.id);

      if (existing && existing.length > 0) {
        toast.error('Maandafrekening bestaat al voor dit plan');
        setGeneratingPayout(false);
        return;
      }

      const payoutRows = Object.entries(byVolunteer).map(([volunteerId, data]) => ({
        club_id: clubId,
        plan_id: plan.id,
        enrollment_id: data.enrollment_id,
        volunteer_id: volunteerId,
        total_days: data.total_days,
        total_hours: data.total_hours,
        total_amount: data.total_amount,
        status: 'pending',
      }));

      const { error } = await supabase.from('monthly_payouts').insert(payoutRows);
      if (error) throw error;
      toast.success(`Maandafrekening gegenereerd voor ${payoutRows.length} vrijwilliger(s)`);
    } catch (err: any) {
      toast.error(err.message || 'Genereren mislukt');
    }
    setGeneratingPayout(false);
  };

  const exportToSepa = () => {
    navigate('/sepa-payouts');
  };

  const openEditTask = (task: PlanTask) => {
    setEditingTask(task);
    setSelectedDate(task.task_date);
    setTaskForm({
      title: task.title,
      category: task.category,
      description: task.description || '',
      location: task.location || '',
      start_time: task.start_time || '09:00',
      end_time: task.end_time || '17:00',
      compensation_type: task.compensation_type,
      daily_rate: String(task.daily_rate || 25),
      hourly_rate: String(task.hourly_rate || 5),
      estimated_hours: String(task.estimated_hours || 8),
      spots_available: String(task.spots_available),
    });
    setShowAddTask(true);
  };

  // Calendar helpers
  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const getFirstDayOfWeek = (y: number, m: number) => {
    const d = new Date(y, m - 1, 1).getDay();
    return d === 0 ? 6 : d - 1; // Monday = 0
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getTasksForDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.task_date === dateStr);
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

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

  return (
    <ClubPageLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-primary" />
              Maandplanning
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Plan dagelijkse taken en vergoed vrijwilligers met één maandcontract
            </p>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="text-center">
            <h2 className="text-xl font-bold">{MONTH_NAMES_NL[viewMonth - 1]} {viewYear}</h2>
            {plan && (
              <Badge variant={plan.status === 'published' ? 'default' : 'secondary'} className="mt-1">
                {plan.status === 'published' ? 'Gepubliceerd' : 'Concept'}
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
              <p className="text-xs text-muted-foreground">Taken gepland</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{enrollments.length}</p>
              <p className="text-xs text-muted-foreground">Inschrijvingen</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{new Set(tasks.map(t => t.task_date)).size}</p>
              <p className="text-xs text-muted-foreground">Actieve dagen</p>
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
            <h3 className="text-lg font-semibold mb-2">Nog geen maandplan voor {MONTH_NAMES_NL[viewMonth - 1]}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Maak een maandplan aan om dagelijkse taken in te plannen en vrijwilligers uit te nodigen.
            </p>
            <Button onClick={createPlan} size="lg"><Plus className="w-4 h-4 mr-2" /> Maandplan aanmaken</Button>
          </Card>
        ) : plan ? (
          <>
            {/* Calendar grid */}
            <Card>
              <CardContent className="p-2 sm:p-4">
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {WEEKDAY_NAMES_NL.map(d => (
                    <div key={d} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                  ))}
                  {calendarDays.map((day, i) => {
                    if (day === null) return <div key={`e-${i}`} className="bg-background p-2 min-h-[80px]" />;
                    const dayTasks = getTasksForDay(day);
                    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = day === now.getDate() && viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();
                    const isPast = new Date(dateStr) < new Date(now.toISOString().split('T')[0]);

                    return (
                      <div
                        key={day}
                        className={`bg-background p-1.5 min-h-[80px] sm:min-h-[100px] cursor-pointer hover:bg-muted/50 transition-colors relative ${isToday ? 'ring-2 ring-primary ring-inset' : ''} ${isPast ? 'opacity-60' : ''}`}
                        onClick={() => {
                          if (plan.status !== 'published' || !isPast) {
                            setSelectedDate(dateStr);
                            resetForm();
                            setEditingTask(null);
                            setShowAddTask(true);
                          }
                        }}
                      >
                        <span className={`text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center' : 'text-foreground'}`}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayTasks.slice(0, 3).map(t => (
                            <div
                              key={t.id}
                              className={`text-[10px] sm:text-xs px-1 py-0.5 rounded truncate ${categoryColor(t.category)}`}
                              onClick={(e) => { e.stopPropagation(); openEditTask(t); }}
                            >
                              {t.title}
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1">+{dayTasks.length - 3} meer</div>
                          )}
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
                  {/* Copy previous month */}
                  <Button variant="outline" onClick={copyPreviousMonth} disabled={copyingTasks}>
                    {copyingTasks ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                    Kopieer vorige maand
                  </Button>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Contractsjabloon:</Label>
                    <Select
                      value={plan.contract_template_id || ''}
                      onValueChange={async (v) => {
                        await supabase.from('monthly_plans').update({ contract_template_id: v || null }).eq('id', plan.id);
                        setPlan(prev => prev ? { ...prev, contract_template_id: v || null } : null);
                        toast.success('Sjabloon gekoppeld');
                      }}
                    >
                      <SelectTrigger className="w-[200px]"><SelectValue placeholder="Kies sjabloon..." /></SelectTrigger>
                      <SelectContent>
                        {contractTemplates.map(ct => (
                          <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {tasks.length > 0 && (
                    <Button onClick={publishPlan}><Send className="w-4 h-4 mr-2" /> Publiceer maandplan</Button>
                  )}
                </div>
              )}
              {plan.status === 'published' && (
                <Badge variant="outline" className="text-sm py-2 px-4">
                  <Users className="w-4 h-4 mr-1" /> {enrollments.length} vrijwilliger(s) ingeschreven
                </Badge>
              )}
            </div>

            {/* Tasks list */}
            {tasks.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Alle taken deze maand</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.map(t => {
                      const d = new Date(t.task_date);
                      const dayName = d.toLocaleDateString('nl-BE', { weekday: 'short' });
                      const dayNum = d.getDate();
                      return (
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <div className="text-center min-w-[40px]">
                            <p className="text-xs text-muted-foreground capitalize">{dayName}</p>
                            <p className="text-lg font-bold text-foreground">{dayNum}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{t.title}</span>
                              <Badge variant="outline" className={`text-[10px] ${categoryColor(t.category)}`}>{t.category}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {t.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.start_time}–{t.end_time}</span>}
                              {t.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</span>}
                              <span className="flex items-center gap-1">
                                <Euro className="w-3 h-3" />
                                {t.compensation_type === 'daily' ? `€${t.daily_rate}/dag` : `€${t.hourly_rate}/u`}
                              </span>
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.spots_available} plaatsen</span>
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

            {/* Enrollments */}
            {enrollments.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Ingeschreven vrijwilligers</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {enrollments.map(e => (
                      <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {((e.profiles as any)?.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{(e.profiles as any)?.full_name || (e.profiles as any)?.email || 'Onbekend'}</p>
                          <p className="text-xs text-muted-foreground">{(e.profiles as any)?.email}</p>
                        </div>
                        <Badge variant={e.contract_status === 'signed' ? 'default' : 'secondary'}>
                          {e.contract_status === 'signed' ? 'Contract getekend' : e.contract_status === 'sent' ? 'Verstuurd' : 'Wacht op contract'}
                        </Badge>
                        {/* Feature 3: Send contract button */}
                        {plan?.contract_template_id && e.contract_status !== 'signed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setContractVolunteer(e)}
                          >
                            <FileSignature className="w-3.5 h-3.5 mr-1" />
                            {e.contract_status === 'sent' ? 'Opnieuw' : 'Contract'}
                          </Button>
                        )}
                      </div>
                    ))}
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
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={async () => {
                              const finalHours = ds.volunteer_reported_hours!;
                              let finalAmount = 0;
                              if (task.compensation_type === 'daily') finalAmount = task.daily_rate || 0;
                              else finalAmount = finalHours * (task.hourly_rate || 0);
                              
                              await supabase.from('monthly_day_signups').update({
                                club_reported_hours: finalHours,
                                club_approved: true,
                                final_hours: finalHours,
                                final_amount: finalAmount,
                                hour_status: 'confirmed',
                              }).eq('id', ds.id);
                              toast.success(`${ds.volunteer_name}: ${finalHours}u bevestigd (€${finalAmount.toFixed(2)})`);
                              // Reload
                              setDaySignups(prev => prev.map(s => s.id === ds.id ? { ...s, club_approved: true, final_hours: finalHours, final_amount: finalAmount, hour_status: 'confirmed' } : s));
                            }}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Akkoord ({ds.volunteer_reported_hours}u)
                            </Button>
                          </div>
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
            <div>
              <Label>Titel *</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="bv. Bar openen, Materiaal opruimen..." />
            </div>
            <div>
              <Label>Categorie</Label>
              <Select value={taskForm.category} onValueChange={v => setTaskForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="time" value={taskForm.start_time} onChange={e => setTaskForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>Einde</Label>
                <Input type="time" value={taskForm.end_time} onChange={e => setTaskForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Locatie</Label>
              <Input value={taskForm.location} onChange={e => setTaskForm(f => ({ ...f, location: e.target.value }))} placeholder="bv. Clubhuis, Veld 3..." />
            </div>
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
              <div>
                <Label>Dagvergoeding (€)</Label>
                <Input type="number" value={taskForm.daily_rate} onChange={e => setTaskForm(f => ({ ...f, daily_rate: e.target.value }))} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Uurloon (€)</Label>
                  <Input type="number" value={taskForm.hourly_rate} onChange={e => setTaskForm(f => ({ ...f, hourly_rate: e.target.value }))} />
                </div>
                <div>
                  <Label>Geschatte uren</Label>
                  <Input type="number" value={taskForm.estimated_hours} onChange={e => setTaskForm(f => ({ ...f, estimated_hours: e.target.value }))} />
                </div>
              </div>
            )}
            <div>
              <Label>Aantal plaatsen</Label>
              <Input type="number" value={taskForm.spots_available} onChange={e => setTaskForm(f => ({ ...f, spots_available: e.target.value }))} />
            </div>
            <div>
              <Label>Beschrijving</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Extra info over de taak..." rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddTask(false)}>Annuleren</Button>
              <Button className="flex-1" onClick={addOrUpdateTask} disabled={!taskForm.title}>
                {editingTask ? 'Opslaan' : 'Toevoegen'}
              </Button>
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
            // Update enrollment contract_status to 'sent'
            await supabase.from('monthly_enrollments')
              .update({ contract_status: 'sent' })
              .eq('id', contractVolunteer.id);
            setEnrollments(prev => prev.map(e =>
              e.id === contractVolunteer.id ? { ...e, contract_status: 'sent' } : e
            ));
            setContractVolunteer(null);
          }}
        />
      )}
    </ClubPageLayout>
  );
};

export default MonthlyPlanning;
