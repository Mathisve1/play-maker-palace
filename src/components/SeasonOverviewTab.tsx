import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Download, ArrowUpDown, Users } from 'lucide-react';
import { ContractTypeKey, CONTRACT_TYPES } from '@/components/ContractTypePicker';

interface SeasonVolRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  contractTypes: ContractTypeKey[];
  tasksAssigned: number;
  tasksAttended: number;
  attendanceRate: number;
  totalCompensation: number;
}

interface Props {
  clubId: string;
  seasonId: string;
  language: Language;
}

type SortKey = 'full_name' | 'tasksAssigned' | 'attendanceRate' | 'totalCompensation';

const SeasonOverviewTab = ({ clubId, seasonId, language }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const [rows, setRows] = useState<SeasonVolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('attendanceRate');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Get season date range
      const { data: season } = await supabase
        .from('seasons')
        .select('start_date, end_date')
        .eq('id', seasonId)
        .single();
      if (!season) { setLoading(false); return; }

      // Get tasks in this season
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, expense_amount')
        .eq('club_id', clubId)
        .gte('task_date', season.start_date)
        .lte('task_date', season.end_date);
      const taskIds = (tasks || []).map(t => t.id);
      if (taskIds.length === 0) { setRows([]); setLoading(false); return; }

      // Parallel: signups, memberships, hour_confirmations
      const [signupsRes, membershipsRes, hoursRes] = await Promise.all([
        (supabase as any).from('task_signups').select('volunteer_id, task_id, checked_in_at').in('task_id', taskIds),
        supabase.from('club_memberships').select('id, volunteer_id').eq('club_id', clubId).eq('status', 'actief'),
        supabase.from('hour_confirmations').select('volunteer_id, final_amount, task_id').in('task_id', taskIds),
      ]);

      const signups = (signupsRes.data || []) as any[];
      const memberships = (membershipsRes.data || []) as any[];
      const hours = (hoursRes.data || []) as any[];

      // Get member contract types
      const msIds = memberships.map((m: any) => m.id);
      let ctMap = new Map<string, ContractTypeKey[]>();
      if (msIds.length > 0) {
        const { data: ctData } = await supabase.from('member_contract_types' as any).select('membership_id, contract_type').in('membership_id', msIds);
        (ctData as any[] || []).forEach((ct: any) => {
          const arr = ctMap.get(ct.membership_id) || [];
          arr.push(ct.contract_type);
          ctMap.set(ct.membership_id, arr);
        });
      }
      const msMap = new Map(memberships.map((m: any) => [m.volunteer_id, m.id]));

      // Aggregate per volunteer
      const volIds = [...new Set(signups.map((s: any) => s.volunteer_id))];
      const { data: profiles } = volIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', volIds)
        : { data: [] as any[] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const result: SeasonVolRow[] = volIds.map(vid => {
        const volSignups = signups.filter((s: any) => s.volunteer_id === vid);
        const attended = volSignups.filter((s: any) => s.checked_in_at).length;
        const total = volSignups.length;
        const volHours = hours.filter((h: any) => h.volunteer_id === vid);
        const comp = volHours.reduce((sum: number, h: any) => sum + (h.final_amount || 0), 0);
        const prof = profileMap.get(vid);
        const msId = msMap.get(vid);

        return {
          id: vid,
          full_name: prof?.full_name || '?',
          avatar_url: prof?.avatar_url || null,
          contractTypes: msId ? ctMap.get(msId) || [] : [],
          tasksAssigned: total,
          tasksAttended: attended,
          attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 0,
          totalCompensation: comp,
        };
      });

      setRows(result);
      setLoading(false);
    };
    load();
  }, [clubId, seasonId]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [rows, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleExportCSV = () => {
    const header = `${t('Naam', 'Nom', 'Name')},${t('Contracttype', 'Type contrat', 'Contract type')},${t('Taken', 'Tâches', 'Tasks')},${t('Bijgewoond', 'Assisté', 'Attended')},${t('Aanwezigheid %', 'Présence %', 'Attendance %')},${t('Vergoeding', 'Compensation', 'Compensation')}\n`;
    const csvRows = sorted.map(r =>
      `"${r.full_name}","${r.contractTypes.join(', ')}",${r.tasksAssigned},${r.tasksAttended},${r.attendanceRate}%,€${r.totalCompensation.toFixed(2)}`
    ).join('\n');
    const blob = new Blob([header + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `season-overview.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? 'text-primary' : ''}`} />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>{t('Geen seizoensdata beschikbaar', 'Aucune donnée saisonnière', 'No season data available')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} {t('vrijwilligers', 'bénévoles', 'volunteers')}
        </p>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
          <Download className="w-4 h-4" />
          {t('Exporteer CSV', 'Exporter CSV', 'Export CSV')}
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_80px_80px_80px_100px] gap-2 px-4 py-3 bg-muted/40 border-b border-border items-center">
          <SortHeader label={t('Naam', 'Nom', 'Name')} field="full_name" />
          <span className="text-xs font-semibold text-muted-foreground w-28">{t('Type', 'Type', 'Type')}</span>
          <SortHeader label={t('Taken', 'Tâches', 'Tasks')} field="tasksAssigned" />
          <span className="text-xs font-semibold text-muted-foreground">{t('Aanw.', 'Prés.', 'Att.')}</span>
          <SortHeader label="%" field="attendanceRate" />
          <SortHeader label={t('Vergoed.', 'Comp.', 'Comp.')} field="totalCompensation" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
          {sorted.map(vol => (
            <div key={vol.id} className="grid grid-cols-[1fr_auto_80px_80px_80px_100px] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-8 w-8 shrink-0">
                  {vol.avatar_url && <AvatarImage src={vol.avatar_url} alt={vol.full_name} />}
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {vol.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground truncate">{vol.full_name}</span>
              </div>
              <div className="flex flex-wrap gap-1 w-28">
                {vol.contractTypes.length > 0
                  ? vol.contractTypes.map(ct => {
                      const def = CONTRACT_TYPES.find(c => c.key === ct);
                      return (
                        <Badge key={ct} variant="outline" className="text-[9px] px-1.5">
                          {def?.icon} {language === 'nl' ? def?.nl : language === 'fr' ? def?.fr : def?.en}
                        </Badge>
                      );
                    })
                  : <span className="text-xs text-muted-foreground">—</span>
                }
              </div>
              <span className="text-sm text-foreground text-center">{vol.tasksAssigned}</span>
              <span className="text-sm text-foreground text-center">{vol.tasksAttended}</span>
              <span className={`text-sm font-semibold text-center ${vol.attendanceRate < 50 ? 'text-destructive' : 'text-foreground'}`}>
                {vol.attendanceRate}%
              </span>
              <span className="text-sm text-foreground text-right">€{vol.totalCompensation.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SeasonOverviewTab;
