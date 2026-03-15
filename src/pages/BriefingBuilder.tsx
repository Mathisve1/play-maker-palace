import { useEffect, useState, useCallback } from 'react';
import { Language } from '@/i18n/translations';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, type DragOverEvent,
  DragOverlay, useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, GripVertical, Save, Users, Loader2, ChevronDown, ChevronUp,
  Trash2, X, Send, Copy, Eye, EyeOff, PanelLeftClose, PanelLeft,
  Clock, FileText, Coffee, CheckSquare, Phone, Route, PenLine, Package,
  Layers, Image as ImageIcon, MapPin, Timer,
} from 'lucide-react';
import { sendPush } from '@/lib/sendPush';
// jsPDF is lazy-loaded when needed for PDF export
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
import { PageSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SendBriefingDialog from '@/components/SendBriefingDialog';
import RouteMapEditor, { type Waypoint } from '@/components/RouteMapEditor';
import BriefingBlockLibrary, { blockTypeConfig, type BlockType } from '@/components/briefing/BriefingBlockLibrary';
import BriefingPreview from '@/components/briefing/BriefingPreview';
import MediaBlockEditor from '@/components/briefing/MediaBlockEditor';

// ─── Types ───
interface ChecklistItem { id: string; label: string; sort_order: number; }

interface Block {
  id: string;
  type: BlockType;
  sort_order: number;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  location?: string;
  title?: string;
  description?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_role?: string;
  checklist_items?: ChecklistItem[];
  waypoints?: Waypoint[];
  media_url?: string;
  materials?: string[];
  zone_mode?: 'full' | 'personalized';
  zone_visible_depth?: number | null;
}

interface Group {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  blocks: Block[];
  expanded: boolean;
}

interface Volunteer { id: string; full_name: string | null; email: string | null; }

const groupColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const uid = () => crypto.randomUUID();

// ─── Sortable Block Component ───
const SortableBlock = ({
  block, groupId, onUpdate, onRemove, onAddChecklistItem, onUpdateChecklistItem, onRemoveChecklistItem,
  onAddMaterial, onUpdateMaterial, onRemoveMaterial, language,
}: {
  block: Block; groupId: string; language: string;
  onUpdate: (groupId: string, blockId: string, updates: Partial<Block>) => void;
  onRemove: (groupId: string, blockId: string) => void;
  onAddChecklistItem: (groupId: string, blockId: string) => void;
  onUpdateChecklistItem: (groupId: string, blockId: string, itemId: string, label: string) => void;
  onRemoveChecklistItem: (groupId: string, blockId: string, itemId: string) => void;
  onAddMaterial: (groupId: string, blockId: string) => void;
  onUpdateMaterial: (groupId: string, blockId: string, index: number, value: string) => void;
  onRemoveMaterial: (groupId: string, blockId: string, index: number) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const config = blockTypeConfig[block.type];
  const Icon = config.icon;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`rounded-xl border p-3 ${config.color} group/block`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 opacity-40 hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4" />
          </button>
          <Icon className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">{config.label}</span>
        </div>
        <button
          onClick={() => onRemove(groupId, block.id)}
          className="p-1 opacity-0 group-hover/block:opacity-100 hover:text-destructive transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Time Slot */}
      {block.type === 'time_slot' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input type="time" value={block.start_time || ''} onChange={e => onUpdate(groupId, block.id, { start_time: e.target.value })} placeholder={language === 'fr' ? 'Heure de début' : language === 'en' ? 'Start time' : 'Starttijd'} className="bg-background/60 text-sm" />
          <Input type="time" value={block.end_time || ''} onChange={e => onUpdate(groupId, block.id, { end_time: e.target.value })} placeholder={language === 'fr' ? 'Heure de fin' : language === 'en' ? 'End time' : 'Eindtijd'} className="bg-background/60 text-sm" />
          <Input value={block.location || ''} onChange={e => onUpdate(groupId, block.id, { location: e.target.value })} placeholder={language === 'fr' ? 'Lieu' : language === 'en' ? 'Location' : 'Locatie'} className="bg-background/60 text-sm" />
          <div className="sm:col-span-3">
            <Input value={block.description || ''} onChange={e => onUpdate(groupId, block.id, { description: e.target.value })} placeholder={language === 'fr' ? 'Description' : language === 'en' ? 'Description' : 'Beschrijving'} className="bg-background/60 text-sm" />
          </div>
        </div>
      )}

      {/* Instruction / Custom */}
      {(block.type === 'instruction' || block.type === 'custom') && (
        <div className="space-y-2">
          <Input value={block.title || ''} onChange={e => onUpdate(groupId, block.id, { title: e.target.value })} placeholder={language === 'fr' ? 'Titre' : language === 'en' ? 'Title' : 'Titel'} className="bg-background/60 text-sm font-medium" />
          <Textarea value={block.description || ''} onChange={e => onUpdate(groupId, block.id, { description: e.target.value })} placeholder={language === 'fr' ? 'Description' : language === 'en' ? 'Description' : 'Beschrijving'} className="bg-background/60 text-sm min-h-[60px]" />
        </div>
      )}

      {/* Pause */}
      {block.type === 'pause' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input type="number" min={1} value={block.duration_minutes || ''} onChange={e => onUpdate(groupId, block.id, { duration_minutes: parseInt(e.target.value) || undefined })} placeholder={language === 'fr' ? 'Durée (min)' : language === 'en' ? 'Duration (min)' : 'Duur (min)'} className="bg-background/60 text-sm" />
          <Input type="time" value={block.start_time || ''} onChange={e => onUpdate(groupId, block.id, { start_time: e.target.value })} placeholder={language === 'fr' ? 'Heure de début' : language === 'en' ? 'Start time' : 'Starttijd'} className="bg-background/60 text-sm" />
          <Input value={block.location || ''} onChange={e => onUpdate(groupId, block.id, { location: e.target.value })} placeholder={language === 'fr' ? 'Lieu' : language === 'en' ? 'Location' : 'Locatie'} className="bg-background/60 text-sm" />
        </div>
      )}

      {/* Checklist */}
      {block.type === 'checklist' && (
        <div className="space-y-2">
          <Input value={block.title || ''} onChange={e => onUpdate(groupId, block.id, { title: e.target.value })} placeholder={language === 'fr' ? 'Titre' : language === 'en' ? 'Title' : 'Titel'} className="bg-background/60 text-sm font-medium" />
          {(block.checklist_items || []).map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 opacity-40 shrink-0" />
              <Input value={item.label} onChange={e => onUpdateChecklistItem(groupId, block.id, item.id, e.target.value)} placeholder={`Item ${idx + 1}`} className="bg-background/60 text-sm flex-1" />
              <button onClick={() => onRemoveChecklistItem(groupId, block.id, item.id)} className="p-1 opacity-40 hover:opacity-100 hover:text-destructive"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => onAddChecklistItem(groupId, block.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> {language === 'fr' ? 'Ajouter un élément' : language === 'en' ? 'Add item' : 'Item toevoegen'}
          </button>
        </div>
      )}

      {/* Emergency Contact */}
      {block.type === 'emergency_contact' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input value={block.contact_name || ''} onChange={e => onUpdate(groupId, block.id, { contact_name: e.target.value })} placeholder={language === 'fr' ? 'Nom' : language === 'en' ? 'Name' : 'Naam'} className="bg-background/60 text-sm" />
          <Input value={block.contact_phone || ''} onChange={e => onUpdate(groupId, block.id, { contact_phone: e.target.value })} placeholder={language === 'fr' ? 'Téléphone' : language === 'en' ? 'Phone' : 'Telefoon'} className="bg-background/60 text-sm" />
          <Input value={block.contact_role || ''} onChange={e => onUpdate(groupId, block.id, { contact_role: e.target.value })} placeholder={language === 'fr' ? 'Fonction' : language === 'en' ? 'Role' : 'Functie'} className="bg-background/60 text-sm" />
        </div>
      )}

      {/* Route */}
      {block.type === 'route' && (
        <div className="space-y-2">
          <Input value={block.title || ''} onChange={e => onUpdate(groupId, block.id, { title: e.target.value })} placeholder={language === 'fr' ? 'Titre' : language === 'en' ? 'Title' : 'Titel'} className="bg-background/60 text-sm font-medium" />
          <Textarea value={block.description || ''} onChange={e => onUpdate(groupId, block.id, { description: e.target.value })} placeholder={language === 'fr' ? 'Description' : language === 'en' ? 'Description' : 'Beschrijving'} className="bg-background/60 text-sm min-h-[40px]" rows={2} />
          <RouteMapEditor waypoints={block.waypoints || []} onChange={wps => onUpdate(groupId, block.id, { waypoints: wps })} language={language as Language} />
        </div>
      )}

      {/* Zone Overview */}
      {block.type === 'zone_overview' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Select value={block.zone_mode || 'full'} onValueChange={(v) => onUpdate(groupId, block.id, { zone_mode: v as 'full' | 'personalized' })}>
              <SelectTrigger className="bg-background/60 text-sm flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">{language === 'fr' ? 'Aperçu complet des zones' : language === 'en' ? 'Full zone overview' : 'Volledig zone-overzicht'}</SelectItem>
                <SelectItem value="personalized">{language === 'fr' ? 'Personnalisé par bénévole' : language === 'en' ? 'Personalized per volunteer' : 'Gepersonaliseerd per vrijwilliger'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {block.zone_mode === 'full' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">{language === 'fr' ? 'Afficher jusqu\'à la profondeur :' : language === 'en' ? 'Show up to depth:' : 'Toon tot diepte:'}</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={block.zone_visible_depth ?? ''}
                onChange={e => onUpdate(groupId, block.id, { zone_visible_depth: e.target.value ? parseInt(e.target.value) : null })}
                placeholder={language === 'fr' ? 'Tout' : language === 'en' ? 'All' : 'Alles'}
                className="bg-background/60 text-sm w-20"
              />
              <span className="text-[10px] text-muted-foreground">
                {block.zone_visible_depth ? `${language === 'fr' ? 'Niveau' : language === 'en' ? 'Level' : 'Niveau'} 1–${block.zone_visible_depth}` : (language === 'fr' ? 'Tous les niveaux' : language === 'en' ? 'All levels' : 'Alle niveaus')}
              </span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            {block.zone_mode === 'personalized'
              ? (language === 'fr' ? 'Chaque bénévole voit uniquement sa zone assignée, couleur de bracelet et matériaux.' : language === 'en' ? 'Each volunteer sees only their assigned zone, wristband color and materials.' : 'Elke vrijwilliger ziet enkel zijn eigen zone-toewijzing, wristband-kleur en materialen.')
              : block.zone_visible_depth
                ? (language === 'fr' ? `Les zones sont affichées jusqu'au niveau ${block.zone_visible_depth}.` : language === 'en' ? `Zones shown up to level ${block.zone_visible_depth}.` : `Zones worden getoond tot niveau ${block.zone_visible_depth} (bv. Zone > Sectie).`)
                : (language === 'fr' ? 'Toutes les zones, sous-zones, capacités et infos de bracelets sont affichées.' : language === 'en' ? 'All zones, sub-zones, capacities and wristband info are shown.' : 'Alle zones, subzones, capaciteiten en wristband-info worden getoond.')}
          </p>
        </div>
      )}

      {/* Materials Checklist */}
      {block.type === 'materials_checklist' && (
        <div className="space-y-2">
          <Input value={block.title || ''} onChange={e => onUpdate(groupId, block.id, { title: e.target.value })} placeholder={language === 'fr' ? 'Titre (ex. Matériel à récupérer)' : language === 'en' ? 'Title (e.g. Materials to pick up)' : 'Titel (bv. Op te halen materialen)'} className="bg-background/60 text-sm font-medium" />
          {(block.materials || []).map((mat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 opacity-40 shrink-0" />
              <Input value={mat} onChange={e => onUpdateMaterial(groupId, block.id, idx, e.target.value)} placeholder={`${language === 'fr' ? 'Matériel' : language === 'en' ? 'Material' : 'Materiaal'} ${idx + 1}`} className="bg-background/60 text-sm flex-1" />
              <button onClick={() => onRemoveMaterial(groupId, block.id, idx)} className="p-1 opacity-40 hover:opacity-100 hover:text-destructive"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => onAddMaterial(groupId, block.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> {language === 'fr' ? 'Ajouter un matériel' : language === 'en' ? 'Add material' : 'Materiaal toevoegen'}
          </button>
        </div>
      )}

      {/* Media */}
      {block.type === 'media' && (
        <MediaBlockEditor
          block={block}
          groupId={groupId}
          onUpdate={onUpdate}
        />
      )}

      {/* Map Overview */}
      {block.type === 'map_overview' && (
        <div className="space-y-2">
          <Input value={block.title || ''} onChange={e => onUpdate(groupId, block.id, { title: e.target.value })} placeholder={language === 'fr' ? 'Titre (ex. Plan de l\'événement)' : language === 'en' ? 'Title (e.g. Event map)' : 'Titel (bv. Plattegrond evenement)'} className="bg-background/60 text-sm" />
          <Textarea value={block.description || ''} onChange={e => onUpdate(groupId, block.id, { description: e.target.value })} placeholder={language === 'fr' ? 'Description ou instructions' : language === 'en' ? 'Description or instructions' : 'Beschrijving of instructies'} className="bg-background/60 text-sm min-h-[40px]" rows={2} />
        </div>
      )}
    </div>
  );
};

// ─── Droppable Group ───
const DroppableGroup = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-[40px] transition-colors rounded-lg ${isOver ? 'bg-primary/5 ring-2 ring-primary/20 ring-dashed' : ''}`}>
      {children}
    </div>
  );
};

// ─── Main Component ───
const BriefingBuilder = () => {
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const clubId = searchParams.get('clubId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingBriefing, setSendingBriefing] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [briefingId, setBriefingId] = useState<string | null>(null);
  const [briefingTitle, setBriefingTitle] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [groupVolunteers, setGroupVolunteers] = useState<Record<string, string[]>>({});
  const [userId, setUserId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskData, setTaskData] = useState<{
    task_date: string | null; start_time: string | null; end_time: string | null;
    location: string | null; briefing_location: string | null; briefing_time: string | null;
  } | null>(null);
  const [clubData, setClubData] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [allBriefings, setAllBriefings] = useState<{ id: string; title: string }[]>([]);
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string; club_id: string; task_date: string | null }[]>([]);
  const [taskSelectorLoading, setTaskSelectorLoading] = useState(!taskId || !clubId);
  const [taskSearch, setTaskSearch] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [plannedSendHours, setPlannedSendHours] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ─── Task selector loader ───
  useEffect(() => {
    if (taskId && clubId) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }
      const { data: ownedClubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id);
      const { data: memberClubs } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id);
      const clubIds = [...(ownedClubs || []).map(c => c.id), ...(memberClubs || []).map(c => c.club_id)];
      if (clubIds.length === 0) { navigate('/club-dashboard'); return; }
      const { data: tasks } = await supabase.from('tasks').select('id, title, club_id, task_date').in('club_id', clubIds).order('task_date', { ascending: false });
      setAvailableTasks(tasks || []);
      setTaskSelectorLoading(false);
    })();
  }, [taskId, clubId, navigate]);

  // ─── Load briefing data ───
  useEffect(() => {
    if (!taskId || !clubId) return;
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setUserId(session.user.id);

      const { data: task } = await supabase.from('tasks').select('title, task_date, start_time, end_time, location, briefing_location, briefing_time, club_id').eq('id', taskId).maybeSingle();
      if (task) {
        setTaskTitle(task.title);
        setTaskData({ task_date: task.task_date, start_time: task.start_time, end_time: task.end_time, location: task.location, briefing_location: task.briefing_location, briefing_time: task.briefing_time });
      }

      const { data: club } = await supabase.from('clubs').select('name, logo_url').eq('id', clubId).maybeSingle();
      if (club) setClubData(club);

      const { data: signups } = await supabase.from('task_signups').select('volunteer_id').eq('task_id', taskId);
      if (signups && signups.length > 0) {
        const vIds = signups.map(s => s.volunteer_id);
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', vIds);
        setVolunteers(profiles || []);
      }

      const { data: briefingsForTask } = await supabase.from('briefings').select('id, title').eq('task_id', taskId).order('created_at');
      setAllBriefings(briefingsForTask || []);

      const briefingIdParam = searchParams.get('briefingId');
      const targetBriefing = briefingIdParam
        ? (briefingsForTask || []).find(b => b.id === briefingIdParam)
        : (briefingsForTask || [])[0];

      if (targetBriefing) {
        await loadBriefingData(targetBriefing.id, targetBriefing.title);
      } else {
        setBriefingTitle(task?.title || '');
        setGroups([{ id: uid(), name: 'Algemeen', color: groupColors[0], sort_order: 0, blocks: [], expanded: true }]);
      }
      setLoading(false);
    };
    init();
  }, [taskId, clubId, navigate]);

  const loadBriefingData = async (bId: string, bTitle: string) => {
    setBriefingId(bId);
    setBriefingTitle(bTitle);
    const { data: grps } = await supabase.from('briefing_groups').select('*').eq('briefing_id', bId).order('sort_order');
    if (grps && grps.length > 0) {
      const groupIds = grps.map(g => g.id);
      const { data: blocks } = await supabase.from('briefing_blocks').select('*').in('group_id', groupIds).order('sort_order');
      const blockIds = (blocks || []).filter(b => b.type === 'checklist').map(b => b.id);
      let checklistItems: any[] = [];
      if (blockIds.length > 0) {
        const { data: items } = await supabase.from('briefing_checklist_items').select('*').in('block_id', blockIds).order('sort_order');
        checklistItems = items || [];
      }
      const routeBlockIds = (blocks || []).filter(b => b.type === 'route').map(b => b.id);
      let routeWaypoints: any[] = [];
      if (routeBlockIds.length > 0) {
        const { data: wps } = await supabase.from('briefing_route_waypoints').select('*').in('block_id', routeBlockIds).order('sort_order');
        routeWaypoints = wps || [];
      }
      const { data: gvs } = await supabase.from('briefing_group_volunteers').select('group_id, volunteer_id').in('group_id', groupIds);
      const gvMap: Record<string, string[]> = {};
      (gvs || []).forEach(gv => { if (!gvMap[gv.group_id]) gvMap[gv.group_id] = []; gvMap[gv.group_id].push(gv.volunteer_id); });
      setGroupVolunteers(gvMap);

      setGroups(grps.map(g => ({
        id: g.id, name: g.name, color: g.color, sort_order: g.sort_order, expanded: true,
        blocks: (blocks || []).filter(b => b.group_id === g.id).map(b => ({
          id: b.id, type: b.type as BlockType, sort_order: b.sort_order,
          start_time: b.start_time || undefined, end_time: b.end_time || undefined,
          duration_minutes: b.duration_minutes || undefined, location: b.location || undefined,
          title: b.title || undefined, description: b.description || undefined,
          contact_name: b.contact_name || undefined, contact_phone: b.contact_phone || undefined,
          contact_role: b.contact_role || undefined,
          checklist_items: checklistItems.filter(ci => ci.block_id === b.id).map(ci => ({ id: ci.id, label: ci.label, sort_order: ci.sort_order })),
          waypoints: routeWaypoints.filter(wp => wp.block_id === b.id).map(wp => ({ id: wp.id, label: wp.label, description: wp.description, lat: wp.lat, lng: wp.lng, arrival_time: wp.arrival_time, sort_order: wp.sort_order })),
        })),
      })));
    }
  };

  // ─── Group helpers ───
  const addGroup = () => {
    setGroups(prev => [...prev, { id: uid(), name: '', color: groupColors[prev.length % groupColors.length], sort_order: prev.length, blocks: [], expanded: true }]);
  };
  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g));
  };
  const removeGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  // ─── Block helpers ───
  const addBlock = (groupId: string, type: BlockType) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const newBlock: Block = {
        id: uid(), type, sort_order: g.blocks.length,
        checklist_items: type === 'checklist' ? [{ id: uid(), label: '', sort_order: 0 }] : undefined,
        waypoints: type === 'route' ? [] : undefined,
        materials: type === 'materials_checklist' ? [''] : undefined,
        zone_mode: type === 'zone_overview' ? 'full' : undefined,
        zone_visible_depth: type === 'zone_overview' ? null : undefined,
      };
      return { ...g, blocks: [...g.blocks, newBlock], expanded: true };
    }));
  };
  const addBlockToActive = (type: BlockType) => {
    const targetGroup = activeGroupId ? groups.find(g => g.id === activeGroupId) : groups[0];
    if (targetGroup) addBlock(targetGroup.id, type);
  };
  const updateBlock = (groupId: string, blockId: string, updates: Partial<Block>) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, blocks: g.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b) };
    }));
  };
  const removeBlock = (groupId: string, blockId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, blocks: g.blocks.filter(b => b.id !== blockId) };
    }));
  };

  // ─── Checklist helpers ───
  const addChecklistItem = (groupId: string, blockId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, blocks: g.blocks.map(b => {
        if (b.id !== blockId) return b;
        const items = b.checklist_items || [];
        return { ...b, checklist_items: [...items, { id: uid(), label: '', sort_order: items.length }] };
      }) };
    }));
  };
  const updateChecklistItem = (groupId: string, blockId: string, itemId: string, label: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, blocks: g.blocks.map(b => {
        if (b.id !== blockId) return b;
        return { ...b, checklist_items: (b.checklist_items || []).map(ci => ci.id === itemId ? { ...ci, label } : ci) };
      }) };
    }));
  };
  const removeChecklistItem = (groupId: string, blockId: string, itemId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, blocks: g.blocks.map(b => {
        if (b.id !== blockId) return b;
        return { ...b, checklist_items: (b.checklist_items || []).filter(ci => ci.id !== itemId) };
      }) };
    }));
  };

  // ─── Materials helpers ───
  const addMaterial = (groupId: string, blockId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, blocks: g.blocks.map(b => {
        if (b.id !== blockId) return b;
        return { ...b, materials: [...(b.materials || []), ''] };
      }) };
    }));
  };
  const updateMaterial = (groupId: string, blockId: string, index: number, value: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, blocks: g.blocks.map(b => {
        if (b.id !== blockId) return b;
        const mats = [...(b.materials || [])];
        mats[index] = value;
        return { ...b, materials: mats };
      }) };
    }));
  };
  const removeMaterial = (groupId: string, blockId: string, index: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, blocks: g.blocks.map(b => {
        if (b.id !== blockId) return b;
        return { ...b, materials: (b.materials || []).filter((_, i) => i !== index) };
      }) };
    }));
  };

  // ─── Volunteer assignment ───
  const toggleVolunteer = (groupId: string, volunteerId: string) => {
    setGroupVolunteers(prev => {
      const current = prev[groupId] || [];
      if (current.includes(volunteerId)) return { ...prev, [groupId]: current.filter(v => v !== volunteerId) };
      return { ...prev, [groupId]: [...current, volunteerId] };
    });
  };

  // ─── DnD ───
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find which group contains the active block
    let sourceGroupId: string | null = null;
    let destGroupId: string | null = null;

    for (const g of groups) {
      if (g.blocks.some(b => b.id === active.id)) sourceGroupId = g.id;
      if (g.blocks.some(b => b.id === over.id)) destGroupId = g.id;
      if (over.id === g.id) destGroupId = g.id; // dropping on group droppable
    }

    if (sourceGroupId && destGroupId && sourceGroupId === destGroupId) {
      // Reorder within same group
      setGroups(prev => prev.map(g => {
        if (g.id !== sourceGroupId) return g;
        const oldIndex = g.blocks.findIndex(b => b.id === active.id);
        const newIndex = g.blocks.findIndex(b => b.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return g;
        return { ...g, blocks: arrayMove(g.blocks, oldIndex, newIndex) };
      }));
    }
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!taskId || !clubId) return;
    setSaving(true);
    try {
      let bId = briefingId;
      // Calculate planned_send_at from task_date and offset hours
      let plannedSendAt: string | null = null;
      if (plannedSendHours !== null && taskData?.task_date) {
        const d = new Date(taskData.task_date);
        if (taskData.start_time) {
          const [h, m] = taskData.start_time.split(':').map(Number);
          d.setHours(h, m, 0, 0);
        }
        d.setTime(d.getTime() - plannedSendHours * 60 * 60 * 1000);
        plannedSendAt = d.toISOString();
      }

      if (!bId) {
        const { data, error } = await supabase.from('briefings').insert({
          task_id: taskId, club_id: clubId, title: briefingTitle, created_by: userId,
          planned_send_at: plannedSendAt,
        } as any).select('id').single();
        if (error) throw error;
        bId = data.id;
        setBriefingId(bId);
      } else {
        await supabase.from('briefings').update({
          title: briefingTitle,
          planned_send_at: plannedSendAt,
        } as any).eq('id', bId);
      }

      await supabase.from('briefing_groups').delete().eq('briefing_id', bId);

      for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];
        const { data: savedGroup, error: gErr } = await supabase.from('briefing_groups').insert({ briefing_id: bId!, name: group.name || 'Groep', color: group.color, sort_order: gi }).select('id').single();
        if (gErr) throw gErr;

        for (let bi = 0; bi < group.blocks.length; bi++) {
          const block = group.blocks[bi];
          const { data: savedBlock, error: bErr } = await supabase.from('briefing_blocks').insert({
            group_id: savedGroup.id, type: block.type, sort_order: bi,
            start_time: block.start_time || null, end_time: block.end_time || null,
            duration_minutes: block.duration_minutes || null, location: block.location || null,
            title: block.title || null, description: block.description || null,
            contact_name: block.contact_name || null, contact_phone: block.contact_phone || null,
            contact_role: block.contact_role || null,
          }).select('id').single();
          if (bErr) throw bErr;

          if (block.type === 'checklist' && block.checklist_items) {
            const validItems = block.checklist_items.filter(ci => ci.label.trim());
            if (validItems.length > 0) {
              await supabase.from('briefing_checklist_items').insert(validItems.map((ci, idx) => ({ block_id: savedBlock.id, label: ci.label.trim(), sort_order: idx })));
            }
          }
          if (block.type === 'route' && block.waypoints && block.waypoints.length > 0) {
            await supabase.from('briefing_route_waypoints').insert(block.waypoints.map((wp, idx) => ({
              block_id: savedBlock.id, label: wp.label || '', description: wp.description || null,
              lat: wp.lat, lng: wp.lng, arrival_time: wp.arrival_time || null, sort_order: idx,
            })));
          }
        }

        const vols = groupVolunteers[group.id] || [];
        if (vols.length > 0) {
          await supabase.from('briefing_group_volunteers').insert(vols.map(vid => ({ group_id: savedGroup.id, volunteer_id: vid })));
        }
      }

      setAllBriefings(prev => {
        const exists = prev.find(b => b.id === bId);
        if (exists) return prev.map(b => b.id === bId ? { ...b, title: briefingTitle } : b);
        return [...prev, { id: bId!, title: briefingTitle }];
      });
      toast.success(t3('Briefing opgeslagen!', 'Briefing enregistré !', 'Briefing saved!'));
    } catch (err: any) {
      toast.error(err.message || t3('Fout bij opslaan', 'Erreur lors de la sauvegarde', 'Error saving briefing'));
    } finally {
      setSaving(false);
    }
  };

  const handleNewBriefing = () => {
    setBriefingId(null);
    setBriefingTitle(taskTitle ? `${taskTitle} (${allBriefings.length + 1})` : '');
    setGroups([{ id: uid(), name: 'Algemeen', color: groupColors[0], sort_order: 0, blocks: [], expanded: true }]);
    setGroupVolunteers({});
  };

  const handleDuplicate = () => {
    setBriefingId(null);
    setBriefingTitle(`${briefingTitle} (${t3('kopie', 'copie', 'copy')})`);
    setGroups(groups.map(g => ({
      ...g, id: uid(),
      blocks: g.blocks.map(b => ({
        ...b, id: uid(),
        checklist_items: (b.checklist_items || []).map(ci => ({ ...ci, id: uid() })),
        waypoints: (b.waypoints || []).map(wp => ({ ...wp, id: uid() })),
      })),
    })));
    toast.success(t3('Briefing gedupliceerd — sla op om te bewaren', 'Briefing dupliqué — enregistrez pour conserver', 'Briefing duplicated — save to keep'));
  };

  const switchBriefing = async (bId: string) => {
    const b = allBriefings.find(x => x.id === bId);
    if (!b) return;
    setLoading(true);
    setGroups([]);
    setGroupVolunteers({});
    await loadBriefingData(b.id, b.title);
    setLoading(false);
  };

  // ─── Send briefing ───
  const handleOpenSendDialog = () => {
    if (!briefingId) { toast.error(t3('Sla de briefing eerst op voordat je verstuurt.', 'Enregistrez d\'abord le briefing avant d\'envoyer.', 'Save the briefing first before sending.')); return; }
    setShowSendDialog(true);
  };

  const handleSendBriefing = async (selectedVolunteerIds: string[], personalMessage: string) => {
    if (!taskId || !clubId || !userId) return;
    setSendingBriefing(true);
    try {
      for (const volunteerId of selectedVolunteerIds) {
        const { data: existing } = await supabase.from('conversations').select('id').eq('task_id', taskId).eq('volunteer_id', volunteerId).maybeSingle();
        let convoId: string;
        if (existing) {
          convoId = existing.id;
        } else {
          const { data: created, error: convoErr } = await supabase.from('conversations').insert({ task_id: taskId, volunteer_id: volunteerId, club_owner_id: userId }).select('id').single();
          if (convoErr) throw convoErr;
          convoId = created.id;
        }

        const briefingLink = `${window.location.origin}/training/${briefingId}`;
        const msgContent = personalMessage.trim()
          ? `📋 ${briefingTitle || 'Briefing'}\n\n${personalMessage.trim()}\n\n🔗 ${t3('Bekijk je briefing', 'Consultez votre briefing', 'View your briefing')}: ${briefingLink}`
          : `📋 ${briefingTitle || 'Briefing'}\n\n🔗 ${t3('Bekijk je briefing', 'Consultez votre briefing', 'View your briefing')}: ${briefingLink}`;

        const { error: msgErr } = await supabase.from('messages').insert({ conversation_id: convoId, sender_id: userId, content: msgContent });
        if (msgErr) throw msgErr;
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convoId);
      }
      // Send push notifications to all selected volunteers
      const dateStr = taskData?.task_date
        ? new Date(taskData.task_date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
        : '';
      await Promise.allSettled(
        selectedVolunteerIds.map(vid =>
          sendPush({
            userId: vid,
            title: '📋 Nieuwe briefing beschikbaar!',
            message: `Er is een briefing voor jouw taak ${taskTitle}${dateStr ? ` op ${dateStr}` : ''}. Bekijk de instructies.`,
            url: '/dashboard',
            type: 'briefing',
          })
        )
      );

      setShowSendDialog(false);
      trackEvent('briefing_sent');
      toast.success(t3('Briefing link verstuurd naar vrijwilligers!', 'Lien du briefing envoyé aux bénévoles !', 'Briefing link sent to volunteers!'));
    } catch (err: any) {
      toast.error(err.message || t3('Fout bij versturen', 'Erreur lors de l\'envoi', 'Error sending briefing'));
    } finally {
      setSendingBriefing(false);
    }
  };

  // ─── Task selector ───
  if (!taskId || !clubId) {
    if (taskSelectorLoading) {
      return <PageSkeleton />;
    }
    const filtered = availableTasks.filter(t => t.title.toLowerCase().includes(taskSearch.toLowerCase()));
    return (
      <ClubPageLayout>
        <div className="max-w-2xl mx-auto py-4 space-y-4">
          <PageNavTabs tabs={[
            { label: 'Overzicht', path: '/volunteer-management' },
            { label: 'Contracten', path: '/season-contracts' },
            { label: 'Contract Builder', path: '/contract-builder' },
            { label: 'Sjablonen', path: '/contract-templates' },
            { label: 'Briefings', path: '/briefing-builder' },
            { label: 'Vergoedingen', path: '/sepa-payouts' },
            { label: 'Compliance', path: '/compliance' },
          ]} />
          <h1 className="text-2xl font-bold text-foreground mb-1">Briefing Builder</h1>
          <p className="text-muted-foreground text-sm mb-6">Selecteer een taak om de briefing te bewerken of aan te maken.</p>
          <Input placeholder="Zoek taak..." value={taskSearch} onChange={e => setTaskSearch(e.target.value)} className="mb-4" />
          <div className="space-y-2">
            {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Geen taken gevonden.</p>}
            {filtered.map(task => (
              <button key={task.id} onClick={() => navigate(`/briefing-builder?taskId=${task.id}&clubId=${task.club_id}`)} className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
                <p className="font-medium text-foreground">{task.title}</p>
                {task.task_date && <p className="text-xs text-muted-foreground mt-1">{new Date(task.task_date).toLocaleDateString('nl-BE')}</p>}
              </button>
            ))}
          </div>
        </div>
      </ClubPageLayout>
    );
  }

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <ClubPageLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm shrink-0 flex-wrap">
          {allBriefings.length > 1 && (
            <select value={briefingId || ''} onChange={e => e.target.value && switchBriefing(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              {allBriefings.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          )}
          <Button onClick={handleNewBriefing} size="sm" variant="ghost" className="h-8"><Plus className="w-4 h-4" /></Button>
          <Button onClick={handleDuplicate} size="sm" variant="ghost" className="h-8" disabled={groups.length === 0}><Copy className="w-4 h-4" /></Button>

          <div className="flex-1" />

          <Button onClick={() => setShowLibrary(!showLibrary)} size="sm" variant="ghost" className="h-8" title="Blokbibliotheek">
            {showLibrary ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>
          <Button onClick={() => setShowPreview(!showPreview)} size="sm" variant="ghost" className="h-8" title="Preview">
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          <Button onClick={handleSave} disabled={saving || sendingBriefing} size="sm" variant="outline" className="h-8">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
          <Button onClick={handleOpenSendDialog} disabled={sendingBriefing || saving} size="sm" className="h-8">
            {sendingBriefing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
            Versturen
          </Button>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Block Library */}
          <AnimatePresence>
            {showLibrary && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 220, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-r border-border bg-card/30 overflow-y-auto p-3 shrink-0"
              >
                <BriefingBlockLibrary onAddBlock={addBlockToActive} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center: Builder */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Title */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-1">{taskTitle}</p>
              <Input
                value={briefingTitle}
                onChange={e => setBriefingTitle(e.target.value)}
                placeholder={t3('Briefing titel', 'Titre du briefing', 'Briefing title')}
                className="text-xl font-heading font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
              />
              {/* Scheduled send */}
              <div className="flex items-center gap-2 mt-2">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={plannedSendHours !== null ? String(plannedSendHours) : 'manual'}
                  onValueChange={v => setPlannedSendHours(v === 'manual' ? null : Number(v))}
                >
                  <SelectTrigger className="h-8 w-56 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t3('Handmatig versturen', 'Envoi manuel', 'Manual send')}</SelectItem>
                    <SelectItem value="6">{t3('6 uur voor taak', '6h avant la tâche', '6h before task')}</SelectItem>
                    <SelectItem value="12">{t3('12 uur voor taak', '12h avant la tâche', '12h before task')}</SelectItem>
                    <SelectItem value="24">{t3('24 uur voor taak (aanbevolen)', '24h avant (recommandé)', '24h before (recommended)')}</SelectItem>
                    <SelectItem value="48">{t3('48 uur voor taak', '48h avant la tâche', '48h before task')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Groups with DnD */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="space-y-4">
                {groups.map((group, gi) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
                  >
                    {/* Group header */}
                    <div
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors ${activeGroupId === group.id ? 'ring-2 ring-primary/30 ring-inset' : ''}`}
                      onClick={() => { updateGroup(group.id, { expanded: !group.expanded }); setActiveGroupId(group.id); }}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                      <input
                        value={group.name}
                        onChange={e => { e.stopPropagation(); updateGroup(group.id, { name: e.target.value }); }}
                        onClick={e => { e.stopPropagation(); setActiveGroupId(group.id); }}
                        placeholder="Sectienaam"
                        className="flex-1 bg-transparent font-medium text-foreground outline-none text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                          {groupColors.map(c => (
                            <button key={c} onClick={() => updateGroup(group.id, { color: c })}
                              className={`w-3 h-3 rounded-full transition-transform ${group.color === c ? 'ring-2 ring-offset-1 ring-foreground scale-125' : 'hover:scale-110'}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground ml-2">
                          <Users className="w-3 h-3 inline mr-0.5" />{(groupVolunteers[group.id] || []).length}
                        </span>
                        {groups.length > 1 && (
                          <button onClick={e => { e.stopPropagation(); removeGroup(group.id); }} className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {group.expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {group.expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          {/* Volunteer assignment */}
                          {volunteers.length > 0 && (
                            <div className="px-3 pb-2 border-b border-border">
                              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Vrijwilligers toewijzen</p>
                              <div className="flex flex-wrap gap-1">
                                {volunteers.map(v => {
                                  const assigned = (groupVolunteers[group.id] || []).includes(v.id);
                                  return (
                                    <button key={v.id} onClick={() => toggleVolunteer(group.id, v.id)}
                                      className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${assigned ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                                      {v.full_name || v.email || 'Vrijwilliger'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Blocks */}
                          <DroppableGroup id={group.id}>
                            <div className="p-3 space-y-2"
                              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                              onDrop={e => {
                                e.preventDefault();
                                const type = e.dataTransfer.getData('blockType') as BlockType;
                                if (type) addBlock(group.id, type);
                              }}
                            >
                              <SortableContext items={group.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                {group.blocks.map(block => (
                                  <SortableBlock
                                    key={block.id}
                                    block={block}
                                    groupId={group.id}
                                    language={language}
                                    onUpdate={updateBlock}
                                    onRemove={removeBlock}
                                    onAddChecklistItem={addChecklistItem}
                                    onUpdateChecklistItem={updateChecklistItem}
                                    onRemoveChecklistItem={removeChecklistItem}
                                    onAddMaterial={addMaterial}
                                    onUpdateMaterial={updateMaterial}
                                    onRemoveMaterial={removeMaterial}
                                  />
                                ))}
                              </SortableContext>

                              {group.blocks.length === 0 && (
                                <div className="text-center py-6 text-muted-foreground text-xs border-2 border-dashed border-border rounded-xl">
                                  Sleep blokken hierheen of klik in het zijpaneel
                                </div>
                              )}
                            </div>
                          </DroppableGroup>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                {/* Add group */}
                <button onClick={addGroup} className="w-full py-3 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Sectie toevoegen
                </button>
              </div>
            </DndContext>
          </div>

          {/* Right: Preview */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-l border-border bg-muted/20 overflow-y-auto p-3 shrink-0"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</h3>
                  <span className="text-[10px] text-muted-foreground">Zoals de vrijwilliger het ziet</span>
                </div>
                <BriefingPreview
                  briefingTitle={briefingTitle}
                  groups={groups}
                  taskTitle={taskTitle}
                  taskData={taskData}
                  clubName={clubData?.name}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <SendBriefingDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        volunteers={volunteers}
        onSend={handleSendBriefing}
        language={language}
        sending={sendingBriefing}
      />
    </ClubPageLayout>
  );
};

export default BriefingBuilder;
