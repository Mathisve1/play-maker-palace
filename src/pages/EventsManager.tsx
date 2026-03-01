import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Calendar, MapPin, Users, Layers, ChevronDown, ChevronUp,
  Pencil, Copy, Loader2, X, AlertTriangle, CalendarDays, Handshake, LayoutGrid,
  PauseCircle, PlayCircle, Shield, Radio, Play, BookOpen,
} from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskZoneDialog from '@/components/TaskZoneDialog';
import SafetyConfigDialog from '@/components/SafetyConfigDialog';
import PlanningOnboardingTour from '@/components/PlanningOnboardingTour';

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
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', location: '' });
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Create loose task
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', task_date: '', location: '', spots_available: 1 });
  const [creatingTask, setCreatingTask] = useState(false);

  // Event management
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [addingGroupToEvent, setAddingGroupToEvent] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupWristbandColor, setNewGroupWristbandColor] = useState('');
  const [newGroupWristbandLabel, setNewGroupWristbandLabel] = useState('');
  const [newGroupMaterialsNote, setNewGroupMaterialsNote] = useState('');
  const [duplicatingEvent, setDuplicatingEvent] = useState<string | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<string | null>(null);
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

  // Adding task to group
  const [addingTaskToGroup, setAddingTaskToGroup] = useState<{ eventId: string; groupId: string } | null>(null);
  const [groupTaskForm, setGroupTaskForm] = useState({ title: '', task_date: '', location: '', spots_available: 1 });
  const [creatingGroupTask, setCreatingGroupTask] = useState(false);

  // Zone dialog
  const [zoneDialogTask, setZoneDialogTask] = useState<{ id: string; title: string } | null>(null);
  const [safetyConfigEvent, setSafetyConfigEvent] = useState<{ eventId: string; clubId: string } | null>(null);

  const nl = language === 'nl';
  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

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

      const [evRes, taskRes] = await Promise.all([
        (supabase as any).from('events').select('*').eq('club_id', cId).is('training_id', null).neq('event_type', 'training').order('event_date', { ascending: false }),
        (supabase as any).from('tasks').select('id, title, task_date, location, spots_available, event_id, event_group_id, partner_only, assigned_partner_id, status').eq('club_id', cId).order('task_date', { ascending: true }),
      ]);
      setEvents(evRes.data || []);
      setTasks(taskRes.data || []);

      if (evRes.data?.length) {
        const eventIds = evRes.data.map((e: any) => e.id);
        const { data: groups } = await (supabase as any).from('event_groups').select('*').in('event_id', eventIds).order('sort_order');
        setEventGroups(groups || []);
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newEvent.title.trim()) return;
    setCreatingEvent(true);
    const { data, error } = await (supabase as any).from('events').insert({
      club_id: clubId, title: newEvent.title.trim(), description: newEvent.description.trim() || null,
      event_date: newEvent.event_date || null, location: newEvent.location.trim() || null,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { toast.success(nl ? 'Evenement aangemaakt!' : 'Event created!'); setEvents(prev => [data, ...prev]); setShowCreateEvent(false); setNewEvent({ title: '', description: '', event_date: '', location: '' }); }
    setCreatingEvent(false);
  };

  const handleCreateLooseTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !newTask.title.trim()) return;
    setCreatingTask(true);
    const { data, error } = await (supabase as any).from('tasks').insert({
      club_id: clubId, title: newTask.title.trim(), description: newTask.description.trim() || null,
      task_date: newTask.task_date || null, location: newTask.location.trim() || null,
      spots_available: newTask.spots_available,
    }).select('id, title, task_date, location, spots_available, event_id, event_group_id').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { toast.success(nl ? 'Taak aangemaakt!' : 'Task created!'); setTasks(prev => [...prev, data]); setShowCreateTask(false); setNewTask({ title: '', description: '', task_date: '', location: '', spots_available: 1 }); }
    setCreatingTask(false);
  };

  const handleAddGroup = async (eventId: string) => {
    if (!newGroupName.trim()) return;
    const groups = eventGroups.filter(g => g.event_id === eventId);
    const { data, error } = await (supabase as any).from('event_groups').insert({
      event_id: eventId, name: newGroupName.trim(), color: GROUP_COLORS[groups.length % GROUP_COLORS.length], sort_order: groups.length,
      wristband_color: newGroupWristbandColor.trim() || null,
      wristband_label: newGroupWristbandLabel.trim() || null,
      materials_note: newGroupMaterialsNote.trim() || null,
    }).select('*').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) {
      toast.success(nl ? 'Groep aangemaakt!' : 'Group created!');
      setEventGroups(prev => [...prev, data]);
      setAddingGroupToEvent(null);
      setNewGroupWristbandColor(''); setNewGroupWristbandLabel(''); setNewGroupMaterialsNote('');
    }
  };

  const handleAddTaskToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !addingTaskToGroup || !groupTaskForm.title.trim()) return;
    setCreatingGroupTask(true);
    const { data, error } = await (supabase as any).from('tasks').insert({
      club_id: clubId, title: groupTaskForm.title.trim(), task_date: groupTaskForm.task_date || null,
      location: groupTaskForm.location.trim() || null, spots_available: groupTaskForm.spots_available,
      event_id: addingTaskToGroup.eventId, event_group_id: addingTaskToGroup.groupId,
    }).select('id, title, task_date, location, spots_available, event_id, event_group_id').maybeSingle();
    if (error) toast.error(error.message);
    else if (data) { toast.success(nl ? 'Taak toegevoegd!' : 'Task added!'); setTasks(prev => [...prev, data]); setAddingTaskToGroup(null); setGroupTaskForm({ title: '', task_date: '', location: '', spots_available: 1 }); }
    setCreatingGroupTask(false);
  };

  const handleDuplicateEvent = async (eventId: string) => {
    setDuplicatingEvent(eventId);
    const event = events.find(e => e.id === eventId);
    if (!event || !clubId) return;
    const { data: newEv, error } = await (supabase as any).from('events').insert({
      club_id: clubId, title: `${event.title} (kopie)`, description: event.description,
      event_date: event.event_date, location: event.location,
    }).select('*').maybeSingle();
    if (error || !newEv) { toast.error(error?.message || 'Failed'); setDuplicatingEvent(null); return; }

    const groups = eventGroups.filter(g => g.event_id === eventId);
    for (const group of groups) {
      const { data: newGrp } = await (supabase as any).from('event_groups').insert({
        event_id: newEv.id, name: group.name, color: group.color, sort_order: group.sort_order,
      }).select('*').maybeSingle();
      if (newGrp) {
        setEventGroups(prev => [...prev, newGrp]);
        const groupTasks = tasks.filter(t => t.event_group_id === group.id);
        for (const task of groupTasks) {
          const { data: newTask } = await (supabase as any).from('tasks').insert({
            club_id: clubId, title: task.title, task_date: task.task_date, location: task.location,
            spots_available: task.spots_available, event_id: newEv.id, event_group_id: newGrp.id,
          }).select('id, title, task_date, location, spots_available, event_id, event_group_id').maybeSingle();
          if (newTask) setTasks(prev => [...prev, newTask]);
        }
      }
    }
    setEvents(prev => [newEv, ...prev]);
    toast.success(nl ? 'Evenement gedupliceerd!' : 'Event duplicated!');
    setDuplicatingEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingEvent(eventId);
    const groups = eventGroups.filter(g => g.event_id === eventId);
    for (const g of groups) {
      await (supabase as any).from('tasks').delete().eq('event_group_id', g.id);
      await (supabase as any).from('event_groups').delete().eq('id', g.id);
    }
    await (supabase as any).from('tasks').delete().eq('event_id', eventId).is('event_group_id', null);
    const { error } = await (supabase as any).from('events').delete().eq('id', eventId);
    if (error) toast.error(error.message);
    else {
      toast.success(nl ? 'Evenement verwijderd!' : 'Event deleted!');
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setEventGroups(prev => prev.filter(g => g.event_id !== eventId));
      setTasks(prev => prev.filter(t => t.event_id !== eventId));
    }
    setDeletingEvent(null);
    setConfirmDeleteEvent(null);
  };

  const handleDeleteGroup = async (groupId: string) => {
    await (supabase as any).from('tasks').delete().eq('event_group_id', groupId);
    await (supabase as any).from('event_groups').delete().eq('id', groupId);
    setEventGroups(prev => prev.filter(g => g.id !== groupId));
    setTasks(prev => prev.filter(t => t.event_group_id !== groupId));
    toast.success(nl ? 'Groep verwijderd!' : 'Group deleted!');
  };

  const handleStartEditEvent = (event: EventData) => {
    setEditingEvent(event);
    setEditEventForm({ title: event.title, description: event.description || '', event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '', location: event.location || '' });
  };

  const handleSaveEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSavingEvent(true);
    const { error } = await (supabase as any).from('events').update({
      title: editEventForm.title.trim(), description: editEventForm.description.trim() || null,
      event_date: editEventForm.event_date || null, location: editEventForm.location.trim() || null,
    }).eq('id', editingEvent.id);
    if (error) toast.error(error.message);
    else {
      toast.success(nl ? 'Evenement bijgewerkt!' : 'Event updated!');
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
      toast.success(nl ? 'Demo aangemaakt! Pagina wordt herladen...' : 'Demo created! Reloading...');
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
      toast.success(nl ? 'Demo data verwijderd!' : 'Demo data deleted!');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) { toast.error(err.message); }
    setDemoDeleteLoading(false);
  };

  const handleDeleteLooseTask = async (taskId: string) => {
    setDeletingTask(taskId);
    const { error } = await (supabase as any).from('tasks').delete().eq('id', taskId);
    if (error) toast.error(error.message);
    else { toast.success(nl ? 'Taak verwijderd!' : 'Task deleted!'); setTasks(prev => prev.filter(t => t.id !== taskId)); }
    setDeletingTask(null);
    setConfirmDeleteTask(null);
  };

  const handleToggleHoldEvent = async (eventId: string) => {
    setTogglingHold(eventId);
    const event = events.find(e => e.id === eventId);
    const newStatus = event?.status === 'on_hold' ? 'open' : 'on_hold';
    const { error } = await (supabase as any).from('events').update({ status: newStatus }).eq('id', eventId);
    if (error) toast.error(error.message);
    else { setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e)); toast.success(newStatus === 'on_hold' ? (nl ? 'Evenement on hold gezet' : 'Event put on hold') : (nl ? 'Evenement weer actief' : 'Event reactivated')); }
    setTogglingHold(null);
  };

  const handleToggleHoldTask = async (taskId: string, currentStatus: string) => {
    setTogglingHold(taskId);
    const newStatus = currentStatus === 'on_hold' ? 'open' : 'on_hold';
    const { error } = await (supabase as any).from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) toast.error(error.message);
    else { setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)); toast.success(newStatus === 'on_hold' ? (nl ? 'Taak on hold gezet' : 'Task put on hold') : (nl ? 'Taak weer actief' : 'Task reactivated')); }
    setTogglingHold(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <>
    <ClubPageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              {nl ? 'Evenementen & Taken' : 'Events & Tasks'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {events.length} {nl ? 'evenementen' : 'events'} · {looseTasks.length} {nl ? 'losse taken' : 'loose tasks'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowTour(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              <BookOpen className="w-4 h-4" /> {nl ? 'Hoe werkt het?' : 'How does it work?'}
            </button>
            {hasDemoEvent ? (
              <button onClick={handleDeletePlanningDemo} disabled={demoDeleteLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50">
                {demoDeleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {nl ? 'Demo wissen' : 'Delete demo'}
              </button>
            ) : (
              <button onClick={handleStartPlanningDemo} disabled={demoLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {nl ? 'Start demo' : 'Start demo'}
              </button>
            )}
            <button onClick={() => { setShowCreateEvent(true); setShowCreateTask(false); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <CalendarDays className="w-4 h-4" /> {nl ? 'Nieuw evenement' : 'New event'}
            </button>
            <button onClick={() => { setShowCreateTask(true); setShowCreateEvent(false); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
              <Plus className="w-4 h-4" /> {nl ? 'Losse taak' : 'Loose task'}
            </button>
          </div>
        </div>

        {/* Create Event Form */}
        <AnimatePresence>
          {showCreateEvent && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateEvent} className="bg-card rounded-2xl shadow-card border border-border p-6 overflow-hidden">
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{nl ? 'Nieuw evenement' : 'New event'}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className={labelClass}>{nl ? 'Titel' : 'Title'} *</label><input type="text" required maxLength={200} value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} className={inputClass} /></div>
                <div className="sm:col-span-2"><label className={labelClass}>{nl ? 'Beschrijving' : 'Description'}</label><textarea rows={2} value={newEvent.description} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} /></div>
                <div><label className={labelClass}>{nl ? 'Datum' : 'Date'}</label><input type="datetime-local" value={newEvent.event_date} onChange={e => setNewEvent(p => ({ ...p, event_date: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{nl ? 'Locatie' : 'Location'}</label><input type="text" value={newEvent.location} onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))} className={inputClass} /></div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCreateEvent(false)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{nl ? 'Annuleren' : 'Cancel'}</button>
                <button type="submit" disabled={creatingEvent || !newEvent.title.trim()} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                  {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : (nl ? 'Aanmaken' : 'Create')}
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
              <h2 className="text-lg font-heading font-semibold text-foreground mb-4">{nl ? 'Nieuwe losse taak' : 'New loose task'}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className={labelClass}>{nl ? 'Titel' : 'Title'} *</label><input type="text" required maxLength={200} value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} className={inputClass} /></div>
                <div className="sm:col-span-2"><label className={labelClass}>{nl ? 'Beschrijving' : 'Description'}</label><textarea rows={2} value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} /></div>
                <div><label className={labelClass}>{nl ? 'Datum' : 'Date'}</label><input type="datetime-local" value={newTask.task_date} onChange={e => setNewTask(p => ({ ...p, task_date: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{nl ? 'Locatie' : 'Location'}</label><input type="text" value={newTask.location} onChange={e => setNewTask(p => ({ ...p, location: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{nl ? 'Plaatsen' : 'Spots'}</label><input type="number" min={1} value={newTask.spots_available} onChange={e => setNewTask(p => ({ ...p, spots_available: parseInt(e.target.value) || 1 }))} className={inputClass} /></div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCreateTask(false)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{nl ? 'Annuleren' : 'Cancel'}</button>
                <button type="submit" disabled={creatingTask || !newTask.title.trim()} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                  {creatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : (nl ? 'Aanmaken' : 'Create')}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Events Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming">{nl ? 'Aankomend' : 'Upcoming'} ({upcomingEvents.length})</TabsTrigger>
            <TabsTrigger value="past">{nl ? 'Afgelopen' : 'Past'} ({pastEvents.length + pastLooseTasks.length})</TabsTrigger>
            <TabsTrigger value="loose">{nl ? 'Losse taken' : 'Loose tasks'} ({upcomingLooseTasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>{nl ? 'Geen aankomende evenementen.' : 'No upcoming events.'}</p>
              </div>
            ) : upcomingEvents.map((event, ei) => renderEventCard(event, ei))}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastEvents.length === 0 && pastLooseTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p>{nl ? 'Geen afgelopen items.' : 'No past items.'}</p></div>
            ) : (
              <>
                {pastEvents.map((event, ei) => renderEventCard(event, ei))}
                {pastLooseTasks.length > 0 && (
                  <>
                    {pastEvents.length > 0 && <div className="pt-2"><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{nl ? 'Afgelopen losse taken' : 'Past loose tasks'}</p></div>}
                    {pastLooseTasks.map((task, i) => renderLooseTaskCard(task, i))}
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="loose" className="space-y-3">
            {upcomingLooseTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p>{nl ? 'Geen losse taken.' : 'No loose tasks.'}</p></div>
            ) : upcomingLooseTasks.map((task, i) => renderLooseTaskCard(task, i))}
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
                <h2 className="text-lg font-heading font-semibold text-foreground">{nl ? 'Evenement verwijderen' : 'Delete event'}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{nl ? 'Weet je zeker dat je dit evenement wilt verwijderen? Alle groepen en taken worden ook verwijderd.' : 'Are you sure? All groups and tasks will also be deleted.'}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeleteEvent(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{nl ? 'Annuleren' : 'Cancel'}</button>
                <button onClick={() => handleDeleteEvent(confirmDeleteEvent)} disabled={deletingEvent === confirmDeleteEvent} className="px-5 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 disabled:opacity-50">
                  {deletingEvent === confirmDeleteEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : (nl ? 'Verwijderen' : 'Delete')}
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
                <h2 className="text-lg font-heading font-semibold text-foreground">{nl ? 'Evenement bewerken' : 'Edit event'}</h2>
                <button onClick={() => setEditingEvent(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveEditEvent} className="space-y-4">
                <div><label className={labelClass}>{nl ? 'Titel' : 'Title'} *</label><input type="text" required value={editEventForm.title} onChange={e => setEditEventForm(p => ({ ...p, title: e.target.value }))} className={inputClass} /></div>
                <div><label className={labelClass}>{nl ? 'Beschrijving' : 'Description'}</label><textarea rows={2} value={editEventForm.description} onChange={e => setEditEventForm(p => ({ ...p, description: e.target.value }))} className={inputClass + ' resize-none'} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>{nl ? 'Datum' : 'Date'}</label><input type="datetime-local" value={editEventForm.event_date} onChange={e => setEditEventForm(p => ({ ...p, event_date: e.target.value }))} className={inputClass} /></div>
                  <div><label className={labelClass}>{nl ? 'Locatie' : 'Location'}</label><input type="text" value={editEventForm.location} onChange={e => setEditEventForm(p => ({ ...p, location: e.target.value }))} className={inputClass} /></div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditingEvent(null)} className="px-4 py-2 text-sm rounded-xl bg-muted text-muted-foreground">{nl ? 'Annuleren' : 'Cancel'}</button>
                  <button type="submit" disabled={savingEvent} className="px-5 py-2 text-sm rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                    {savingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : (nl ? 'Opslaan' : 'Save')}
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
    </ClubPageLayout>
    <PlanningOnboardingTour open={showTour} onClose={() => setShowTour(false)} />
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
        <button onClick={() => setExpandedEvent(isExpanded ? null : event.id)} className="w-full p-5 text-left flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-foreground text-lg">{event.title}</h3>
              {event.status === 'on_hold' && <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">On hold</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(event.event_date).toLocaleDateString(nl ? 'nl-BE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
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

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3 mb-4 flex-wrap">
              <button onClick={() => { setAddingGroupToEvent(event.id); setNewGroupName(''); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Plus className="w-3.5 h-3.5" /> {nl ? 'Groep toevoegen' : 'Add group'}
              </button>
              <button onClick={() => handleStartEditEvent(event)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="w-3.5 h-3.5" /> {nl ? 'Bewerken' : 'Edit'}
              </button>
              <button onClick={() => handleDuplicateEvent(event.id)} disabled={duplicatingEvent === event.id} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                {duplicatingEvent === event.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />} {nl ? 'Dupliceren' : 'Duplicate'}
              </button>
              <button onClick={() => handleToggleHoldEvent(event.id)} disabled={togglingHold === event.id} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50">
                {event.status === 'on_hold' ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />} {event.status === 'on_hold' ? (nl ? 'Heractiveren' : 'Reactivate') : (nl ? 'On hold' : 'On hold')}
              </button>
              <button onClick={() => setConfirmDeleteEvent(event.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> {nl ? 'Verwijderen' : 'Delete'}
              </button>
              <button onClick={() => setSafetyConfigEvent({ eventId: event.id, clubId: event.club_id })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                <Shield className="w-3.5 h-3.5" /> Safety
              </button>
              <button onClick={() => navigate(`/safety/${event.id}`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Radio className="w-3.5 h-3.5" /> Control Room
              </button>
            </div>

            {/* Add group inline */}
            {addingGroupToEvent === event.id && (
              <div className="mb-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3">
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
                {groups.sort((a, b) => a.sort_order - b.sort_order).map(group => {
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
                          <button onClick={() => { setAddingTaskToGroup({ eventId: event.id, groupId: group.id }); setGroupTaskForm({ title: '', task_date: '', location: event.location || '', spots_available: 1 }); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={nl ? 'Taak toevoegen' : 'Add task'}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
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
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => setZoneDialogTask({ id: task.id, title: task.title })} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={nl ? 'Zones beheren' : 'Manage zones'}>
                                <Layers className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => navigate(`/planning/${task.id}`)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={nl ? 'Zone planning' : 'Zone planning'}>
                                <LayoutGrid className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {groupTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{nl ? 'Geen taken' : 'No tasks'}</p>}
                      </div>

                      {/* Add task to group form */}
                      {addingTaskToGroup?.groupId === group.id && (
                        <form onSubmit={handleAddTaskToGroup} className="p-4 border-t border-border space-y-3">
                          <div><label className={labelClass}>{nl ? 'Titel' : 'Title'} *</label><input type="text" required value={groupTaskForm.title} onChange={e => setGroupTaskForm(p => ({ ...p, title: e.target.value }))} className={inputClass} autoFocus /></div>
                          <div className="grid grid-cols-3 gap-3">
                            <div><label className={labelClass}>{nl ? 'Datum' : 'Date'}</label><input type="datetime-local" value={groupTaskForm.task_date} onChange={e => setGroupTaskForm(p => ({ ...p, task_date: e.target.value }))} className={inputClass} /></div>
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
