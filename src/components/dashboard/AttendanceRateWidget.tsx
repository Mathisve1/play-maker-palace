import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  clubId: string | null;
  language: Language;
}

const t3 = (l: Language, nl: string, fr: string, en: string) =>
  l === 'nl' ? nl : l === 'fr' ? fr : en;

const getSeasonRange = () => {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return { start: new Date(year, 6, 1), end: new Date(year + 1, 5, 30, 23, 59, 59) };
};

export const AttendanceRateWidget = ({ clubId, language }: Props) => {
  const [chartData, setChartData] = useState<{ month: string; rate: number }[]>([]);
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const season = getSeasonRange();

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, task_date')
        .eq('club_id', clubId)
        .gte('task_date', season.start.toISOString().split('T')[0])
        .lte('task_date', season.end.toISOString().split('T')[0]);

      if (!tasks || tasks.length === 0) return;

      const taskIds = tasks.map(t => t.id);
      const { data: signups } = await supabase
        .from('task_signups')
        .select('task_id, status, checked_in_at' as any)
        .in('task_id', taskIds)
        .eq('status', 'assigned') as any;

      if (!signups) return;

      const taskDateMap = new Map(tasks.map(t => [t.id, t.task_date]));
      const monthMap = new Map<string, { total: number; attended: number }>();

      // Generate month keys
      const now = new Date();
      const cursor = new Date(season.start);
      while (cursor <= season.end && cursor <= now) {
        const key = cursor.toLocaleDateString(locale, { month: 'short' });
        monthMap.set(key, { total: 0, attended: 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      signups.forEach(s => {
        const taskDate = taskDateMap.get(s.task_id);
        if (!taskDate) return;
        const key = new Date(taskDate).toLocaleDateString(locale, { month: 'short' });
        const entry = monthMap.get(key);
        if (!entry) return;
        entry.total++;
        if (s.checked_in_at) entry.attended++;
      });

      setChartData(Array.from(monthMap.entries()).map(([month, d]) => ({
        month,
        rate: d.total > 0 ? Math.round((d.attended / d.total) * 100) : 0,
      })));
    };
    load();
  }, [clubId, language]);

  return (
    <div className="w-full h-full bg-card rounded-2xl border border-border p-4">
      <p className="text-xs font-semibold text-foreground mb-2">
        {t3(language, 'Aanwezigheidsgraad', 'Taux de présence', 'Attendance Rate')}
      </p>
      {chartData.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          {t3(language, 'Geen data', 'Pas de données', 'No data')}
        </p>
      ) : (
        <div className="h-[calc(100%-28px)]" style={{ minHeight: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number) => [`${value}%`, t3(language, 'Aanwezigheid', 'Présence', 'Attendance')]}
              />
              <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
