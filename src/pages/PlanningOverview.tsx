import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calendar, MapPin, Users, Layers, ChevronRight, Search } from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';

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

const PlanningOverview = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const nl = language === 'nl';

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [tasks, setTasks] = useState<TaskWithZones[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: ownedClubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id);
      let clubId = ownedClubs?.[0]?.id || null;
      if (!clubId) {
        const { data: memberships } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id);
        clubId = memberships?.[0]?.club_id || null;
      }
      if (!clubId) { setLoading(false); return; }

      // Fetch events & tasks
      const [evRes, taskRes] = await Promise.all([
        (supabase as any).from('events').select('id, title, event_date, location').eq('club_id', clubId).is('training_id', null).neq('event_type', 'training').order('event_date', { ascending: false }),
        (supabase as any).from('tasks').select('id, title, task_date, location, spots_available, event_id').eq('club_id', clubId).order('task_date', { ascending: true }),
      ]);

      setEvents(evRes.data || []);

      // For each task, count zones, signups and assignments
      const allTasks = taskRes.data || [];
      if (allTasks.length) {
        const taskIds = allTasks.map((t: any) => t.id);
        const [zoneRes, signupRes] = await Promise.all([
          (supabase as any).from('task_zones').select('id, task_id').in('task_id', taskIds),
          (supabase as any).from('task_signups').select('id, task_id').in('task_id', taskIds).eq('status', 'assigned'),
        ]);
        const zones = zoneRes.data || [];
        const signups = signupRes.data || [];

        // Get assignment counts
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

      setLoading(false);
    };
    init();
  }, [navigate]);

  const looseTasks = tasks.filter(t => !t.event_id);
  const getEventTasks = (eventId: string) => tasks.filter(t => t.event_id === eventId);

  const filteredEvents = events.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    if (e.title.toLowerCase().includes(s)) return true;
    return getEventTasks(e.id).some(t => t.title.toLowerCase().includes(s));
  });
  const filteredLooseTasks = looseTasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const TaskRow = ({ task }: { task: TaskWithZones }) => {
    const hasZones = task.zone_count > 0;
    return (
      <button
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
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{task.zone_count} {nl ? 'zones' : 'zones'}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{task.assignment_count}/{task.signup_count}</span>
          </div>
        </div>
        {hasZones && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        {!hasZones && <span className="text-[10px] text-muted-foreground shrink-0">{nl ? 'Geen zones' : 'No zones'}</span>}
      </button>
    );
  };

  return (
    <ClubPageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {nl ? 'Planning' : 'Planning'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {nl ? 'Selecteer een evenement of taak om vrijwilligers toe te wijzen aan zones' : 'Select an event or task to assign volunteers to zones'}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={nl ? 'Zoek evenement of taak...' : 'Search event or task...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Events with tasks */}
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
                {eventTasks.map(task => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Loose tasks */}
        {filteredLooseTasks.length > 0 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <h2 className="text-base font-heading font-semibold text-foreground">{nl ? 'Losse taken' : 'Standalone tasks'}</h2>
            </div>
            <div className="divide-y divide-border">
              {filteredLooseTasks.map(task => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {filteredEvents.length === 0 && filteredLooseTasks.length === 0 && (
          <div className="text-center py-12">
            <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{nl ? 'Geen evenementen of taken gevonden' : 'No events or tasks found'}</p>
          </div>
        )}
      </div>
    </ClubPageLayout>
  );
};

export default PlanningOverview;
