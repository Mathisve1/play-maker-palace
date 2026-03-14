import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, FileSignature, Ticket, Users, UserCheck, UserX, ChevronDown, ChevronUp } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface MonthlyPlanningKPIsProps {
  clubId: string | null;
  language: Language;
  navigate: (path: string) => void;
}

interface EnrollmentDetail {
  id: string;
  volunteer_id: string;
  approval_status: string;
  contract_status: string;
  full_name: string | null;
  email: string | null;
}

interface DaySignupDetail {
  id: string;
  enrollment_id: string;
  volunteer_id: string;
  status: string;
  ticket_barcode: string | null;
  task_title: string;
  task_date: string;
  volunteer_name: string;
}

const MonthlyPlanningKPIs = ({ clubId, language, navigate }: MonthlyPlanningKPIsProps) => {
  const [kpis, setKpis] = useState({ pendingEnrollments: 0, contractsToSend: 0, pendingDaySignups: 0, ticketsToGenerate: 0, planMonth: 0, planYear: 0 });
  const [hasData, setHasData] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pendingEnrollmentsList, setPendingEnrollmentsList] = useState<EnrollmentDetail[]>([]);
  const [contractsList, setContractsList] = useState<EnrollmentDetail[]>([]);
  const [pendingDaySignupsList, setPendingDaySignupsList] = useState<DaySignupDetail[]>([]);
  const [ticketsList, setTicketsList] = useState<DaySignupDetail[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);

  const load = async () => {
    if (!clubId) return;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const { data: plans } = await supabase
      .from('monthly_plans')
      .select('id, month, year')
      .eq('club_id', clubId)
      .eq('status', 'published')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(2);

    if (!plans || plans.length === 0) return;

    const activePlan = plans.find(p => p.year === currentYear && p.month === currentMonth) || plans[0];
    setPlanId(activePlan.id);

    const { data: enrollments } = await supabase
      .from('monthly_enrollments')
      .select('id, volunteer_id, approval_status, contract_status, profiles:volunteer_id(full_name, email)')
      .eq('plan_id', activePlan.id);

    const enrs = (enrollments || []) as any[];
    const pending = enrs.filter(e => e.approval_status === 'pending').map(e => ({
      id: e.id, volunteer_id: e.volunteer_id, approval_status: e.approval_status,
      contract_status: e.contract_status,
      full_name: e.profiles?.full_name || null, email: e.profiles?.email || null,
    }));
    const contracts = enrs.filter(e => e.approval_status === 'approved' && e.contract_status === 'pending').map(e => ({
      id: e.id, volunteer_id: e.volunteer_id, approval_status: e.approval_status,
      contract_status: e.contract_status,
      full_name: e.profiles?.full_name || null, email: e.profiles?.email || null,
    }));

    setPendingEnrollmentsList(pending);
    setContractsList(contracts);

    let pendingDS: DaySignupDetail[] = [];
    let ticketsDS: DaySignupDetail[] = [];

    if (enrs.length > 0) {
      const { data: daySignups } = await supabase
        .from('monthly_day_signups')
        .select('id, enrollment_id, plan_task_id, volunteer_id, status, ticket_barcode')
        .in('enrollment_id', enrs.map(e => e.id));

      if (daySignups && daySignups.length > 0) {
        // Load task info for day signups
        const taskIds = [...new Set(daySignups.map(d => d.plan_task_id))];
        const { data: tasksData } = await supabase
          .from('monthly_plan_tasks')
          .select('id, title, task_date')
          .in('id', taskIds);
        const taskMap = Object.fromEntries((tasksData || []).map(t => [t.id, t]));

        const enriched = daySignups.map(d => {
          const enr = enrs.find(e => e.id === d.enrollment_id);
          const task = taskMap[d.plan_task_id];
          return {
            ...d,
            task_title: task?.title || '?',
            task_date: task?.task_date || '',
            volunteer_name: enr?.profiles?.full_name || enr?.profiles?.email || 'Onbekend',
          };
        });

        pendingDS = enriched.filter(d => d.status === 'pending');
        ticketsDS = enriched.filter(d => d.status === 'assigned' && !d.ticket_barcode);
      }
    }

    setPendingDaySignupsList(pendingDS);
    setTicketsList(ticketsDS);

    const total = pending.length + contracts.length + pendingDS.length + ticketsDS.length;
    if (total > 0) {
      setHasData(true);
      setKpis({
        pendingEnrollments: pending.length, contractsToSend: contracts.length,
        pendingDaySignups: pendingDS.length, ticketsToGenerate: ticketsDS.length,
        planMonth: activePlan.month, planYear: activePlan.year,
      });
    }
  };

  useEffect(() => { load(); }, [clubId]);

  const approveEnrollment = async (id: string) => {
    const { error } = await supabase.from('monthly_enrollments').update({ approval_status: 'approved' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'nl' ? 'Goedgekeurd!' : 'Approved!');
    load();
  };

  const rejectEnrollment = async (id: string) => {
    const { error } = await supabase.from('monthly_enrollments').update({ approval_status: 'rejected' } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'nl' ? 'Afgewezen.' : 'Rejected.');
    load();
  };

  const assignDaySignup = async (id: string) => {
    const { error } = await supabase.from('monthly_day_signups').update({ status: 'assigned' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(language === 'nl' ? 'Toegekend!' : 'Assigned!');
    load();
  };

  if (!hasData) return null;

  const mpLink = `/monthly-planning?y=${kpis.planYear}&m=${kpis.planMonth}`;

  const cards = [
    { label: language === 'nl' ? 'Wachtende inschrijvingen' : 'Pending enrollments', value: kpis.pendingEnrollments, icon: Users, color: 'text-yellow-600 bg-yellow-500/10' },
    { label: language === 'nl' ? 'Contracten te versturen' : 'Contracts to send', value: kpis.contractsToSend, icon: FileSignature, color: 'text-blue-600 bg-blue-500/10' },
    { label: language === 'nl' ? 'Dag-aanmeldingen te bevestigen' : 'Day signups to confirm', value: kpis.pendingDaySignups, icon: Clock, color: 'text-orange-600 bg-orange-500/10' },
    { label: language === 'nl' ? 'Tickets te genereren' : 'Tickets to generate', value: kpis.ticketsToGenerate, icon: Ticket, color: 'text-purple-600 bg-purple-500/10' },
  ].filter(c => c.value > 0);

  if (cards.length === 0) return null;

  const hasDetails = pendingEnrollmentsList.length > 0 || pendingDaySignupsList.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          {language === 'nl' ? 'Maandplanning' : 'Monthly Planning'}
        </h2>
        <div className="flex items-center gap-2">
          {hasDetails && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? (language === 'nl' ? 'Inklappen' : 'Collapse') : (language === 'nl' ? 'Details' : 'Details')}
            </button>
          )}
          <button onClick={() => navigate(mpLink)} className="text-xs text-primary hover:underline">
            {language === 'nl' ? 'Bekijk plan' : 'View plan'} →
          </button>
        </div>
      </div>

      {/* KPI summary cards */}
      <div className={`grid gap-3 ${cards.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : cards.length === 3 ? 'grid-cols-3' : cards.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {cards.map((card, i) => (
          <button key={i} onClick={() => setExpanded(!expanded)} className="bg-card rounded-2xl border border-border p-4 text-left hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-heading font-bold text-foreground">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{card.label}</p>
          </button>
        ))}
      </div>

      {/* Expandable detail sections */}
      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 space-y-4">
          
          {/* Pending enrollments */}
          {pendingEnrollmentsList.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-yellow-600" />
                {language === 'nl' ? 'Wachtende inschrijvingen' : 'Pending enrollments'}
              </h3>
              <div className="space-y-2">
                {pendingEnrollmentsList.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {(e.full_name || e.email || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.full_name || e.email || 'Onbekend'}</p>
                      {e.email && <p className="text-xs text-muted-foreground truncate">{e.email}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1 text-green-700 h-8" onClick={() => approveEnrollment(e.id)}>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{language === 'nl' ? 'Goedkeuren' : 'Approve'}</span>
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive h-8" onClick={() => rejectEnrollment(e.id)}>
                        <UserX className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{language === 'nl' ? 'Afwijzen' : 'Reject'}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending day signups */}
          {pendingDaySignupsList.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-orange-600" />
                {language === 'nl' ? 'Dag-aanmeldingen te bevestigen' : 'Day signups to confirm'}
              </h3>
              <div className="space-y-2">
                {pendingDaySignupsList.map(ds => {
                  const d = ds.task_date ? new Date(ds.task_date) : null;
                  return (
                    <div key={ds.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      {d && (
                        <div className="text-center min-w-[40px]">
                          <p className="text-[10px] text-muted-foreground capitalize">{d.toLocaleDateString('nl-BE', { weekday: 'short' })}</p>
                          <p className="text-lg font-bold leading-tight">{d.getDate()}</p>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ds.volunteer_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{ds.task_title}</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1 text-green-700 h-8 shrink-0" onClick={() => assignDaySignup(ds.id)}>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{language === 'nl' ? 'Toekennen' : 'Assign'}</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contracts to send / Tickets - just link to planning page */}
          {(contractsList.length > 0 || ticketsList.length > 0) && (
            <div className="flex gap-2 flex-wrap">
              {contractsList.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => navigate(mpLink)} className="gap-1.5">
                  <FileSignature className="w-3.5 h-3.5" />
                  {contractsList.length} {language === 'nl' ? 'contracten versturen' : 'contracts to send'} →
                </Button>
              )}
              {ticketsList.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => navigate(mpLink)} className="gap-1.5">
                  <Ticket className="w-3.5 h-3.5" />
                  {ticketsList.length} {language === 'nl' ? 'tickets genereren' : 'tickets to generate'} →
                </Button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default MonthlyPlanningKPIs;
