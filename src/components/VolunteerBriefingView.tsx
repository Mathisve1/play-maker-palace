import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { Clock, MapPin, FileText, Coffee, Phone, CheckSquare, ChevronRight, Route, PenLine, CheckCircle, Image, Video, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import RouteMapEditor, { type Waypoint } from '@/components/RouteMapEditor';

type BlockType = 'time_slot' | 'instruction' | 'pause' | 'checklist' | 'emergency_contact' | 'route' | 'custom' | 'media';

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
    emergency: 'Noodcontact',
    step: 'Stap',
    of: 'van',
    next: 'Volgende',
    previous: 'Vorige',
    markComplete: 'Afvinken',
    completed: 'Afgevinkt ✓',
    briefingDone: 'Briefing voltooid ✓',
    briefingDoneMsg: 'Je hebt alle stappen doorgenomen. Succes vandaag!',
    back: 'Terug',
    start: 'Briefing starten',
    finish: 'Afsluiten',
    offlineNote: 'Deze briefing is ook offline beschikbaar.',
    call: 'Bellen',
    checkedItems: 'afgevinkt',
    allSections: 'secties voltooid',
    paymentReady: 'Alle secties zijn afgevinkt!',
    goToPayment: 'Vergoedingen',
    mustComplete: 'Vink alle secties af.',
  },
  fr: {
    briefing: 'Briefing',
    noBriefing: 'Aucun briefing disponible pour cette tâche.',
    noBriefings: 'Aucun briefing disponible.',
    emergency: 'Contact d\'urgence',
    step: 'Étape',
    of: 'de',
    next: 'Suivant',
    previous: 'Précédent',
    markComplete: 'Valider',
    completed: 'Validé ✓',
    briefingDone: 'Briefing terminé ✓',
    briefingDoneMsg: 'Vous avez complété toutes les étapes. Bonne chance !',
    back: 'Retour',
    start: 'Démarrer le briefing',
    finish: 'Terminer',
    offlineNote: 'Ce briefing est également disponible hors ligne.',
    call: 'Appeler',
    checkedItems: 'complétés',
    allSections: 'sections complétées',
    paymentReady: 'Toutes les sections sont complétées !',
    goToPayment: 'Indemnités',
    mustComplete: 'Complétez toutes les sections.',
  },
  en: {
    briefing: 'Briefing',
    noBriefing: 'No briefing available for this task yet.',
    noBriefings: 'No briefings available yet.',
    emergency: 'Emergency contact',
    step: 'Step',
    of: 'of',
    next: 'Next',
    previous: 'Previous',
    markComplete: 'Mark done',
    completed: 'Completed ✓',
    briefingDone: 'Briefing completed ✓',
    briefingDoneMsg: 'You\'ve completed all steps. Good luck today!',
    back: 'Back',
    start: 'Start briefing',
    finish: 'Finish',
    offlineNote: 'This briefing is also available offline.',
    call: 'Call',
    checkedItems: 'checked',
    allSections: 'sections completed',
    paymentReady: 'All sections complete!',
    goToPayment: 'Payments',
    mustComplete: 'Complete all sections.',
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
  media: Image,
};

const CACHE_PREFIX = 'briefing_cache_';

interface VolunteerBriefingViewProps {
  taskId: string;
  language: Language;
  userId: string;
  onNavigateToPayments?: () => void;
  fullscreen?: boolean;
}

const VolunteerBriefingView = ({ taskId, language, userId, onNavigateToPayments, fullscreen = false }: VolunteerBriefingViewProps) => {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [completedBlocks, setCompletedBlocks] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState(-1); // -1 = intro, allBlocks.length = done
  const [myZone, setMyZone] = useState<{ name: string; max_capacity: number | null } | null>(null);
  const l = labels[language];

  // Flatten all blocks across groups for step-by-step
  const allBlocks = briefing ? briefing.groups.flatMap(g => g.blocks) : [];
  const totalSteps = allBlocks.length;
  const isIntro = currentStep === -1;
  const isDone = currentStep >= totalSteps;
  const currentBlock = !isIntro && !isDone ? allBlocks[currentStep] : null;

  useEffect(() => {
    loadBriefing();
    loadZoneAssignment();
  }, [taskId]);

  const loadZoneAssignment = async () => {
    const { data: zones } = await supabase.from('task_zones').select('id, name, max_capacity').eq('task_id', taskId);
    if (!zones || zones.length === 0) return;
    const zoneIds = zones.map(z => z.id);
    const { data: assignments } = await supabase.from('task_zone_assignments')
      .select('zone_id')
      .eq('volunteer_id', userId)
      .in('zone_id', zoneIds);
    if (assignments && assignments.length > 0) {
      const zone = zones.find(z => z.id === assignments[0].zone_id);
      if (zone) setMyZone({ name: zone.name, max_capacity: zone.max_capacity });
    }
  };

  // Cache to localStorage for offline access
  const cacheData = useCallback((data: BriefingData) => {
    try {
      localStorage.setItem(CACHE_PREFIX + taskId, JSON.stringify(data));
    } catch {}
  }, [taskId]);

  const loadCached = useCallback((): BriefingData | null => {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + taskId);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [taskId]);

  const loadBriefing = async () => {
    setLoading(true);

    // Try cache first
    const cached = loadCached();
    if (cached) {
      setBriefing(cached);
    }

    const { data: briefingsData } = await supabase
      .from('briefings')
      .select('id, title')
      .eq('task_id', taskId)
      .order('created_at')
      .limit(1);

    if (!briefingsData || briefingsData.length === 0) {
      setLoading(false);
      return;
    }

    const b = briefingsData[0];
    const newCheckedItems = new Set<string>();
    const newCompletedBlocks = new Set<string>();

    const { data: allGroups } = await supabase
      .from('briefing_groups')
      .select('*')
      .eq('briefing_id', b.id)
      .order('sort_order');

    if (!allGroups || allGroups.length === 0) { setLoading(false); return; }

    const groupIds = allGroups.map(g => g.id);

    // Check personalized assignment
    const { data: assignments } = await supabase
      .from('briefing_group_volunteers')
      .select('group_id')
      .in('group_id', groupIds)
      .eq('volunteer_id', userId);

    const assignedGroupIds = new Set((assignments || []).map(a => a.group_id));
    const visibleGroups = assignedGroupIds.size > 0
      ? allGroups.filter(g => assignedGroupIds.has(g.id))
      : allGroups;

    if (visibleGroups.length === 0) { setLoading(false); return; }

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

    // Load progress
    if (checklistItems.length > 0) {
      const itemIds = checklistItems.map(ci => ci.id);
      const { data: progress } = await supabase
        .from('briefing_checklist_progress')
        .select('checklist_item_id, checked')
        .in('checklist_item_id', itemIds)
        .eq('volunteer_id', userId);
      (progress || []).forEach(p => { if (p.checked) newCheckedItems.add(p.checklist_item_id); });
    }

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

    const briefingData: BriefingData = { id: b.id, title: b.title, groups };
    setBriefing(briefingData);
    setCheckedItems(newCheckedItems);
    setCompletedBlocks(newCompletedBlocks);
    cacheData(briefingData);

    // If all blocks completed, go to done screen
    const allBl = groups.flatMap(g => g.blocks);
    if (allBl.length > 0 && allBl.every(bl => newCompletedBlocks.has(bl.id))) {
      setCurrentStep(allBl.length);
    }

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

  const markBlockComplete = async (blockId: string) => {
    setCompletedBlocks(prev => new Set([...prev, blockId]));
    await supabase.from('briefing_block_progress').upsert({
      block_id: blockId,
      volunteer_id: userId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'block_id,volunteer_id' });
  };

  const goNext = () => {
    if (currentBlock) {
      // Auto-complete current block when advancing
      if (!completedBlocks.has(currentBlock.id)) {
        // For checklist blocks, only complete if all checked
        if (currentBlock.type === 'checklist' && currentBlock.checklist_items.length > 0) {
          const allChecked = currentBlock.checklist_items.every(ci => checkedItems.has(ci.id));
          if (allChecked) markBlockComplete(currentBlock.id);
        } else {
          markBlockComplete(currentBlock.id);
        }
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const goPrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, -1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!briefing || allBlocks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-lg">{l.noBriefing}</p>
      </div>
    );
  }

  const completedCount = allBlocks.filter(b => completedBlocks.has(b.id)).length;
  const progressPct = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  const wrapperClass = fullscreen
    ? 'min-h-screen bg-background flex flex-col'
    : 'flex flex-col';

  return (
    <div className={wrapperClass}>
      {/* Progress header */}
      {!isIntro && !isDone && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 space-y-2" style={{ paddingTop: fullscreen ? 'max(env(safe-area-inset-top, 0px), 12px)' : undefined }}>
          <div className="flex items-center justify-between">
            <button onClick={goPrev} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] justify-center">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{l.back}</span>
            </button>
            <span className="text-sm font-semibold text-foreground">
              {l.step} {currentStep + 1} {l.of} {totalSteps}
            </span>
            <div className="w-11" />
          </div>
          <Progress value={((currentStep + 1) / totalSteps) * 100} className="h-2" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        <AnimatePresence mode="wait">
          {/* INTRO SCREEN */}
          {isIntro && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto text-center space-y-6 py-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">{briefing.title}</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  {totalSteps} {l.step.toLowerCase()}{totalSteps !== 1 ? (language === 'nl' ? 'pen' : 's') : ''}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <Progress value={progressPct} className="h-2 w-full max-w-xs" />
                <p className="text-xs text-muted-foreground">
                  {completedCount}/{totalSteps} {l.allSections}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => setCurrentStep(0)}
                className="w-full max-w-xs mx-auto text-lg py-6 rounded-2xl"
              >
                {l.start}
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-xs text-muted-foreground">{l.offlineNote}</p>
            </motion.div>
          )}

          {/* STEP SCREEN */}
          {currentBlock && (
            <motion.div
              key={currentBlock.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.25 }}
              className="max-w-lg mx-auto space-y-6"
            >
              <StepBlock
                block={currentBlock}
                checkedItems={checkedItems}
                onToggleCheck={toggleCheck}
                language={language}
                labels={l}
              />

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={goPrev}
                  className="flex-1 min-h-[52px] rounded-2xl text-base"
                >
                  {l.previous}
                </Button>
                <Button
                  size="lg"
                  onClick={goNext}
                  disabled={
                    currentBlock.type === 'checklist' &&
                    currentBlock.checklist_items.length > 0 &&
                    !currentBlock.checklist_items.every(ci => checkedItems.has(ci.id))
                  }
                  className="flex-1 min-h-[52px] rounded-2xl text-base"
                >
                  {currentStep === totalSteps - 1 ? l.finish : l.next}
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* DONE SCREEN */}
          {isDone && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto text-center space-y-6 py-12"
            >
              <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-14 h-14 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">{l.briefingDone}</h2>
                <p className="text-muted-foreground mt-2 text-lg">{l.briefingDoneMsg}</p>
              </div>
              <Progress value={100} className="h-2 max-w-xs mx-auto" />
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                {onNavigateToPayments && (
                  <Button size="lg" onClick={onNavigateToPayments} className="w-full rounded-2xl text-base py-5">
                    {l.goToPayment}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentStep(-1)}
                  className="w-full rounded-2xl text-base py-5"
                >
                  {l.back}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Step Block: renders one block per screen ───
const StepBlock = ({
  block,
  checkedItems,
  onToggleCheck,
  language,
  labels: l,
}: {
  block: BlockData;
  checkedItems: Set<string>;
  onToggleCheck: (id: string) => void;
  language: Language;
  labels: typeof import('./VolunteerBriefingView').default extends never ? any : any;
}) => {
  const Icon = blockIcons[block.type] || FileText;

  return (
    <div className="space-y-5">
      {/* Block header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground leading-snug">
          {block.title || block.type.replace(/_/g, ' ')}
        </h2>
      </div>

      {/* Time slot info */}
      {block.type === 'time_slot' && (
        <div className="bg-muted/50 rounded-2xl p-5 space-y-3">
          {(block.start_time || block.end_time) && (
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <span className="text-lg font-semibold text-foreground">
                {block.start_time}{block.end_time && ` — ${block.end_time}`}
              </span>
            </div>
          )}
          {block.location && (
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <span className="text-lg text-foreground">{block.location}</span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {block.description && (
        <p className="text-lg leading-relaxed text-foreground whitespace-pre-wrap">
          {block.description}
        </p>
      )}

      {/* Media (images/videos in description URLs) */}
      {block.type === 'media' && block.description && (
        <div className="space-y-3">
          {block.description.split('\n').filter(line => line.trim()).map((url, i) => {
            const trimmed = url.trim();
            if (/\.(mp4|webm|mov)(\?|$)/i.test(trimmed)) {
              return (
                <video key={i} src={trimmed} controls className="w-full rounded-2xl" playsInline />
              );
            }
            if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(trimmed) || trimmed.startsWith('http')) {
              return (
                <img key={i} src={trimmed} alt="" className="w-full rounded-2xl object-cover" loading="lazy" />
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Pause */}
      {block.type === 'pause' && (
        <div className="bg-muted/50 rounded-2xl p-5 flex items-center gap-4">
          <Coffee className="w-6 h-6 text-primary" />
          <div>
            {block.duration_minutes && (
              <span className="text-lg font-semibold text-foreground">{block.duration_minutes} min</span>
            )}
            {block.location && (
              <p className="text-base text-muted-foreground mt-0.5">{block.location}</p>
            )}
          </div>
        </div>
      )}

      {/* Emergency contact */}
      {block.type === 'emergency_contact' && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-destructive uppercase tracking-wide">{l.emergency}</p>
          {block.contact_name && <p className="text-xl font-bold text-foreground">{block.contact_name}</p>}
          {block.contact_role && <p className="text-base text-muted-foreground">{block.contact_role}</p>}
          {block.contact_phone && (
            <a
              href={`tel:${block.contact_phone}`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-base min-h-[52px] hover:opacity-90 transition-opacity"
            >
              <Phone className="w-5 h-5" />
              {block.contact_phone}
            </a>
          )}
        </div>
      )}

      {/* Checklist — large touch targets */}
      {block.type === 'checklist' && block.checklist_items.length > 0 && (
        <div className="space-y-3">
          {block.checklist_items.map(item => {
            const checked = checkedItems.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => onToggleCheck(item.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all min-h-[56px] text-left ${
                  checked
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-400 dark:border-green-600'
                    : 'bg-card border-border hover:border-primary/40'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                  checked ? 'bg-green-500 border-green-500' : 'border-muted-foreground/40'
                }`}>
                  {checked && <CheckCircle className="w-5 h-5 text-white" />}
                </div>
                <span className={`text-base font-medium transition-all ${
                  checked ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
          <p className="text-sm text-muted-foreground text-center">
            {block.checklist_items.filter(ci => checkedItems.has(ci.id)).length}/{block.checklist_items.length} {l.checkedItems}
          </p>
        </div>
      )}

      {/* Route */}
      {block.type === 'route' && block.waypoints.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <RouteMapEditor
            waypoints={block.waypoints}
            onChange={() => {}}
            language={language}
            readOnly
          />
        </div>
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
