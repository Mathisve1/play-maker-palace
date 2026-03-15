import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Euro, TrendingUp, Award, FileSignature, Shield, ExternalLink, ChevronDown, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SeasonOverviewProps {
  userId: string;
  language: Language;
}

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

const getSeasonRange = () => {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    label: `${year}–${year + 1}`,
    start: new Date(year, 6, 1),
    end: new Date(year + 1, 5, 30, 23, 59, 59),
  };
};

interface SeasonContract {
  id: string;
  status: string;
  signing_url: string | null;
  document_url: string | null;
  template_category: string | null;
  season_name: string | null;
}

interface BadgeData {
  id: string;
  earned_at: string;
  name: string;
  description: string | null;
  icon: string;
}

interface MonthData {
  month: string;
  tasks: number;
  hours: number;
  earned: number;
}
interface SepaPaymentItem {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  batch_reference: string;
}

const VolunteerSeasonOverview = ({ userId, language }: SeasonOverviewProps) => {
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<SeasonContract | null>(null);
  const [stats, setStats] = useState({ totalTasks: 0, totalHours: 0, totalEarned: 0, clubs: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [sepaPayments, setSepaPayments] = useState<SepaPaymentItem[]>([]);
  const [showGdpr, setShowGdpr] = useState(false);

  const season = getSeasonRange();
  const now = new Date();
  const seasonElapsed = Math.min(
    Math.max((now.getTime() - season.start.getTime()) / (season.end.getTime() - season.start.getTime()), 0),
    1
  );
  const seasonPercent = Math.round(seasonElapsed * 100);

  const maxPlafond = 3233.91;

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Parallel fetch: season contract, signups, badges
      const [contractRes, signupsRes, badgesRes] = await Promise.all([
        supabase
          .from('season_contracts' as any)
          .select('id, status, signing_url, document_url, template_id, season_id')
          .eq('volunteer_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('task_signups')
          .select('task_id, signed_up_at')
          .eq('volunteer_id', userId)
          .eq('status', 'assigned'),
        supabase
          .from('volunteer_badges' as any)
          .select('id, earned_at, badge_id')
          .eq('volunteer_id', userId)
          .order('earned_at', { ascending: false })
          .limit(10),
      ]);

      // Process contract - enrich with template and season data
      if (contractRes.data && contractRes.data.length > 0) {
        const c = contractRes.data[0] as any;
        let templateCategory: string | null = null;
        let seasonName: string | null = null;

        if (c.template_id) {
          const { data: tmpl } = await supabase.from('season_contract_templates' as any).select('category').eq('id', c.template_id).limit(1);
          templateCategory = (tmpl as any)?.[0]?.category || null;
        }
        if (c.season_id) {
          const { data: seas } = await supabase.from('seasons' as any).select('name').eq('id', c.season_id).limit(1);
          seasonName = (seas as any)?.[0]?.name || null;
        }

        setContract({
          id: c.id,
          status: c.status,
          signing_url: c.signing_url,
          document_url: c.document_url,
          template_category: templateCategory,
          season_name: seasonName,
        });
      }

      // Process badges - enrich with definitions
      if (badgesRes.data && (badgesRes.data as any[]).length > 0) {
        const badgeIds = (badgesRes.data as any[]).map((b: any) => b.badge_id);
        const { data: defs } = await supabase.from('badge_definitions').select('id, name_nl, name_fr, name_en, description_nl, description_fr, description_en, icon').in('id', badgeIds);
        const defMap = new Map((defs || []).map(d => [d.id, d]));

        setBadges((badgesRes.data as any[]).map((b: any) => {
          const def = defMap.get(b.badge_id);
          return {
            id: b.id,
            earned_at: b.earned_at,
            name: language === 'nl' ? def?.name_nl : language === 'fr' ? def?.name_fr : def?.name_en,
            description: language === 'nl' ? def?.description_nl : language === 'fr' ? def?.description_fr : def?.description_en,
            icon: def?.icon || '🏅',
          };
        }));
      }

      // Process tasks
      const sups = signupsRes.data || [];
      if (sups.length === 0) {
        setStats({ totalTasks: 0, totalHours: 0, totalEarned: 0, clubs: 0 });
        setMonthlyData([]);
        setLoading(false);
        return;
      }

      const taskIds = sups.map(s => s.task_id);

      const [tasksRes, hourConfsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, task_date, start_time, end_time, expense_amount, club_id, hourly_rate, estimated_hours, daily_rate, compensation_type')
          .in('id', taskIds),
        supabase
          .from('hour_confirmations')
          .select('task_id, final_hours, final_amount')
          .eq('volunteer_id', userId)
          .eq('status', 'confirmed')
          .in('task_id', taskIds),
      ]);

      const hourMap = new Map((hourConfsRes.data || []).map(h => [h.task_id, h]));
      const seasonTasks = (tasksRes.data || []).filter(t => {
        if (!t.task_date) return false;
        const d = new Date(t.task_date);
        return d >= season.start && d <= season.end;
      });

      const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';
      const clubSet = new Set<string>();
      let totalHours = 0;
      let totalEarned = 0;
      const monthMap = new Map<string, { tasks: number; hours: number; earned: number }>();

      // Generate all months of the season
      const allMonths: string[] = [];
      const cursor = new Date(season.start);
      while (cursor <= season.end && cursor <= now) {
        allMonths.push(cursor.toLocaleDateString(locale, { month: 'short' }));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      allMonths.forEach(m => monthMap.set(m, { tasks: 0, hours: 0, earned: 0 }));

      seasonTasks.forEach(task => {
        clubSet.add(task.club_id);
        const monthKey = new Date(task.task_date!).toLocaleDateString(locale, { month: 'short' });
        const entry = monthMap.get(monthKey) || { tasks: 0, hours: 0, earned: 0 };
        entry.tasks++;

        const hc = hourMap.get(task.id);
        let hours = 0;
        if (hc?.final_hours) hours = hc.final_hours;
        else if (task.start_time && task.end_time) hours = (new Date(task.end_time).getTime() - new Date(task.start_time).getTime()) / 3600000;
        else if (task.estimated_hours) hours = task.estimated_hours;
        entry.hours += hours;
        totalHours += hours;

        let earned = 0;
        if (hc?.final_amount) earned = hc.final_amount;
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
      });

      setMonthlyData(Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        tasks: data.tasks,
        hours: Math.round(data.hours * 10) / 10,
        earned: Math.round(data.earned),
      })));

      setLoading(false);
    };
    load();
  }, [userId, language]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const plafondPercent = Math.min((stats.totalEarned / maxPlafond) * 100, 100);
  const contractStatus = contract?.status || 'none';

  // Circle progress SVG
  const circleSize = 120;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - seasonElapsed);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero block */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-6 md:p-8 flex flex-col md:flex-row items-center gap-6"
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
            {t3(language, 'Seizoen', 'Saison', 'Season')} {season.label}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {season.start.toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' → '}
            {season.end.toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {seasonPercent}% {t3(language, 'van het seizoen verstreken', 'de la saison écoulée', 'of season elapsed')}
          </p>
        </div>
        <div className="shrink-0">
          <svg width={circleSize} height={circleSize} viewBox={`0 0 ${circleSize} ${circleSize}`}>
            <circle
              cx={circleSize / 2} cy={circleSize / 2} r={radius}
              fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
            />
            <motion.circle
              cx={circleSize / 2} cy={circleSize / 2} r={radius}
              fill="none" stroke="hsl(var(--primary))" strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
              transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
            />
            <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="text-xl font-bold fill-foreground">
              {seasonPercent}%
            </text>
          </svg>
        </div>
      </motion.div>

      {/* Contract status card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <FileSignature className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t3(language, 'Seizoenscontract', 'Contrat saisonnier', 'Season Contract')}
          </p>
          {contract?.template_category && (
            <p className="text-xs text-muted-foreground capitalize">{contract.template_category.replace('_', ' ')}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {contractStatus === 'signed' && (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20">
              {t3(language, 'Ondertekend', 'Signé', 'Signed')}
            </Badge>
          )}
          {contractStatus === 'pending' && (
            <>
              <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20">
                {t3(language, 'In afwachting', 'En attente', 'Pending')}
              </Badge>
              {contract?.signing_url && (
                <Button size="sm" onClick={() => window.open(contract.signing_url!, '_blank')} className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t3(language, 'Onderteken nu', 'Signer', 'Sign now')}
                </Button>
              )}
            </>
          )}
          {contractStatus === 'none' && (
            <Badge variant="outline" className="text-muted-foreground">
              {t3(language, 'Niet ontvangen', 'Non reçu', 'Not received')}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Calendar, value: stats.totalTasks, label: t3(language, 'Taken voltooid', 'Tâches terminées', 'Tasks completed'), color: 'primary' },
          { icon: Clock, value: `${stats.totalHours}h`, label: t3(language, 'Uren gewerkt', 'Heures travaillées', 'Hours worked'), color: 'secondary' },
          { icon: Euro, value: `€${stats.totalEarned.toFixed(0)}`, label: t3(language, 'Totaal verdiend', 'Total gagné', 'Total earned'), color: 'accent' },
          { icon: TrendingUp, value: stats.clubs, label: t3(language, 'Clubs geholpen', 'Clubs aidés', 'Clubs helped'), color: 'primary' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-card rounded-2xl p-4 border border-border"
          >
            <div className={`w-8 h-8 rounded-lg bg-${stat.color}/10 flex items-center justify-center mb-2`}>
              <stat.icon className={`w-4 h-4 text-${stat.color}`} />
            </div>
            <p className="text-xl font-heading font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Plafond bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl p-5 border border-border"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t3(language, 'Jaarplafond vrijwilligersvergoeding', 'Plafond annuel', 'Annual volunteer cap')}
          </p>
          <p className="text-xs font-semibold text-foreground">€{stats.totalEarned.toFixed(2)} / €{maxPlafond.toFixed(2)}</p>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${plafondPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${plafondPercent > 80 ? 'bg-destructive' : plafondPercent > 50 ? 'bg-yellow-500' : 'bg-primary'}`}
          />
        </div>
        {plafondPercent > 80 && (
          <p className="text-[11px] text-destructive mt-1.5 font-medium">
            ⚠️ {t3(language, 'Je nadert het jaarplafond!', 'Vous approchez le plafond!', 'Approaching annual cap!')}
          </p>
        )}
      </motion.div>

      {/* Monthly bar chart */}
      {monthlyData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card rounded-2xl p-5 border border-border"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t3(language, 'Maandelijks overzicht', 'Aperçu mensuel', 'Monthly overview')}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    name === 'tasks' ? t3(language, 'Taken', 'Tâches', 'Tasks') : t3(language, 'Uren', 'Heures', 'Hours'),
                  ]}
                />
                <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hours" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Badge showcase */}
      {badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl p-5 border border-border"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            {t3(language, 'Behaalde badges', 'Badges obtenus', 'Earned badges')}
          </h3>
          <div className="flex flex-wrap gap-3">
            {badges.map(b => (
              <div
                key={b.id}
                className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 border border-border"
              >
                <span className="text-lg">{b.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{b.name}</p>
                  {b.description && <p className="text-[10px] text-muted-foreground">{b.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* GDPR block */}
      <Collapsible open={showGdpr} onOpenChange={setShowGdpr}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-card rounded-2xl border border-border overflow-hidden"
        >
          <CollapsibleTrigger className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t3(language, 'Jouw data', 'Vos données', 'Your data')}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {t3(language, 'Bekijk welke gegevens we opslaan', 'Voir les données stockées', 'View stored data')}
                </p>
              </div>
            </div>
            <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 space-y-2 text-xs text-muted-foreground">
              <p>• {t3(language, 'Profiel: naam, e-mail, telefoonnummer, avatar', 'Profil: nom, e-mail, téléphone, avatar', 'Profile: name, email, phone, avatar')}</p>
              <p>• {t3(language, 'Bankgegevens: IBAN en rekeninghouder (voor vergoedingen)', 'Données bancaires: IBAN (pour remboursements)', 'Bank details: IBAN and holder (for reimbursements)')}</p>
              <p>• {t3(language, 'Taakgeschiedenis: inschrijvingen, uren, vergoedingen', 'Historique: inscriptions, heures, remboursements', 'Task history: signups, hours, payments')}</p>
              <p>• {t3(language, 'Contracten: ondertekende seizoenscontracten', 'Contrats: contrats saisonniers signés', 'Contracts: signed season contracts')}</p>
              <p>• {t3(language, 'Beschikbaarheid en voorkeuren', 'Disponibilité et préférences', 'Availability and preferences')}</p>
              <p className="pt-2 text-[11px]">
                {t3(language,
                  'Op basis van de AVG heb je recht op inzage, correctie en verwijdering van je gegevens. Neem contact op met je club voor een verzoek.',
                  'Conformément au RGPD, vous avez le droit d\'accéder, de corriger et de supprimer vos données.',
                  'Under GDPR, you have the right to access, correct and delete your data. Contact your club for requests.'
                )}
              </p>
            </div>
          </CollapsibleContent>
        </motion.div>
      </Collapsible>
    </div>
  );
};

export default VolunteerSeasonOverview;
