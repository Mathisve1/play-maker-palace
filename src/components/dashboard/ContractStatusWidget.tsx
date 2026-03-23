import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  clubId: string | null;
  language: Language;
}

const t3 = (l: Language, nl: string, fr: string, en: string) =>
  l === 'nl' ? nl : l === 'fr' ? fr : en;

export const ContractStatusWidget = ({ clubId, language }: Props) => {
  const [chartData, setChartData] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const [membersRes, contractsRes] = await Promise.all([
        supabase.from('club_memberships').select('volunteer_id').eq('club_id', clubId).eq('status', 'actief'),
        supabase.from('season_contracts' as any).select('volunteer_id, status').eq('club_id', clubId),
      ]);

      const totalMembers = (membersRes.data || []).length;
      const contracts = (contractsRes.data || []) as any[];
      const signed = new Set(contracts.filter(c => c.status === 'signed').map(c => c.volunteer_id)).size;
      const pending = new Set(contracts.filter(c => c.status === 'sent' || c.status === 'pending').map(c => c.volunteer_id)).size;
      const notSent = Math.max(totalMembers - signed - pending, 0);

      setChartData([
        { name: t3(language, 'Ondertekend', 'Signé', 'Signed'), value: signed, color: 'hsl(var(--primary))' },
        { name: t3(language, 'In afwachting', 'En attente', 'Pending'), value: pending, color: 'hsl(45 93% 47%)' },
        { name: t3(language, 'Niet verstuurd', 'Non envoyé', 'Not sent'), value: notSent, color: 'hsl(var(--muted-foreground))' },
      ]);
    };
    load();
  }, [clubId, language]);

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="w-full h-full bg-card rounded-2xl border border-border p-4">
      <p className="text-xs font-semibold text-foreground mb-2">
        {t3(language, 'Contractstatus', 'Statut contrats', 'Contract Status')}
      </p>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          {t3(language, 'Geen data', 'Pas de données', 'No data')}
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-24 h-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={2} strokeWidth={0}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 flex-1">
            {chartData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] text-muted-foreground flex-1">{d.name}</span>
                <span className="text-xs font-semibold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
