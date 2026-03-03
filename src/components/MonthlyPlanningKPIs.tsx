import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, FileSignature, Ticket, Users } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface MonthlyPlanningKPIsProps {
  clubId: string | null;
  language: Language;
  navigate: (path: string) => void;
}

const MonthlyPlanningKPIs = ({ clubId, language, navigate }: MonthlyPlanningKPIsProps) => {
  const [kpis, setKpis] = useState({ pendingEnrollments: 0, contractsToSend: 0, pendingDaySignups: 0, ticketsToGenerate: 0, planMonth: 0, planYear: 0 });
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Find active plan(s) for current or next month
      const { data: plans } = await supabase
        .from('monthly_plans')
        .select('id, month, year')
        .eq('club_id', clubId)
        .eq('status', 'published')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(2);

      if (!plans || plans.length === 0) return;

      // Use the most relevant plan (current month or upcoming)
      const activePlan = plans.find(p => p.year === currentYear && p.month === currentMonth) || plans[0];
      const planId = activePlan.id;

      const { data: enrollments } = await supabase
        .from('monthly_enrollments')
        .select('id, approval_status, contract_status')
        .eq('plan_id', planId);

      const enrs = enrollments || [];
      const pendingEnrollments = enrs.filter(e => (e as any).approval_status === 'pending').length;
      const contractsToSend = enrs.filter(e => (e as any).approval_status === 'approved' && e.contract_status === 'pending').length;

      let pendingDaySignups = 0;
      let ticketsToGenerate = 0;

      if (enrs.length > 0) {
        const { data: daySignups } = await supabase
          .from('monthly_day_signups')
          .select('id, status, ticket_barcode')
          .in('enrollment_id', enrs.map(e => e.id));

        const ds = daySignups || [];
        pendingDaySignups = ds.filter(d => d.status === 'pending').length;
        ticketsToGenerate = ds.filter(d => d.status === 'assigned' && !d.ticket_barcode).length;
      }

      const total = pendingEnrollments + contractsToSend + pendingDaySignups + ticketsToGenerate;
      if (total > 0) {
        setHasData(true);
        setKpis({ pendingEnrollments, contractsToSend, pendingDaySignups, ticketsToGenerate, planMonth: activePlan.month, planYear: activePlan.year });
      }
    };
    load();
  }, [clubId]);

  if (!hasData) return null;

  const mpLink = `/monthly-planning?y=${kpis.planYear}&m=${kpis.planMonth}`;

  const cards = [
    { label: language === 'nl' ? 'Wachtende inschrijvingen' : 'Pending enrollments', value: kpis.pendingEnrollments, icon: Users, color: 'text-yellow-600 bg-yellow-500/10' },
    { label: language === 'nl' ? 'Contracten te versturen' : 'Contracts to send', value: kpis.contractsToSend, icon: FileSignature, color: 'text-blue-600 bg-blue-500/10' },
    { label: language === 'nl' ? 'Dag-aanmeldingen te bevestigen' : 'Day signups to confirm', value: kpis.pendingDaySignups, icon: Clock, color: 'text-orange-600 bg-orange-500/10' },
    { label: language === 'nl' ? 'Tickets te genereren' : 'Tickets to generate', value: kpis.ticketsToGenerate, icon: Ticket, color: 'text-purple-600 bg-purple-500/10' },
  ].filter(c => c.value > 0);

  if (cards.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          {language === 'nl' ? 'Maandplanning' : 'Monthly Planning'}
        </h2>
        <button onClick={() => navigate(mpLink)} className="text-xs text-primary hover:underline">
          {language === 'nl' ? 'Bekijk plan' : 'View plan'} →
        </button>
      </div>
      <div className={`grid gap-3 ${cards.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : cards.length === 3 ? 'grid-cols-3' : cards.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {cards.map((card, i) => (
          <button key={i} onClick={() => navigate(mpLink)} className="bg-card rounded-2xl border border-border p-4 text-left hover:border-primary/30 transition-colors">
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
    </motion.div>
  );
};

export default MonthlyPlanningKPIs;
