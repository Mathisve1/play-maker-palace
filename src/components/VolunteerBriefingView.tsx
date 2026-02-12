import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Clock, MapPin, FileText, Coffee, Phone, CheckSquare, ChevronDown, ChevronUp, Route } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import RouteMapEditor, { type Waypoint } from '@/components/RouteMapEditor';

type BlockType = 'time_slot' | 'instruction' | 'pause' | 'checklist' | 'emergency_contact' | 'route';

interface ChecklistItemData {
  id: string;
  label: string;
  sort_order: number;
}

interface BlockData {
  id: string;
  type: BlockType;
  sort_order: number;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  location?: string | null;
  title?: string | null;
  description?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_role?: string | null;
  checklist_items: ChecklistItemData[];
  waypoints: Waypoint[];
}

interface GroupData {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  blocks: BlockData[];
}

interface BriefingData {
  id: string;
  title: string;
  groups: GroupData[];
}

const labels = {
  nl: {
    briefing: 'Briefing',
    noBriefing: 'Nog geen briefing beschikbaar voor deze taak.',
    noBriefings: 'Je hebt nog geen briefings.',
    checkedItems: 'afgevinkt',
    emergency: 'Noodcontact',
  },
  fr: {
    briefing: 'Briefing',
    noBriefing: 'Aucun briefing disponible pour cette tâche.',
    noBriefings: 'Aucun briefing disponible.',
    checkedItems: 'complétés',
    emergency: 'Contact d\'urgence',
  },
  en: {
    briefing: 'Briefing',
    noBriefing: 'No briefing available for this task yet.',
    noBriefings: 'No briefings available yet.',
    checkedItems: 'checked',
    emergency: 'Emergency contact',
  },
};

const blockIcons: Record<BlockType, typeof Clock> = {
  time_slot: Clock,
  instruction: FileText,
  pause: Coffee,
  checklist: CheckSquare,
  emergency_contact: Phone,
  route: Route,
};

const blockColors: Record<BlockType, string> = {
  time_slot: 'border-l-blue-500',
  instruction: 'border-l-amber-500',
  pause: 'border-l-green-500',
  checklist: 'border-l-purple-500',
  emergency_contact: 'border-l-red-500',
  route: 'border-l-cyan-500',
};

interface VolunteerBriefingViewProps {
  taskId: string;
  language: Language;
  userId: string;
}

const VolunteerBriefingView = ({ taskId, language, userId }: VolunteerBriefingViewProps) => {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const l = labels[language];

  useEffect(() => {
    loadBriefing();
  }, [taskId]);

  const loadBriefing = async () => {
    setLoading(true);

    // Get briefing for this task
    const { data: b } = await supabase
      .from('briefings')
      .select('id, title')
      .eq('task_id', taskId)
      .maybeSingle();

    if (!b) { setLoading(false); return; }

    // Get groups the volunteer is assigned to
    const { data: allGroups } = await supabase
      .from('briefing_groups')
      .select('*')
      .eq('briefing_id', b.id)
      .order('sort_order');

    if (!allGroups || allGroups.length === 0) { setLoading(false); return; }

    const groupIds = allGroups.map(g => g.id);

    // Check which groups the volunteer is assigned to
    const { data: assignments } = await supabase
      .from('briefing_group_volunteers')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('volunteer_id', userId);

    const assignedGroupIds = new Set((assignments || []).map(a => a.group_id));
    
    // If no specific assignments, show all groups (fallback)
    const visibleGroups = assignedGroupIds.size > 0
      ? allGroups.filter(g => assignedGroupIds.has(g.id))
      : allGroups;

    if (visibleGroups.length === 0) { setLoading(false); return; }

    const visibleGroupIds = visibleGroups.map(g => g.id);

    // Load blocks
    const { data: blocks } = await supabase
      .from('briefing_blocks')
      .select('*')
      .in('group_id', visibleGroupIds)
      .order('sort_order');

    // Load checklist items
    const checklistBlockIds = (blocks || []).filter(bl => bl.type === 'checklist').map(bl => bl.id);
    let checklistItems: any[] = [];
    if (checklistBlockIds.length > 0) {
      const { data: items } = await supabase
        .from('briefing_checklist_items')
        .select('*')
        .in('block_id', checklistBlockIds)
        .order('sort_order');
      checklistItems = items || [];
    }

    // Load route waypoints
    const routeBlockIds = (blocks || []).filter(bl => bl.type === 'route').map(bl => bl.id);
    let routeWaypoints: any[] = [];
    if (routeBlockIds.length > 0) {
      const { data: wps } = await supabase
        .from('briefing_route_waypoints')
        .select('*')
        .in('block_id', routeBlockIds)
        .order('sort_order');
      routeWaypoints = wps || [];
    }

    // Load existing progress
    if (checklistItems.length > 0) {
      const itemIds = checklistItems.map(ci => ci.id);
      const { data: progress } = await supabase
        .from('briefing_checklist_progress')
        .select('checklist_item_id, checked')
        .in('checklist_item_id', itemIds)
        .eq('volunteer_id', userId);

      const checked = new Set<string>();
      (progress || []).forEach(p => { if (p.checked) checked.add(p.checklist_item_id); });
      setCheckedItems(checked);
    }

    const groups: GroupData[] = visibleGroups.map(g => ({
      id: g.id,
      name: g.name,
      color: g.color,
      sort_order: g.sort_order,
      blocks: (blocks || [])
        .filter(bl => bl.group_id === g.id)
        .map(bl => ({
          id: bl.id,
          type: bl.type as BlockType,
          sort_order: bl.sort_order,
          start_time: bl.start_time,
          end_time: bl.end_time,
          duration_minutes: bl.duration_minutes,
          location: bl.location,
          title: bl.title,
          description: bl.description,
          contact_name: bl.contact_name,
          contact_phone: bl.contact_phone,
          contact_role: bl.contact_role,
          checklist_items: checklistItems.filter(ci => ci.block_id === bl.id),
          waypoints: routeWaypoints
            .filter(wp => wp.block_id === bl.id)
            .map(wp => ({ id: wp.id, label: wp.label, description: wp.description, lat: wp.lat, lng: wp.lng, arrival_time: wp.arrival_time, sort_order: wp.sort_order })),
        })),
    }));

    setBriefing({ id: b.id, title: b.title, groups });
    setExpandedGroups(new Set(groups.map(g => g.id)));
    setLoading(false);
  };

  const toggleCheck = async (itemId: string) => {
    const newChecked = !checkedItems.has(itemId);

    // Optimistic update
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (newChecked) next.add(itemId); else next.delete(itemId);
      return next;
    });

    // Upsert progress
    if (newChecked) {
      await supabase.from('briefing_checklist_progress').upsert({
        checklist_item_id: itemId,
        volunteer_id: userId,
        checked: true,
        checked_at: new Date().toISOString(),
      }, { onConflict: 'checklist_item_id,volunteer_id' });
    } else {
      // Delete instead of setting to false for cleaner data
      await supabase.from('briefing_checklist_progress')
        .delete()
        .eq('checklist_item_id', itemId)
        .eq('volunteer_id', userId);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{l.noBriefing}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-semibold text-foreground">{briefing.title}</h3>

      {briefing.groups.map((group, gi) => {
        const totalChecklist = group.blocks
          .filter(b => b.type === 'checklist')
          .flatMap(b => b.checklist_items);
        const checkedCount = totalChecklist.filter(ci => checkedItems.has(ci.id)).length;
        const isExpanded = expandedGroups.has(group.id);

        return (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                <span className="font-medium text-foreground text-sm">{group.name}</span>
                {totalChecklist.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {checkedCount}/{totalChecklist.length} {l.checkedItems}
                  </span>
                )}
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {/* Blocks */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    {group.blocks.map(block => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        checkedItems={checkedItems}
                        onToggleCheck={toggleCheck}
                        language={language}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── Block Card ───
const BlockCard = ({
  block,
  checkedItems,
  onToggleCheck,
  language,
}: {
  block: BlockData;
  checkedItems: Set<string>;
  onToggleCheck: (id: string) => void;
  language: Language;
}) => {
  const Icon = blockIcons[block.type];
  const borderColor = blockColors[block.type];

  return (
    <div className={`border-l-4 ${borderColor} bg-muted/20 rounded-lg p-3 space-y-2`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        {block.title && <span className="text-sm font-medium text-foreground">{block.title}</span>}
      </div>

      {/* Time slot */}
      {block.type === 'time_slot' && (
        <div className="space-y-1 text-sm text-muted-foreground">
          {(block.start_time || block.end_time) && (
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{block.start_time}{block.end_time && ` — ${block.end_time}`}</span>
            </div>
          )}
          {block.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>{block.location}</span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {block.description && (
        <p className="text-sm text-muted-foreground">{block.description}</p>
      )}

      {/* Pause */}
      {block.type === 'pause' && block.duration_minutes && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coffee className="w-3.5 h-3.5" />
          <span>{block.duration_minutes} min</span>
          {block.location && (
            <>
              <span>—</span>
              <MapPin className="w-3.5 h-3.5" />
              <span>{block.location}</span>
            </>
          )}
        </div>
      )}

      {/* Emergency contact */}
      {block.type === 'emergency_contact' && (
        <div className="space-y-1 text-sm">
          {block.contact_name && (
            <p className="text-foreground font-medium">{block.contact_name}</p>
          )}
          {block.contact_role && (
            <p className="text-muted-foreground">{block.contact_role}</p>
          )}
          {block.contact_phone && (
            <a href={`tel:${block.contact_phone}`} className="text-primary hover:underline flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {block.contact_phone}
            </a>
          )}
        </div>
      )}

      {/* Checklist */}
      {block.type === 'checklist' && block.checklist_items.length > 0 && (
        <div className="space-y-2">
          {block.checklist_items.map(item => (
            <label
              key={item.id}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <Checkbox
                checked={checkedItems.has(item.id)}
                onCheckedChange={() => onToggleCheck(item.id)}
              />
              <span className={`text-sm transition-all ${
                checkedItems.has(item.id) 
                  ? 'text-muted-foreground line-through' 
                  : 'text-foreground'
              }`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Route */}
      {block.type === 'route' && block.waypoints.length > 0 && (
        <RouteMapEditor
          waypoints={block.waypoints}
          onChange={() => {}}
          language={language}
          readOnly
        />
      )}
    </div>
  );
};

// Simple clipboard icon fallback
const ClipboardIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);

// ─── Briefings List (for the tab on Volunteer Dashboard) ───
export const VolunteerBriefingsList = ({ language, userId }: { language: Language; userId: string }) => {
  const [briefings, setBriefings] = useState<{ id: string; title: string; taskId: string; taskTitle: string; clubName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const l = labels[language];

  useEffect(() => {
    loadBriefings();
  }, [userId]);

  const loadBriefings = async () => {
    // Get tasks the volunteer is signed up for
    const { data: signups } = await supabase
      .from('task_signups')
      .select('task_id')
      .eq('volunteer_id', userId);

    if (!signups || signups.length === 0) { setLoading(false); return; }

    const taskIds = signups.map(s => s.task_id);

    // Get briefings for those tasks
    const { data: briefingsData } = await supabase
      .from('briefings')
      .select('id, title, task_id')
      .in('task_id', taskIds);

    if (!briefingsData || briefingsData.length === 0) { setLoading(false); return; }

    // Get task + club info
    const briefingTaskIds = briefingsData.map(b => b.task_id);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, clubs(name)')
      .in('id', briefingTaskIds);

    const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);

    setBriefings(briefingsData.map(b => {
      const task = taskMap.get(b.task_id);
      return {
        id: b.id,
        title: b.title,
        taskId: b.task_id,
        taskTitle: task?.title || '',
        clubName: (task as any)?.clubs?.name || '',
      };
    }));

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedTaskId) {
    return (
      <div>
        <button
          onClick={() => setSelectedTaskId(null)}
          className="text-sm text-primary hover:underline mb-4 flex items-center gap-1"
        >
          ← {language === 'nl' ? 'Terug naar overzicht' : language === 'fr' ? 'Retour à la liste' : 'Back to overview'}
        </button>
        <VolunteerBriefingView taskId={selectedTaskId} language={language} userId={userId} />
      </div>
    );
  }

  if (briefings.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <ClipboardIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>{l.noBriefings}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {briefings.map((b, i) => (
        <motion.button
          key={b.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => setSelectedTaskId(b.taskId)}
          className="w-full text-left bg-card rounded-2xl p-4 shadow-card border border-transparent hover:border-primary/30 transition-all"
        >
          <p className="text-sm font-medium text-foreground">{b.taskTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{b.clubName} • {b.title}</p>
        </motion.button>
      ))}
    </div>
  );
};

export default VolunteerBriefingView;
