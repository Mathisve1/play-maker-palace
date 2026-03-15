import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { motion } from 'framer-motion';
import { CalendarRange, Users, FileSignature } from 'lucide-react';

interface Props {
  clubId: string | null;
  language: Language;
}

const t3 = (l: Language, nl: string, fr: string, en: string) =>
  l === 'nl' ? nl : l === 'fr' ? fr : en;

const getSeasonRange = () => {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    label: `${year}–${year + 1}`,
    start: new Date(year, 6, 1),
    end: new Date(year + 1, 5, 30, 23, 59, 59),
  };
};

export const SeasonProgressWidget = ({ clubId, language }: Props) => {
  const [data, setData] = useState({ activeVols: 0, signedContracts: 0, totalMembers: 0 });
  const season = getSeasonRange();
  const now = new Date();
  const elapsed = Math.min(Math.max((now.getTime() - season.start.getTime()) / (season.end.getTime() - season.start.getTime()), 0), 1);
  const percent = Math.round(elapsed * 100);

  const circleSize = 80;
  const strokeWidth = 7;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - elapsed);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const [membersRes, contractsRes, signupsRes] = await Promise.all([
        supabase.from('club_memberships').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'active'),
        supabase.from('season_contracts' as any).select('id, status').eq('club_id', clubId),
        supabase.from('task_signups').select('volunteer_id').eq('status', 'assigned'),
      ]);

      const totalMembers = membersRes.count || 0;
      const signed = ((contractsRes.data || []) as any[]).filter((c: any) => c.status === 'signed').length;
      const activeVols = new Set((signupsRes.data || []).map(s => s.volunteer_id)).size;

      setData({ activeVols, signedContracts: signed, totalMembers });
    };
    load();
  }, [clubId]);

  return (
    <div className="w-full h-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
      <div className="shrink-0">
        <svg width={circleSize} height={circleSize} viewBox={`0 0 ${circleSize} ${circleSize}`}>
          <circle cx={circleSize / 2} cy={circleSize / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          <motion.circle
            cx={circleSize / 2} cy={circleSize / 2} r={radius}
            fill="none" stroke="hsl(var(--primary))" strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
          />
          <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="text-sm font-bold fill-foreground">
            {percent}%
          </text>
        </svg>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="text-xs font-semibold text-foreground">{t3(language, 'Seizoen', 'Saison', 'Season')} {season.label}</p>
          <p className="text-[10px] text-muted-foreground">{percent}% {t3(language, 'verstreken', 'écoulé', 'elapsed')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="w-3 h-3" /> {data.activeVols}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <FileSignature className="w-3 h-3" /> {data.signedContracts}/{data.totalMembers}
          </div>
        </div>
      </div>
    </div>
  );
};
