import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { TrendingUp, Users, CalendarCheck, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import ClubOwnerSidebar from '@/components/ClubOwnerSidebar';
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

type TabKey = 'volunteers' | 'events' | 'retention';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
];

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [tab, setTab] = useState<TabKey>('volunteers');
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [clubInfo, setClubInfo] = useState<any>(null);

  // Data
  const [volunteerGrowth, setVolunteerGrowth] = useState<{ month: string; count: number; cumulative: number }[]>([]);
  const [eventAttendance, setEventAttendance] = useState<{ name: string; signups: number; spots: number; rate: number }[]>([]);
  const [retentionData, setRetentionData] = useState<{ month: string; returning: number; new: number; total: number; rate: number }[]>([]);
  const [topVolunteers, setTopVolunteers] = useState<{ name: string; tasks: number }[]>([]);
  const [kpis, setKpis] = useState({ totalVolunteers: 0, avgAttendance: 0, retentionRate: 0, activeThisMonth: 0 });

  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }

      const { data: profileData } = await supabase.from('profiles').select('full_name, email, avatar_url').eq('id', session.user.id).maybeSingle();
      setProfile(profileData);

      // Find club
      const { data: club } = await supabase.from('clubs').select('id, name, logo_url').eq('owner_id', session.user.id).maybeSingle();
      if (!club) {
        const { data: membership } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id).limit(1).maybeSingle();
        if (membership) {
          const { data: c } = await supabase.from('clubs').select('id, name, logo_url').eq('id', membership.club_id).maybeSingle();
          if (c) { setClubId(c.id); setClubInfo(c); }
        }
      } else {
        setClubId(club.id); setClubInfo(club);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!clubId) return;
    loadData();
  }, [clubId]);

  const loadData = async () => {
    if (!clubId) return;
    setLoading(true);

    const [membersRes, tasksRes, signupsRes, eventsRes] = await Promise.all([
      supabase.from('club_members').select('user_id, created_at').eq('club_id', clubId),
      supabase.from('tasks').select('id, title, spots_available, task_date, event_id').eq('club_id', clubId),
      supabase.from('task_signups').select('task_id, volunteer_id, status, signed_up_at'),
      supabase.from('events').select('id, title, event_date').eq('club_id', clubId).order('event_date', { ascending: false }).limit(50),
    ]);

    const members = membersRes.data || [];
    const tasks = tasksRes.data || [];
    const allSignups = signupsRes.data || [];
    const events = eventsRes.data || [];
    const taskIds = new Set(tasks.map(t => t.id));
    const signups = allSignups.filter(s => taskIds.has(s.task_id));

    // === Volunteer Growth (last 12 months) ===
    const now = new Date();
    const months: { month: string; count: number; cumulative: number }[] = [];
    let cumulative = 0;
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { month: 'short', year: '2-digit' });
      const count = members.filter(m => m.created_at.slice(0, 7) === monthKey).length;
      cumulative += count;
      months.push({ month: label, count, cumulative });
    }
    setVolunteerGrowth(months);

    // === Event Attendance ===
    const eventData = events.slice(0, 12).map(event => {
      const eventTasks = tasks.filter(t => t.event_id === event.id);
      const totalSpots = eventTasks.reduce((sum, t) => sum + (t.spots_available || 0), 0);
      const totalSignups = eventTasks.reduce((sum, t) => {
        return sum + signups.filter(s => s.task_id === t.id).length;
      }, 0);
      return {
        name: event.title.length > 20 ? event.title.slice(0, 18) + '…' : event.title,
        signups: totalSignups,
        spots: totalSpots,
        rate: totalSpots > 0 ? Math.round((totalSignups / totalSpots) * 100) : 0,
      };
    }).filter(e => e.spots > 0).reverse();
    setEventAttendance(eventData);

    // === Retention (month-over-month, using earliest signup per volunteer) ===
    // Build a map: volunteer_id -> earliest signup month
    const earliestSignup: Record<string, string> = {};
    signups.forEach(s => {
      const m = s.signed_up_at.slice(0, 7);
      if (!earliestSignup[s.volunteer_id] || m < earliestSignup[s.volunteer_id]) {
        earliestSignup[s.volunteer_id] = m;
      }
    });

    const retMonths: typeof retentionData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { month: 'short' });

      const activeThisMonth = new Set(
        signups.filter(s => s.signed_up_at.slice(0, 7) === monthKey).map(s => s.volunteer_id)
      );

      let returning = 0;
      let newV = 0;
      activeThisMonth.forEach(vid => {
        if (earliestSignup[vid] && earliestSignup[vid] < monthKey) {
          returning++;
        } else {
          newV++;
        }
      });

      const rate = (returning + newV) > 0 ? Math.round((returning / (returning + newV)) * 100) : 0;
      retMonths.push({ month: label, returning, new: newV, total: activeThisMonth.size, rate });
    }
    setRetentionData(retMonths);

    // === Top Volunteers ===
    const volCounts: Record<string, number> = {};
    signups.forEach(s => { volCounts[s.volunteer_id] = (volCounts[s.volunteer_id] || 0) + 1; });
    const topIds = Object.entries(volCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (topIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', topIds.map(t => t[0]));
      const nameMap = new Map((profiles || []).map(p => [p.id, p.full_name || 'Onbekend']));
      setTopVolunteers(topIds.map(([id, count]) => ({ name: nameMap.get(id) || 'Onbekend', tasks: count })));
    }

    // === KPIs ===
    const currentMonth = now.toISOString().slice(0, 7);
    const activeThisMonth = new Set(signups.filter(s => s.signed_up_at.slice(0, 7) === currentMonth).map(s => s.volunteer_id)).size;
    const avgAtt = eventData.length > 0 ? Math.round(eventData.reduce((s, e) => s + e.rate, 0) / eventData.length) : 0;
    const latestRet = retMonths.length > 0 ? retMonths[retMonths.length - 1].rate : 0;

    setKpis({
      totalVolunteers: members.length,
      avgAttendance: avgAtt,
      retentionRate: latestRet,
      activeThisMonth,
    });

    setLoading(false);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'volunteers', label: t3('Vrijwilligers', 'Bénévoles', 'Volunteers') },
    { key: 'events', label: t3('Evenementen', 'Événements', 'Events') },
    { key: 'retention', label: t3('Retentie', 'Rétention', 'Retention') },
  ];

  const kpiCards = [
    {
      label: t3('Totaal vrijwilligers', 'Total bénévoles', 'Total volunteers'),
      value: kpis.totalVolunteers,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: t3('Gem. opkomst', 'Présence moy.', 'Avg. attendance'),
      value: `${kpis.avgAttendance}%`,
      icon: CalendarCheck,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      trend: kpis.avgAttendance >= 75 ? 'up' : kpis.avgAttendance >= 50 ? 'flat' : 'down',
    },
    {
      label: t3('Retentie', 'Rétention', 'Retention'),
      value: `${kpis.retentionRate}%`,
      icon: TrendingUp,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      trend: kpis.retentionRate >= 60 ? 'up' : kpis.retentionRate >= 30 ? 'flat' : 'down',
    },
    {
      label: t3('Actief deze maand', 'Actifs ce mois', 'Active this month'),
      value: kpis.activeThisMonth,
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const TrendIcon = ({ trend }: { trend?: string }) => {
    if (trend === 'up') return <ArrowUpRight className="w-4 h-4 text-accent" />;
    if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const exportCsv = useCallback(() => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (tab === 'volunteers') {
      headers = [t3('Maand', 'Mois', 'Month'), t3('Nieuw', 'Nouveaux', 'New'), t3('Cumulatief', 'Cumulatif', 'Cumulative')];
      rows = volunteerGrowth.map(r => [r.month, String(r.count), String(r.cumulative)]);
    } else if (tab === 'events') {
      headers = [t3('Event', 'Événement', 'Event'), t3('Plaatsen', 'Places', 'Spots'), t3('Aanmeldingen', 'Inscriptions', 'Signups'), t3('Opkomst %', 'Présence %', 'Attendance %')];
      rows = eventAttendance.map(r => [r.name, String(r.spots), String(r.signups), `${r.rate}%`]);
    } else {
      headers = [t3('Maand', 'Mois', 'Month'), t3('Terugkerend', 'Retours', 'Returning'), t3('Nieuw', 'Nouveaux', 'New'), t3('Totaal', 'Total', 'Total'), t3('Retentie %', 'Rétention %', 'Retention %')];
      rows = retentionData.map(r => [r.month, String(r.returning), String(r.new), String(r.total), `${r.rate}%`]);
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tab, volunteerGrowth, eventAttendance, retentionData, language]);
    if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <ClubPageLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <PageNavTabs tabs={[
          { label: t3('Rapporten', 'Rapports', 'Reports'), path: '/reporting' },
          { label: 'Analytics', path: '/analytics' },
          { label: t3('Rapport Builder', 'Rapport Builder', 'Report Builder'), path: '/report-builder' },
          { label: 'Audit Log', path: '/audit-log' },
        ]} />
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
              {t3('Analytics', 'Analytique', 'Analytics')} 📊
            </h1>
            <p className="text-muted-foreground mt-1">
              {t3('Inzichten in vrijwilligersgroei, opkomst en retentie', 'Aperçu de la croissance, présence et rétention', 'Insights into volunteer growth, attendance and retention')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} className="shrink-0 gap-1.5">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t3('Exporteer CSV', 'Exporter CSV', 'Export CSV')}</span>
          </Button>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                {kpi.trend && <TrendIcon trend={kpi.trend} />}
              </div>
              <p className="text-2xl font-heading font-bold text-foreground">{loading ? '—' : kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Charts */}
        {!loading && (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {tab === 'volunteers' && (
              <>
                {/* Growth Chart */}
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <h3 className="font-heading font-semibold text-foreground mb-4">
                    {t3('Vrijwilligersgroei (12 maanden)', 'Croissance des bénévoles (12 mois)', 'Volunteer growth (12 months)')}
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={volunteerGrowth}>
                        <defs>
                          <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '13px' }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" fill="url(#growthGrad)" strokeWidth={2} name={t3('Totaal', 'Total', 'Total')} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.4} radius={[4, 4, 0, 0]} name={t3('Nieuw', 'Nouveaux', 'New')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Volunteers */}
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <h3 className="font-heading font-semibold text-foreground mb-4">
                    {t3('Top vrijwilligers', 'Top bénévoles', 'Top volunteers')}
                  </h3>
                  {topVolunteers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t3('Nog geen data', 'Pas encore de données', 'No data yet')}</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topVolunteers} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '13px' }} />
                          <Bar dataKey="tasks" fill="hsl(var(--accent))" radius={[0, 6, 6, 0]} name={t3('Taken', 'Tâches', 'Tasks')} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 'events' && (
              <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                <h3 className="font-heading font-semibold text-foreground mb-4">
                  {t3('Opkomst per event', 'Présence par événement', 'Attendance per event')}
                </h3>
                {eventAttendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t3('Nog geen events', 'Pas encore d\'événements', 'No events yet')}</p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventAttendance}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '13px' }} />
                        <Legend />
                        <Bar dataKey="spots" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name={t3('Plaatsen', 'Places', 'Spots')} />
                        <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t3('Aanmeldingen', 'Inscriptions', 'Signups')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {tab === 'retention' && (
              <>
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <h3 className="font-heading font-semibold text-foreground mb-4">
                    {t3('Retentie & nieuwe vrijwilligers', 'Rétention & nouveaux bénévoles', 'Retention & new volunteers')}
                  </h3>
                  {retentionData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t3('Nog geen data', 'Pas encore de données', 'No data yet')}</p>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={retentionData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '13px' }} />
                          <Legend />
                          <Bar dataKey="returning" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} name={t3('Terugkerend', 'Retours', 'Returning')} />
                          <Bar dataKey="new" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name={t3('Nieuw', 'Nouveaux', 'New')} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Retention rate line */}
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                  <h3 className="font-heading font-semibold text-foreground mb-4">
                    {t3('Retentiepercentage', 'Taux de rétention', 'Retention rate')}
                  </h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={retentionData}>
                        <defs>
                          <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} unit="%" />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '13px' }} formatter={(v: number) => `${v}%`} />
                        <Area type="monotone" dataKey="rate" stroke="hsl(var(--secondary))" fill="url(#retGrad)" strokeWidth={2} name={t3('Retentie %', 'Rétention %', 'Retention %')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </ClubPageLayout>
  );
};

export default AnalyticsDashboard;
