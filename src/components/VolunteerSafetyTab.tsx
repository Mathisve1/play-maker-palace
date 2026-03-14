import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronDown, ChevronRight, ExternalLink, CheckCircle2, Circle, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Language } from '@/i18n/translations';

interface SafetyEvent {
  id: string;
  title: string;
  event_date: string | null;
  is_live: boolean;
  club_name: string;
}

interface ChecklistItem {
  id: string;
  event_id: string;
  zone_id: string | null;
  description: string;
  sort_order: number;
  assigned_volunteer_id: string | null;
  assigned_team_id: string | null;
}

interface SafetyZone {
  id: string;
  event_id: string;
  name: string;
  color: string;
  sort_order: number;
  event_group_id: string | null;
  checklist_active: boolean;
}

interface ChecklistProgress {
  checklist_item_id: string;
  is_completed: boolean;
}

interface Props {
  userId: string;
  language: Language;
  onPendingCountChange?: (count: number) => void;
}

const labels = {
  nl: {
    title: 'Safety Checklist',
    noEvents: 'Je bent nog niet aangemeld voor evenementen met een safety checklist.',
    checklist: 'Checklist',
    live: 'LIVE',
    goLive: 'Ga naar Live Dashboard',
    noZone: 'Algemeen',
    completed: 'voltooid',
  },
  fr: {
    title: 'Checklist Sécurité',
    noEvents: 'Vous n\'êtes inscrit à aucun événement avec une checklist de sécurité.',
    checklist: 'Checklist',
    live: 'LIVE',
    goLive: 'Aller au dashboard live',
    noZone: 'Général',
    completed: 'terminé',
  },
  en: {
    title: 'Safety Checklist',
    noEvents: 'You are not signed up for any events with a safety checklist.',
    checklist: 'Checklist',
    live: 'LIVE',
    goLive: 'Go to Live Dashboard',
    noZone: 'General',
    completed: 'completed',
  },
};

const VolunteerSafetyTab = ({ userId, language, onPendingCountChange }: Props) => {
  const navigate = useNavigate();
  const l = labels[language];
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [zones, setZones] = useState<SafetyZone[]>([]);
  const [progress, setProgress] = useState<ChecklistProgress[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    // 1. Get event IDs and group IDs from user's task signups
    const { data: signups } = await supabase
      .from('task_signups')
      .select('task_id')
      .eq('volunteer_id', userId);

    if (!signups || signups.length === 0) { setLoading(false); return; }

    const taskIds = signups.map(s => s.task_id);
    const { data: userTasks } = await supabase
      .from('tasks')
      .select('event_id, event_group_id')
      .in('id', taskIds)
      .not('event_id', 'is', null);

    const eventIds = [...new Set((userTasks || []).map(t => t.event_id!).filter(Boolean))];
    if (eventIds.length === 0) { setLoading(false); return; }

    // Collect the user's assigned group IDs per event
    const userGroupIds = new Set(
      (userTasks || []).map(t => t.event_group_id).filter(Boolean)
    );

    // Get user's safety team IDs
    const [{ data: teamMemberships }, { data: teamLeaderships }] = await Promise.all([
      supabase.from('safety_team_members').select('team_id').eq('volunteer_id', userId),
      supabase.from('safety_teams').select('id').eq('leader_id', userId).in('event_id', eventIds),
    ]);
    const userTeamIds = new Set([
      ...(teamMemberships || []).map(t => t.team_id),
      ...(teamLeaderships || []).map(t => t.id),
    ]);

    // 2. Get all zones for those events (with event_group_id)
    const { data: zonesData } = await supabase
      .from('safety_zones')
      .select('id, event_id, name, color, sort_order, event_group_id, checklist_active')
      .in('event_id', eventIds)
      .order('sort_order', { ascending: true });
    
    const allZones: SafetyZone[] = zonesData || [];
    
    // Filter zones to only those linked to the user's assigned groups (or unlinked zones)
    const myZones = allZones.filter(z => 
      !z.event_group_id || userGroupIds.has(z.event_group_id)
    );
    // If no groups assigned, only show unlinked zones/items
    const myZoneIds = new Set(myZones.map(z => z.id));
    setZones(myZones);

    // 3. Get checklist items for those events, filtered to user's zones
    const { data: checklistItems } = await supabase
      .from('safety_checklist_items')
      .select('id, event_id, zone_id, description, sort_order, assigned_volunteer_id, assigned_team_id')
      .in('event_id', eventIds)
      .order('sort_order', { ascending: true });

    // Only keep items that belong to the user's zones (or have no zone)
    // AND are assigned to this user/team, or have no assignment (visible to all)
    const filteredItems = (checklistItems || []).filter(i => {
      if (i.zone_id && !myZoneIds.has(i.zone_id)) return false;
      // If item has specific assignment, only show if it matches this user/team
      const hasAssignment = i.assigned_volunteer_id || i.assigned_team_id;
      if (hasAssignment) {
        const assignedToMe = i.assigned_volunteer_id === userId;
        const assignedToMyTeam = i.assigned_team_id && userTeamIds.has(i.assigned_team_id);
        return assignedToMe || assignedToMyTeam;
      }
      return true; // No assignment = visible to everyone in zone
    });

    if (filteredItems.length === 0) { setLoading(false); return; }

    // 4. Get events with checklist items
    const eventsWithChecklist = [...new Set(filteredItems.map(i => i.event_id))];
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, event_date, is_live, club_id')
      .in('id', eventsWithChecklist)
      .order('event_date', { ascending: true });

    if (eventsData && eventsData.length > 0) {
      const clubIds = [...new Set(eventsData.map(e => e.club_id))];
      const { data: clubs } = await supabase.from('clubs').select('id, name').in('id', clubIds);
      const clubMap = new Map(clubs?.map(c => [c.id, c.name]) || []);
      const mappedEvents = eventsData.map(e => ({ ...e, club_name: clubMap.get(e.club_id) || '' }));
      setEvents(mappedEvents);
      setExpandedEvents(new Set(eventsData.map(e => e.id)));

      // If event is already live when this tab loads, redirect immediately
      const liveEvent = mappedEvents.find(e => e.is_live);
      if (liveEvent) {
        navigate(`/safety/${liveEvent.id}`);
      }
    }

    setItems(filteredItems);

    // 5. Get progress
    const { data: progressData } = await supabase
      .from('safety_checklist_progress')
      .select('checklist_item_id, is_completed')
      .eq('volunteer_id', userId);
    setProgress(progressData || []);

    setLoading(false);
  }, [userId, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: listen for is_live changes on events — auto-navigate when live
  useEffect(() => {
    if (events.length === 0) return;
    const eventIds = events.map(e => e.id);
    const channels = eventIds.map(eid =>
      supabase
        .channel(`volunteer-safety-event-${eid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eid}` },
          (payload: any) => {
            if (payload.new.is_live !== undefined) {
              setEvents(prev => prev.map(e => e.id === eid ? { ...e, is_live: payload.new.is_live } : e));
              // Auto-navigate to live safety dashboard when event goes live
              if (payload.new.is_live === true) {
                navigate(`/safety/${eid}`);
              }
            }
            // When event is closed (status = 'closed'), remove it from the list
            if (payload.new.status === 'closed') {
              setEvents(prev => prev.filter(e => e.id !== eid));
            }
          })
        .subscribe()
    );
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [events.map(e => e.id).join(','), navigate]);

  // Realtime: listen for zone checklist_active changes
  useEffect(() => {
    if (zones.length === 0) return;
    const eventIds = [...new Set(zones.map(z => z.event_id))];
    const channels = eventIds.map(eid =>
      supabase
        .channel(`volunteer-safety-zones-${eid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'safety_zones', filter: `event_id=eq.${eid}` },
          (payload: any) => {
            setZones(prev => prev.map(z => z.id === payload.new.id ? { ...z, ...payload.new } : z));
          })
        .subscribe()
    );
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [zones.map(z => z.event_id).join(',')]);

  // Report pending count
  useEffect(() => {
    if (!onPendingCountChange) return;
    const completedSet = new Set(progress.filter(p => p.is_completed).map(p => p.checklist_item_id));
    const pending = items.filter(i => !completedSet.has(i.id)).length;
    onPendingCountChange(pending);
  }, [items, progress, onPendingCountChange]);

  const isCompleted = (itemId: string) => progress.some(p => p.checklist_item_id === itemId && p.is_completed);

  const toggleItem = async (itemId: string) => {
    const current = isCompleted(itemId);
    const newValue = !current;

    // Optimistic update
    setProgress(prev => {
      const existing = prev.find(p => p.checklist_item_id === itemId);
      if (existing) return prev.map(p => p.checklist_item_id === itemId ? { ...p, is_completed: newValue } : p);
      return [...prev, { checklist_item_id: itemId, is_completed: newValue }];
    });

    const { error } = await supabase
      .from('safety_checklist_progress')
      .upsert({
        checklist_item_id: itemId,
        volunteer_id: userId,
        is_completed: newValue,
        completed_at: newValue ? new Date().toISOString() : null,
      }, { onConflict: 'checklist_item_id,volunteer_id' });

    if (error) {
      toast.error(error.message);
      // Revert
      setProgress(prev => prev.map(p => p.checklist_item_id === itemId ? { ...p, is_completed: current } : p));
    }
  };

  const toggleExpand = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId); else next.add(eventId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{l.noEvents}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground">{l.title}</h1>

      {events.map(event => {
        const eventItems = items.filter(i => i.event_id === event.id);
        const completedCount = eventItems.filter(i => isCompleted(i.id)).length;
        const totalCount = eventItems.length;
        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const expanded = expandedEvents.has(event.id);

        // Group by zone
        const eventZones = zones.filter(z => z.event_id === event.id);
        const noZoneItems = eventItems.filter(i => !i.zone_id);
        const zoneGroups = eventZones.map(z => ({
          zone: z,
          items: eventItems.filter(i => i.zone_id === z.id),
        })).filter(g => g.items.length > 0);

        return (
          <div key={event.id} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Event header */}
            <button
              onClick={() => toggleExpand(event.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
            >
              {expanded ? <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground truncate">{event.title}</span>
                  {event.is_live ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{l.live}</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{l.checklist}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.club_name}
                  {event.event_date && ` · ${new Date(event.event_date).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB')}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-semibold text-foreground">{pct}%</span>
                <p className="text-[10px] text-muted-foreground">{completedCount}/{totalCount} {l.completed}</p>
              </div>
            </button>

            {/* Progress bar */}
            <div className="px-4 pb-2">
              <Progress value={pct} className="h-2" />
            </div>

            {/* Expanded content */}
            {expanded && (
              <div className="px-4 pb-4 space-y-4">
                {/* Go to live dashboard */}
                {event.is_live && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full"
                    onClick={() => navigate(`/safety/${event.id}`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    {l.goLive}
                  </Button>
                )}

                {/* No-zone items */}
                {noZoneItems.length > 0 && (
                  <ZoneChecklistGroup
                    label={l.noZone}
                    color="#6b7280"
                    items={noZoneItems}
                    isCompleted={isCompleted}
                    toggleItem={toggleItem}
                    completedLabel={l.completed}
                  />
                )}

                {/* Zone groups */}
                {zoneGroups.map(({ zone, items: zItems }) => (
                  <ZoneChecklistGroup
                    key={zone.id}
                    label={zone.name}
                    color={zone.color}
                    items={zItems}
                    isCompleted={isCompleted}
                    toggleItem={toggleItem}
                    completedLabel={l.completed}
                    isActive={zone.checklist_active}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Sub-component: zone group with progress + checklist items
const ZoneChecklistGroup = ({
  label, color, items, isCompleted, toggleItem, completedLabel, isActive = true,
}: {
  label: string;
  color: string;
  items: ChecklistItem[];
  isCompleted: (id: string) => boolean;
  toggleItem: (id: string) => void;
  completedLabel: string;
  isActive?: boolean;
}) => {
  const done = items.filter(i => isCompleted(i.id)).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-foreground flex-1">{label}</span>
        {isActive ? (
          <span className="text-[11px] text-muted-foreground">{done}/{items.length} {completedLabel}</span>
        ) : (
          <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
            <Lock className="w-3 h-3" /> Wacht op activatie
          </Badge>
        )}
      </div>
      {isActive && <Progress value={pct} className="h-1.5" />}
      <div className={`space-y-1 pl-5 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        {items.map(item => (
          <label
            key={item.id}
            className="flex items-start gap-2.5 py-1.5 cursor-pointer group"
          >
            <Checkbox
              checked={isCompleted(item.id)}
              onCheckedChange={() => toggleItem(item.id)}
              className="mt-0.5"
              disabled={!isActive}
            />
            <span className={`text-sm ${isCompleted(item.id) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {item.description}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default VolunteerSafetyTab;
