import { useEffect, useState } from 'react';
import { sendPushToFollowers, sendPushToClubMembers } from '@/lib/sendPush';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Calendar, MapPin, Users, Layers, ChevronDown, ChevronUp,
  Pencil, Copy, Loader2, X, AlertTriangle, CalendarDays, Handshake, LayoutGrid,
  PauseCircle, PlayCircle, Shield, Radio, Play, BookOpen, MoreHorizontal,
  FileText, Save, ClipboardCheck, Send, UserCheck, Zap, Wand2, Clock, Activity,
} from 'lucide-react';
import BulkMessageDialog from '@/components/BulkMessageDialog';
import EventTemplateDialog from '@/components/EventTemplateDialog';
import ClubPageLayout from '@/components/ClubPageLayout';
import PageNavTabs from '@/components/PageNavTabs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskZoneDialog from '@/components/TaskZoneDialog';
import SafetyConfigDialog from '@/components/SafetyConfigDialog';
import PlanningOnboardingTour from '@/components/PlanningOnboardingTour';
import SpoedoproepDialog from '@/components/SpoedoproepDialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EventData {
  id: string; club_id: string; title: string; description: string | null;
  event_date: string | null; location: string | null; status: string; created_at: string;
}
interface EventGroup {
  id: string; event_id: string; name: string; color: string; sort_order: number;
  wristband_color?: string | null; wristband_label?: string | null; materials_note?: string | null;
}
interface Task {
  id: string; title: string; task_date: string | null; location: string | null;
  spots_available: number; event_id: string | null; event_group_id: string | null;
  partner_only?: boolean; assigned_partner_id?: string | null; status?: string;
  start_time?: string | null; end_time?: string | null;
}

const GROUP_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const EventsManager = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [clubId, setClubId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Create event
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', location: '', street: '', number: '', postalCode: '', city: '', country: 'België', locationNote: '', kickoff_time: '', shift_template_id: '' });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [shiftTemplates, setShiftTemplates] = useState<{ id: string; name: string }[]>([]);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // Create loose task
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', description: '', task_date: '', spots_available: 1,
    street: '', number: '', postalCode: '', city: '', country: 'België', locationNote: '',
    start_time: '', end_time: '', briefing_time: '', briefing_location: '', notes: '',
    compensation_type: 'none' as 'none' | 'fixed' | 'hourly' | 'daily',
    expense_amount: '', hourly_rate: '', estimated_hours: '', daily_rate: '',
    contract_template_id: '', add_to_monthly_plan: false,
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [contractTemplates, setContractTemplates] = useState<{ id: string; name: string }[]>([]);
  const [monthlyPlans, setMonthlyPlans] = useState<{ id: string; title: string; month: number; year: number }[]>([]);
  const [selectedMonthlyPlanId, setSelectedMonthlyPlanId] = useState('');

  // Event management
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [addingGroupToEvent, setAddingGroupToEvent] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupWristbandColor, setNewGroupWristbandColor] = useState('');
  const [newGroupWristbandLabel, setNewGroupWristbandLabel] = useState('');
  const [newGroupMaterialsNote, setNewGroupMaterialsNote] = useState('');
  const [duplicatingEvent, setDuplicatingEvent] = useState<string | null>(null);
  const [duplicateDateDialog, setDuplicateDateDialog] = useState<string | null>(null);
  const [duplicateNewDate, setDuplicateNewDate] = useState('');
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<string | null>(null);
  const [showTaskSetPicker, setShowTaskSetPicker] = useState(false);
  const [taskSetPickerEventId, setTaskSetPickerEventId] = useState<string | null>(null);
  const [taskSets, setTaskSets] = useState<{ id: string; name: string; items: { template_id: string }[] }[]>([]);
  const [taskTemplatesMap, setTaskTemplatesMap] = useState<Record<string, any>>({});
  const [applyingSet, setApplyingSet] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [editEventForm, setEditEventForm] = useState({ title: '', description: '', event_date: '', location: '' });
  const [savingEvent, setSavingEvent] = useState(false);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<string | null>(null);
  const [togglingHold, setTogglingHold] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoDeleteLoading, setDemoDeleteLoading] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [bulkMessageEventId, setBulkMessageEventId] = useState<string | null>(null);
  const [bulkMessageTask, setBulkMessageTask] = useState<{ id: string; title: string } | null>(null);

  // Adding task to group
  const [addingTaskToGroup, setAddingTaskToGroup] = useState<{ eventId: string; groupId: string } | null>(null);
  const [groupTaskForm, setGroupTaskForm] = useState({ title: '', task_date: '', location: '', spots_available: 1 });
  const [creatingGroupTask, setCreatingGroupTask] = useState(false);

  // Zone dialog
  const [zoneDialogTask, setZoneDialogTask] = useState<{ id: string; title: string } | null>(null);
  const [safetyConfigEvent, setSafetyConfigEvent] = useState<{ eventId: string; clubId: string } | null>(null);
  const [spoedTask, setSpoedTask] = useState<Task | null>(null);

  // Edit group
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editGroupForm, setEditGroupForm] = useState({ name: '', color: '', wristband_color: '', wristband_label: '', materials_note: '' });
  const [savingGroup, setSavingGroup] = useState(false);

  const nl = language === 'nl';
  const fr = language === 'fr';
  const t3 = (nlS: string, frS: string, enS: string) => nl ? nlS : fr ? frS : enS;
  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  // Tour action listener
  useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent).detail?.action;
      if (action === 'open-create-event') {
        setShowCreateEvent(true);
        setShowCreateTask(false);
      } else if (action === 'close-forms') {
        setShowCreateEvent(false);
        setShowCreateTask(false);
        setAddingGroupToEvent(null);
        setAddingTaskToGroup(null);
      } else if (action === 'expand-first-event') {
        setShowCreateEvent(false);
        setShowCreateTask(false);
        if (events.length > 0) setExpandedEvent(events[0].id);
      } else if (action === 'open-add-group') {
        if (events.length > 0) {
          setExpandedEvent(events[0].id);
          setAddingGroupToEvent(events[0].id);
          setNewGroupName('');
        }
      } else if (action === 'close-add-group') {
        setAddingGroupToEvent(null);
        setAddingTaskToGroup(null);
      } else if (action === 'open-add-task-group') {
        setAddingGroupToEvent(null);
        if (events.length > 0) {
          setExpandedEvent(events[0].id);
          const firstGroup = eventGroups.find(g => g.event_id === events[0].id);
          if (firstGroup) {
            setAddingTaskToGroup({ eventId: events[0].id, groupId: firstGroup.id });
            setGroupTaskForm({ title: '', task_date: '', location: events[0].location || '', spots_available: 1 });
          }
        }
      } else if (action === 'close-add-task-group') {
        setAddingTaskToGroup(null);
      }
    };
    window.addEventListener('tour-action', handler);
    return () => window.removeEventListener('tour-action', handler);
  }, [events, eventGroups]);

  const { clubId: contextClubId, userId: contextUserId } = useClubContext();

  useEffect(() => {
    const init = async () => {
      const cId = contextClubId;
      if (!cId) { setLoading(false); return; }
      setClubId(cId);

      const [evRes, taskRes, tmplRes, mpRes, stRes] = await Promise.all([
        supabase.from('events').select('*').eq('club_id', cId).is('training_id', null).neq('event_type', 'training').order('event_date', { ascending: false }),
        supabase.from('tasks').select('id, title, task_date, location, spots_available, event_id, event_group_id, partner_only, assigned_partner_id, status, start_time, end_time').eq('club_id', cId).order('task_date', { ascending: true }),
        supabase.from('contract_templates').select('id, name').eq('club_id', cId).order('name'),
        supabase.from('monthly_plans').select('id, title, month, year, status').eq('club_id', cId).eq('status', 'open').order('year', { ascending: false }),
        (supabase as any).from('shift_templates').select('id, name').eq('club_id', cId).order('name'),
      ]);
      setEvents(evRes.data || []);
      setTasks(taskRes.data || []);
      setContractTemplates(tmplRes.data || []);
      setMonthlyPlans((mpRes.data || []).map((p: any) => ({ id: p.id, title: p.title, month: p.month, year: p.year })));
      setShiftTemplates(stRes.data || []);

      if (evRes.data?.length) {
        const eventIds = evRes.data.map((e: any) => e.id);
        const { data: groups } = await supabase.from('event_groups').select('*').in('event_id', eventIds).order('sort_order');
        setEventGroups(groups || []);
      }
      setLoading(false);
    };
    init();
  }, [contextClubId]);

  const buildLocationString = () => {
    const parts: string[] = [];
    if (newEvent.street.trim()) {
      parts.push(newEvent.street.trim() + (newEvent.number.trim() ? ' ' + newEvent.number.trim() : ''));
    }
    if (newEvent.postalCode.trim() || newEvent.city.trim()) {
      parts.push([newEvent.postalCode.trim(), newEvent.city.trim()].filter(Boolean).join(' '));
    }
    if (newEvent.country.trim() && newEvent.country.trim() !== 'België') {
      parts.push(newEvent.country.trim());
    }
    if (newEvent.locationNote.trim()) {
      parts.push('(' + newEvent.locationNote.trim() + ')');
    }
    return parts.join(', ') || null;
  };

  const buildTaskLocationString = () => {
    const parts: string[] = [];
    if (newTask.street.trim()) {
      parts.push(newTask.street.trim() + (newTask.number.trim() ? ' ' + newTask.number.trim() : ''));
    }
    if (newTask.postalCode.trim() || newTask.city.trim()) {
      parts.push([newTask.postalCode.trim(), newTask.city.trim()].filter(Boolean).join(' '));
    }
    if (newTask.country.trim() && newTask.country.trim() !== 'België') {
      parts.push(newTask.country.trim());
    }
    if (newTask.locationNote.trim()) {
      parts.push('(' + newTask.locationNote.trim() + ')');
    }
    return parts.join(', ') || null;
  };

  const pastDateError = () => t3('Je kunt geen datum in het verleden kiezen.', 'Vous ne pouvez pas choisir une date dans le passé.', 'You cannot choose a date in the past.');
  const isDateInPast = (d: string) => d && new Date(d) < new Date(new Date().toDateString());
  const todayMin = new Date().toISOString().slice(0, 16);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newEvent.title.trim()) return;
    if (isDateInPast(newEvent.event_date)) { toast.error(pastDateError()); return; }
    setCreatingEvent(true);
    const locationStr = buildLocationString();
    const { data, error } = await (supabase as any).from('events').insert({
      club_id: clubId, title: newEvent.title.trim(), description: newEvent.description.trim() || null,
      event_date: newEvent.event_date || null, location: locationStr,
      kickoff_time: newEvent.kickoff_time || null,
    }).select('*').maybeSingle();
    if (error) { toast.error(error.message); setCreatingEvent(false); return; }
    if (data) {
      // Apply shift template if selected
      if (newEvent.shift_template_id) {
        setApplyingTemplate(true);
        const { error: rpcError } = await (supabase as any).rpc('apply_shift_template_to_event', {
          p_event_id: data.id, p_template_id: newEvent.shift_template_id,
        });
        if (rpcError) toast.error(t3('Sjabloon kon niet worden toegepast: ', 'Erreur lors de l\'application du modèle: ', 'Template error: ') + rpcError.message);
        else toast.success(t3('Evenement aangemaakt en sjabloon toegepast!', 'Événement créé et modèle appliqué!', 'Event created and template applied!'));
        setApplyingTemplate(false);
      } else {
        toast.success(t3('Evenement aangemaakt!', 'Événement créé!', 'Event created!'));
      }
      setEvents(prev => [data, ...prev]);
      setShowCreateEvent(false);
      setNewEvent({ title: '', description: '', event_date: '', location: '', street: '', number: '', postalCode: '', city: '', country: 'België', locationNote: '', kickoff_time: '', shift_template_id: '' });
      if (clubId) sendPushToFollowers({ clubId, title: '🆕 Nieuw evenement', message: `"${data.title}" is aangemaakt. Bekijk het in de community!`, url: '/community', type: 'club_new_event' });
    }
    setCreatingEvent(false);
  };

  const resetNewTask = () => setNewTask({
    title: '', description: '', task_date: '', spots_available: 1,
    street: '', number: '', postalCode: '', city: '', country: 'België', locationNote: '',
    start_time: '', end_time: '', briefing_time: '', briefing_location: '', notes: '',
    compensation_type: 'none', expense_amount: '', hourly_rate: '', estimated_hours: '', daily_rate: '',
    contract_template_id: '', add_to_monthly_plan: false,
  });

  const handleCreateLooseTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newTask.title.trim()) return;
    if (isDateInPast(newTask.task_date)) { toast.error(pastDateError()); return; }
    setCreatingTask(true);
    const locationStr = buildTaskLocationString();
    const insertData = {
      club_id: clubId, title: newTask.title.trim(), description: newTask.description.trim() || null,
      task_date: newTask.task_date || null, location: locationStr,
      spots_available: newTask.spots_available,
      start_time: newTask.start_time || null, end_time: newTask.end_time || null,
      briefing_time: newTask.briefing_time || null, briefing_location: newTask.briefing_location.trim() || null,
      notes: newTask.notes.trim() || null,
      contract_template_id: newTask.contract_template_id || null,
      compensation_type: newTask.compensation_type === 'none' ? 'fixed' : newTask.compensation_type,
      expense_reimbursement: newTask.compensation_type === 'fixed' && newTask.expense_amount ? true : false,
      expense_amount: newTask.compensation_type === 'fixed' && newTask.expense_amount ? parseFloat(newTask.expense_amount) : null,
      hourly_rate: newTask.compensation_type === 'hourly' && newTask.hourly_rate ? parseFloat(newTask.hourly_rate) : null,
      estimated_hours: newTask.compensation_type === 'hourly' && newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
      daily_rate: newTask.compensation_type === 'daily' && newTask.daily_rate ? parseFloat(newTask.daily_rate) : null,
    };
    const { data, error } = await supabase.from('tasks').insert(insertData).select('id, title, task_date, location, spots_available, event_id, event_group_id, partner_only, assigned_partner_id, status').maybeSingle();
    if (error) { toast.error(error.message); }
    else if (data) {
      if (newTask.add_to_monthly_plan && selectedMonthlyPlanId) {
        const compType = newTask.compensation_type === 'none' ? 'fixed' : newTask.compensation_type;
        await supabase.from('monthly_plan_tasks').insert({
          plan_id: selectedMonthlyPlanId,
          title: newTask.title.trim(),
          description: newTask.description.trim() || null,
          task_date: newTask.task_date ? newTask.task_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
          location: locationStr,
          spots_available: newTask.spots_available,
          start_time: newTask.start_time || null,
          end_time: newTask.end_time || null,
          compensation_type: compType,
          hourly_rate: compType === 'hourly' && newTask.hourly_rate ? parseFloat(newTask.hourly_rate) : null,
          estimated_hours: compType === 'hourly' && newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
          daily_rate: compType === 'daily' && newTask.daily_rate ? parseFloat(newTask.daily_rate) : null,
        });
      }
      toast.success(t3('Taak aangemaakt!', 'Tâche créée!', 'Task created!'));
      setTasks(prev => [...prev, data]); setShowCreateTask(false); resetNewTask(); setSelectedMonthlyPlanId('');
      if (clubId) {
        sendPushToFollowers({ clubId, title: '🆕 Nieuwe taak', message: `"${data.title}" is beschikbaar. Meld je aan!`, url: '/community', type: 'club_new_task' });
        sendPushToClubMembers({ clubId, title: '🆕 Nieuwe taak beschikbaar', message: `"${data.title}" is beschikbaar. Meld je aan!`, url: '/dashboard', type: 'new_task_available' });
      }
    }
    setCreatingTask(false);
  };

  const handleAddGroup = async (eventId: string) => {
    if (!newGroupName.trim()) return;
    const groups = eventGroups.filter(g => g.event_id === eventId);
    const { data, error } = await supabase.from('event_groups').insert({
      event_id: eventId, name: newGroupName.trim(), color: GROUP_COLORS[groups.length % GROUP_COLORS.length], sort_order: groups.length,
      wristband_color: newGroupWristbandColor.trim() || null,
      wristband_label: newGroupWristbandLabel.trim() || null,
      materials_note: newGroupMaterialsNote.trim() || null,
    } as any).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) {
      toast.success(t3('Groep aangemaakt!', 'Groupe créé!', 'Group created!'));
      setEventGroups(prev => [...prev, data]);
      setAddingGroupToEvent(null);
      setNewGroupWristbandColor(''); setNewGroupWristbandLabel(''); setNewGroupMaterialsNote('');
    }
  };

  const handleAddTaskToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !addingTaskToGroup || !groupTaskForm.title.trim()) return;
    if (isDateInPast(groupTaskForm.task_date)) { toast.error(pastDateError()); return; }
    setCreatingGroupTask(true);
    const { data, error } = await supabase.from('tasks').insert({
      club_id: clubId, title: groupTaskForm.title.trim(), task_date: groupTaskForm.task_date || null,
      location: groupTaskForm.location.trim() || null, spots_available: groupTaskForm.spots_available,
      event_id: addingTaskToGroup.eventId, event_group_id: addingTaskToGroup.groupId,
    } as any).select('id, title, task_date, location, spots_available, event_id, event_group_id').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) {
      toast.success(t3('Taak toegevoegd!', 'Tâche ajoutée!', 'Task added!'));
      setTasks(prev => [...prev, data]); setAddingTaskToGroup(null); setGroupTaskForm({ title: '', task_date: '', location: '', spots_available: 1 });
      if (clubId) sendPushToClubMembers({ clubId, title: '🆕 Nieuwe taak beschikbaar', message: `"${data.title}" is beschikbaar. Meld je aan!`, url: '/dashboard', type: 'new_task_available' });
    }
    setCreatingGroupTask(false);
  };

  const openDuplicateDialog = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    setDuplicateDateDialog(eventId);
    setDuplicateNewDate(event?.event_date ? event.event_date.slice(0, 16) : '');
  };

  const handleDuplicateEvent = async () => {
    if (!duplicateDateDialog || !clubId) return;
    const eventId = duplicateDateDialog;
    setDuplicatingEvent(eventId);
    const event = events.find(e => e.id === eventId);
    if (!event) { setDuplicatingEvent(null); setDuplicateDateDialog(null); return; }
    const { data: newEv, error } = await supabase.from('events').insert({
      club_id: clubId, title: `${event.title} (kopie)`, description: event.description,
      event_date: duplicateNewDate || event.event_date, location: event.location,
    } as any).select('*').maybeSingle();
    if (error || !newEv) { toast.error(error?.message || 'Failed'); setDuplicatingEvent(null); setDuplicateDateDialog(null); return; }

    const groups = eventGroups.filter(g => g.event_id === eventId);
    for (const group of groups) {
      const { data: newGrp } = await supabase.from('event_groups').insert({
        event_id: newEv.id, name: group.name, color: group.color, sort_order: group.sort_order,
        wristband_color: group.wristband_color, wristband_label: group.wristband_label, materials_note: group.materials_note,
      } as any).select('*').maybeSingle();
      if (newGrp) {
        setEventGroups(prev => [...prev, newGrp]);
        const groupTasks = tasks.filter(t => t.event_group_id === group.id);
        for (const task of groupTasks) {
          const { data: newTask } = await supabase.from('tasks').insert({
            club_id: clubId, title: task.title, task_date: duplicateNewDate || task.task_date, location: task.location,
            spots_available: task.spots_available, event_id: newEv.id, event_group_id: newGrp.id,
          } as any).select('id, title, task_date, location, spots_available, event_id, event_group_id, partner_only, assigned_partner_id, status').maybeSingle();
          if (newTask) setTasks(prev => [...prev, newTask]);
        }
      }
    }
    setEvents(prev => [newEv, ...prev]);
    toast.success(t3('Evenement gedupliceerd!', 'Événement dupliqué!', 'Event duplicated!'));
    setDuplicatingEvent(null);
    setDuplicateDateDialog(null);
  };

  const loadTaskSetsForPicker = async (eventId: string) => {
    setTaskSetPickerEventId(eventId);
    setShowTaskSetPicker(true);
    const [setsRes, ttRes] = await Promise.all([
      supabase.from('task_template_sets').select('id, name').eq('club_id', clubId!),
      supabase.from('task_templates').select('*').eq('club_id', clubId!),
    ]);
    const sets = setsRes.data || [];
    const tts = ttRes.data || [];
    const map: Record<string, any> = {};
    tts.forEach((t: any) => { map[t.id] = t; });
    setTaskTemplatesMap(map);

    if (sets.length > 0) {
      const { data: items } = await supabase.from('task_template_set_items').select('*').in('set_id', sets.map((s: any) => s.id));
      setTaskSets(sets.map((s: any) => ({ ...s, items: (items || []).filter((i: any) => i.set_id === s.id) })));
    } else {
      setTaskSets([]);
    }
  };

  const handleApplyTaskSet = async (setId: string) => {
    if (!clubId || !taskSetPickerEventId) return;
    setApplyingSet(setId);
    const set = taskSets.find(s => s.id === setId);
    if (!set) { setApplyingSet(null); return; }

    for (const item of set.items) {
      const tt = taskTemplatesMap[item.template_id];
      if (!tt) continue;
      const { data: newTask } = await supabase.from('tasks').insert({
        club_id: clubId, title: tt.name, description: tt.description,
        location: tt.location, spots_available: tt.required_volunteers,
        event_id: taskSetPickerEventId,
      } as any).select('id, title, task_date, location, spots_available, event_id, event_group_id, partner_only, assigned_partner_id, status').maybeSingle();
      if (newTask) setTasks(prev => [...prev, newTask]);
    }
    toast.success(t3('Taken aangemaakt vanuit set!', 'Tâches créées à partir de l\'ensemble!', 'Tasks created from set!'));
    setApplyingSet(null);
    setShowTaskSetPicker(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    // Ownership guard: event must belong to the current club
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent || targetEvent.club_id !== clubId) {
      toast.error(t3('Niet gemachtigd om dit evenement te verwijderen.', 'Non autorisé à supprimer cet événement.', 'Not authorized to delete this event.'));
      setConfirmDeleteEvent(null);
      return;
    }
    setDeletingEvent(eventId);
    try {
      const groups = eventGroups.filter(g => g.event_id === eventId);
      for (const g of groups) {
        const { error: taskErr } = await supabase.from('tasks').delete().eq('event_group_id', g.id);
        if (taskErr) throw taskErr;
        const { error: groupErr } = await supabase.from('event_groups').delete().eq('id', g.id);
        if (groupErr) throw groupErr;
      }
      const { error: orphanErr } = await supabase.from('tasks').delete().eq('event_id', eventId).is('event_group_id', null);
      if (orphanErr) throw orphanErr;
      const { error } = await supabase.from('events').delete().eq('id', eventId).eq('club_id', clubId);
      if (error) throw error;
      toast.success(t3('Evenement verwijderd!', 'Événement supprimé!', 'Event deleted!'));
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setEventGroups(prev => prev.filter(g => g.event_id !== eventId));
      setTasks(prev => prev.filter(t => t.event_id !== eventId));
    } catch (err: any) {
      toast.error(err?.message || t3('Verwijderen mislukt. Probeer opnieuw.', 'Échec de la suppression. Réessayez.', 'Delete failed. Please try again.'));
    } finally {
      setDeletingEvent(null);
      setConfirmDeleteEvent(null);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    await supabase.from('tasks').delete().eq('event_group_id', groupId);
    await supabase.from('event_groups').delete().eq('id', groupId);
    setEventGroups(prev => prev.filter(g => g.id !== groupId));
    setTasks(prev => prev.filter(t => t.event_group_id !== groupId));
    toast.success(t3('Groep verwijderd!', 'Groupe supprimé!', 'Group deleted!'));
  };

  const handleStartEditGroup = (group: EventGroup) => {
    setEditingGroup(group.id);
    setEditGroupForm({
      name: group.name,
      color: group.color,
      wristband_color: group.wristband_color || '',
      wristband_label: group.wristband_label || '',
      materials_note: group.materials_note || '',
    });
  };

  const handleSaveEditGroup = async (groupId: string) => {
    setSavingGroup(true);
    const { error } = await supabase.from('event_groups').update({
      name: editGroupForm.name.trim(),
      color: editGroupForm.color,
      wristband_color: editGroupForm.wristband_color.trim() || null,
      wristband_label: editGroupForm.wristband_label.trim() || null,
      materials_note: editGroupForm.materials_note.trim() || null,
    } as any).eq('id', groupId);
    if (error) toast.error(error.message);
    else {
      setEventGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: editGroupForm.name.trim(), color: editGroupForm.color, wristband_color: editGroupForm.wristband_color.trim() || null, wristband_label: editGroupForm.wristband_label.trim() || null, materials_note: editGroupForm.materials_note.trim() || null } : g));
      toast.success(t3('Groep bijgewerkt!', 'Groupe mis à jour!', 'Group updated!'));
      setEditingGroup(null);
    }
    setSavingGroup(false);
  };

  const handleDuplicateGroup = async (group: EventGroup) => {
    const newColor = GROUP_COLORS[(GROUP_COLORS.indexOf(group.color) + 1) % GROUP_COLORS.length];
    const maxOrder = eventGroups.filter(g => g.event_id === group.event_id).reduce((m, g) => Math.max(m, g.sort_order), 0);
    const { data, error } = await supabase.from('event_groups').insert({
      event_id: group.event_id,
      name: group.name + ' (kopie)',
      color: newColor,
      sort_order: maxOrder + 1,
      wristband_color: group.wristband_color,
      wristband_label: group.wristband_label,
      materials_note: group.materials_note,
    } as any).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) {
      setEventGroups(prev => [...prev, data]);
      toast.success(t3('Groep gedupliceerd!', 'Groupe dupliqué!', 'Group duplicated!'));
    }
  };

  const handleStartEditEvent = (event: EventData) => {
    setEditingEvent(event);
    setEditEventForm({ title: event.title, description: event.description || '', event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '', location: event.location || '' });
  };

  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSavingEvent(true);
    const { error } = await supabase.from('events').update({
      title: editEventForm.title.trim(), description: editEventForm.description.trim() || null,
      event_date: editEventForm.event_date || null, location: editEventForm.location.trim() || null,
    } as any).eq('id', editingEvent.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t3('Evenement bijgewerkt!', 'Événement mis à jour!', 'Event updated!'));
      setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? { ...ev, ...editEventForm, description: editEventForm.description || null, event_date: editEventForm.event_date || null, location: editEventForm.location || null } : ev));
      setEditingEvent(null);
    }
    setSavingEvent(false);
  };

  const looseTasks = tasks.filter(t => !t.event_id);
  const getGroupTasks = (groupId: string) => tasks.filter(t => t.event_group_id === groupId);

  const now = new Date();
  const upcomingEvents = events.filter(e => !e.event_date || new Date(e.event_date) >= now);
  const pastEvents = events.filter(e => e.event_date && new Date(e.event_date) < now);
  const upcomingLooseTasks = looseTasks.filter(t => !t.task_date || new Date(t.task_date) >= now);
  const pastLooseTasks = looseTasks.filter(t => t.task_date && new Date(t.task_date) < now);
  const hasDemoEvent = events.some(e => e.title === 'Demo Voetbalwedstrijd 2026');

  const handleStartPlanningDemo = async () => {
    if (!clubId) return;
    setDemoLoading(true);
    try {
      const res = await supabase.functions.invoke('planning-demo', { body: { club_id: clubId, action: 'create' } });
      if (res.error) throw new Error(res.error.message);
      toast.success(t3('Demo aangemaakt! Pagina wordt herladen...', 'Démo créée! Rechargement...', 'Demo created! Reloading...'));
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) { toast.error(err.message); }
    setDemoLoading(false);
  };

  const handleDeletePlanningDemo = async () => {
    if (!clubId) return;
    setDemoDeleteLoading(true);
    try {
      const res = await supabase.functions.invoke('planning-demo', { body: { club_id: clubId, action: 'delete' } });
      if (res.error) throw new Error(res.error.message);
      toast.success(t3('Demo data verwijderd!', 'Données démo supprimées!', 'Demo data deleted!'));
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) { toast.error(err.message); }
    setDemoDeleteLoading(false);
  };

  const handleDeleteLooseTask = async (taskId: string) => {
    setDeletingTask(taskId);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) toast.error(error.message);
    else { toast.success(t3('Taak verwijderd!', 'Tâche supprimée!', 'Task deleted!')); setTasks(prev => prev.filter(t => t.id !== taskId)); }
    setDeletingTask(null);
    setConfirmDeleteTask(null);
  };

  const handleToggleHoldEvent = async (eventId: string) => {
    setTogglingHold(eventId);
    const event = events.find(e => e.id === eventId);
    const newStatus = event?.status === 'on_hold' ? 'open' : 'on_hold';
    const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', eventId);
    if (error) toast.error(error.message);
    else { setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e)); toast.success(newStatus === 'on_hold' ? t3('Evenement on hold gezet', 'Événement mis en attente', 'Event put on hold') : t3('Evenement weer actief', 'Événement réactivé', 'Event reactivated')); }
    setTogglingHold(null);
  };

  const handleToggleHoldTask = async (taskId: string, currentStatus: string) => {
    setTogglingHold(taskId);
    const newStatus = currentStatus === 'on_hold' ? 'open' : 'on_hold';
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) toast.error(error.message);
    else { setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)); toast.success(newStatus === 'on_hold' ? t3('Taak on hold gezet', 'Tâche mise en attente', 'Task put on hold') : t3('Taak weer actief', 'Tâche réactivée', 'Task reactivated')); }
    setTogglingHold(null);
  };

  const handleSaveAsTemplate = async (eventId: string) => {
    setSavingTemplate(eventId);
    const event = events.find(e => e.id === eventId);
    if (!event || !clubId) { setSavingTemplate(null); return; }
    const groups = eventGroups.filter(g => g.event_id === eventId);
    const templateGroups = groups.map(g => ({
      name: g.name, color: g.color,
      wristband_color: g.wristband_color, wristband_label: g.wristband_label,
      materials_note: g.materials_note,
      tasks: tasks.filter(t => t.event_group_id === g.id).map(t => ({
        title: t.title, spots_available: t.spots_available,
      })),
    }));
    const { error } = await supabase.from('event_templates').insert({
      club_id: clubId, name: event.title, description: event.description,
      location: event.location, groups: templateGroups,
    });
    if (error) toast.error(error.message);
    else toast.success(t3('Sjabloon opgeslagen!', 'Modèle sauvegardé!', 'Template saved!'));
    setSavingTemplate(null);
  };

  const handleCreateFromTemplate = async (template: { name: string; description: string | null; location: string | null; groups: any[] }) => {
    if (!clubId) return;
    const { data: newEv, error } = await supabase.from('events').insert({
      club_id: clubId, title: template.name, description: template.description, location: template.location,
    } as any).select('*').maybeSingle();
    if (error || !newEv) { toast.error(error?.message || 'Failed'); return; }
    for (const group of template.groups) {
      const { data: newGrp } = await supabase.from('event_groups').insert({
        event_id: newEv.id, name: group.name, color: group.color, sort_order: template.groups.indexOf(group),
        wristband_color: group.wristband_color, wristband_label: group.wristband_label,
        materials_note: group.materials_note,
      } as any).select('*').maybeSingle();
      if (newGrp) {
        setEventGroups(prev => [...prev, newGrp]);
        for (const task of (group.tasks || [])) {
          const { data: newTask } = await supabase.from('tasks').insert({
            club_id: clubId, title: task.title, spots_available: task.spots_available || 1,
            event_id: newEv.id, event_group_id: newGrp.id,
          } as any).select('id, title, task_date, location, spots_available, event_id, event_group_id, partner_only, assigned_partner_id, status').maybeSingle();
          if (newTask) setTasks(prev => [...prev, newTask]);
        }
      }
    }
    setEvents(prev => [newEv, ...prev]);
    toast.success(t3('Evenement aangemaakt vanuit sjabloon!', 'Événement créé à partir du modèle!', 'Event created from template!'));
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <>
    <ClubPageLayout>
      <div className="space-y-6">
        {/* Page-level tabs */}
        <PageNavTabs tabs={[
          { label: t3('Evenementen & Taken', 'Événements & Tâches', 'Events & Tasks'), path: '/events-manager' },
          { label: 'Planning', path: '/planning' },
          { label: t3('Maandplanning', 'Planification mensuelle', 'Monthly Planning'), path: '/monthly-planning' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
             <h1 className="text-2xl font-heading font-bold text-foreground">
               {t3('Evenementen & Taken', 'Événements & Tâches', 'Events & Tasks')}
            </h1>
             <p className="text-muted-foreground mt-1">
               {events.length} {t3('evenementen', 'événements', 'events')} · {looseTasks.length} {t3('losse taken', 'tâches libres', 'loose tasks')}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowTour(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              <BookOpen className="w-4 h-4" /> {t3('Hoe werkt het?', 'Comment ça marche?', 'How does it work?')}
            </button>
            {hasDemoEvent ? (
              <button onClick={handleDeletePlanningDemo} disabled={demoDeleteLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50">
                {demoDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {nl ? 'Demo wissen' : fr ? 'Supprimer démo' : 'Delete demo'}
              </button>
            ) : (
              <button onClick={handleStartPlanningDemo} disabled={demoLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {nl ? 'Start demo' : 'Start demo'}
              </button>
            )}
            <button onClick={() => setShowTemplateDialog(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              <FileText className="w-4 h-4" /> {t3('Sjablonen', 'Modèles', 'Templates')}
            </button>
            <button data-tour="btn-new-event" onClick={() => { setShowCreateEvent(true); setShowCreateTask(false); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
               <CalendarDays className="w-4 h-4" /> {t3('Nieuw evenement', 'Nouvel événement', 'New event')}
             </button>
             <button onClick={() => { setShowCreateTask(true); setShowCreateEvent(false); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
               <Plus className="w-4 h-4" /> {t3('Losse taak', 'Tâche libre', 'Loose task')}
            </button>
          </div>
        </div>

        {/* Create Event Form */}
        <AnimatePresence>
          {showCreateEvent && (
            <motion.form data-tour="form-new-event" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateEvent} className="bg-card rounded-2xl shadow-card border border-border p-6 overflow-hidden">
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{t3('Nieuw evenement', 'Nouvel événement', 'New event')}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                 <div className="sm:col-span-2"><label className={labelClass}>{t3('Titel', 'Titre', 'Title')} *</label><input type="text" required maxLength={200} value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} className={inputClass} /></div>
                 <div className="sm:col-span-2"><label className={labelClass}>{t3('Beschrijving', 'Description', 'Description')}</label><textarea rows={2} value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} /></div>
                 <div className="sm:col-span-2"><label className={labelClass}>{t3('Datum', 'Date', 'Date')}</label><input type="datetime-local" min={todayMin} value={newEvent.event_date} onChange={e => setNewEvent(p => ({ ...p, event_date: e.target.value }))} className={inputClass} /></div>
                 <div>
                   <label className={labelClass}><Clock className="inline w-3 h-3 mr-1" />{t3('Aftrapuur (voor sjabloon)', 'Heure de coup d\'envoi', 'Kickoff time (for template)')}</label>
                   <input type="time" value={newEvent.kickoff_time} onChange={e => setNewEvent(p => ({ ...p, kickoff_time: e.target.value }))} className={inputClass} placeholder="15:00" />
                 </div>
                 <div>
                   <label className={labelClass}><Wand2 className="inline w-3 h-3 mr-1" />{t3('Shift-sjabloon (optioneel)', 'Modèle de shifts (optionnel)', 'Shift template (optional)')}</label>
                   <select value={newEvent.shift_template_id} onChange={e => setNewEvent(p => ({ ...p, shift_template_id: e.target.value }))} className={inputClass}>
                     <option value="">{t3('— Geen sjabloon —', '— Aucun modèle —', '— No template —')}</option>
                     {shiftTemplates.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                   </select>
                 </div>
                 <div className="sm:col-span-2">
                   <label className={labelClass}>{t3('Locatie', 'Lieu', 'Location')}</label>
                   <div className="grid gap-3 sm:grid-cols-4">
                     <div className="sm:col-span-3">
                       <input type="text" placeholder={t3('Straat', 'Rue', 'Street')} maxLength={200} value={newEvent.street} onChange={e => setNewEvent(p => ({ ...p, street: e.target.value }))} className={inputClass} />
                     </div>
                     <div>
                       <input type="text" placeholder={t3('Nr.', 'N°', 'No.')} maxLength={20} value={newEvent.number} onChange={e => setNewEvent(p => ({ ...p, number: e.target.value }))} className={inputClass} />
                     </div>
                     <div>
                       <input type="text" placeholder={t3('Postcode', 'Code postal', 'Postal code')} maxLength={10} value={newEvent.postalCode} onChange={e => setNewEvent(p => ({ ...p, postalCode: e.target.value }))} className={inputClass} />
                     </div>
                     <div>
                       <input type="text" placeholder={t3('Stad', 'Ville', 'City')} maxLength={100} value={newEvent.city} onChange={e => setNewEvent(p => ({ ...p, city: e.target.value }))} className={inputClass} />
                     </div>
                     <div>
                       <input type="text" placeholder={t3('Land', 'Pays', 'Country')} maxLength={60} value={newEvent.country} onChange={e => setNewEvent(p => ({ ...p, country: e.target.value }))} className={inputClass} />
                     </div>
                     <div>
                       <input type="text" placeholder={t3('Extra info (bv. zaal, ingang...)', 'Info supplémentaire', 'Extra info')} maxLength={200} value={newEvent.locationNote} onChange={e => setNewEvent(p => ({ ...p, locationNote: e.target.value }))} className={inputClass} />
                     </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                 <button type="button" onClick={() => setShowCreateEvent(false)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{t3('Annuleren', 'Annuler', 'Cancel')}</button>
                 <button type="submit" disabled={creatingEvent || applyingTemplate || !newEvent.title.trim()} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                   {(creatingEvent || applyingTemplate) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                   {applyingTemplate ? t3('Sjabloon toepassen...', 'Application du modèle...', 'Applying template...') : t3('Aanmaken', 'Créer', 'Create')}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Create Loose Task Form */}
        <AnimatePresence>
          {showCreateTask && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateLooseTask} className="bg-card rounded-2xl shadow-card border border-border p-6 overflow-hidden">
               <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{t3('Nieuwe losse taak', 'Nouvelle tâche libre', 'New loose task')}</h2>
               <div className="grid gap-4 sm:grid-cols-2">
                 {/* Title & Description */}
                 <div className="sm:col-span-2"><label className={labelClass}>{t3('Titel', 'Titre', 'Title')} *</label><input type="text" required maxLength={200} value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} className={inputClass} /></div>
                 <div className="sm:col-span-2"><label className={labelClass}>{t3('Beschrijving', 'Description', 'Description')}</label><textarea rows={2} value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} /></div>

                 {/* Date & Spots */}
                 <div><label className={labelClass}>{t3('Datum', 'Date', 'Date')}</label><input type="datetime-local" min={todayMin} value={newTask.task_date} onChange={e => setNewTask(p => ({ ...p, task_date: e.target.value }))} className={inputClass} /></div>
                 <div><label className={labelClass}>{t3('Plaatsen', 'Places', 'Spots')}</label><input type="number" min={1} value={newTask.spots_available} onChange={e => setNewTask(p => ({ ...p, spots_available: parseInt(e.target.value) || 1 }))} className={inputClass} /></div>

                 {/* Location (multi-field) */}
                 <div className="sm:col-span-2">
                   <label className={labelClass}>{t3('Locatie', 'Lieu', 'Location')}</label>
                   <div className="grid gap-3 sm:grid-cols-4">
                     <div className="sm:col-span-3"><input type="text" placeholder={t3('Straat', 'Rue', 'Street')} maxLength={200} value={newTask.street} onChange={e => setNewTask(p => ({ ...p, street: e.target.value }))} className={inputClass} /></div>
                     <div><input type="text" placeholder={t3('Nr.', 'N°', 'No.')} maxLength={20} value={newTask.number} onChange={e => setNewTask(p => ({ ...p, number: e.target.value }))} className={inputClass} /></div>
                     <div><input type="text" placeholder={t3('Postcode', 'Code postal', 'Postal code')} maxLength={10} value={newTask.postalCode} onChange={e => setNewTask(p => ({ ...p, postalCode: e.target.value }))} className={inputClass} /></div>
                     <div><input type="text" placeholder={t3('Stad', 'Ville', 'City')} maxLength={100} value={newTask.city} onChange={e => setNewTask(p => ({ ...p, city: e.target.value }))} className={inputClass} /></div>
                     <div><input type="text" placeholder={t3('Land', 'Pays', 'Country')} maxLength={60} value={newTask.country} onChange={e => setNewTask(p => ({ ...p, country: e.target.value }))} className={inputClass} /></div>
                     <div><input type="text" placeholder={t3('Extra info (bv. zaal, ingang...)', 'Info supplémentaire', 'Extra info')} maxLength={200} value={newTask.locationNote} onChange={e => setNewTask(p => ({ ...p, locationNote: e.target.value }))} className={inputClass} /></div>
                   </div>
                 </div>

                 {/* Times */}
                 <div><label className={labelClass}>{t3('Starttijd', 'Heure de début', 'Start time')}</label><input type="datetime-local" value={newTask.start_time} onChange={e => setNewTask(p => ({ ...p, start_time: e.target.value }))} className={inputClass} /></div>
                 <div><label className={labelClass}>{t3('Eindtijd', 'Heure de fin', 'End time')}</label><input type="datetime-local" value={newTask.end_time} onChange={e => setNewTask(p => ({ ...p, end_time: e.target.value }))} className={inputClass} /></div>
                 <div><label className={labelClass}>{t3('Briefing tijd', 'Heure de briefing', 'Briefing time')}</label><input type="datetime-local" value={newTask.briefing_time} onChange={e => setNewTask(p => ({ ...p, briefing_time: e.target.value }))} className={inputClass} /></div>
                 <div><label className={labelClass}>{t3('Briefing locatie', 'Lieu de briefing', 'Briefing location')}</label><input type="text" maxLength={300} value={newTask.briefing_location} onChange={e => setNewTask(p => ({ ...p, briefing_location: e.target.value }))} className={inputClass} /></div>

                 {/* Notes */}
                 <div className="sm:col-span-2"><label className={labelClass}>{t3('Notities', 'Notes', 'Notes')}</label><input type="text" maxLength={500} value={newTask.notes} onChange={e => setNewTask(p => ({ ...p, notes: e.target.value }))} className={inputClass} /></div>

                 {/* Compensation */}
                 <div className="sm:col-span-2">
                   <label className={labelClass}>{t3('Vergoeding', 'Rémunération', 'Compensation')}</label>
                   <div className="flex flex-wrap gap-2 mt-1">
                     {(['none', 'fixed', 'hourly', 'daily'] as const).map(ct => (
                       <button key={ct} type="button" onClick={() => setNewTask(p => ({ ...p, compensation_type: ct }))}
                         className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${newTask.compensation_type === ct ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
                         {ct === 'none' ? t3('Geen', 'Aucune', 'None') : ct === 'fixed' ? t3('Vast bedrag', 'Montant fixe', 'Fixed amount') : ct === 'hourly' ? t3('Uurloon', 'Taux horaire', 'Hourly rate') : t3('Dagvergoeding', 'Indemnité journalière', 'Daily rate')}
                       </button>
                     ))}
                   </div>
                 </div>
                 {newTask.compensation_type === 'fixed' && (
                   <div><label className={labelClass}>{t3('Bedrag (€)', 'Montant (€)', 'Amount (€)')}</label><input type="number" min={0} step={0.01} value={newTask.expense_amount} onChange={e => setNewTask(p => ({ ...p, expense_amount: e.target.value }))} className={inputClass} /></div>
                 )}
                 {newTask.compensation_type === 'hourly' && (
                   <>
                     <div><label className={labelClass}>{t3('Uurloon (€)', 'Taux horaire (€)', 'Hourly rate (€)')}</label><input type="number" min={0} step={0.01} value={newTask.hourly_rate} onChange={e => setNewTask(p => ({ ...p, hourly_rate: e.target.value }))} className={inputClass} /></div>
                     <div><label className={labelClass}>{t3('Geschatte uren', 'Heures estimées', 'Estimated hours')}</label><input type="number" min={0} step={0.5} value={newTask.estimated_hours} onChange={e => setNewTask(p => ({ ...p, estimated_hours: e.target.value }))} className={inputClass} /></div>
                   </>
                 )}
                 {newTask.compensation_type === 'daily' && (
                   <div><label className={labelClass}>{t3('Dagvergoeding (€)', 'Indemnité journalière (€)', 'Daily rate (€)')}</label><input type="number" min={0} step={0.01} value={newTask.daily_rate} onChange={e => setNewTask(p => ({ ...p, daily_rate: e.target.value }))} className={inputClass} /></div>
                 )}
                 {newTask.compensation_type === 'hourly' && (
                   <div className="sm:col-span-2">
                     <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                       ⏱️ {t3('Bij uurloon wordt het klokkingsysteem (check-in/out) automatisch geactiveerd.', 'Avec un taux horaire, le système de pointage (check-in/out) est automatiquement activé.', 'With hourly rate, the clock-in/out system is automatically activated.')}
                     </p>
                   </div>
                 )}

                 {/* Contract template */}
                 {contractTemplates.length > 0 && (
                   <div className="sm:col-span-2">
                     <label className={labelClass}>{t3('Contractsjabloon', 'Modèle de contrat', 'Contract template')}</label>
                     <select value={newTask.contract_template_id} onChange={e => setNewTask(p => ({ ...p, contract_template_id: e.target.value }))} className={inputClass}>
                       <option value="">{t3('Geen sjabloon', 'Aucun modèle', 'No template')}</option>
                       {contractTemplates.map(tmpl => <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>)}
                     </select>
                   </div>
                 )}

                 {/* Monthly plan link */}
                 {monthlyPlans.length > 0 && (
                   <div className="sm:col-span-2 bg-muted/30 rounded-xl p-4 border border-border">
                     <label className="flex items-center gap-2 cursor-pointer">
                       <input type="checkbox" checked={newTask.add_to_monthly_plan} onChange={e => { setNewTask(p => ({ ...p, add_to_monthly_plan: e.target.checked })); if (!e.target.checked) setSelectedMonthlyPlanId(''); }} className="w-4 h-4 rounded border-input accent-primary" />
                       <span className="text-sm font-medium text-foreground">{t3('Toevoegen aan maandplanning', 'Ajouter au planning mensuel', 'Add to monthly plan')}</span>
                     </label>
                     {newTask.add_to_monthly_plan && (
                       <div className="mt-3">
                         <select value={selectedMonthlyPlanId} onChange={e => setSelectedMonthlyPlanId(e.target.value)} className={inputClass}>
                           <option value="">{t3('Selecteer maandplanning...', 'Sélectionnez le planning...', 'Select monthly plan...')}</option>
                           {monthlyPlans.map(mp => <option key={mp.id} value={mp.id}>{mp.title} ({mp.month}/{mp.year})</option>)}
                         </select>
                       </div>
                     )}
                   </div>
                 )}
               </div>
               <div className="flex justify-end gap-3 mt-6">
                 <button type="button" onClick={() => { setShowCreateTask(false); resetNewTask(); }} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{t3('Annuleren', 'Annuler', 'Cancel')}</button>
                 <button type="submit" disabled={creatingTask || !newTask.title.trim() || (newTask.add_to_monthly_plan && !selectedMonthlyPlanId)} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                   {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : t3('Aanmaken', 'Créer', 'Create')}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Events Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-4">
             <TabsTrigger value="upcoming">{t3('Aankomende Evenementen', 'Événements à venir', 'Upcoming Events')} ({upcomingEvents.length})</TabsTrigger>
             <TabsTrigger value="loose">{t3('Losse taken', 'Tâches libres', 'Loose tasks')} ({upcomingLooseTasks.length})</TabsTrigger>
             <TabsTrigger value="past">{t3('Historie', 'Historique', 'History')} ({pastEvents.length + pastLooseTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>{t3('Geen aankomende evenementen.', 'Aucun événement à venir.', 'No upcoming events.')}</p>
              </div>
            ) : [...upcomingEvents].sort((a, b) => {
              if (!a.event_date) return 1;
              if (!b.event_date) return -1;
              return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
            }).map((event, ei) => renderEventCard(event, ei))}
          </TabsContent>

          <TabsContent value="loose" className="space-y-3">
            {upcomingLooseTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p>{t3('Geen losse taken.', 'Aucune tâche libre.', 'No loose tasks.')}</p></div>
            ) : upcomingLooseTasks.map((task, i) => renderLooseTaskCard(task, i))}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastEvents.length === 0 && pastLooseTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p>{t3('Geen afgelopen items.', 'Aucun élément passé.', 'No past items.')}</p></div>
            ) : (
              <>
                {[...pastEvents].sort((a, b) => {
                  if (!a.event_date || !b.event_date) return 0;
                  return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
                }).map((event, ei) => renderEventCard(event, ei))}
                {pastLooseTasks.length > 0 && (
                  <>
                    {pastEvents.length > 0 && <div className="pt-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t3('Afgelopen losse taken', 'Tâches libres passées', 'Past loose tasks')}</p></div>}
                    {pastLooseTasks.map((task, i) => renderLooseTaskCard(task, i))}
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Event Confirmation */}
      <AnimatePresence>
        {confirmDeleteEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDeleteEvent(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                 <h2 className="text-lg font-heading font-semibold text-foreground">{t3('Evenement verwijderen', 'Supprimer l\'événement', 'Delete event')}</h2>
               </div>
               <p className="text-sm text-muted-foreground mb-6">{t3('Weet je zeker dat je dit evenement wilt verwijderen? Alle groepen en taken worden ook verwijderd.', 'Êtes-vous sûr? Tous les groupes et tâches seront supprimés.', 'Are you sure? All groups and tasks will also be deleted.')}</p>
               <div className="flex justify-end gap-3">
                 <button onClick={() => setConfirmDeleteEvent(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{t3('Annuleren', 'Annuler', 'Cancel')}</button>
                 <button onClick={() => handleDeleteEvent(confirmDeleteEvent)} disabled={deletingEvent === confirmDeleteEvent} className="px-5 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 disabled:opacity-50">
                   {deletingEvent === confirmDeleteEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : t3('Verwijderen', 'Supprimer', 'Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Event Dialog */}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingEvent(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">{t3('Evenement bewerken', 'Modifier l\'événement', 'Edit event')}</h2>
                <button onClick={() => setEditingEvent(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveEditEvent} className="space-y-4">
                 <div><label className={labelClass}>{t3('Titel', 'Titre', 'Title')} *</label><input type="text" required value={editEventForm.title} onChange={e => setEditEventForm(p => ({ ...p, title: e.target.value }))} className={inputClass} /></div>
                 <div><label className={labelClass}>{t3('Beschrijving', 'Description', 'Description')}</label><textarea rows={2} value={editEventForm.description} onChange={e => setEditEventForm(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} /></div>
                 <div className="grid grid-cols-2 gap-4">
                   <div><label className={labelClass}>{t3('Datum', 'Date', 'Date')}</label><input type="datetime-local" value={editEventForm.event_date} onChange={e => setEditEventForm(p => ({ ...p, event_date: e.target.value }))} className={inputClass} /></div>
                   <div><label className={labelClass}>{t3('Locatie', 'Lieu', 'Location')}</label><input type="text" value={editEventForm.location} onChange={e => setEditEventForm(p => ({ ...p, location: e.target.value }))} className={inputClass} /></div>
                 </div>
                 <div className="flex justify-end gap-3 pt-2">
                   <button type="button" onClick={() => setEditingEvent(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{t3('Annuleren', 'Annuler', 'Cancel')}</button>
                  <button type="submit" disabled={savingEvent} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                    {savingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : t3('Opslaan', 'Enregistrer', 'Save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Task Confirmation */}
      <AnimatePresence>
        {confirmDeleteTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDeleteTask(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                <h2 className="text-lg font-heading font-semibold text-foreground">{nl ? 'Taak verwijderen' : 'Delete task'}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{nl ? 'Weet je zeker dat je deze taak wilt verwijderen?' : 'Are you sure you want to delete this task?'}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeleteTask(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{nl ? 'Annuleren' : 'Cancel'}</button>
                <button onClick={() => handleDeleteLooseTask(confirmDeleteTask)} disabled={deletingTask === confirmDeleteTask} className="px-5 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 disabled:opacity-50">
                  {deletingTask === confirmDeleteTask ? <Loader2 className="w-4 h-4 animate-spin" /> : (nl ? 'Verwijderen' : 'Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zone Dialog */}
      {zoneDialogTask && (
        <TaskZoneDialog
          taskId={zoneDialogTask.id}
          taskTitle={zoneDialogTask.title}
          language={language}
          open={!!zoneDialogTask}
          onClose={() => setZoneDialogTask(null)}
        />
      )}

      {safetyConfigEvent && (
        <SafetyConfigDialog
          open={!!safetyConfigEvent}
          onClose={() => setSafetyConfigEvent(null)}
          eventId={safetyConfigEvent.eventId}
          clubId={safetyConfigEvent.clubId}
        />
      )}
      {bulkMessageEventId && clubId && contextUserId && (
        <BulkMessageDialog
          clubId={clubId}
          clubOwnerId={contextUserId}
          preselectedEventId={bulkMessageEventId}
          onClose={() => setBulkMessageEventId(null)}
        />
      )}
      {bulkMessageTask && clubId && contextUserId && (
        <BulkMessageDialog
          clubId={clubId}
          clubOwnerId={contextUserId}
          preselectedTaskId={bulkMessageTask.id}
          preselectedTaskTitle={bulkMessageTask.title}
          onClose={() => setBulkMessageTask(null)}
        />
      )}
    </ClubPageLayout>
    <PlanningOnboardingTour open={showTour} onClose={() => setShowTour(false)} />
    {clubId && (
      <EventTemplateDialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        clubId={clubId}
        language={language}
        onCreateFromTemplate={handleCreateFromTemplate}
      />
    )}
    {spoedTask && clubId && (
      <SpoedoproepDialog
        open={!!spoedTask}
        onOpenChange={(o) => { if (!o) setSpoedTask(null); }}
        task={{
          id: spoedTask.id,
          title: spoedTask.title,
          task_date: spoedTask.task_date || null,
          start_time: spoedTask.start_time || null,
          end_time: spoedTask.end_time || null,
          location: spoedTask.location || null,
          club_id: clubId,
          spots_available: spoedTask.spots_available,
        }}
      />
    )}

    {/* Duplicate Event Date Picker */}
    <AnimatePresence>
      {duplicateDateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDuplicateDateDialog(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-sm">
            <h2 className="text-lg font-heading font-semibold text-foreground mb-4">
              {t3('Evenement dupliceren', 'Dupliquer l\'événement', 'Duplicate event')}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">{t3('Kies de nieuwe datum voor het gedupliceerde evenement.', 'Choisissez la nouvelle date.', 'Choose the new date for the duplicated event.')}</p>
            <div className="mb-4">
              <label className={labelClass}>{t3('Nieuwe datum', 'Nouvelle date', 'New date')}</label>
              <input type="datetime-local" value={duplicateNewDate} onChange={e => setDuplicateNewDate(e.target.value)} className={inputClass} autoFocus />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDuplicateDateDialog(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{t3('Annuleren', 'Annuler', 'Cancel')}</button>
              <button onClick={handleDuplicateEvent} disabled={!!duplicatingEvent} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                {duplicatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : t3('Dupliceren', 'Dupliquer', 'Duplicate')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Task Set Picker */}
    <AnimatePresence>
      {showTaskSetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowTaskSetPicker(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-foreground">
                {t3('Taken aanmaken vanuit set', 'Créer tâches depuis ensemble', 'Create tasks from set')}
              </h2>
              <button onClick={() => setShowTaskSetPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {taskSets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t3('Geen wedstrijdsets gevonden. Maak er eerst één aan via Sjablonen.', 'Aucun ensemble trouvé.', 'No match sets found. Create one first via Templates.')}</p>
                </div>
              ) : taskSets.map(set => (
                <div key={set.id} className="rounded-xl border border-border p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{set.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {set.items.map((item, i) => {
                          const tt = taskTemplatesMap[item.template_id];
                          return tt ? <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">{tt.name}</span> : null;
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{set.items.length} {t3('taken', 'tâches', 'tasks')}</p>
                    </div>
                    <button onClick={() => handleApplyTaskSet(set.id)} disabled={applyingSet === set.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 shrink-0">
                      {applyingSet === set.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {t3('Toepassen', 'Appliquer', 'Apply')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );

  function renderLooseTaskCard(task: Task, i: number) {
    const isOnHold = task.status === 'on_hold';
    return (
      <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
        className={`bg-card rounded-2xl p-4 border flex items-center gap-4 ${isOnHold ? 'border-yellow-500/30 opacity-70' : 'border-border'}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
            {isOnHold && <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 shrink-0">On hold</span>}
          </div>
          <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
            {task.task_date && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{new Date(task.task_date).toLocaleDateString(nl ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short' })}</span>}
            {task.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{task.location}</span>}
            <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{task.spots_available}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {task.partner_only && <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent/20 text-accent-foreground flex items-center gap-0.5"><Handshake className="w-3 h-3" /> Partner</span>}
          <button onClick={() => handleToggleHoldTask(task.id, task.status || 'open')} disabled={togglingHold === task.id} className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-600 hover:bg-yellow-500/10 transition-colors" title={isOnHold ? (nl ? 'Heractiveren' : 'Reactivate') : (nl ? 'On hold zetten' : 'Put on hold')}>
            {isOnHold ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setZoneDialogTask({ id: task.id, title: task.title })} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={nl ? 'Zones beheren' : 'Manage zones'}>
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => navigate(`/planning/${task.id}`)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={nl ? 'Zone planning' : 'Zone planning'}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setConfirmDeleteTask(task.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title={nl ? 'Verwijderen' : 'Delete'}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setSpoedTask(task)} className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors" title={t3('Spoedoproep', 'Appel urgent', 'Urgent call')}>
            <Zap className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  }

  function renderEventCard(event: EventData, ei: number) {
    const isExpanded = expandedEvent === event.id;
    const groups = eventGroups.filter(g => g.event_id === event.id);
    const eventTaskCount = tasks.filter(t => t.event_id === event.id).length;

    return (
      <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ei * 0.05 }}
        className={`bg-card rounded-2xl shadow-card border overflow-hidden ${event.status === 'on_hold' ? 'border-yellow-500/30 opacity-70' : 'border-primary/10'}`}>
        <button onClick={() => setExpandedEvent(isExpanded ? null : event.id)} data-tour={ei === 0 ? 'event-card-first' : undefined} className="w-full p-5 text-left flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-foreground text-lg">{event.title}</h3>
              {event.status === 'on_hold' && <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">On hold</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.event_date).toLocaleDateString(nl ? 'nl-BE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</span>}
              {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{groups.length} {nl ? 'groepen' : 'groups'}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{eventTaskCount} {nl ? 'taken' : 'tasks'}</span>
            </div>
          </div>
          <div className="shrink-0">{isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}</div>
        </button>

        {isExpanded && (
          <div className="border-t border-border px-5 pb-5">
            {event.description && <p className="text-sm text-muted-foreground mt-3 mb-4">{event.description}</p>}

            {/* Floating Action Bar */}
            <div className="sticky bottom-0 z-20 mt-4 -mx-5 -mb-5 px-4 py-3 bg-card/95 backdrop-blur-sm border-t border-border flex items-center justify-between gap-2 rounded-b-2xl">
              <div className="flex items-center gap-2">
                <button data-tour={ei === 0 ? 'btn-add-group' : undefined} onClick={() => { setAddingGroupToEvent(event.id); setNewGroupName(''); }} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors touch-target">
                  <Plus className="w-3.5 h-3.5" /> {nl ? 'Groep toevoegen' : 'Add group'}
                </button>
                <button onClick={() => navigate(`/safety/${event.id}`)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors touch-target">
                  <Radio className="w-3.5 h-3.5" /> Control Room
                </button>
                <button onClick={() => navigate(`/events/${event.id}/attendance`)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors touch-target">
                  <ClipboardCheck className="w-3.5 h-3.5" /> {nl ? 'Aanwezigheid' : 'Attendance'}
                </button>
                <button onClick={() => setSafetyConfigEvent({ eventId: event.id, clubId: event.club_id })} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-muted text-foreground hover:bg-accent transition-colors touch-target">
                  <Shield className="w-3.5 h-3.5" /> {nl ? 'Safety Rollen' : 'Safety Roles'}
                </button>
                <button onClick={() => setBulkMessageEventId(event.id)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-muted text-foreground hover:bg-accent transition-colors touch-target">
                  <Send className="w-3.5 h-3.5" /> {nl ? 'Stuur bericht' : fr ? 'Envoyer message' : 'Send message'}
                </button>
                <button onClick={() => loadTaskSetsForPicker(event.id)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors touch-target">
                  <FileText className="w-3.5 h-3.5" /> {t3('Taken uit set', 'Tâches depuis ensemble', 'Tasks from set')}
                </button>
                <button onClick={() => navigate(`/events/${event.id}`)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:opacity-90 transition-opacity touch-target shadow-sm">
                  <Wand2 className="w-3.5 h-3.5" /> {t3('Auto-Vul Magie', 'Remplissage auto', 'Auto-Fill')}
                </button>
                <button onClick={() => navigate(`/events/${event.id}/live`)} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors touch-target shadow-sm">
                  <Activity className="w-3.5 h-3.5" /> {t3('Live Opvolging', 'Suivi en direct', 'Go Live')}
                </button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-colors touch-target">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleStartEditEvent(event)}>
                    <Pencil className="w-4 h-4 mr-2" /> {nl ? 'Bewerken' : 'Edit'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openDuplicateDialog(event.id)} disabled={duplicatingEvent === event.id}>
                    {duplicatingEvent === event.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />} {nl ? 'Dupliceren' : 'Duplicate'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSaveAsTemplate(event.id)} disabled={savingTemplate === event.id}>
                    {savingTemplate === event.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} {nl ? 'Opslaan als sjabloon' : 'Save as template'}
                  </DropdownMenuItem>
                  {event.event_date && new Date(event.event_date).setHours(0,0,0,0) <= new Date().setHours(23,59,59,999) && (
                    <DropdownMenuItem onClick={() => navigate(`/events/${event.id}/attendance`)}>
                      <UserCheck className="w-4 h-4 mr-2" /> {t3('Aanwezigheidsoverzicht', 'Aperçu des présences', 'Attendance overview')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleToggleHoldEvent(event.id)} disabled={togglingHold === event.id} className="text-yellow-600 dark:text-yellow-400 focus:text-yellow-600 dark:focus:text-yellow-400">
                    {event.status === 'on_hold' ? <PlayCircle className="w-4 h-4 mr-2" /> : <PauseCircle className="w-4 h-4 mr-2" />} {event.status === 'on_hold' ? (nl ? 'Heractiveren' : 'Reactivate') : (nl ? 'On hold' : 'On hold')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmDeleteEvent(event.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="w-4 h-4 mr-2" /> {nl ? 'Verwijderen' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Add group inline */}
            {addingGroupToEvent === event.id && (
            <div data-tour={addingGroupToEvent === event.id && ei === 0 ? 'form-add-group' : undefined} className="mb-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>{nl ? 'Groepsnaam' : 'Group name'} *</label>
                    <input type="text" placeholder={nl ? 'bv. Stewards' : 'e.g. Stewards'} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className={inputClass} autoFocus />
                  </div>
                  <div>
                    <label className={labelClass}>{nl ? 'Kleur bandje / accessoire' : 'Wristband color'}</label>
                    <input type="text" placeholder={nl ? 'bv. Rood' : 'e.g. Red'} value={newGroupWristbandColor} onChange={e => setNewGroupWristbandColor(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{nl ? 'Type accessoire' : 'Accessory type'}</label>
                    <input type="text" placeholder={nl ? 'bv. Polsbandje, Hesje, Badge' : 'e.g. Wristband, Vest, Badge'} value={newGroupWristbandLabel} onChange={e => setNewGroupWristbandLabel(e.target.value)} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>{nl ? 'Extra materiaal / instructies' : 'Extra materials / instructions'}</label>
                    <textarea rows={2} placeholder={nl ? 'bv. Gele T-shirt maat M, walkietalkie kanaal 3' : 'e.g. Yellow T-shirt size M, walkie channel 3'} value={newGroupMaterialsNote} onChange={e => setNewGroupMaterialsNote(e.target.value)} className={inputClass + ' resize-none'} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleAddGroup(event.id)} disabled={!newGroupName.trim()} className="px-3 py-2 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">{nl ? 'Aanmaken' : 'Create'}</button>
                  <button onClick={() => { setAddingGroupToEvent(null); setNewGroupWristbandColor(''); setNewGroupWristbandLabel(''); setNewGroupMaterialsNote(''); }} className="px-3 py-2 text-xs rounded-lg bg-muted text-muted-foreground">{nl ? 'Annuleren' : 'Cancel'}</button>
                </div>
              </div>
            )}

            {/* Groups */}
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{nl ? 'Voeg groepen toe om taken te organiseren.' : 'Add groups to organize tasks.'}</p>
            ) : (
              <div className="space-y-4">
                {groups.sort((a, b) => a.sort_order - b.sort_order).map((group, gi) => {
                  const groupTasks = getGroupTasks(group.id);
                  return (
                    <div key={group.id} className="rounded-xl border border-border overflow-hidden">
                      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: group.color + '15' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                          <h4 className="font-medium text-foreground text-sm">{group.name}</h4>
                          <span className="text-xs text-muted-foreground">({groupTasks.length})</span>
                          {group.wristband_color && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border" style={{ borderColor: group.color, color: group.color }}>
                              {group.wristband_color} {group.wristband_label || (nl ? 'bandje' : 'band')}
                            </span>
                          )}
                          {group.materials_note && (
                            <span className="text-[10px] text-muted-foreground italic max-w-[200px] truncate" title={group.materials_note}>📋 {group.materials_note}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button data-tour={ei === 0 && gi === 0 ? 'btn-add-task-group' : undefined} onClick={() => { setAddingTaskToGroup({ eventId: event.id, groupId: group.id }); setGroupTaskForm({ title: '', task_date: '', location: event.location || '', spots_available: 1 }); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={nl ? 'Taak toevoegen' : 'Add task'}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => handleStartEditGroup(group)}>
                                <Pencil className="w-4 h-4 mr-2" /> {nl ? 'Bewerken' : 'Edit'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateGroup(group)}>
                                <Copy className="w-4 h-4 mr-2" /> {nl ? 'Dupliceren' : 'Duplicate'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteGroup(group.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="w-4 h-4 mr-2" /> {nl ? 'Verwijderen' : 'Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Inline edit group form */}
                      {editingGroup === group.id && (
                        <div className="p-4 border-b border-border bg-muted/30 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className={labelClass}>{nl ? 'Groepsnaam' : 'Group name'} *</label>
                              <input type="text" value={editGroupForm.name} onChange={e => setEditGroupForm(p => ({ ...p, name: e.target.value }))} className={inputClass} autoFocus />
                            </div>
                            <div>
                              <label className={labelClass}>{nl ? 'Kleur' : 'Color'}</label>
                              <div className="flex gap-1.5 flex-wrap mt-1">
                                {GROUP_COLORS.map(c => (
                                  <button key={c} type="button" onClick={() => setEditGroupForm(p => ({ ...p, color: c }))} className={`w-6 h-6 rounded-full border-2 transition-transform ${editGroupForm.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className={labelClass}>{nl ? 'Polsbandkleur' : 'Wristband color'}</label>
                              <input type="text" value={editGroupForm.wristband_color} onChange={e => setEditGroupForm(p => ({ ...p, wristband_color: e.target.value }))} className={inputClass} placeholder={nl ? 'bv. Blauw' : 'e.g. Blue'} />
                            </div>
                            <div>
                              <label className={labelClass}>{nl ? 'Polsbandlabel' : 'Wristband label'}</label>
                              <input type="text" value={editGroupForm.wristband_label} onChange={e => setEditGroupForm(p => ({ ...p, wristband_label: e.target.value }))} className={inputClass} placeholder={nl ? 'bv. STEWARD' : 'e.g. STEWARD'} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={labelClass}>{nl ? 'Materiaal notitie' : 'Materials note'}</label>
                              <input type="text" value={editGroupForm.materials_note} onChange={e => setEditGroupForm(p => ({ ...p, materials_note: e.target.value }))} className={inputClass} placeholder={nl ? 'bv. Fluohesje, walkietalkie' : 'e.g. Safety vest, walkie-talkie'} />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditingGroup(null)} className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground">{nl ? 'Annuleren' : 'Cancel'}</button>
                            <button type="button" onClick={() => handleSaveEditGroup(group.id)} disabled={savingGroup || !editGroupForm.name.trim()} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                              {savingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (nl ? 'Opslaan' : 'Save')}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="divide-y divide-border">
                        {groupTasks.map((task) => (
                          <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                              <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                                {task.task_date && <span>{new Date(task.task_date).toLocaleDateString(nl ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short' })}</span>}
                                {task.location && <span>{task.location}</span>}
                                <span>{task.spots_available} {nl ? 'plaatsen' : 'spots'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => setBulkMessageTask({ id: task.id, title: task.title })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border" title={t3('Nodig vrijwilligers uit', 'Inviter des bénévoles', 'Invite volunteers')}>
                                <Send className="w-3.5 h-3.5" /> {t3('Uitnodigen', 'Inviter', 'Invite')}
                              </button>
                              <button data-tour={ei === 0 && gi === 0 ? 'btn-zones-first' : undefined} onClick={() => setZoneDialogTask({ id: task.id, title: task.title })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border" title={nl ? 'Zones beheren' : 'Manage zones'}>
                                <Layers className="w-3.5 h-3.5" /> {nl ? 'Zones' : 'Zones'}
                              </button>
                              <button onClick={() => navigate(`/planning/${task.id}`)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border" title={nl ? 'Kanban planning' : 'Kanban planning'}>
                                <LayoutGrid className="w-3.5 h-3.5" /> {nl ? 'Planning' : 'Planning'}
                              </button>
                              <button onClick={() => setSpoedTask(task)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-800">
                                <Zap className="w-3.5 h-3.5" /> {t3('Spoed', 'Urgent', 'Urgent')}
                              </button>
                            </div>
                          </div>
                        ))}
                        {groupTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{nl ? 'Geen taken' : 'No tasks'}</p>}
                      </div>

                      {/* Add task to group form */}
                      {addingTaskToGroup?.groupId === group.id && (
                        <form data-tour={ei === 0 && gi === 0 ? 'form-add-task-group' : undefined} onSubmit={handleAddTaskToGroup} className="p-4 border-t border-border space-y-3">
                          <div><label className={labelClass}>{nl ? 'Titel' : 'Title'} *</label><input type="text" required value={groupTaskForm.title} onChange={e => setGroupTaskForm(p => ({ ...p, title: e.target.value }))} className={inputClass} autoFocus /></div>
                          <div className="grid grid-cols-3 gap-3">
                            <div><label className={labelClass}>{nl ? 'Datum' : 'Date'}</label><input type="datetime-local" min={todayMin} value={groupTaskForm.task_date} onChange={e => setGroupTaskForm(p => ({ ...p, task_date: e.target.value }))} className={inputClass} /></div>
                            <div><label className={labelClass}>{nl ? 'Locatie' : 'Location'}</label><input type="text" value={groupTaskForm.location} onChange={e => setGroupTaskForm(p => ({ ...p, location: e.target.value }))} className={inputClass} /></div>
                            <div><label className={labelClass}>{nl ? 'Plaatsen' : 'Spots'}</label><input type="number" min={1} value={groupTaskForm.spots_available} onChange={e => setGroupTaskForm(p => ({ ...p, spots_available: parseInt(e.target.value) || 1 }))} className={inputClass} /></div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setAddingTaskToGroup(null)} className="px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground">{nl ? 'Annuleren' : 'Cancel'}</button>
                            <button type="submit" disabled={creatingGroupTask || !groupTaskForm.title.trim()} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                              {creatingGroupTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (nl ? 'Toevoegen' : 'Add')}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }
};

export default EventsManager;
