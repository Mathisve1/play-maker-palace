import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ClipboardList, CalendarCheck, UserCheck, Clock, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface Task {
  id: string;
  title: string;
  task_date: string | null;
  partner_acceptance_status: string;
  assigned_members: string[];
  spots_available: number;
  event_title?: string | null;
}

interface Props {
  tasks: Task[];
  memberCount: number;
}

const PartnerDashboardHome = ({ tasks, memberCount }: Props) => {
  const { language } = useLanguage();
  const nl = language === 'nl';

  const stats = useMemo(() => {
    const accepted = tasks.filter(t => t.partner_acceptance_status === 'accepted');
    const pending = tasks.filter(t => t.partner_acceptance_status === 'pending');
    const totalAssigned = accepted.reduce((sum, t) => sum + t.assigned_members.length, 0);
    const totalSpots = accepted.reduce((sum, t) => sum + t.spots_available, 0);
    const upcoming = accepted.filter(t => t.task_date && new Date(t.task_date) > new Date());
    const fillRate = totalSpots > 0 ? Math.round((totalAssigned / totalSpots) * 100) : 0;

    return { accepted: accepted.length, pending: pending.length, totalAssigned, totalSpots, upcoming: upcoming.length, fillRate };
  }, [tasks]);

  const kpis = [
    { icon: ClipboardList, label: nl ? 'Actieve taken' : 'Active tasks', value: stats.accepted, color: 'text-primary' },
    { icon: Clock, label: nl ? 'Wachtend' : 'Pending', value: stats.pending, color: 'text-amber-500' },
    { icon: CalendarCheck, label: nl ? 'Komende shifts' : 'Upcoming shifts', value: stats.upcoming, color: 'text-blue-500' },
    { icon: Users, label: nl ? 'Medewerkers' : 'Staff', value: memberCount, color: 'text-secondary' },
    { icon: UserCheck, label: nl ? 'Toegewezen' : 'Assigned', value: `${stats.totalAssigned}/${stats.totalSpots}`, color: 'text-green-500' },
    { icon: TrendingUp, label: nl ? 'Bezettingsgraad' : 'Fill rate', value: `${stats.fillRate}%`, color: 'text-accent' },
  ];

  const upcomingTasks = tasks
    .filter(t => t.partner_acceptance_status === 'accepted' && t.task_date && new Date(t.task_date) > new Date())
    .sort((a, b) => new Date(a.task_date!).getTime() - new Date(b.task_date!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming shifts */}
      <div>
        <h3 className="text-sm font-semibold mb-3">{nl ? '📅 Komende shifts' : '📅 Upcoming shifts'}</h3>
        {upcomingTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{nl ? 'Geen komende shifts.' : 'No upcoming shifts.'}</p>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map(t => (
              <Card key={t.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.event_title && <p className="text-[11px] text-primary">{t.event_title}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.task_date && new Date(t.task_date).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{t.assigned_members.length}/{t.spots_available}</p>
                    <p className="text-[11px] text-muted-foreground">{nl ? 'bezet' : 'filled'}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerDashboardHome;
