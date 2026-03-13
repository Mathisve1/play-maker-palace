import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { TrendingUp, Euro, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import { Language } from '@/i18n/translations';

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface Props {
  userId: string;
  language: Language;
}

interface MonthData {
  month: string;
  label: string;
  earned: number;
}

const VolunteerFinancialDashboard = ({ userId, language }: Props) => {
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [totalThisYear, setTotalThisYear] = useState(0);
  const [totalLastYear, setTotalLastYear] = useState(0);
  const [loading, setLoading] = useState(true);

  const maxPlafond = 3233.91;
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      const seasonStart = new Date(year, 6, 1).toISOString();
      const seasonEnd = new Date(year + 1, 5, 30, 23, 59, 59).toISOString();

      // Get SEPA payouts this season
      const { data: sepa } = await supabase
        .from('sepa_batch_items')
        .select('amount, created_at, status')
        .eq('volunteer_id', userId);

      // Get volunteer payments
      const { data: payments } = await supabase
        .from('volunteer_payments')
        .select('amount, created_at, status')
        .eq('volunteer_id', userId)
        .eq('status', 'succeeded');

      // Get hour confirmations with final_amount
      const { data: hours } = await supabase
        .from('hour_confirmations')
        .select('final_amount, created_at, status')
        .eq('volunteer_id', userId)
        .eq('status', 'confirmed');

      // Build monthly map for current season
      const monthMap = new Map<string, number>();
      const months: MonthData[] = [];

      // Initialize 12 months of the season
      for (let i = 0; i < 12; i++) {
        const m = (6 + i) % 12;
        const y = m >= 6 ? year : year + 1;
        const key = `${y}-${String(m + 1).padStart(2, '0')}`;
        const label = new Date(y, m).toLocaleDateString(locale, { month: 'short' });
        monthMap.set(key, 0);
        months.push({ month: key, label, earned: 0 });
      }

      const addToMonth = (date: string, amount: number) => {
        const d = new Date(date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap.has(key)) {
          monthMap.set(key, (monthMap.get(key) || 0) + amount);
        }
      };

      (sepa || []).filter(s => s.status !== 'failed').forEach(s => addToMonth(s.created_at, Number(s.amount)));
      (payments || []).forEach(p => addToMonth(p.created_at, Number(p.amount)));
      (hours || []).filter(h => h.final_amount).forEach(h => addToMonth(h.created_at, h.final_amount!));

      let thisYearTotal = 0;
      months.forEach(m => {
        m.earned = monthMap.get(m.month) || 0;
        thisYearTotal += m.earned;
      });

      setMonthlyData(months);
      setTotalThisYear(Math.round(thisYearTotal * 100) / 100);

      // Simple last year comparison
      const prevSeasonStart = new Date(year - 1, 6, 1).toISOString();
      const prevSeasonEnd = new Date(year, 5, 30, 23, 59, 59).toISOString();
      const { data: prevSepa } = await supabase
        .from('sepa_batch_items')
        .select('amount, status')
        .eq('volunteer_id', userId)
        .gte('created_at', prevSeasonStart)
        .lte('created_at', prevSeasonEnd);
      const prevTotal = (prevSepa || []).filter(s => s.status !== 'failed').reduce((s, p) => s + Number(p.amount), 0);
      setTotalLastYear(Math.round(prevTotal * 100) / 100);

      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return null;

  const maxEarned = Math.max(...monthlyData.map(m => m.earned), 1);
  const plafondPct = Math.min((totalThisYear / maxPlafond) * 100, 100);
  const diff = totalThisYear - totalLastYear;
  const remaining = Math.max(maxPlafond - totalThisYear, 0);

  // Forecast: average monthly × remaining months
  const monthsWithData = monthlyData.filter(m => m.earned > 0).length || 1;
  const avgMonthly = totalThisYear / monthsWithData;
  const now = new Date();
  const currentSeasonMonth = now.getMonth() >= 6 ? now.getMonth() - 6 : now.getMonth() + 6;
  const remainingMonths = Math.max(12 - currentSeasonMonth - 1, 0);
  const forecast = Math.round((totalThisYear + avgMonthly * remainingMonths) * 100) / 100;
  const forecastExceeds = forecast > maxPlafond;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        {t3(language, 'Financieel overzicht', 'Aperçu financier', 'Financial overview')}
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl p-4 border border-border">
          <Euro className="w-4 h-4 text-primary mb-1" />
          <p className="text-xl font-heading font-bold text-foreground">€{totalThisYear.toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'Dit seizoen', 'Cette saison', 'This season')}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          <TrendingUp className="w-4 h-4 text-secondary mb-1" />
          <p className="text-xl font-heading font-bold text-foreground flex items-center gap-1">
            €{remaining.toFixed(0)}
          </p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'Nog beschikbaar', 'Encore disponible', 'Remaining')}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border">
          {diff >= 0 ? <ArrowUp className="w-4 h-4 text-green-500 mb-1" /> : <ArrowDown className="w-4 h-4 text-destructive mb-1" />}
          <p className="text-xl font-heading font-bold text-foreground">
            {diff >= 0 ? '+' : ''}€{diff.toFixed(0)}
          </p>
          <p className="text-[11px] text-muted-foreground">{t3(language, 'vs vorig seizoen', 'vs saison préc.', 'vs last season')}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-card rounded-2xl p-4 border border-border">
        <p className="text-xs font-medium text-muted-foreground mb-3">
          {t3(language, 'Maandelijks overzicht', 'Aperçu mensuel', 'Monthly overview')}
        </p>
        <div className="flex items-end gap-1 h-24">
          {monthlyData.map((m, i) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((m.earned / maxEarned) * 80, 2)}%` }}
                transition={{ delay: i * 0.03, duration: 0.4 }}
                className={`w-full rounded-t-md ${m.earned > 0 ? 'bg-primary' : 'bg-muted'}`}
                title={`€${m.earned.toFixed(2)}`}
              />
              <span className="text-[8px] text-muted-foreground leading-none">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast */}
      {avgMonthly > 0 && (
        <div className={`rounded-2xl p-3 border text-xs ${forecastExceeds ? 'bg-destructive/5 border-destructive/20 text-destructive' : 'bg-card border-border text-muted-foreground'}`}>
          <p>
            📊 {t3(language, 'Prognose einde seizoen', 'Prévision fin de saison', 'End of season forecast')}: <strong className="text-foreground">€{forecast.toFixed(0)}</strong>
            {forecastExceeds && ` — ${t3(language, '⚠️ Boven het jaarplafond!', '⚠️ Au-dessus du plafond !', '⚠️ Above the annual cap!')}`}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default VolunteerFinancialDashboard;
