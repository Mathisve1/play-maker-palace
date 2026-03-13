import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Euro, Calendar, Award, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';

interface SeasonOverviewProps {
  userId: string;
  language: Language;
}

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

// Season runs July → June
const getSeasonRange = () => {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    label: `${year}–${year + 1}`,
    start: new Date(year, 6, 1).toISOString(),
    end: new Date(year + 1, 5, 30, 23, 59, 59).toISOString(),
  };
};

const VolunteerSeasonOverview = ({ userId, language }: SeasonOverviewProps) => {
  const [stats, setStats] = useState<{
    totalTasks: number;
    totalHours: number;
    totalEarned: number;
    clubs: number;
    monthlyBreakdown: { month: string; tasks: number; hours: number; earned: number }[];
  } | null>(null);

  const season = getSeasonRange();

  useEffect(() => {
    const load = async () => {
      // Get all assigned signups this season
      const { data: signups } = await supabase
        .from('task_signups')
        .select('task_id, signed_up_at')
        .eq('volunteer_id', userId)
        .eq('status', 'assigned');

      if (!signups || signups.length === 0) {
        setStats({ totalTasks: 0, totalHours: 0, totalEarned: 0, clubs: 0, monthlyBreakdown: [] });
        return;
      }

      const taskIds = signups.map(s => s.task_id);

      // Fetch tasks with details
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, task_date, start_time, end_time, expense_amount, club_id, hourly_rate, estimated_hours, daily_rate, compensation_type')
        .in('id', taskIds);

      const seasonTasks = (tasks || []).filter(t => {
        if (!t.task_date) return false;
        return t.task_date >= season.start && t.task_date <= season.end;
      });

      // Also get hour confirmations for actual hours
      const { data: hourConfs } = await supabase
        .from('hour_confirmations')
        .select('task_id, final_hours, final_amount')
        .eq('volunteer_id', userId)
        .eq('status', 'confirmed')
        .in('task_id', taskIds);

      const hourMap = new Map((hourConfs || []).map(h => [h.task_id, h]));

      // Also get SEPA payouts
      const { data: sepaItems } = await supabase
        .from('sepa_batch_items')
        .select('amount, status, task_id')
        .eq('volunteer_id', userId)
        .in('task_id', taskIds);

      const sepaMap = new Map<string, number>();
      (sepaItems || []).filter(s => s.status !== 'failed').forEach(s => {
        sepaMap.set(s.task_id, (sepaMap.get(s.task_id) || 0) + Number(s.amount));
      });

      // Also get volunteer_payments
      const { data: payments } = await supabase
        .from('volunteer_payments')
        .select('task_id, amount, status')
        .eq('volunteer_id', userId)
        .eq('status', 'succeeded')
        .in('task_id', taskIds);

      const paymentMap = new Map<string, number>();
      (payments || []).forEach(p => {
        paymentMap.set(p.task_id, (paymentMap.get(p.task_id) || 0) + Number(p.amount));
      });

      const clubSet = new Set<string>();
      let totalHours = 0;
      let totalEarned = 0;

      // Monthly breakdown
      const monthMap = new Map<string, { tasks: number; hours: number; earned: number }>();
      const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

      seasonTasks.forEach(task => {
        clubSet.add(task.club_id);

        const monthKey = new Date(task.task_date!).toLocaleDateString(locale, { month: 'short', year: 'numeric' });
        const entry = monthMap.get(monthKey) || { tasks: 0, hours: 0, earned: 0 };
        entry.tasks++;

        // Hours
        const hc = hourMap.get(task.id);
        let hours = 0;
        if (hc?.final_hours) {
          hours = hc.final_hours;
        } else if (task.start_time && task.end_time) {
          hours = (new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 3600000;
        } else if (task.estimated_hours) {
          hours = task.estimated_hours;
        }
        entry.hours += hours;
        totalHours += hours;

        // Earnings
        let earned = 0;
        if (hc?.final_amount) earned = hc.final_amount;
        else if (paymentMap.has(task.id)) earned = paymentMap.get(task.id)!;
        else if (sepaMap.has(task.id)) earned = sepaMap.get(task.id)!;
        else if (task.compensation_type === 'fixed' && task.expense_amount) earned = task.expense_amount;
        else if (task.compensation_type === 'hourly' && task.hourly_rate) earned = task.hourly_rate * hours;
        else if (task.compensation_type === 'daily' && task.daily_rate) earned = task.daily_rate;
        entry.earned += earned;
        totalEarned += earned;

        monthMap.set(monthKey, entry);
      });

      setStats({
        totalTasks: seasonTasks.length,
        totalHours: Math.round(totalHours * 10) / 10,
        totalEarned: Math.round(totalEarned * 100) / 100,
        clubs: clubSet.size,
        monthlyBreakdown: Array.from(monthMap.entries()).map(([month, data]) => ({ month, ...data })),
      });
    };
    load();
  }, [userId, language]);

  if (!stats) return null;
  if (stats.totalTasks === 0) return null;

  const maxPlafond = 3233.91;
  const plafondPercent = Math.min((stats.totalEarned / maxPlafond) * 100, 100);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          {t3(language, 'Seizoensoverzicht', 'Aperçu de la saison', 'Season Overview')} {season.label}
        </h2>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <Calendar className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">{stats.totalTasks}</p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'Taken voltooid', 'Tâches terminées', 'Tasks completed')}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
            <Clock className="w-3.5 h-3.5 text-secondary" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">{stats.totalHours}h</p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'Uren gewerkt', 'Heures travaillées', 'Hours worked')}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
            <Euro className="w-3.5 h-3.5 text-accent" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">€{stats.totalEarned.toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'Totaal verdiend', 'Total gagné', 'Total earned')}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">{stats.clubs}</p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'Clubs geholpen', 'Clubs aidés', 'Clubs helped')}</p>
        </div>
      </div>

      {/* Plafond progress */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t3(language, 'Jaarplafond vrijwilligersvergoeding', 'Plafond annuel', 'Annual volunteer cap')}
          </p>
          <p className="text-xs font-semibold text-foreground">€{stats.totalEarned.toFixed(2)} / €{maxPlafond.toFixed(2)}</p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${plafondPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${plafondPercent > 80 ? 'bg-destructive' : plafondPercent > 50 ? 'bg-yellow-500' : 'bg-primary'}`}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {plafondPercent > 80
            ? t3(language, '⚠️ Let op: je nadert het jaarplafond', '⚠️ Attention: vous approchez le plafond', '⚠️ Warning: approaching annual cap')
            : `${Math.round(plafondPercent)}% ${t3(language, 'gebruikt', 'utilisé', 'used')}`}
        </p>
      </div>

      {/* Monthly breakdown */}
      {stats.monthlyBreakdown.length > 1 && (
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {t3(language, 'Per maand', 'Par mois', 'Per month')}
          </p>
          <div className="space-y-2">
            {stats.monthlyBreakdown.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium capitalize">{m.month}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{m.tasks} {t3(language, 'taken', 'tâches', 'tasks')}</span>
                  <span>{Math.round(m.hours * 10) / 10}h</span>
                  <span className="font-medium text-foreground">€{m.earned.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default VolunteerSeasonOverview;
