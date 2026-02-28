import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ArrowLeft, Plus, GripVertical, Clock, MapPin, FileText, Coffee, Phone, CheckSquare,
  Trash2, Save, Users, Loader2, ChevronDown, ChevronUp, Palette, X, Route, PenLine, Send, Copy
} from 'lucide-react';
import jsPDF from 'jspdf';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SendBriefingDialog from '@/components/SendBriefingDialog';
import RouteMapEditor, { type Waypoint } from '@/components/RouteMapEditor';

// ─── Types ───
type BlockType = 'time_slot' | 'instruction' | 'pause' | 'checklist' | 'emergency_contact' | 'route' | 'custom';

interface ChecklistItem {
  id: string;
  label: string;
  sort_order: number;
}

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
}

interface Group {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  blocks: Block[];
  expanded: boolean;
}

interface Volunteer {
  id: string;
  full_name: string | null;
  email: string | null;
}

// ─── Labels ───
const labels = {
  nl: {
    back: 'Terug',
    briefingBuilder: 'Briefing Builder',
    save: 'Opslaan',
    saving: 'Opslaan...',
    saved: 'Briefing opgeslagen!',
    send: 'Versturen',
    sending: 'Versturen...',
    sent: 'Briefing verstuurd naar vrijwilligers!',
    noVolunteersToSend: 'Geen vrijwilligers toegewezen om de briefing naar te sturen.',
    saveFirstToSend: 'Sla de briefing eerst op voordat je verstuurt.',
    addGroup: 'Sectie toevoegen',
    addBlock: 'Blok toevoegen',
    groupName: 'Sectienaam (wordt pagina-titel)',
    timeSlot: 'Tijdslot',
    instruction: 'Instructie',
    pause: 'Pauze',
    checklist: 'Checklist',
    emergencyContact: 'Noodcontact',
    route: 'Route',
    custom: 'Vrij veld',
    startTime: 'Starttijd',
    endTime: 'Eindtijd',
    location: 'Locatie',
    duration: 'Duur (min)',
    title: 'Titel',
    description: 'Beschrijving',
    contactName: 'Naam',
    contactPhone: 'Telefoon',
    contactRole: 'Functie',
    addItem: 'Item toevoegen',
    volunteers: 'Vrijwilligers',
    assignVolunteers: 'Vrijwilligers toewijzen',
    noVolunteers: 'Geen aangemelde vrijwilligers',
    briefingTitle: 'Briefing titel',
    deleteGroup: 'Groep verwijderen',
    deleteBlock: 'Blok verwijderen',
    duplicate: 'Dupliceren',
    newBriefing: 'Nieuwe briefing',
    selectBriefing: 'Briefing kiezen',
    meetingPoint: 'Verzamelplaats',
    date: 'Datum',
    time: 'Tijd',
  },
  fr: {
    back: 'Retour',
    briefingBuilder: 'Constructeur de briefing',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    saved: 'Briefing enregistré!',
    send: 'Envoyer',
    sending: 'Envoi...',
    sent: 'Briefing envoyé aux bénévoles!',
    noVolunteersToSend: 'Aucun bénévole assigné pour envoyer le briefing.',
    saveFirstToSend: 'Enregistrez le briefing avant de l\'envoyer.',
    addGroup: 'Ajouter un groupe',
    addBlock: 'Ajouter un bloc',
    groupName: 'Nom du groupe',
    timeSlot: 'Créneau horaire',
    instruction: 'Instruction',
    pause: 'Pause',
    checklist: 'Checklist',
    emergencyContact: 'Contact d\'urgence',
    route: 'Itinéraire',
    custom: 'Champ libre',
    startTime: 'Heure de début',
    endTime: 'Heure de fin',
    location: 'Lieu',
    duration: 'Durée (min)',
    title: 'Titre',
    description: 'Description',
    contactName: 'Nom',
    contactPhone: 'Téléphone',
    contactRole: 'Fonction',
    addItem: 'Ajouter un élément',
    volunteers: 'Bénévoles',
    assignVolunteers: 'Assigner des bénévoles',
    noVolunteers: 'Aucun bénévole inscrit',
    briefingTitle: 'Titre du briefing',
    deleteGroup: 'Supprimer le groupe',
    deleteBlock: 'Supprimer le bloc',
    duplicate: 'Dupliquer',
    newBriefing: 'Nouveau briefing',
    selectBriefing: 'Choisir un briefing',
    meetingPoint: 'Point de rassemblement',
    date: 'Date',
    time: 'Heure',
  },
  en: {
    back: 'Back',
    briefingBuilder: 'Briefing Builder',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Briefing saved!',
    send: 'Send',
    sending: 'Sending...',
    sent: 'Briefing sent to volunteers!',
    noVolunteersToSend: 'No volunteers assigned to send the briefing to.',
    saveFirstToSend: 'Save the briefing before sending.',
    addGroup: 'Add group',
    addBlock: 'Add block',
    groupName: 'Group name',
    timeSlot: 'Time slot',
    instruction: 'Instruction',
    pause: 'Pause',
    checklist: 'Checklist',
    emergencyContact: 'Emergency contact',
    route: 'Route',
    custom: 'Custom field',
    startTime: 'Start time',
    endTime: 'End time',
    location: 'Location',
    duration: 'Duration (min)',
    title: 'Title',
    description: 'Description',
    contactName: 'Name',
    contactPhone: 'Phone',
    contactRole: 'Role',
    addItem: 'Add item',
    volunteers: 'Volunteers',
    assignVolunteers: 'Assign volunteers',
    noVolunteers: 'No signed up volunteers',
    briefingTitle: 'Briefing title',
    deleteGroup: 'Delete group',
    deleteBlock: 'Delete block',
    duplicate: 'Duplicate',
    newBriefing: 'New briefing',
    selectBriefing: 'Select briefing',
    meetingPoint: 'Meeting point',
    date: 'Date',
    time: 'Time',
  },
};

const blockTypeConfig: Record<BlockType, { icon: typeof Clock; color: string }> = {
  time_slot: { icon: Clock, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  instruction: { icon: FileText, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  pause: { icon: Coffee, color: 'bg-green-500/10 text-green-600 border-green-200' },
  checklist: { icon: CheckSquare, color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  emergency_contact: { icon: Phone, color: 'bg-red-500/10 text-red-600 border-red-200' },
  route: { icon: Route, color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200' },
  custom: { icon: PenLine, color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
};

const groupColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const uid = () => crypto.randomUUID();

const BriefingBuilder = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const clubId = searchParams.get('clubId');
  const l = labels[language];

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
    task_date: string | null;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    briefing_location: string | null;
    briefing_time: string | null;
  } | null>(null);
  const [clubData, setClubData] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [allBriefings, setAllBriefings] = useState<{ id: string; title: string }[]>([]);
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string; club_id: string; task_date: string | null }[]>([]);
  const [taskSelectorLoading, setTaskSelectorLoading] = useState(!taskId || !clubId);
  const [taskSearch, setTaskSearch] = useState('');

  // If no taskId/clubId, load available tasks for selection
  useEffect(() => {
    if (taskId && clubId) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/club-login'); return; }

      // Find club(s) this user owns or is member of
      const { data: ownedClubs } = await supabase.from('clubs').select('id').eq('owner_id', session.user.id);
      const { data: memberClubs } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id);
      const clubIds = [
        ...(ownedClubs || []).map(c => c.id),
        ...(memberClubs || []).map(c => c.club_id),
      ];
      if (clubIds.length === 0) { navigate('/club-dashboard'); return; }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, club_id, task_date')
        .in('club_id', clubIds)
        .order('task_date', { ascending: false });
      setAvailableTasks(tasks || []);
      setTaskSelectorLoading(false);
    })();
  }, [taskId, clubId, navigate]);

  // Load existing briefing or initialize
  useEffect(() => {
    if (!taskId || !clubId) return;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setUserId(session.user.id);

      // Get task info with full details
      const { data: task } = await supabase.from('tasks').select('title, task_date, start_time, end_time, location, briefing_location, briefing_time, club_id').eq('id', taskId).maybeSingle();
      if (task) {
        setTaskTitle(task.title);
        setTaskData({
          task_date: task.task_date,
          start_time: task.start_time,
          end_time: task.end_time,
          location: task.location,
          briefing_location: task.briefing_location,
          briefing_time: task.briefing_time,
        });
      }

      // Get club info
      const { data: club } = await supabase.from('clubs').select('name, logo_url').eq('id', clubId).maybeSingle();
      if (club) setClubData(club);

      // Get volunteers signed up for this task
      const { data: signups } = await supabase
        .from('task_signups')
        .select('volunteer_id')
        .eq('task_id', taskId);

      if (signups && signups.length > 0) {
        const vIds = signups.map(s => s.volunteer_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', vIds);
        setVolunteers(profiles || []);
      }

      // Load all briefings for this task
      const { data: briefingsForTask } = await supabase
        .from('briefings')
        .select('id, title')
        .eq('task_id', taskId)
        .order('created_at');

      setAllBriefings(briefingsForTask || []);

      // Load briefing from URL param or first available
      const briefingIdParam = searchParams.get('briefingId');
      const targetBriefing = briefingIdParam
        ? (briefingsForTask || []).find(b => b.id === briefingIdParam)
        : (briefingsForTask || [])[0];

      if (targetBriefing) {
        await loadBriefingData(targetBriefing.id, targetBriefing.title);
      } else {
        // Initialize with one default group
        setBriefingTitle(task?.title || '');
        setGroups([{
          id: uid(),
          name: 'Algemeen',
          color: groupColors[0],
          sort_order: 0,
          blocks: [],
          expanded: true,
        }]);
      }

      setLoading(false);
    };

    init();
  }, [taskId, clubId, navigate]);

  const loadBriefingData = async (bId: string, bTitle: string) => {
    setBriefingId(bId);
    setBriefingTitle(bTitle);

    // Load groups
    const { data: grps } = await supabase
      .from('briefing_groups')
      .select('*')
      .eq('briefing_id', bId)
      .order('sort_order');

    if (grps && grps.length > 0) {
      const groupIds = grps.map(g => g.id);

      // Load blocks
      const { data: blocks } = await supabase
        .from('briefing_blocks')
        .select('*')
        .in('group_id', groupIds)
        .order('sort_order');

      // Load checklist items
      const blockIds = (blocks || []).filter(b => b.type === 'checklist').map(b => b.id);
      let checklistItems: any[] = [];
      if (blockIds.length > 0) {
        const { data: items } = await supabase
          .from('briefing_checklist_items')
          .select('*')
          .in('block_id', blockIds)
          .order('sort_order');
        checklistItems = items || [];
      }

      // Load route waypoints
      const routeBlockIds = (blocks || []).filter(b => b.type === 'route').map(b => b.id);
      let routeWaypoints: any[] = [];
      if (routeBlockIds.length > 0) {
        const { data: wps } = await supabase
          .from('briefing_route_waypoints')
          .select('*')
          .in('block_id', routeBlockIds)
          .order('sort_order');
        routeWaypoints = wps || [];
      }

      // Load group volunteers
      const { data: gvs } = await supabase
        .from('briefing_group_volunteers')
        .select('group_id, volunteer_id')
        .in('group_id', groupIds);

      const gvMap: Record<string, string[]> = {};
      (gvs || []).forEach(gv => {
        if (!gvMap[gv.group_id]) gvMap[gv.group_id] = [];
        gvMap[gv.group_id].push(gv.volunteer_id);
      });
      setGroupVolunteers(gvMap);

      const loadedGroups: Group[] = grps.map(g => ({
        id: g.id,
        name: g.name,
        color: g.color,
        sort_order: g.sort_order,
        expanded: true,
        blocks: (blocks || [])
          .filter(b => b.group_id === g.id)
          .map(b => ({
            id: b.id,
            type: b.type as BlockType,
            sort_order: b.sort_order,
            start_time: b.start_time || undefined,
            end_time: b.end_time || undefined,
            duration_minutes: b.duration_minutes || undefined,
            location: b.location || undefined,
            title: b.title || undefined,
            description: b.description || undefined,
            contact_name: b.contact_name || undefined,
            contact_phone: b.contact_phone || undefined,
            contact_role: b.contact_role || undefined,
            checklist_items: checklistItems
              .filter(ci => ci.block_id === b.id)
              .map(ci => ({ id: ci.id, label: ci.label, sort_order: ci.sort_order })),
            waypoints: routeWaypoints
              .filter(wp => wp.block_id === b.id)
              .map(wp => ({ id: wp.id, label: wp.label, description: wp.description, lat: wp.lat, lng: wp.lng, arrival_time: wp.arrival_time, sort_order: wp.sort_order })),
          })),
      }));

      setGroups(loadedGroups);
    }
  };

  // ─── Group helpers ───
  const addGroup = () => {
    setGroups(prev => [...prev, {
      id: uid(),
      name: '',
      color: groupColors[prev.length % groupColors.length],
      sort_order: prev.length,
      blocks: [],
      expanded: true,
    }]);
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
        id: uid(),
        type,
        sort_order: g.blocks.length,
        checklist_items: type === 'checklist' ? [{ id: uid(), label: '', sort_order: 0 }] : undefined,
        waypoints: type === 'route' ? [] : undefined,
      };
      return { ...g, blocks: [...g.blocks, newBlock] };
    }));
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
      return {
        ...g, blocks: g.blocks.map(b => {
          if (b.id !== blockId) return b;
          const items = b.checklist_items || [];
          return { ...b, checklist_items: [...items, { id: uid(), label: '', sort_order: items.length }] };
        }),
      };
    }));
  };

  const updateChecklistItem = (groupId: string, blockId: string, itemId: string, label: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g, blocks: g.blocks.map(b => {
          if (b.id !== blockId) return b;
          return { ...b, checklist_items: (b.checklist_items || []).map(ci => ci.id === itemId ? { ...ci, label } : ci) };
        }),
      };
    }));
  };

  const removeChecklistItem = (groupId: string, blockId: string, itemId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g, blocks: g.blocks.map(b => {
          if (b.id !== blockId) return b;
          return { ...b, checklist_items: (b.checklist_items || []).filter(ci => ci.id !== itemId) };
        }),
      };
    }));
  };

  // ─── Volunteer assignment ───
  const toggleVolunteer = (groupId: string, volunteerId: string) => {
    setGroupVolunteers(prev => {
      const current = prev[groupId] || [];
      if (current.includes(volunteerId)) {
        return { ...prev, [groupId]: current.filter(v => v !== volunteerId) };
      }
      return { ...prev, [groupId]: [...current, volunteerId] };
    });
  };

  // ─── Save ───
  const handleSave = async () => {
    if (!taskId || !clubId) return;
    setSaving(true);

    try {
      let bId = briefingId;

      if (!bId) {
        const { data, error } = await supabase
          .from('briefings')
          .insert({ task_id: taskId, club_id: clubId, title: briefingTitle, created_by: userId })
          .select('id')
          .single();
        if (error) throw error;
        bId = data.id;
        setBriefingId(bId);
      } else {
        await supabase.from('briefings').update({ title: briefingTitle }).eq('id', bId);
      }

      // Delete existing groups (cascade deletes blocks, items)
      await supabase.from('briefing_groups').delete().eq('briefing_id', bId);

      // Insert groups
      for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];
        const { data: savedGroup, error: gErr } = await supabase
          .from('briefing_groups')
          .insert({ briefing_id: bId!, name: group.name || 'Groep', color: group.color, sort_order: gi })
          .select('id')
          .single();
        if (gErr) throw gErr;

        // Insert blocks
        for (let bi = 0; bi < group.blocks.length; bi++) {
          const block = group.blocks[bi];
          const { data: savedBlock, error: bErr } = await supabase
            .from('briefing_blocks')
            .insert({
              group_id: savedGroup.id,
              type: block.type,
              sort_order: bi,
              start_time: block.start_time || null,
              end_time: block.end_time || null,
              duration_minutes: block.duration_minutes || null,
              location: block.location || null,
              title: block.title || null,
              description: block.description || null,
              contact_name: block.contact_name || null,
              contact_phone: block.contact_phone || null,
              contact_role: block.contact_role || null,
            })
            .select('id')
            .single();
          if (bErr) throw bErr;

          // Insert checklist items
          if (block.type === 'checklist' && block.checklist_items) {
            const validItems = block.checklist_items.filter(ci => ci.label.trim());
            if (validItems.length > 0) {
              await supabase.from('briefing_checklist_items').insert(
                validItems.map((ci, idx) => ({
                  block_id: savedBlock.id,
                  label: ci.label.trim(),
                  sort_order: idx,
                }))
              );
            }
          }

          // Insert route waypoints
          if (block.type === 'route' && block.waypoints && block.waypoints.length > 0) {
            await supabase.from('briefing_route_waypoints').insert(
              block.waypoints.map((wp, idx) => ({
                block_id: savedBlock.id,
                label: wp.label || '',
                description: wp.description || null,
                lat: wp.lat,
                lng: wp.lng,
                arrival_time: wp.arrival_time || null,
                sort_order: idx,
              }))
            );
          }
        }

        // Insert group volunteers
        const vols = groupVolunteers[group.id] || [];
        if (vols.length > 0) {
          await supabase.from('briefing_group_volunteers').insert(
            vols.map(vid => ({ group_id: savedGroup.id, volunteer_id: vid }))
          );
        }
      }

      // Update allBriefings list
      setAllBriefings(prev => {
        const exists = prev.find(b => b.id === bId);
        if (exists) return prev.map(b => b.id === bId ? { ...b, title: briefingTitle } : b);
        return [...prev, { id: bId!, title: briefingTitle }];
      });

      toast.success(l.saved);
    } catch (err: any) {
      toast.error(err.message || 'Error saving briefing');
    } finally {
      setSaving(false);
    }
  };

  // ─── New Briefing ───
  const handleNewBriefing = () => {
    setBriefingId(null);
    setBriefingTitle(taskTitle ? `${taskTitle} (${allBriefings.length + 1})` : '');
    setGroups([{
      id: uid(),
      name: 'Algemeen',
      color: groupColors[0],
      sort_order: 0,
      blocks: [],
      expanded: true,
    }]);
    setGroupVolunteers({});
  };

  // ─── Duplicate Briefing ───
  const handleDuplicate = () => {
    setBriefingId(null);
    setBriefingTitle(`${briefingTitle} (kopie)`);
    // Deep clone groups with new IDs
    setGroups(groups.map(g => ({
      ...g,
      id: uid(),
      blocks: g.blocks.map(b => ({
        ...b,
        id: uid(),
        checklist_items: (b.checklist_items || []).map(ci => ({ ...ci, id: uid() })),
        waypoints: (b.waypoints || []).map(wp => ({ ...wp, id: uid() })),
      })),
    })));
    toast.success(language === 'nl' ? 'Briefing gedupliceerd — sla op om te bewaren' : 'Briefing duplicated — save to keep');
  };

  // ─── Switch Briefing ───
  const switchBriefing = async (bId: string) => {
    const b = allBriefings.find(x => x.id === bId);
    if (!b) return;
    setLoading(true);
    setGroups([]);
    setGroupVolunteers({});
    await loadBriefingData(b.id, b.title);
    setLoading(false);
  };

  // ─── Generate PDF (Premium Design) ───
  const generateBriefingPdf = (): Blob => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = margin;

    // ── Color palette ──
    const primary = { r: 234, g: 120, b: 23 };   // warm orange
    const dark = { r: 30, g: 30, b: 35 };
    const muted = { r: 120, g: 120, b: 130 };
    const light = { r: 245, g: 245, b: 248 };
    const accent = { r: 13, g: 148, b: 136 };     // teal

    const setColor = (c: { r: number; g: number; b: number }) => doc.setTextColor(c.r, c.g, c.b);
    const setFillColor = (c: { r: number; g: number; b: number }) => doc.setFillColor(c.r, c.g, c.b);
    const setDrawCol = (c: { r: number; g: number; b: number }) => doc.setDrawColor(c.r, c.g, c.b);

    // ── Helper: page footer ──
    const addFooter = (pageNum?: number, totalPages?: number) => {
      const footerY = pageH - 10;
      doc.setFontSize(7);
      setColor(muted);
      doc.setFont('helvetica', 'normal');
      if (clubData?.name) {
        doc.text(clubData.name, margin, footerY);
      }
      if (pageNum && totalPages) {
        doc.text(`${pageNum} / ${totalPages}`, pageW - margin, footerY, { align: 'right' });
      }
      // Thin top line for footer
      setDrawCol({ r: 230, g: 230, b: 235 });
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
    };

    // ── Helper: section divider with color bar ──
    const drawColorBar = (color: string, barY: number) => {
      try {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        doc.setFillColor(r, g, b);
      } catch {
        setFillColor(primary);
      }
      doc.roundedRect(margin, barY, contentW, 1.5, 0.75, 0.75, 'F');
    };

    const checkPage = (needed: number) => {
      if (y + needed > pageH - 20) {
        doc.addPage();
        y = margin;
        return true;
      }
      return false;
    };

    // ═══════════════════════════════════════════
    // ── COVER PAGE ──
    // ═══════════════════════════════════════════
    const centerX = pageW / 2;

    // Top accent bar
    setFillColor(primary);
    doc.rect(0, 0, pageW, 3, 'F');

    // Club name — small, elegant, uppercase tracking
    y = 65;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setColor(muted);
    doc.text((clubData?.name || '').toUpperCase(), centerX, y, { align: 'center' });

    // Briefing title — large, bold
    y += 12;
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    setColor(dark);
    const titleLines = doc.splitTextToSize(briefingTitle || 'Briefing', contentW - 20);
    doc.text(titleLines, centerX, y, { align: 'center' });
    y += titleLines.length * 13 + 8;

    // Accent underline
    const underlineW = 40;
    setFillColor(primary);
    doc.roundedRect(centerX - underlineW / 2, y, underlineW, 1.5, 0.75, 0.75, 'F');
    y += 18;

    // Task details — info cards style
    const detailItems: { icon: string; label: string; value: string }[] = [];
    if (taskData?.task_date) {
      const d = new Date(taskData.task_date);
      detailItems.push({
        icon: 'DATUM',
        label: language === 'nl' ? 'Datum' : language === 'fr' ? 'Date' : 'Date',
        value: d.toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      });
    }
    if (taskData?.start_time || taskData?.end_time) {
      const st = taskData?.start_time ? new Date(taskData.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const et = taskData?.end_time ? new Date(taskData.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      detailItems.push({
        icon: 'TIJD',
        label: language === 'nl' ? 'Tijdstip' : language === 'fr' ? 'Horaire' : 'Time',
        value: `${st}${et ? ` — ${et}` : ''}`,
      });
    }
    if (taskData?.location) {
      detailItems.push({
        icon: 'LOC',
        label: language === 'nl' ? 'Locatie' : language === 'fr' ? 'Lieu' : 'Location',
        value: taskData.location,
      });
    }
    if (taskData?.briefing_location) {
      detailItems.push({
        icon: 'VP',
        label: language === 'nl' ? 'Verzamelplaats' : language === 'fr' ? 'Rassemblement' : 'Meeting point',
        value: taskData.briefing_location,
      });
    }
    if (taskData?.briefing_time) {
      const bt = new Date(taskData.briefing_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      detailItems.push({
        icon: 'BRF',
        label: language === 'nl' ? 'Briefing' : 'Briefing',
        value: bt,
      });
    }

    // Render detail cards in a clean grid
    if (detailItems.length > 0) {
      const cardW = contentW;
      const cardX = margin;

      // Background card
      setFillColor(light);
      const cardH = detailItems.length * 12 + 12;
      doc.roundedRect(cardX, y - 4, cardW, cardH, 3, 3, 'F');

      y += 4;
      detailItems.forEach((item) => {
        // Label
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        setColor(primary);
        doc.text(item.label.toUpperCase(), cardX + 10, y);
        // Value
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        setColor(dark);
        doc.text(item.value, cardX + 10, y + 5);
        y += 12;
      });
    }

    // Cover footer
    doc.setFontSize(7);
    setColor(muted);
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    doc.text(
      `${language === 'nl' ? 'Gegenereerd op' : language === 'fr' ? 'Généré le' : 'Generated on'} ${now.toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      centerX, pageH - 15, { align: 'center' }
    );

    // Bottom accent bar
    setFillColor(primary);
    doc.rect(0, pageH - 3, pageW, 3, 'F');

    // ═══════════════════════════════════════════
    // ── CONTENT PAGES ──
    // ═══════════════════════════════════════════
    const totalContentPages = groups.length;
    groups.forEach((group, gi) => {
      doc.addPage();
      y = margin;

      // Top accent bar
      setFillColor(primary);
      doc.rect(0, 0, pageW, 2, 'F');

      // Section color bar
      drawColorBar(group.color, y);
      y += 6;

      // Section number + title
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(primary);
      doc.text(`${language === 'nl' ? 'SECTIE' : language === 'fr' ? 'SECTION' : 'SECTION'} ${gi + 1}/${totalContentPages}`, margin, y);
      y += 6;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      setColor(dark);
      const sectionTitle = group.name || `${language === 'nl' ? 'Sectie' : 'Section'} ${gi + 1}`;
      doc.text(sectionTitle, margin, y);
      y += 10;

      // Thin separator
      setDrawCol({ r: 230, g: 230, b: 235 });
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      group.blocks.forEach(block => {
        checkPage(25);

        // Block type badge
        const typeLabel = blockLabel(block.type).toUpperCase();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');

        // Badge background
        const badgeW = doc.getTextWidth(typeLabel) + 6;
        const badgeColors: Record<BlockType, { r: number; g: number; b: number }> = {
          time_slot: { r: 59, g: 130, b: 246 },
          instruction: { r: 245, g: 158, b: 11 },
          pause: { r: 16, g: 185, b: 129 },
          checklist: { r: 139, g: 92, b: 246 },
          emergency_contact: { r: 239, g: 68, b: 68 },
          route: { r: 6, g: 182, b: 212 },
          custom: { r: 100, g: 116, b: 139 },
        };
        const bColor = badgeColors[block.type] || muted;
        doc.setFillColor(bColor.r, bColor.g, bColor.b);
        doc.roundedRect(margin, y - 3.5, badgeW, 5, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(typeLabel, margin + 3, y);
        y += 5;

        // Reset text style
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        setColor(dark);

        if (block.type === 'time_slot') {
          if (block.start_time || block.end_time) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            setColor(dark);
            doc.text(`${block.start_time || ''} — ${block.end_time || ''}`, margin + 1, y + 1);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            y += 7;
          }
          if (block.location) {
            setColor(accent);
            doc.setFontSize(9);
            doc.text(block.location, margin + 1, y);
            setColor(dark);
            doc.setFontSize(10);
            y += 5;
          }
          if (block.description) {
            setColor(muted);
            doc.setFontSize(9);
            const lines = doc.splitTextToSize(block.description, contentW - 4);
            checkPage(lines.length * 4 + 2);
            doc.text(lines, margin + 1, y);
            setColor(dark);
            doc.setFontSize(10);
            y += lines.length * 4 + 2;
          }
        } else if (block.type === 'instruction' || block.type === 'custom') {
          if (block.title) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(block.title, margin + 1, y + 1);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            y += 6;
          }
          if (block.description) {
            setColor({ r: 60, g: 60, b: 65 });
            doc.setFontSize(9);
            const lines = doc.splitTextToSize(block.description, contentW - 4);
            checkPage(lines.length * 4 + 2);
            doc.text(lines, margin + 1, y);
            setColor(dark);
            doc.setFontSize(10);
            y += lines.length * 4 + 2;
          }
        } else if (block.type === 'pause') {
          // Pause card with background
          const parts = [];
          if (block.duration_minutes) parts.push(`${block.duration_minutes} min`);
          if (block.start_time) parts.push(`${language === 'nl' ? 'om' : language === 'fr' ? 'à' : 'at'} ${block.start_time}`);
          if (block.location) parts.push(block.location);
          if (parts.length) {
            setFillColor({ r: 240, g: 253, b: 244 });
            doc.roundedRect(margin, y - 2, contentW, 8, 2, 2, 'F');
            doc.setFontSize(9);
            setColor({ r: 22, g: 163, b: 74 });
            doc.setFont('helvetica', 'bold');
            doc.text(parts.join('  ·  '), margin + 4, y + 2.5);
            doc.setFont('helvetica', 'normal');
            setColor(dark);
            doc.setFontSize(10);
            y += 10;
          }
        } else if (block.type === 'checklist') {
          if (block.title) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(block.title, margin + 1, y + 1);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            y += 6;
          }
          (block.checklist_items || []).forEach(item => {
            if (item.label.trim()) {
              checkPage(7);
              // Checkbox square
              setDrawCol({ r: 180, g: 180, b: 190 });
              doc.setLineWidth(0.4);
              doc.roundedRect(margin + 2, y - 3, 3.5, 3.5, 0.5, 0.5, 'S');
              // Label
              doc.setFontSize(9);
              setColor(dark);
              doc.text(item.label, margin + 8, y);
              doc.setFontSize(10);
              y += 6;
            }
          });
        } else if (block.type === 'emergency_contact') {
          // Emergency contact card
          setFillColor({ r: 254, g: 242, b: 242 });
          const ecParts = [block.contact_name, block.contact_role, block.contact_phone].filter(Boolean);
          const ecH = 12;
          doc.roundedRect(margin, y - 2, contentW, ecH, 2, 2, 'F');
          // Red left bar
          doc.setFillColor(239, 68, 68);
          doc.roundedRect(margin, y - 2, 2, ecH, 1, 1, 'F');

          if (block.contact_name) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            setColor({ r: 185, g: 28, b: 28 });
            doc.text(block.contact_name, margin + 6, y + 2);
          }
          const subParts = [block.contact_role, block.contact_phone].filter(Boolean);
          if (subParts.length) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            setColor({ r: 153, g: 27, b: 27 });
            doc.text(subParts.join('  ·  '), margin + 6, y + 6.5);
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          setColor(dark);
          y += ecH + 2;
        } else if (block.type === 'route') {
          if (block.title) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(block.title, margin + 1, y + 1);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            y += 6;
          }
          if (block.description) {
            setColor(muted);
            doc.setFontSize(9);
            const lines = doc.splitTextToSize(block.description, contentW - 4);
            checkPage(lines.length * 4 + 2);
            doc.text(lines, margin + 1, y);
            setColor(dark);
            doc.setFontSize(10);
            y += lines.length * 4 + 2;
          }
          (block.waypoints || []).forEach((wp, wi) => {
            checkPage(12);
            // Numbered circle
            const circleX = margin + 4;
            const circleY = y - 1;
            doc.setFillColor(accent.r, accent.g, accent.b);
            doc.circle(circleX, circleY, 3, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(`${wi + 1}`, circleX, circleY + 1, { align: 'center' });

            // Waypoint label
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            setColor(dark);
            const wpLabel = wp.label || `${language === 'nl' ? 'Punt' : 'Point'} ${wi + 1}`;
            doc.text(wpLabel, margin + 10, y);
            if (wp.arrival_time) {
              doc.setFont('helvetica', 'normal');
              setColor(accent);
              doc.text(wp.arrival_time, margin + 10 + doc.getTextWidth(wpLabel + '  '), y);
              setColor(dark);
            }
            y += 4;
            if (wp.description) {
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              setColor(muted);
              doc.text(wp.description, margin + 10, y);
              setColor(dark);
              doc.setFontSize(10);
              y += 4;
            }
            // Connecting line to next
            if (wi < (block.waypoints || []).length - 1) {
              setDrawCol({ r: 200, g: 220, b: 220 });
              doc.setLineWidth(0.3);
              doc.setLineDashPattern([1, 1], 0);
              doc.line(circleX, circleY + 3, circleX, y + 1);
              doc.setLineDashPattern([], 0);
              y += 2;
            }
          });
        }

        y += 6; // spacing between blocks
      });

      // Page footer
      addFooter(gi + 2, totalContentPages + 1);

      // Bottom accent bar
      setFillColor(primary);
      doc.rect(0, pageH - 2, pageW, 2, 'F');
    });

    // Add footer to cover page
    doc.setPage(1);
    addFooter(1, totalContentPages + 1);

    return doc.output('blob');
  };

  // ─── Open send dialog ───
  const handleOpenSendDialog = () => {
    if (!briefingId) {
      toast.error(l.saveFirstToSend);
      return;
    }
    setShowSendDialog(true);
  };

  // ─── Send briefing via chat ───
  const handleSendBriefing = async (selectedVolunteerIds: string[], personalMessage: string) => {
    if (!taskId || !clubId || !userId) return;

    setSendingBriefing(true);
    try {
      // Generate PDF
      const pdfBlob = generateBriefingPdf();
      const fileName = `briefing_${(briefingTitle || 'briefing').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      // Upload PDF to storage
      const storagePath = `${userId}/${Date.now()}_${fileName}`;
      const { error: uploadErr } = await supabase.storage
        .from('chat-attachments')
        .upload(storagePath, pdfBlob, { contentType: 'application/pdf' });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(storagePath);

      // For each selected volunteer, find or create conversation and send message
      for (const volunteerId of selectedVolunteerIds) {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('task_id', taskId)
          .eq('volunteer_id', volunteerId)
          .maybeSingle();

        let convoId: string;
        if (existing) {
          convoId = existing.id;
        } else {
          const { data: created, error: convoErr } = await supabase
            .from('conversations')
            .insert({
              task_id: taskId,
              volunteer_id: volunteerId,
              club_owner_id: userId,
            })
            .select('id')
            .single();
          if (convoErr) throw convoErr;
          convoId = created.id;
        }

        // Build message content
        const msgContent = personalMessage.trim()
          ? `📋 ${briefingTitle || 'Briefing'}\n\n${personalMessage.trim()}`
          : `📋 ${briefingTitle || 'Briefing'}`;

        // Send message with PDF attachment
        const { error: msgErr } = await supabase.from('messages').insert({
          conversation_id: convoId,
          sender_id: userId,
          content: msgContent,
          attachment_url: publicUrl,
          attachment_type: 'document',
          attachment_name: fileName,
        });
        if (msgErr) throw msgErr;

        await supabase.from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convoId);
      }

      setShowSendDialog(false);
      toast.success(l.sent);
    } catch (err: any) {
      toast.error(err.message || 'Error sending briefing');
    } finally {
      setSendingBriefing(false);
    }
  };

  const blockLabel = (type: BlockType) => {
    const map: Record<BlockType, string> = {
      time_slot: l.timeSlot,
      instruction: l.instruction,
      pause: l.pause,
      checklist: l.checklist,
      emergency_contact: l.emergencyContact,
      route: l.route,
      custom: l.custom,
    };
    return map[type];
  };

  // Task selector when no taskId provided
  if (!taskId || !clubId) {
    if (taskSelectorLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    const filtered = availableTasks.filter(t =>
      t.title.toLowerCase().includes(taskSearch.toLowerCase())
    );

    return (
      <ClubPageLayout>
        <div className="max-w-2xl mx-auto py-4">
          <h1 className="text-2xl font-bold text-foreground mb-1">{l.briefingBuilder}</h1>
          <p className="text-muted-foreground text-sm mb-6">Selecteer een taak om de briefing te bewerken of aan te maken.</p>
          <Input
            placeholder="Zoek taak..."
            value={taskSearch}
            onChange={e => setTaskSearch(e.target.value)}
            className="mb-4"
          />
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">Geen taken gevonden.</p>
            )}
            {filtered.map(task => (
              <button
                key={task.id}
                onClick={() => navigate(`/briefing-builder?taskId=${task.id}&clubId=${task.club_id}`)}
                className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <p className="font-medium text-foreground">{task.title}</p>
                {task.task_date && (
                  <p className="text-xs text-muted-foreground mt-1">{new Date(task.task_date).toLocaleDateString('nl-BE')}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </ClubPageLayout>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ClubPageLayout>
      <div className="max-w-4xl mx-auto">
        {/* Briefing actions bar */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {allBriefings.length > 1 && (
            <select
              value={briefingId || ''}
              onChange={e => e.target.value && switchBriefing(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            >
              {allBriefings.map(b => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          )}
          <Button onClick={handleNewBriefing} size="sm" variant="ghost" title={l.newBriefing}>
            <Plus className="w-4 h-4" />
          </Button>
          <Button onClick={handleDuplicate} size="sm" variant="ghost" title={l.duplicate} disabled={groups.length === 0}>
            <Copy className="w-4 h-4" />
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving || sendingBriefing} size="sm" variant="outline">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              {saving ? l.saving : l.save}
            </Button>
            <Button onClick={handleOpenSendDialog} disabled={sendingBriefing || saving} size="sm">
              {sendingBriefing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              {sendingBriefing ? l.sending : l.send}
            </Button>
          </div>
        </div>
        {/* Title */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-1">{taskTitle}</p>
          <Input
            value={briefingTitle}
            onChange={e => setBriefingTitle(e.target.value)}
            placeholder={l.briefingTitle}
            className="text-xl font-heading font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
          />
        </div>

        {/* Groups */}
        <div className="space-y-6">
          {groups.map((group, gi) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
            >
              {/* Group header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => updateGroup(group.id, { expanded: !group.expanded })}
              >
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                <input
                  value={group.name}
                  onChange={e => { e.stopPropagation(); updateGroup(group.id, { name: e.target.value }); }}
                  onClick={e => e.stopPropagation()}
                  placeholder={l.groupName}
                  className="flex-1 bg-transparent font-medium text-foreground outline-none"
                />
                <div className="flex items-center gap-1">
                  {/* Color picker */}
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {groupColors.map(c => (
                        <button
                          key={c}
                          onClick={() => updateGroup(group.id, { color: c })}
                          className={`w-4 h-4 rounded-full transition-transform ${group.color === c ? 'ring-2 ring-offset-1 ring-foreground scale-125' : 'hover:scale-110'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Volunteer count */}
                  <span className="text-xs text-muted-foreground ml-2">
                    <Users className="w-3.5 h-3.5 inline mr-0.5" />
                    {(groupVolunteers[group.id] || []).length}
                  </span>
                  {groups.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); removeGroup(group.id); }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                      <div className="px-4 pb-3 border-b border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">{l.assignVolunteers}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {volunteers.map(v => {
                            const assigned = (groupVolunteers[group.id] || []).includes(v.id);
                            return (
                              <button
                                key={v.id}
                                onClick={() => toggleVolunteer(group.id, v.id)}
                                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                                  assigned
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                              >
                                {v.full_name || v.email || 'Vrijwilliger'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Blocks */}
                    <div className="p-4 space-y-3">
                      {group.blocks.map((block, bi) => {
                        const config = blockTypeConfig[block.type];
                        const Icon = config.icon;
                        return (
                          <motion.div
                            key={block.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`rounded-xl border p-4 ${config.color}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 opacity-40 cursor-grab" />
                                <Icon className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wide">{blockLabel(block.type)}</span>
                              </div>
                              <button
                                onClick={() => removeBlock(group.id, block.id)}
                                className="p-1 opacity-40 hover:opacity-100 hover:text-destructive transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Time Slot fields */}
                            {block.type === 'time_slot' && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                  type="time"
                                  value={block.start_time || ''}
                                  onChange={e => updateBlock(group.id, block.id, { start_time: e.target.value })}
                                  placeholder={l.startTime}
                                  className="bg-background/60 text-sm"
                                />
                                <Input
                                  type="time"
                                  value={block.end_time || ''}
                                  onChange={e => updateBlock(group.id, block.id, { end_time: e.target.value })}
                                  placeholder={l.endTime}
                                  className="bg-background/60 text-sm"
                                />
                                <Input
                                  value={block.location || ''}
                                  onChange={e => updateBlock(group.id, block.id, { location: e.target.value })}
                                  placeholder={l.location}
                                  className="bg-background/60 text-sm"
                                />
                                <div className="sm:col-span-3">
                                  <Input
                                    value={block.description || ''}
                                    onChange={e => updateBlock(group.id, block.id, { description: e.target.value })}
                                    placeholder={l.description}
                                    className="bg-background/60 text-sm"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Instruction fields */}
                            {block.type === 'instruction' && (
                              <div className="space-y-2">
                                <Input
                                  value={block.title || ''}
                                  onChange={e => updateBlock(group.id, block.id, { title: e.target.value })}
                                  placeholder={l.title}
                                  className="bg-background/60 text-sm font-medium"
                                />
                                <Textarea
                                  value={block.description || ''}
                                  onChange={e => updateBlock(group.id, block.id, { description: e.target.value })}
                                  placeholder={l.description}
                                  className="bg-background/60 text-sm min-h-[60px]"
                                />
                              </div>
                            )}

                            {/* Pause fields */}
                            {block.type === 'pause' && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={block.duration_minutes || ''}
                                  onChange={e => updateBlock(group.id, block.id, { duration_minutes: parseInt(e.target.value) || undefined })}
                                  placeholder={l.duration}
                                  className="bg-background/60 text-sm"
                                />
                                <Input
                                  type="time"
                                  value={block.start_time || ''}
                                  onChange={e => updateBlock(group.id, block.id, { start_time: e.target.value })}
                                  placeholder={l.startTime}
                                  className="bg-background/60 text-sm"
                                />
                                <Input
                                  value={block.location || ''}
                                  onChange={e => updateBlock(group.id, block.id, { location: e.target.value })}
                                  placeholder={l.location}
                                  className="bg-background/60 text-sm"
                                />
                              </div>
                            )}

                            {/* Checklist fields */}
                            {block.type === 'checklist' && (
                              <div className="space-y-2">
                                <Input
                                  value={block.title || ''}
                                  onChange={e => updateBlock(group.id, block.id, { title: e.target.value })}
                                  placeholder={l.title}
                                  className="bg-background/60 text-sm font-medium"
                                />
                                {(block.checklist_items || []).map((item, idx) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <CheckSquare className="w-3.5 h-3.5 opacity-40 shrink-0" />
                                    <Input
                                      value={item.label}
                                      onChange={e => updateChecklistItem(group.id, block.id, item.id, e.target.value)}
                                      placeholder={`Item ${idx + 1}`}
                                      className="bg-background/60 text-sm flex-1"
                                    />
                                    <button
                                      onClick={() => removeChecklistItem(group.id, block.id, item.id)}
                                      className="p-1 opacity-40 hover:opacity-100 hover:text-destructive"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => addChecklistItem(group.id, block.id)}
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> {l.addItem}
                                </button>
                              </div>
                            )}

                            {/* Emergency contact fields */}
                            {block.type === 'emergency_contact' && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input
                                  value={block.contact_name || ''}
                                  onChange={e => updateBlock(group.id, block.id, { contact_name: e.target.value })}
                                  placeholder={l.contactName}
                                  className="bg-background/60 text-sm"
                                />
                                <Input
                                  value={block.contact_phone || ''}
                                  onChange={e => updateBlock(group.id, block.id, { contact_phone: e.target.value })}
                                  placeholder={l.contactPhone}
                                  className="bg-background/60 text-sm"
                                />
                                <Input
                                  value={block.contact_role || ''}
                                  onChange={e => updateBlock(group.id, block.id, { contact_role: e.target.value })}
                                  placeholder={l.contactRole}
                                  className="bg-background/60 text-sm"
                                />
                              </div>
                            )}

                            {/* Route fields */}
                            {block.type === 'route' && (
                              <div className="space-y-2">
                                <Input
                                  value={block.title || ''}
                                  onChange={e => updateBlock(group.id, block.id, { title: e.target.value })}
                                  placeholder={l.title}
                                  className="bg-background/60 text-sm font-medium"
                                />
                                <Textarea
                                  value={block.description || ''}
                                  onChange={e => updateBlock(group.id, block.id, { description: e.target.value })}
                                  placeholder={l.description}
                                  className="bg-background/60 text-sm min-h-[40px]"
                                  rows={2}
                                />
                                <RouteMapEditor
                                  waypoints={block.waypoints || []}
                                  onChange={wps => updateBlock(group.id, block.id, { waypoints: wps })}
                                  language={language}
                                />
                              </div>
                            )}

                            {/* Custom free field */}
                            {block.type === 'custom' && (
                              <div className="space-y-2">
                                <Input
                                  value={block.title || ''}
                                  onChange={e => updateBlock(group.id, block.id, { title: e.target.value })}
                                  placeholder={l.title}
                                  className="bg-background/60 text-sm font-medium"
                                />
                                <Textarea
                                  value={block.description || ''}
                                  onChange={e => updateBlock(group.id, block.id, { description: e.target.value })}
                                  placeholder={l.description}
                                  className="bg-background/60 text-sm min-h-[80px]"
                                  rows={4}
                                />
                              </div>
                            )}
                          </motion.div>
                        );
                      })}

                      {/* Add block buttons */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {(['time_slot', 'instruction', 'pause', 'checklist', 'emergency_contact', 'route', 'custom'] as BlockType[]).map(type => {
                          const config = blockTypeConfig[type];
                          const Icon = config.icon;
                          return (
                            <button
                              key={type}
                              onClick={() => addBlock(group.id, type)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {blockLabel(type)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {/* Add group button */}
          <button
            onClick={addGroup}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {l.addGroup}
          </button>
        </div>
      </div>

      {/* Send Briefing Dialog */}
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
