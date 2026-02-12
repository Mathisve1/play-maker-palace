import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Clock, MapPin, FileText, Coffee, Phone, CheckSquare, ChevronLeft, ChevronRight, Route, PenLine, AlertTriangle, CreditCard, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import RouteMapEditor, { type Waypoint } from '@/components/RouteMapEditor';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

type BlockType = 'time_slot' | 'instruction' | 'pause' | 'checklist' | 'emergency_contact' | 'route' | 'custom';

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
    page: 'Pagina',
    of: 'van',
    next: 'Volgende',
    previous: 'Vorige',
    sectionComplete: 'Sectie afgevinkt',
    markComplete: 'Markeer als voltooid',
    checklistFirst: 'Vink eerst alle checklist-items af',
    paymentReady: 'Alle secties zijn afgevinkt! Je kunt nu betaald worden.',
    goToPayment: 'Ga naar vergoedingen',
    mustComplete: 'Vink alle secties af om betaald te worden.',
    allSections: 'secties voltooid',
  },
  fr: {
    briefing: 'Briefing',
    noBriefing: 'Aucun briefing disponible pour cette tâche.',
    noBriefings: 'Aucun briefing disponible.',
    checkedItems: 'complétés',
    emergency: 'Contact d\'urgence',
    page: 'Page',
    of: 'de',
    next: 'Suivant',
    previous: 'Précédent',
    sectionComplete: 'Section complétée',
    markComplete: 'Marquer comme terminé',
    checklistFirst: 'Complétez d\'abord tous les éléments de la checklist',
    paymentReady: 'Toutes les sections sont complétées ! Vous pouvez maintenant être payé.',
    goToPayment: 'Voir les indemnités',
    mustComplete: 'Complétez toutes les sections pour être payé.',
    allSections: 'sections complétées',
  },
  en: {
    briefing: 'Briefing',
    noBriefing: 'No briefing available for this task yet.',
    noBriefings: 'No briefings available yet.',
    checkedItems: 'checked',
    emergency: 'Emergency contact',
    page: 'Page',
    of: 'of',
    next: 'Next',
    previous: 'Previous',
    sectionComplete: 'Section complete',
    markComplete: 'Mark as complete',
    checklistFirst: 'Complete all checklist items first',
    paymentReady: 'All sections complete! You can now be paid.',
    goToPayment: 'Go to payments',
    mustComplete: 'Complete all sections to get paid.',
    allSections: 'sections completed',
  },
};

const blockIcons: Record<BlockType, typeof Clock> = {
  time_slot: Clock,
  instruction: FileText,
  pause: Coffee,
  checklist: CheckSquare,
  emergency_contact: Phone,
  route: Route,
  custom: PenLine,
};

interface VolunteerBriefingViewProps {
  taskId: string;
  language: Language;
  userId: string;
  onNavigateToPayments?: () => void;
}

const VolunteerBriefingView = ({ taskId, language, userId, onNavigateToPayments }: VolunteerBriefingViewProps) => {
  const [briefings, setBriefingsForTask] = useState<BriefingData[]>([]);
  const [activeBriefingIdx, setActiveBriefingIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const l = labels[language];

  useEffect(() => {
    loadBriefing();
  }, [taskId]);

  const loadBriefing = async () => {
    setLoading(true);

    const { data: allBriefingsData } = await supabase
      .from('briefings')
      .select('id, title')
      .eq('task_id', taskId)
      .order('created_at');

    if (!allBriefingsData || allBriefingsData.length === 0) { setLoading(false); return; }

    const loadedBriefings: BriefingData[] = [];
    const newCheckedItems = new Set<string>();
    const newCompletedBlocks = new Set<string>();

    for (const b of allBriefingsData) {
      const { data: allGroups } = await supabase
        .from('briefing_groups')
        .select('*')
        .eq('briefing_id', b.id)
        .order('sort_order');

      if (!allGroups || allGroups.length === 0) continue;

      const groupIds = allGroups.map(g => g.id);

      const { data: assignments } = await supabase
        .from('briefing_group_volunteers')
        .select('group_id')
        .in('group_id', groupIds)
        .eq('volunteer_id', userId);

      const assignedGroupIds = new Set((assignments || []).map(a => a.group_id));
      const visibleGroups = assignedGroupIds.size > 0
        ? allGroups.filter(g => assignedGroupIds.has(g.id))
        : allGroups;

      if (visibleGroups.length === 0) continue;

      const visibleGroupIds = visibleGroups.map(g => g.id);

      const { data: blocks } = await supabase
        .from('briefing_blocks')
        .select('*')
        .in('group_id', visibleGroupIds)
        .order('sort_order');

      const allBlockIds = (blocks || []).map(bl => bl.id);

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

      // Load checklist progress
      if (checklistItems.length > 0) {
        const itemIds = checklistItems.map(ci => ci.id);
        const { data: progress } = await supabase
          .from('briefing_checklist_progress')
          .select('checklist_item_id, checked')
          .in('checklist_item_id', itemIds)
          .eq('volunteer_id', userId);
        (progress || []).forEach(p => { if (p.checked) newCheckedItems.add(p.checklist_item_id); });
      }

      // Load block progress
      if (allBlockIds.length > 0) {
        const { data: blockProg } = await supabase
          .from('briefing_block_progress')
          .select('block_id, completed')
          .in('block_id', allBlockIds)
          .eq('volunteer_id', userId);
        (blockProg || []).forEach(bp => { if (bp.completed) newCompletedBlocks.add(bp.block_id); });
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

      loadedBriefings.push({ id: b.id, title: b.title, groups });
    }

    setCheckedItems(newCheckedItems);
    setCompletedBlocks(newCompletedBlocks);
    setBriefingsForTask(loadedBriefings);
    setActiveBriefingIdx(0);
    setCurrentPage(0);
    setLoading(false);
  };

  const toggleCheck = async (itemId: string) => {
    const newChecked = !checkedItems.has(itemId);
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (newChecked) next.add(itemId); else next.delete(itemId);
      return next;
    });

    if (newChecked) {
      await supabase.from('briefing_checklist_progress').upsert({
        checklist_item_id: itemId,
        volunteer_id: userId,
        checked: true,
        checked_at: new Date().toISOString(),
      }, { onConflict: 'checklist_item_id,volunteer_id' });
    } else {
      await supabase.from('briefing_checklist_progress')
        .delete()
        .eq('checklist_item_id', itemId)
        .eq('volunteer_id', userId);
    }
  };

  const toggleBlockComplete = async (blockId: string, block: BlockData) => {
    // For checklist blocks, verify all items are checked
    if (block.type === 'checklist' && block.checklist_items.length > 0) {
      const allChecked = block.checklist_items.every(ci => checkedItems.has(ci.id));
      if (!allChecked) return; // can't complete if not all checked
    }

    const newCompleted = !completedBlocks.has(blockId);
    setCompletedBlocks(prev => {
      const next = new Set(prev);
      if (newCompleted) next.add(blockId); else next.delete(blockId);
      return next;
    });

    if (newCompleted) {
      await supabase.from('briefing_block_progress').upsert({
        block_id: blockId,
        volunteer_id: userId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'block_id,volunteer_id' });
    } else {
      await supabase.from('briefing_block_progress')
        .delete()
        .eq('block_id', blockId)
        .eq('volunteer_id', userId);
    }
  };

  // Calculate overall progress
  const allBlocks = briefings.flatMap(b => b.groups.flatMap(g => g.blocks));
  const totalBlocks = allBlocks.length;
  const totalCompleted = allBlocks.filter(b => completedBlocks.has(b.id)).length;
  const allComplete = totalBlocks > 0 && totalCompleted === totalBlocks;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (briefings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{l.noBriefing}</p>
      </div>
    );
  }

  const briefing = briefings[activeBriefingIdx];
  if (!briefing) return null;

  const totalPages = briefing.groups.length;
  const currentGroup = briefing.groups[currentPage];
  if (!currentGroup) return null;

  const groupBlocks = currentGroup.blocks;
  const groupCompleted = groupBlocks.filter(b => completedBlocks.has(b.id)).length;

  return (
    <div className="space-y-4">
      {/* Payment alert */}
      {totalBlocks > 0 && (
        <Alert variant={allComplete ? 'default' : 'destructive'} className={allComplete ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20' : ''}>
          <AlertDescription className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {allComplete ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">{l.paymentReady}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">{l.mustComplete} ({totalCompleted}/{totalBlocks} {l.allSections})</span>
                </>
              )}
            </div>
            {allComplete && onNavigateToPayments && (
              <Button size="sm" variant="outline" onClick={onNavigateToPayments} className="gap-1.5 border-green-500 text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-950/40">
                <CreditCard className="w-3.5 h-3.5" />
                {l.goToPayment}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Overall progress bar */}
      {totalBlocks > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalCompleted}/{totalBlocks} {l.allSections}</span>
            <span>{Math.round((totalCompleted / totalBlocks) * 100)}%</span>
          </div>
          <Progress value={(totalCompleted / totalBlocks) * 100} className="h-2" />
        </div>
      )}

      {/* Briefing selector if multiple */}
      {briefings.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {briefings.map((b, i) => (
            <button
              key={b.id}
              onClick={() => { setActiveBriefingIdx(i); setCurrentPage(0); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                i === activeBriefingIdx
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {b.title}
            </button>
          ))}
        </div>
      )}

      <h3 className="text-lg font-heading font-semibold text-foreground">{briefing.title}</h3>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="gap-1">
            <ChevronLeft className="w-4 h-4" />
            {l.previous}
          </Button>
          <div className="flex items-center gap-2">
            {briefing.groups.map((g, i) => {
              const gBlocks = g.blocks;
              const gDone = gBlocks.length > 0 && gBlocks.every(b => completedBlocks.has(b.id));
              return (
                <button
                  key={g.id}
                  onClick={() => setCurrentPage(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === currentPage
                      ? 'bg-primary scale-125'
                      : gDone
                        ? 'bg-green-500'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              );
            })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="gap-1">
            {l.next}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Current page/group */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentGroup.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="border-b border-border pb-3">
            <h4 className="text-base font-semibold text-foreground">{currentGroup.name}</h4>
            {totalPages > 1 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {l.page} {currentPage + 1} {l.of} {totalPages}
                {` · ${groupCompleted}/${groupBlocks.length} ${l.allSections}`}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {currentGroup.blocks.map(block => (
              <BlockCard
                key={block.id}
                block={block}
                checkedItems={checkedItems}
                completedBlocks={completedBlocks}
                onToggleCheck={toggleCheck}
                onToggleBlockComplete={toggleBlockComplete}
                language={language}
                labels={l}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ─── Block Card with section-level completion ───
const BlockCard = ({
  block,
  checkedItems,
  completedBlocks,
  onToggleCheck,
  onToggleBlockComplete,
  language,
  labels: l,
}: {
  block: BlockData;
  checkedItems: Set<string>;
  completedBlocks: Set<string>;
  onToggleCheck: (id: string) => void;
  onToggleBlockComplete: (blockId: string, block: BlockData) => void;
  language: Language;
  labels: typeof import('./VolunteerBriefingView').default extends never ? any : any;
}) => {
  const Icon = blockIcons[block.type];
  const isCompleted = completedBlocks.has(block.id);

  // For checklist blocks, check if all items are checked
  const isChecklistBlock = block.type === 'checklist' && block.checklist_items.length > 0;
  const allChecklistDone = isChecklistBlock && block.checklist_items.every(ci => checkedItems.has(ci.id));
  const canComplete = isChecklistBlock ? allChecklistDone : true;

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all ${
      isCompleted
        ? 'bg-green-50/50 dark:bg-green-950/10 border-green-300/50'
        : 'bg-card border-border'
    }`}>
      {/* Header */}
      {block.title && (
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{block.title}</span>
          {isCompleted && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
        </div>
      )}

      {/* Time slot */}
      {block.type === 'time_slot' && (
        <div className="space-y-1.5">
          {(block.start_time || block.end_time) && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{block.start_time}{block.end_time && ` — ${block.end_time}`}</span>
            </div>
          )}
          {block.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{block.location}</span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {block.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{block.description}</p>
      )}

      {/* Pause */}
      {block.type === 'pause' && block.duration_minutes && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Coffee className="w-4 h-4" />
            <span>{block.duration_minutes} min</span>
          </div>
          {block.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{block.location}</span>
            </div>
          )}
        </div>
      )}

      {/* Emergency contact */}
      {block.type === 'emergency_contact' && (
        <div className="space-y-1 text-sm">
          {block.contact_name && <p className="text-foreground font-medium">{block.contact_name}</p>}
          {block.contact_role && <p className="text-muted-foreground">{block.contact_role}</p>}
          {block.contact_phone && (
            <a href={`tel:${block.contact_phone}`} className="text-primary hover:underline flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              {block.contact_phone}
            </a>
          )}
        </div>
      )}

      {/* Checklist */}
      {isChecklistBlock && (
        <div className="space-y-2.5">
          {block.checklist_items.map(item => (
            <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={checkedItems.has(item.id)}
                onCheckedChange={() => onToggleCheck(item.id)}
                disabled={isCompleted}
              />
              <span className={`text-sm transition-all ${
                checkedItems.has(item.id) ? 'text-muted-foreground line-through' : 'text-foreground'
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

      {/* Section completion button */}
      <div className="pt-2 border-t border-border/50">
        {isCompleted ? (
          <button
            onClick={() => onToggleBlockComplete(block.id, block)}
            className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 hover:text-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            {l.sectionComplete}
          </button>
        ) : (
          <button
            onClick={() => canComplete && onToggleBlockComplete(block.id, block)}
            disabled={!canComplete}
            className={`flex items-center gap-2 text-xs transition-colors ${
              canComplete
                ? 'text-primary hover:text-primary/80 cursor-pointer'
                : 'text-muted-foreground/50 cursor-not-allowed'
            }`}
          >
            <Checkbox checked={false} disabled={!canComplete} className="pointer-events-none" />
            {canComplete ? l.markComplete : l.checklistFirst}
          </button>
        )}
      </div>
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
    const { data: signups } = await supabase
      .from('task_signups')
      .select('task_id')
      .eq('volunteer_id', userId);

    if (!signups || signups.length === 0) { setLoading(false); return; }

    const taskIds = signups.map(s => s.task_id);

    const { data: briefingsData } = await supabase
      .from('briefings')
      .select('id, title, task_id')
      .in('task_id', taskIds);

    if (!briefingsData || briefingsData.length === 0) { setLoading(false); return; }

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
