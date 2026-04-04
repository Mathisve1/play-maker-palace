import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, FileSignature, TrendingUp, Eye, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const AdminDashboard = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const t3 = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  // KPIs
  const [totalClubs, setTotalClubs] = useState(0);
  const [totalVolunteers, setTotalVolunteers] = useState(0);
  const [activeContracts, setActiveContracts] = useState(0);
  const [newClubsThisMonth, setNewClubsThisMonth] = useState(0);

  // Recent clubs
  const [recentClubs, setRecentClubs] = useState<{
    id: string; name: string; created_at: string; member_count: number;
  }[]>([]);

  // Chart
  const [clubsPerMonth, setClubsPerMonth] = useState<{ month: string; count: number }[]>([]);

  // Attention
  const [blockedVolunteers, setBlockedVolunteers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [inactiveVolunteers, setInactiveVolunteers] = useState<{ id: string; full_name: string; email: string; created_at: string }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [clubsRes, profilesRes, contractsRes, newClubsRes, recentRes, blockedRes] = await Promise.all([
      supabase.from('clubs').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('season_contracts').select('id', { count: 'exact', head: true }).in('status', ['active', 'signed']),
      supabase.from('clubs').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('clubs').select('id, name, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('id, full_name, email').eq('compliance_blocked', true).limit(20),
    ]);

    setTotalClubs(clubsRes.count || 0);
    setTotalVolunteers(profilesRes.count || 0);
    setActiveContracts(contractsRes.count || 0);
    setNewClubsThisMonth(newClubsRes.count || 0);
    setBlockedVolunteers((blockedRes.data || []).map(p => ({
      id: p.id, full_name: p.full_name || '', email: p.email || '',
    })));

    // Recent clubs with member counts
    const clubs = recentRes.data || [];
    if (clubs.length > 0) {
      const memberCounts = await Promise.all(
        clubs.map(c =>
          supabase.from('club_memberships').select('id', { count: 'exact', head: true }).eq('club_id', c.id).eq('status', 'actief')
        )
      );
      setRecentClubs(clubs.map((c, i) => ({
        id: c.id, name: c.name, created_at: c.created_at, member_count: memberCounts[i].count || 0,
      })));
    }

    // Clubs per month (last 6 months)
    const allClubsForChart = await supabase.from('clubs').select('created_at').order('created_at');
    const monthCounts: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthCounts[d.toISOString().slice(0, 7)] = 0;
    }
    (allClubsForChart.data || []).forEach(c => {
      const m = c.created_at.slice(0, 7);
      if (m in monthCounts) monthCounts[m]++;
    });
    setClubsPerMonth(Object.entries(monthCounts).map(([key, count]) => {
      const d = new Date(key + '-01');
      return {
        month: d.toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { month: 'short', year: '2-digit' }),
        count,
      };
    }));

    // Inactive volunteers: registered > 30 days ago with zero signups
    const oldProfiles = await supabase.from('profiles').select('id, full_name, email, created_at').lte('created_at', thirtyDaysAgo).limit(200);
    const oldIds = (oldProfiles.data || []).map(p => p.id);
    if (oldIds.length > 0) {
      const signupsRes = await supabase.from('task_signups').select('volunteer_id').in('volunteer_id', oldIds);
      const signedUpIds = new Set((signupsRes.data || []).map(s => s.volunteer_id));
      setInactiveVolunteers(
        (oldProfiles.data || [])
          .filter(p => !signedUpIds.has(p.id))
          .slice(0, 10)
          .map(p => ({ id: p.id, full_name: p.full_name || '', email: p.email || '', created_at: p.created_at }))
      );
    }

    setLoading(false);
  }, [language]);

  useEffect(() => { loadData(); }, [loadData]);

  const kpiCards = [
    {
      icon: Building2,
      label: t3('Totaal clubs', 'Total clubs', 'Total clubs'),
      value: totalClubs,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Users,
      label: t3('Totaal vrijwilligers', 'Total bénévoles', 'Total volunteers'),
      value: totalVolunteers,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      icon: FileSignature,
      label: t3('Actieve contracten', 'Contrats actifs', 'Active contracts'),
      value: activeContracts,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      icon: TrendingUp,
      label: t3('Nieuwe clubs deze maand', 'Nouveaux clubs ce mois', 'New clubs this month'),
      value: newClubsThisMonth,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" showText={false} linkTo="/admin" />
          <span className="font-heading font-bold text-lg text-foreground">
            {t3('Admin Dashboard', 'Tableau de bord Admin', 'Admin Dashboard')}
          </span>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t3('Uitloggen', 'Déconnexion', 'Logout')}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        {/* Title */}
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-heading font-bold text-foreground">
          {t3('Operationeel overzicht', 'Aperçu opérationnel', 'Operational overview')} 🛠️
        </motion.h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5">
                <div className={`w-9 h-9 rounded-xl ${kpi.bgColor} flex items-center justify-center mb-2`}>
                  <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
                </div>
                <p className="text-2xl font-heading font-bold text-foreground">
                  {loading ? '—' : kpi.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Chart + Recent Clubs */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Chart */}
          <Card className="lg:col-span-2 p-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">
              {t3('Nieuwe clubs per maand', 'Nouveaux clubs par mois', 'New clubs per month')}
            </h3>
            {!loading && (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clubsPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '13px' }} />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} name={t3('Clubs', 'Clubs', 'Clubs')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Recent Clubs Table */}
          <Card className="lg:col-span-3 p-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">
              {t3('Recente clubs', 'Clubs récents', 'Recent clubs')}
            </h3>
            {!loading && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t3('Clubnaam', 'Nom du club', 'Club name')}</TableHead>
                      <TableHead>{t3('Datum', 'Date', 'Date')}</TableHead>
                      <TableHead className="text-center">{t3('Leden', 'Membres', 'Members')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentClubs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          {t3('Geen clubs gevonden', 'Aucun club trouvé', 'No clubs found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentClubs.map(club => (
                        <TableRow key={club.id}>
                          <TableCell className="font-medium">{club.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatDate(club.created_at)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{club.member_count}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/club-dashboard')}>
                              <Eye className="w-3.5 h-3.5" />
                              {t3('Bekijk', 'Voir', 'View')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        {/* Attention Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Compliance blocked */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="font-heading font-semibold text-foreground">
                {t3('Compliance geblokkeerd', 'Conformité bloquée', 'Compliance blocked')}
              </h3>
            </div>
            {!loading && blockedVolunteers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t3('Geen geblokkeerde vrijwilligers', 'Aucun bénévole bloqué', 'No blocked volunteers')} ✅
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {blockedVolunteers.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.full_name || v.email}</p>
                      <p className="text-xs text-muted-foreground">{v.email}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {t3('Geblokkeerd', 'Bloqué', 'Blocked')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Inactive volunteers */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-heading font-semibold text-foreground">
                {t3('Inactieve vrijwilligers (>30 dagen)', 'Bénévoles inactifs (>30 jours)', 'Inactive volunteers (>30 days)')}
              </h3>
            </div>
            {!loading && inactiveVolunteers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t3('Iedereen is actief!', 'Tout le monde est actif!', 'Everyone is active!')} 🎉
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {inactiveVolunteers.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.full_name || v.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {t3('Geregistreerd op', 'Inscrit le', 'Registered on')} {formatDate(v.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {t3('Geen taken', 'Aucune tâche', 'No tasks')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
