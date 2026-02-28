import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, MapPin, Calendar, ChevronRight, ChevronDown, Loader2, X, UserPlus, UserMinus } from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';

interface Zone {
  id: string;
  task_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  max_capacity: number | null;
  is_visible: boolean;
}

interface ZoneAssignment {
  id: string;
  zone_id: string;
  volunteer_id: string;
  assigned_by: string | null;
}

interface Volunteer {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface TaskInfo {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
}

const ZonePlanning = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const nl = language === 'nl';

  const [task, setTask] = useState<TaskInfo | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!taskId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/login'); return; }
    setUserId(session.user.id);

    const [taskRes, zoneRes, signupRes] = await Promise.all([
      (supabase as any).from('tasks').select('id, title, task_date, location').eq('id', taskId).maybeSingle(),
      (supabase as any).from('task_zones').select('*').eq('task_id', taskId).order('sort_order'),
      (supabase as any).from('task_signups').select('volunteer_id').eq('task_id', taskId).eq('status', 'assigned'),
    ]);

    setTask(taskRes.data);
    setZones(zoneRes.data || []);

    // Fetch assignments for all zones
    if (zoneRes.data?.length) {
      const zoneIds = zoneRes.data.map((z: Zone) => z.id);
      const { data: assignData } = await (supabase as any).from('task_zone_assignments').select('*').in('zone_id', zoneIds);
      setAssignments(assignData || []);
    }

    // Fetch volunteer profiles for assigned volunteers
    const volIds = (signupRes.data || []).map((s: any) => s.volunteer_id);
    if (volIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', volIds);
      setVolunteers(profiles || []);
    }

    // Expand all root zones by default
    if (zoneRes.data?.length) {
      const rootIds = zoneRes.data.filter((z: Zone) => !z.parent_id).map((z: Zone) => z.id);
      setExpanded(new Set(rootIds));
    }

    setLoading(false);
  }, [taskId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getChildren = (parentId: string | null) => zones.filter(z => z.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);
  const getAssignments = (zoneId: string) => assignments.filter(a => a.zone_id === zoneId);
  const getVolunteer = (volId: string) => volunteers.find(v => v.id === volId);

  const isAssignedAnywhere = (volId: string) => assignments.some(a => a.volunteer_id === volId);

  const unassignedVolunteers = volunteers.filter(v => !isAssignedAnywhere(v.id));

  const handleAssign = async (zoneId: string, volunteerId: string) => {
    if (!userId) return;
    // Check capacity
    const zone = zones.find(z => z.id === zoneId);
    if (zone?.max_capacity) {
      const current = getAssignments(zoneId).length;
      if (current >= zone.max_capacity) {
        toast.error(nl ? 'Zone zit vol!' : 'Zone is full!');
        return;
      }
    }

    const { data, error } = await (supabase as any).from('task_zone_assignments').insert({
      zone_id: zoneId,
      volunteer_id: volunteerId,
      assigned_by: userId,
    }).select('*').maybeSingle();

    if (error) {
      if (error.code === '23505') toast.error(nl ? 'Al toegewezen aan deze zone' : 'Already assigned to this zone');
      else toast.error(error.message);
    } else if (data) {
      setAssignments(prev => [...prev, data]);
      toast.success(nl ? 'Vrijwilliger toegewezen!' : 'Volunteer assigned!');
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    const { error } = await (supabase as any).from('task_zone_assignments').delete().eq('id', assignmentId);
    if (error) toast.error(error.message);
    else {
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast.success(nl ? 'Toewijzing verwijderd!' : 'Assignment removed!');
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [dragVolunteer, setDragVolunteer] = useState<string | null>(null);

  const renderZoneColumn = (zone: Zone, depth: number) => {
    const children = getChildren(zone.id);
    const zoneAssignments = getAssignments(zone.id);
    const isExpanded = expanded.has(zone.id);
    const isFull = zone.max_capacity ? zoneAssignments.length >= zone.max_capacity : false;

    return (
      <div key={zone.id} className="min-w-[240px]">
        <div
          className="rounded-2xl border border-border bg-card overflow-hidden"
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-primary'); }}
          onDragLeave={e => { e.currentTarget.classList.remove('ring-2', 'ring-primary'); }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.classList.remove('ring-2', 'ring-primary');
            if (dragVolunteer && !isFull) handleAssign(zone.id, dragVolunteer);
            setDragVolunteer(null);
          }}
        >
          {/* Zone header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              {children.length > 0 && (
                <button onClick={() => toggleExpand(zone.id)} className="text-muted-foreground hover:text-foreground">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              )}
              <h4 className="text-sm font-semibold text-foreground flex-1 truncate">{zone.name}</h4>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isFull ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                {zoneAssignments.length}{zone.max_capacity ? `/${zone.max_capacity}` : ''}
              </span>
            </div>
          </div>

          {/* Assigned volunteers */}
          <div className="p-2 space-y-1 min-h-[60px]">
            {zoneAssignments.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">{nl ? 'Sleep vrijwilligers hierheen' : 'Drag volunteers here'}</p>
            )}
            {zoneAssignments.map(a => {
              const vol = getVolunteer(a.volunteer_id);
              return (
                <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 group">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {vol?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm text-foreground flex-1 truncate">{vol?.full_name || vol?.email || 'Onbekend'}</span>
                  <button onClick={() => handleUnassign(a.id)} className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title={nl ? 'Verwijderen' : 'Remove'}>
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Children */}
        {isExpanded && children.length > 0 && (
          <div className="flex gap-3 mt-3 pl-4 overflow-x-auto">
            {children.map(child => renderZoneColumn(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!task) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">{nl ? 'Taak niet gevonden' : 'Task not found'}</p></div>;
  }

  const rootZones = getChildren(null);

  return (
    <ClubPageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {nl ? 'Terug' : 'Back'}
          </button>
          <h1 className="text-2xl font-heading font-bold text-foreground">{nl ? 'Zone Planning' : 'Zone Planning'}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{task.title}</span>
            {task.task_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(task.task_date).toLocaleDateString(nl ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short' })}</span>}
            {task.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{task.location}</span>}
          </div>
        </div>

        <div className="flex gap-6 min-h-[400px]">
          {/* Unassigned volunteers sidebar */}
          <div className="w-64 shrink-0">
            <div className="rounded-2xl border border-border bg-card overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" /> {nl ? 'Niet toegewezen' : 'Unassigned'}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{unassignedVolunteers.length}</span>
                </h3>
              </div>
              <div className="p-2 space-y-1 max-h-[500px] overflow-y-auto">
                {unassignedVolunteers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">{nl ? 'Alle vrijwilligers zijn toegewezen' : 'All volunteers assigned'}</p>
                )}
                {unassignedVolunteers.map(vol => (
                  <div
                    key={vol.id}
                    draggable
                    onDragStart={() => setDragVolunteer(vol.id)}
                    onDragEnd={() => setDragVolunteer(null)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {vol.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-foreground flex-1 truncate">{vol.full_name || vol.email || 'Onbekend'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Zone columns (Kanban) */}
          <div className="flex-1 overflow-x-auto">
            {rootZones.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">{nl ? 'Geen zones gedefinieerd. Ga naar de taak om zones aan te maken.' : 'No zones defined. Go to the task to create zones.'}</p>
              </div>
            ) : (
              <div className="flex gap-4">
                {rootZones.map(zone => renderZoneColumn(zone, 0))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ClubPageLayout>
  );
};

export default ZonePlanning;
