import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, FileSignature, Clock, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))', 'hsl(var(--chart-4, 280 65% 60%))',
];

interface Props {
  clubId: string;
  language: string;
}

const labels: Record<string, Record<string, string>> = {
  nl: {
    title: 'Seizoensoverzicht',
    totalContracts: 'Seizoenscontracten',
    signed: 'Ondertekend',
    proef: 'Proefperiode',
    actief: 'Actief',
    totalHours: 'Totaal uren',
    avgCheckins: 'Gem. check-ins',
    contractStatus: 'Contractstatus',
    checkinsPerMonth: 'Check-ins per maand',
    volunteerOverview: 'Vrijwilligers seizoensoverzicht',
    name: 'Naam',
    status: 'Status',
    checkins: 'Check-ins',
    hours: 'Uren',
    lastCheckin: 'Laatste check-in',
    pending: 'Verzonden',
    noData: 'Geen seizoensdata beschikbaar',
    season: 'Seizoen',
  },
  fr: {
    title: 'Aperçu saisonnier',
    totalContracts: 'Contrats saisonniers',
    signed: 'Signés',
    proef: 'Période d\'essai',
    actief: 'Actif',
    totalHours: 'Heures totales',
    avgCheckins: 'Check-ins moy.',
    contractStatus: 'Statut des contrats',
    checkinsPerMonth: 'Check-ins par mois',
    volunteerOverview: 'Aperçu bénévoles saisonniers',
    name: 'Nom',
    status: 'Statut',
    checkins: 'Check-ins',
    hours: 'Heures',
    lastCheckin: 'Dernier check-in',
    pending: 'Envoyé',
    noData: 'Aucune donnée saisonnière disponible',
    season: 'Saison',
  },
  en: {
    title: 'Season Overview',
    totalContracts: 'Season Contracts',
    signed: 'Signed',
    proef: 'Trial period',
    actief: 'Active',
    totalHours: 'Total hours',
    avgCheckins: 'Avg. check-ins',
    contractStatus: 'Contract status',
    checkinsPerMonth: 'Check-ins per month',
    volunteerOverview: 'Volunteer season overview',
    name: 'Name',
    status: 'Status',
    checkins: 'Check-ins',
    hours: 'Hours',
    lastCheckin: 'Last check-in',
    pending: 'Sent',
    noData: 'No season data available',
    season: 'Season',
  },
};

interface SeasonContract {
  id: string;
  volunteer_id: string;
  status: string;
  checkin_count: number;
  volunteer_status: string;
  signed_at: string | null;
  season_id: string;
}

interface SeasonCheckin {
  id: string;
  volunteer_id: string;
  season_contract_id: string;
  checked_in_at: string;
  hours_worked: number | null;
}

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const ReportingSeasonTab = ({ clubId, language }: Props) => {
  const L = labels[language] || labels.nl;
  const [contracts, setContracts] = useState<SeasonContract[]>([]);
  const [checkins, setCheckins] = useState<SeasonCheckin[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [contractsRes, checkinsRes, seasonsRes] = await Promise.all([
        supabase.from('season_contracts').select('id, volunteer_id, status, checkin_count, volunteer_status, signed_at, season_id').eq('club_id', clubId),
        supabase.from('season_checkins').select('id, volunteer_id, season_contract_id, checked_in_at, hours_worked').eq('club_id', clubId),
        supabase.from('seasons').select('id, name, start_date, end_date, is_active').eq('club_id', clubId).order('start_date', { ascending: false }),
      ]);

      const contractsData: SeasonContract[] = contractsRes.data || [];
      const checkinsData: SeasonCheckin[] = checkinsRes.data || [];
      const seasonsData: Season[] = seasonsRes.data || [];

      setContracts(contractsData);
      setCheckins(checkinsData);
      setSeasons(seasonsData);

      // Fetch volunteer names
      const volunteerIds = [...new Set(contractsData.map(c => c.volunteer_id))];
      if (volunteerIds.length > 0) {
        const { data: profileData } = await supabase.from('profiles').select('id, full_name').in('id', volunteerIds);
        const map: Record<string, string> = {};
        profileData?.forEach((p: any) => { map[p.id] = p.full_name || 'Onbekend'; });
        setProfiles(map);
      }

      setLoading(false);
    };
    load();
  }, [clubId]);

  // KPIs
  const kpis = useMemo(() => {
    const total = contracts.length;
    const signed = contracts.filter(c => c.status === 'signed').length;
    const signedPct = total > 0 ? Math.round((signed / total) * 100) : 0;
    const proef = contracts.filter(c => c.volunteer_status === 'proef').length;
    const actief = contracts.filter(c => c.volunteer_status === 'actief').length;
    const totalHours = checkins.reduce((sum, ci) => sum + (ci.hours_worked || 0), 0);
    const avgCheckins = total > 0 ? Math.round((checkins.length / total) * 10) / 10 : 0;
    return { total, signed, signedPct, proef, actief, totalHours, avgCheckins };
  }, [contracts, checkins]);

  // Contract status pie
  const contractStatusPie = useMemo(() => {
    const signed = contracts.filter(c => c.status === 'signed').length;
    const sent = contracts.filter(c => c.status === 'sent').length;
    const pending = contracts.filter(c => c.status !== 'signed' && c.status !== 'sent').length;
    return [
      { name: L.signed, value: signed },
      { name: L.pending, value: sent },
      { name: 'Pending', value: pending },
    ].filter(d => d.value > 0);
  }, [contracts, L]);

  // Checkins per month bar chart
  const checkinsPerMonth = useMemo(() => {
    const monthMap: Record<string, number> = {};
    checkins.forEach(ci => {
      const month = format(parseISO(ci.checked_in_at), 'yyyy-MM');
      monthMap[month] = (monthMap[month] || 0) + 1;
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: format(parseISO(month + '-01'), 'MMM yyyy'),
        [L.checkins]: count,
      }));
  }, [checkins, L]);

  // Volunteer table data
  const volunteerRows = useMemo(() => {
    return contracts.map(c => {
      const myCheckins = checkins.filter(ci => ci.season_contract_id === c.id);
      const totalHours = myCheckins.reduce((sum, ci) => sum + (ci.hours_worked || 0), 0);
      const lastCheckin = myCheckins.length > 0
        ? myCheckins.sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at))[0].checked_in_at
        : null;
      return {
        id: c.id,
        name: profiles[c.volunteer_id] || '...',
        status: c.volunteer_status,
        checkins: c.checkin_count,
        hours: Math.round(totalHours * 10) / 10,
        lastCheckin,
        contractStatus: c.status,
      };
    }).sort((a, b) => b.checkins - a.checkins);
  }, [contracts, checkins, profiles]);

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">{L.noData}</div>;
  }

  if (contracts.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{L.noData}</p>
      </div>
    );
  }

  const activeSeason = seasons.find(s => s.is_active);

  return (
    <div className="space-y-6">
      {/* Season name */}
      {activeSeason && (
        <p className="text-sm text-muted-foreground">
          {L.season}: <span className="font-medium text-foreground">{activeSeason.name}</span>
          {' '}({format(parseISO(activeSeason.start_date), 'dd/MM/yyyy')} – {format(parseISO(activeSeason.end_date), 'dd/MM/yyyy')})
        </p>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: FileSignature, label: L.totalContracts, value: `${kpis.signed}/${kpis.total} (${kpis.signedPct}%)`, color: 'text-primary' },
          { icon: Users, label: L.proef, value: kpis.proef, color: 'text-amber-500' },
          { icon: CheckCircle2, label: L.actief, value: kpis.actief, color: 'text-emerald-500' },
          { icon: Clock, label: L.totalHours, value: `${Math.round(kpis.totalHours)}u`, color: 'text-primary' },
          { icon: TrendingUp, label: L.avgCheckins, value: kpis.avgCheckins, color: 'text-primary' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract status pie */}
        <Card>
          <CardHeader><CardTitle className="text-base">{L.contractStatus}</CardTitle></CardHeader>
          <CardContent>
            {contractStatusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie data={contractStatusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {contractStatusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">{L.noData}</p>}
          </CardContent>
        </Card>

        {/* Checkins per month */}
        <Card>
          <CardHeader><CardTitle className="text-base">{L.checkinsPerMonth}</CardTitle></CardHeader>
          <CardContent>
            {checkinsPerMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={checkinsPerMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey={L.checkins} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">{L.noData}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Volunteer table */}
      <Card>
        <CardHeader><CardTitle className="text-base">{L.volunteerOverview}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L.name}</TableHead>
                  <TableHead>{L.status}</TableHead>
                  <TableHead className="text-right">{L.checkins}</TableHead>
                  <TableHead className="text-right">{L.hours}</TableHead>
                  <TableHead>{L.lastCheckin}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volunteerRows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] bg-muted">{row.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'actief' ? 'default' : 'secondary'} className="text-[10px]">
                        {row.status === 'actief' ? L.actief : `${L.proef} ${row.checkins}/4`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.checkins}</TableCell>
                    <TableCell className="text-right">{row.hours}u</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.lastCheckin ? format(parseISO(row.lastCheckin), 'dd/MM/yyyy HH:mm') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportingSeasonTab;
