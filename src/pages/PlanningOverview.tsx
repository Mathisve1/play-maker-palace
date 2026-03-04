import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, MapPin, Users, Layers, ChevronRight, Search, Play, Trash2, BookOpen, Shield, CalendarDays, ClipboardList, FileText } from 'lucide-react';
import { toast } from 'sonner';
import ClubPageLayout from '@/components/ClubPageLayout';
import PlanningOnboardingTour from '@/components/PlanningOnboardingTour';
import SafetyConfigDialog from '@/components/SafetyConfigDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface EventData {
  id: string;
  title: string;
  event_date: string | null;
  location: string | null;
}

interface TaskWithZones {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  event_id: string | null;
  zone_count: number;
  signup_count: number;
  assignment_count: number;
}

interface MonthlyPlanSummary {
  id: string;
  year: number;
  month: number;
  title: string;
  status: string;
  task_count: number;
  enrollment_count: number;
}

const MONTH_NAMES: Record<string, string[]> = {
  nl: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const PlanningOverview = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const nl = language === 'nl';
  const fr = language === 'fr';
  const t3 = (nlS: string, frS: string, enS: string) => nl ? nlS : fr ? frS : enS;

  const activeTab = searchParams.get('tab') || 'events';

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [tasks, setTasks] = useState<TaskWithZones[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlanSummary[]>([]);
  const [search, setSearch] = useState('');
  const [clubId, setClubId] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoDeleteLoading, setDemoDeleteLoading] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showPostDemoCta, setShowPostDemoCta] = useState(false);
  const [showSafetyRoles, setShowSafetyRoles] = useState(false);
  const [monthlyDemoLoading, setMonthlyDemoLoading] = useState(false);
  const [monthlyDemoDeleteLoading, setMonthlyDemoDeleteLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: ownedClubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id);
      let cId = ownedClubs?.[0]?.id || null;
      if (!cId) {
        const { data: memberships } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id);
        cId = memberships?.[0]?.club_id || null;
      }
      if (!cId) { setLoading(false); return; }
      setClubId(cId);

      // Fetch events, tasks, and monthly plans
      const [evRes, taskRes, monthlyRes] = await Promise.all([
        (supabase as any).from('events').select('id, title, event_date, location').eq('club_id', cId).is('training_id', null).neq('event_type', 'training').order('event_date', { ascending: false }),
        (supabase as any).from('tasks').select('id, title, task_date, location, spots_available, event_id').eq('club_id', cId).order('task_date', { ascending: true }),
        supabase.from('monthly_plans').select('id, year, month, title, status').eq('club_id', cId).order('year', { ascending: false }).order('month', { ascending: false }),
      ]);

      setEvents(evRes.data || []);

      // Enrich tasks with zone/signup counts
      const allTasks = taskRes.data || [];
      if (allTasks.length) {
        const taskIds = allTasks.map((t: any) => t.id);
        const [zoneRes, signupRes] = await Promise.all([
          (supabase as any).from('task_zones').select('id, task_id').in('task_id', taskIds),
          (supabase as any).from('task_signups').select('id, task_id').in('task_id', taskIds).eq('status', 'assigned'),
        ]);
        const zones = zoneRes.data || [];
        const signups = signupRes.data || [];
        const zoneIds = zones.map((z: any) => z.id);
        let assignmentMap: Record<string, number> = {};
        if (zoneIds.length) {
          const { data: assignments } = await (supabase as any).from('task_zone_assignments').select('id, zone_id').in('zone_id', zoneIds);
          const zoneToTask: Record<string, string> = {};
          zones.forEach((z: any) => { zoneToTask[z.id] = z.task_id; });
          (assignments || []).forEach((a: any) => {
            const tId = zoneToTask[a.zone_id];
            if (tId) assignmentMap[tId] = (assignmentMap[tId] || 0) + 1;
          });
        }
        const enriched: TaskWithZones[] = allTasks.map((t: any) => ({
          ...t,
          zone_count: zones.filter((z: any) => z.task_id === t.id).length,
          signup_count: signups.filter((s: any) => s.task_id === t.id).length,
          assignment_count: assignmentMap[t.id] || 0,
        }));
        setTasks(enriched);
      }

      // Enrich monthly plans with counts
      const plans = monthlyRes.data || [];
      if (plans.length) {
        const planIds = plans.map((p: any) => p.id);
        const [taskCountRes, enrollCountRes] = await Promise.all([
          supabase.from('monthly_plan_tasks').select('id, plan_id').in('plan_id', planIds),
          supabase.from('monthly_enrollments').select('id, plan_id').in('plan_id', planIds),
        ]);
        const planTasks = taskCountRes.data || [];
        const planEnrolls = enrollCountRes.data || [];
        setMonthlyPlans(plans.map((p: any) => ({
          ...p,
          task_count: planTasks.filter((t: any) => t.plan_id === p.id).length,
          enrollment_count: planEnrolls.filter((e: any) => e.plan_id === p.id).length,
        })));
      }

      setLoading(false);
    };
    init();
  }, [navigate]);

  const hasDemoEvent = events.some(e => e.title === 'Demo Voetbalwedstrijd 2026');
  const looseTasks = tasks.filter(t => !t.event_id);
  const getEventTasks = (eventId: string) => tasks.filter(t => t.event_id === eventId);

  const filteredEvents = events.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    if (e.title.toLowerCase().includes(s)) return true;
    return getEventTasks(e.id).some(t => t.title.toLowerCase().includes(s));
  });
  const filteredLooseTasks = looseTasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const handleStartDemo = async () => {
    if (!clubId) return;
    setDemoLoading(true);
    try {
      const res = await supabase.functions.invoke('planning-demo', {
        body: { club_id: clubId, action: 'create' },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(nl ? 'Demo aangemaakt! Pagina wordt herladen...' : 'Demo created! Reloading...');
      setShowPostDemoCta(true);
      setTimeout(() => window.location.reload(), 2500);
    } catch (err: any) {
      toast.error(err.message);
    }
    setDemoLoading(false);
  };

  const handleDeleteDemo = async () => {
    if (!clubId) return;
    setDemoDeleteLoading(true);
    try {
      const res = await supabase.functions.invoke('planning-demo', {
        body: { club_id: clubId, action: 'delete' },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(nl ? 'Demo data verwijderd!' : 'Demo data deleted!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message);
    }
    setDemoDeleteLoading(false);
  };

  const hasMonthlyDemo = monthlyPlans.some(p => p.title.includes('Demo Maandplan'));

  const handleStartMonthlyDemo = async () => {
    if (!clubId) return;
    setMonthlyDemoLoading(true);
    try {
      const res = await supabase.functions.invoke('monthly-planning-demo', {
        body: { club_id: clubId, action: 'create' },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(nl ? 'Maandplanning demo aangemaakt! Pagina wordt herladen...' : 'Monthly demo created! Reloading...');
      setTimeout(() => window.location.reload(), 2500);
    } catch (err: any) {
      toast.error(err.message);
    }
    setMonthlyDemoLoading(false);
  };

  const handleDeleteMonthlyDemo = async () => {
    if (!clubId) return;
    setMonthlyDemoDeleteLoading(true);
    try {
      const res = await supabase.functions.invoke('monthly-planning-demo', {
        body: { club_id: clubId, action: 'delete' },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(nl ? 'Maandplanning demo verwijderd!' : 'Monthly demo deleted!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message);
    }
    setMonthlyDemoDeleteLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const TaskRow = ({ task, isFirst }: { task: TaskWithZones; isFirst?: boolean }) => {
    const hasZones = task.zone_count > 0;
    return (
      <button
        data-tour={isFirst ? 'planning-task-first' : undefined}
        onClick={() => hasZones ? navigate(`/planning/${task.id}`) : null}
        disabled={!hasZones}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${hasZones ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${hasZones ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <Layers className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            {task.task_date && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(task.task_date).toLocaleDateString(nl ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short' })}</span>
            )}
            {task.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{task.location}</span>
            )}
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{task.zone_count} zones</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{task.assignment_count}/{task.signup_count}</span>
          </div>
        </div>
        {hasZones && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        {!hasZones && <span className="text-[10px] text-muted-foreground shrink-0">{nl ? 'Geen zones' : 'No zones'}</span>}
      </button>
    );
  };

  return (
    <>
    <ClubPageLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Planning
            </h1>
            <p className="text-muted-foreground mt-1">
              {nl ? 'Beheer event planning, losse taken en maandcontracten' : 'Manage event planning, standalone tasks and monthly contracts'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowSafetyRoles(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              <Shield className="w-4 h-4" /> {nl ? 'Safety Rollen' : 'Safety Roles'}
            </button>
            <button onClick={() => setShowTour(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              <BookOpen className="w-4 h-4" /> {nl ? 'Hoe werkt het?' : 'How does it work?'}
            </button>
            {hasDemoEvent ? (
              <button onClick={handleDeleteDemo} disabled={demoDeleteLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50">
                {demoDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {nl ? 'Demo wissen' : 'Delete demo'}
              </button>
            ) : (
              <button onClick={handleStartDemo} disabled={demoLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {nl ? 'Start demo' : 'Start demo'}
              </button>
            )}
          </div>
        </div>

        {/* Post-demo CTA */}
        {showPostDemoCta && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">🎉 {nl ? 'Demo is aangemaakt!' : 'Demo created!'}</p>
              <p className="text-xs text-muted-foreground mt-1">{nl ? 'Wil je leren hoe je dit zelf kunt opzetten?' : 'Want to learn how to set this up yourself?'}</p>
            </div>
            <button onClick={() => { setShowPostDemoCta(false); setShowTour(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <BookOpen className="w-4 h-4" /> {nl ? 'Maak nu zelf' : 'Create your own'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-12">
            <TabsTrigger value="events" className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              {nl ? 'Event Planning' : 'Event Planning'}
            </TabsTrigger>
            <TabsTrigger value="loose" className="flex items-center gap-2 text-sm">
              <ClipboardList className="w-4 h-4" />
              {nl ? 'Losse Taken' : 'Standalone Tasks'}
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4" />
              {nl ? 'Maandplanning' : 'Monthly Planning'}
            </TabsTrigger>
          </TabsList>

          {/* Search - shared */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={nl ? 'Zoek evenement of taak...' : 'Search event or task...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Tab: Event Planning */}
          <TabsContent value="events" className="space-y-4 mt-4">
            {filteredEvents.map(event => {
              const eventTasks = getEventTasks(event.id);
              if (!search && eventTasks.length === 0) return null;
              return (
                <div key={event.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30">
                    <h2 className="text-base font-heading font-semibold text-foreground">{event.title}</h2>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {event.event_date && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(event.event_date).toLocaleDateString(nl ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
                      )}
                      <span>{eventTasks.length} {nl ? 'taken' : 'tasks'}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {eventTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">{nl ? 'Geen taken' : 'No tasks'}</p>
                    )}
                    {eventTasks.map((task, ti) => (
                      <TaskRow key={task.id} task={task} isFirst={ti === 0 && task.zone_count > 0} />
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{nl ? 'Geen evenementen gevonden' : 'No events found'}</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Losse Taken */}
          <TabsContent value="loose" className="space-y-4 mt-4">
            {filteredLooseTasks.length > 0 ? (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <h2 className="text-base font-heading font-semibold text-foreground">{nl ? 'Losse taken' : 'Standalone tasks'}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{nl ? 'Taken die niet aan een evenement gekoppeld zijn' : 'Tasks not linked to an event'}</p>
                </div>
                <div className="divide-y divide-border">
                  {filteredLooseTasks.map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{nl ? 'Geen losse taken gevonden' : 'No standalone tasks found'}</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Maandplanning */}
          <TabsContent value="monthly" className="space-y-4 mt-4">
            {/* Info banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {nl ? 'Maandcontracten voor vrijwilligers' : 'Monthly contracts for volunteers'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {nl
                      ? 'Hier beheer je de planning voor vrijwilligers die onder een maandcontract vallen. Deze vrijwilligers worden maandelijks ingepland met een vast of variabel vergoed contract, conform de Belgische vrijwilligerswet.'
                      : 'Manage planning for volunteers under a monthly contract. These volunteers are scheduled monthly with fixed or variable compensation contracts, compliant with Belgian volunteer law.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Demo buttons */}
            <div className="flex gap-2">
              {hasMonthlyDemo ? (
                <button onClick={handleDeleteMonthlyDemo} disabled={monthlyDemoDeleteLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50">
                  {monthlyDemoDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {nl ? 'Demo wissen' : 'Delete demo'}
                </button>
              ) : (
                <button onClick={handleStartMonthlyDemo} disabled={monthlyDemoLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {monthlyDemoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {nl ? 'Start maandplanning demo' : 'Start monthly demo'}
                </button>
              )}
            </div>

            {monthlyPlans.length > 0 ? (
              <div className="space-y-3">
                {monthlyPlans.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => navigate(`/monthly-planning?y=${plan.year}&m=${plan.month}`)}
                    className="w-full bg-card rounded-2xl border border-border p-5 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {MONTH_NAMES_NL[plan.month - 1]} {plan.year}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>{plan.task_count} {nl ? 'taken' : 'tasks'}</span>
                            <span>{plan.enrollment_count} {nl ? 'vrijwilligers' : 'volunteers'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={plan.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                          {plan.status === 'published' ? (nl ? 'Gepubliceerd' : 'Published') : (nl ? 'Concept' : 'Draft')}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{nl ? 'Nog geen maandplannen aangemaakt' : 'No monthly plans created yet'}</p>
              </div>
            )}

            {/* Button to go to full monthly planning */}
            <button
              onClick={() => navigate('/monthly-planning')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <CalendarDays className="w-4 h-4" />
              {nl ? 'Naar maandplanning' : 'Go to monthly planning'}
            </button>
          </TabsContent>
        </Tabs>
      </div>
    </ClubPageLayout>
    <PlanningOnboardingTour open={showTour} onClose={() => setShowTour(false)} />
    {showSafetyRoles && clubId && (
      <SafetyConfigDialog
        open={showSafetyRoles}
        onClose={() => setShowSafetyRoles(false)}
        eventId=""
        clubId={clubId}
      />
    )}
    </>
  );
};

export default PlanningOverview;
