import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Trash2, Loader2, Plus, Calendar, Pencil, Package, Clock, MapPin, Users, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TemplateGroup {
  name: string;
  color: string;
  wristband_color?: string | null;
  wristband_label?: string | null;
  materials_note?: string | null;
  tasks: { title: string; spots_available: number }[];
}

interface EventTemplate {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  groups: TemplateGroup[];
  created_at: string;
}

interface TaskTemplate {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  required_volunteers: number;
  contract_template_category: string | null;
  created_at: string;
}

interface TaskTemplateSet {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  created_at: string;
  items?: { id: string; template_id: string; sort_order: number }[];
}

interface EventTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  language: Language;
  onCreateFromTemplate: (template: EventTemplate) => void;
  onCreateFromTaskSet?: (set: TaskTemplateSet, templates: TaskTemplate[], eventId: string) => void;
}

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

const EventTemplateDialog = ({ open, onClose, clubId, language, onCreateFromTemplate, onCreateFromTaskSet }: EventTemplateDialogProps) => {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [taskSets, setTaskSets] = useState<TaskTemplateSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Task template form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskTemplate, setEditingTaskTemplate] = useState<TaskTemplate | null>(null);
  const [taskForm, setTaskForm] = useState({ name: '', description: '', location: '', start_time: '', end_time: '', required_volunteers: 1, contract_template_category: '' });
  const [savingTask, setSavingTask] = useState(false);

  // Set form
  const [showSetForm, setShowSetForm] = useState(false);
  const [editingSet, setEditingSet] = useState<TaskTemplateSet | null>(null);
  const [setForm, setSetForm] = useState({ name: '', description: '' });
  const [setSelectedTemplates, setSetSelectedTemplates] = useState<string[]>([]);
  const [savingSet, setSavingSet] = useState(false);

  const inputClass = "w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  useEffect(() => {
    if (!open) return;
    loadAll();
  }, [open, clubId]);

  const loadAll = async () => {
    setLoading(true);
    const [evtRes, ttRes, tsRes] = await Promise.all([
      supabase.from('event_templates').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
      supabase.from('task_templates').select('*').eq('club_id', clubId).order('name'),
      supabase.from('task_template_sets').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
    ]);
    setTemplates((evtRes.data || []).map((t: any) => ({ ...t, groups: Array.isArray(t.groups) ? t.groups : [] })));
    setTaskTemplates(ttRes.data || []);

    // Load set items
    const sets = tsRes.data || [];
    if (sets.length > 0) {
      const setIds = sets.map((s: any) => s.id);
      const { data: items } = await supabase.from('task_template_set_items').select('*').in('set_id', setIds).order('sort_order');
      const setsWithItems = sets.map((s: any) => ({
        ...s,
        items: (items || []).filter((i: any) => i.set_id === s.id),
      }));
      setTaskSets(setsWithItems);
    } else {
      setTaskSets([]);
    }
    setLoading(false);
  };

  const handleDeleteEventTemplate = async (id: string) => {
    setDeleting(id);
    await supabase.from('event_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success(t3(language, 'Sjabloon verwijderd', 'Modèle supprimé', 'Template deleted'));
    setDeleting(null);
  };

  const handleDeleteTaskTemplate = async (id: string) => {
    setDeleting(id);
    await supabase.from('task_template_set_items').delete().eq('template_id', id);
    await supabase.from('task_templates').delete().eq('id', id);
    setTaskTemplates(prev => prev.filter(t => t.id !== id));
    setTaskSets(prev => prev.map(s => ({ ...s, items: (s.items || []).filter(i => i.template_id !== id) })));
    toast.success(t3(language, 'Taaksjabloon verwijderd', 'Modèle de tâche supprimé', 'Task template deleted'));
    setDeleting(null);
  };

  const handleDeleteSet = async (id: string) => {
    setDeleting(id);
    await supabase.from('task_template_set_items').delete().eq('set_id', id);
    await supabase.from('task_template_sets').delete().eq('id', id);
    setTaskSets(prev => prev.filter(s => s.id !== id));
    toast.success(t3(language, 'Set verwijderd', 'Ensemble supprimé', 'Set deleted'));
    setDeleting(null);
  };

  const openTaskForm = (tmpl?: TaskTemplate) => {
    if (tmpl) {
      setEditingTaskTemplate(tmpl);
      setTaskForm({
        name: tmpl.name, description: tmpl.description || '', location: tmpl.location || '',
        start_time: tmpl.start_time || '', end_time: tmpl.end_time || '',
        required_volunteers: tmpl.required_volunteers, contract_template_category: tmpl.contract_template_category || '',
      });
    } else {
      setEditingTaskTemplate(null);
      setTaskForm({ name: '', description: '', location: '', start_time: '', end_time: '', required_volunteers: 1, contract_template_category: '' });
    }
    setShowTaskForm(true);
    setShowSetForm(false);
  };

  const handleSaveTaskTemplate = async () => {
    if (!taskForm.name.trim()) return;
    setSavingTask(true);
    const payload = {
      club_id: clubId,
      name: taskForm.name.trim(),
      description: taskForm.description.trim() || null,
      location: taskForm.location.trim() || null,
      start_time: taskForm.start_time || null,
      end_time: taskForm.end_time || null,
      required_volunteers: taskForm.required_volunteers,
      contract_template_category: taskForm.contract_template_category.trim() || null,
    };

    if (editingTaskTemplate) {
      const { error } = await supabase.from('task_templates').update(payload).eq('id', editingTaskTemplate.id);
      if (error) toast.error(error.message);
      else {
        setTaskTemplates(prev => prev.map(t => t.id === editingTaskTemplate.id ? { ...t, ...payload } : t));
        toast.success(t3(language, 'Sjabloon bijgewerkt', 'Modèle mis à jour', 'Template updated'));
      }
    } else {
      const { data, error } = await supabase.from('task_templates').insert(payload).select('*').maybeSingle();
      if (error) toast.error(error.message);
      else if (data) {
        setTaskTemplates(prev => [...prev, data]);
        toast.success(t3(language, 'Sjabloon aangemaakt', 'Modèle créé', 'Template created'));
      }
    }
    setSavingTask(false);
    setShowTaskForm(false);
  };

  const openSetForm = (set?: TaskTemplateSet) => {
    if (set) {
      setEditingSet(set);
      setSetForm({ name: set.name, description: set.description || '' });
      setSetSelectedTemplates((set.items || []).map(i => i.template_id));
    } else {
      setEditingSet(null);
      setSetForm({ name: '', description: '' });
      setSetSelectedTemplates([]);
    }
    setShowSetForm(true);
    setShowTaskForm(false);
  };

  const handleSaveSet = async () => {
    if (!setForm.name.trim()) return;
    setSavingSet(true);

    if (editingSet) {
      await supabase.from('task_template_sets').update({ name: setForm.name.trim(), description: setForm.description.trim() || null }).eq('id', editingSet.id);
      await supabase.from('task_template_set_items').delete().eq('set_id', editingSet.id);
      if (setSelectedTemplates.length > 0) {
        await supabase.from('task_template_set_items').insert(
          setSelectedTemplates.map((tid, i) => ({ set_id: editingSet.id, template_id: tid, sort_order: i }))
        );
      }
      toast.success(t3(language, 'Set bijgewerkt', 'Ensemble mis à jour', 'Set updated'));
    } else {
      const { data: newSet } = await supabase.from('task_template_sets').insert({
        club_id: clubId, name: setForm.name.trim(), description: setForm.description.trim() || null,
      }).select('*').maybeSingle();
      if (newSet && setSelectedTemplates.length > 0) {
        await supabase.from('task_template_set_items').insert(
          setSelectedTemplates.map((tid, i) => ({ set_id: newSet.id, template_id: tid, sort_order: i }))
        );
      }
      toast.success(t3(language, 'Set aangemaakt', 'Ensemble créé', 'Set created'));
    }
    setSavingSet(false);
    setShowSetForm(false);
    loadAll();
  };

  const totalTasks = (groups: TemplateGroup[]) =>
    groups.reduce((sum, g) => sum + (g.tasks?.length || 0), 0);

  const toggleTemplateInSet = (templateId: string) => {
    setSetSelectedTemplates(prev =>
      prev.includes(templateId) ? prev.filter(id => id !== templateId) : [...prev, templateId]
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-xl border border-border p-6 w-full max-w-2xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-foreground">
                {t3(language, 'Sjablonen', 'Modèles', 'Templates')}
              </h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <Tabs defaultValue="events" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mb-3 shrink-0">
                <TabsTrigger value="events">{t3(language, 'Event sjablonen', 'Modèles d\'événement', 'Event templates')}</TabsTrigger>
                <TabsTrigger value="tasks">{t3(language, 'Taaksjablonen', 'Modèles de tâche', 'Task templates')}</TabsTrigger>
                <TabsTrigger value="sets">{t3(language, 'Wedstrijdsets', 'Ensembles', 'Match sets')}</TabsTrigger>
              </TabsList>

              {/* EVENT TEMPLATES TAB */}
              <TabsContent value="events" className="flex-1 overflow-y-auto space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t3(language, 'Nog geen sjablonen. Sla een evenement op als sjabloon via het ⋯ menu.', 'Pas encore de modèles.', 'No templates yet. Save an event as template via the ⋯ menu.')}</p>
                  </div>
                ) : templates.map(tmpl => (
                  <div key={tmpl.id} className="rounded-xl border border-border p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{tmpl.name}</p>
                        {tmpl.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tmpl.description}</p>}
                        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{tmpl.groups.length} {t3(language, 'groepen', 'groupes', 'groups')}</span>
                          <span>{totalTasks(tmpl.groups)} {t3(language, 'taken', 'tâches', 'tasks')}</span>
                          {tmpl.location && <span className="truncate max-w-[120px]">{tmpl.location}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { onCreateFromTemplate(tmpl); onClose(); }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                          <Plus className="w-3.5 h-3.5" /> {t3(language, 'Gebruiken', 'Utiliser', 'Use')}
                        </button>
                        <button onClick={() => handleDeleteEventTemplate(tmpl.id)} disabled={deleting === tmpl.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          {deleting === tmpl.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* TASK TEMPLATES TAB */}
              <TabsContent value="tasks" className="flex-1 overflow-y-auto space-y-3">
                {showTaskForm ? (
                  <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
                    <h3 className="text-sm font-semibold text-foreground">
                      {editingTaskTemplate ? t3(language, 'Sjabloon bewerken', 'Modifier modèle', 'Edit template') : t3(language, 'Nieuw taaksjabloon', 'Nouveau modèle', 'New task template')}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>{t3(language, 'Naam', 'Nom', 'Name')} *</label>
                        <input type="text" value={taskForm.name} onChange={e => setTaskForm(p => ({ ...p, name: e.target.value }))} className={inputClass} placeholder={t3(language, 'bv. Steward Poort A', 'ex. Steward Porte A', 'e.g. Steward Gate A')} autoFocus />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>{t3(language, 'Beschrijving', 'Description', 'Description')}</label>
                        <input type="text" value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t3(language, 'Locatie', 'Lieu', 'Location')}</label>
                        <input type="text" value={taskForm.location} onChange={e => setTaskForm(p => ({ ...p, location: e.target.value }))} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t3(language, 'Vrijwilligers', 'Bénévoles', 'Volunteers')}</label>
                        <input type="number" min={1} value={taskForm.required_volunteers} onChange={e => setTaskForm(p => ({ ...p, required_volunteers: parseInt(e.target.value) || 1 }))} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t3(language, 'Starttijd', 'Début', 'Start time')}</label>
                        <input type="time" value={taskForm.start_time} onChange={e => setTaskForm(p => ({ ...p, start_time: e.target.value }))} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>{t3(language, 'Eindtijd', 'Fin', 'End time')}</label>
                        <input type="time" value={taskForm.end_time} onChange={e => setTaskForm(p => ({ ...p, end_time: e.target.value }))} className={inputClass} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>{t3(language, 'Contracttype', 'Type de contrat', 'Contract type')}</label>
                        <input type="text" value={taskForm.contract_template_category} onChange={e => setTaskForm(p => ({ ...p, contract_template_category: e.target.value }))} className={inputClass} placeholder={t3(language, 'bv. Steward, Barmedewerker', 'ex. Steward, Barman', 'e.g. Steward, Bar staff')} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveTaskTemplate} disabled={savingTask || !taskForm.name.trim()} className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                        {savingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingTaskTemplate ? t3(language, 'Opslaan', 'Enregistrer', 'Save') : t3(language, 'Aanmaken', 'Créer', 'Create')}
                      </button>
                      <button onClick={() => setShowTaskForm(false)} className="px-4 py-2 text-xs rounded-lg bg-muted text-muted-foreground">{t3(language, 'Annuleren', 'Annuler', 'Cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => openTaskForm()} className="flex items-center gap-2 px-4 py-2.5 w-full rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                    <Plus className="w-4 h-4" /> {t3(language, 'Nieuw taaksjabloon', 'Nouveau modèle de tâche', 'New task template')}
                  </button>
                )}

                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : taskTemplates.length === 0 && !showTaskForm ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t3(language, 'Nog geen taaksjablonen.', 'Pas encore de modèles de tâche.', 'No task templates yet.')}</p>
                  </div>
                ) : taskTemplates.map(tt => (
                  <div key={tt.id} className="rounded-xl border border-border p-3 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{tt.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                          {tt.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{tt.location}</span>}
                          <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{tt.required_volunteers}</span>
                          {tt.start_time && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{tt.start_time.slice(0, 5)}{tt.end_time ? `–${tt.end_time.slice(0, 5)}` : ''}</span>}
                          {tt.contract_template_category && <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tt.contract_template_category}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openTaskForm(tt)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteTaskTemplate(tt.id)} disabled={deleting === tt.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          {deleting === tt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* SETS TAB */}
              <TabsContent value="sets" className="flex-1 overflow-y-auto space-y-3">
                {showSetForm ? (
                  <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
                    <h3 className="text-sm font-semibold text-foreground">
                      {editingSet ? t3(language, 'Set bewerken', 'Modifier ensemble', 'Edit set') : t3(language, 'Nieuwe wedstrijdset', 'Nouvel ensemble', 'New match set')}
                    </h3>
                    <div>
                      <label className={labelClass}>{t3(language, 'Naam', 'Nom', 'Name')} *</label>
                      <input type="text" value={setForm.name} onChange={e => setSetForm(p => ({ ...p, name: e.target.value }))} className={inputClass}
                        placeholder={t3(language, 'bv. Standaard thuiswedstrijd', 'ex. Match à domicile standard', 'e.g. Standard home match')} autoFocus />
                    </div>
                    <div>
                      <label className={labelClass}>{t3(language, 'Beschrijving', 'Description', 'Description')}</label>
                      <input type="text" value={setForm.description} onChange={e => setSetForm(p => ({ ...p, description: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{t3(language, 'Taken in deze set', 'Tâches dans cet ensemble', 'Tasks in this set')}</label>
                      {taskTemplates.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">{t3(language, 'Maak eerst taaksjablonen aan.', 'Créez d\'abord des modèles de tâche.', 'Create task templates first.')}</p>
                      ) : (
                        <div className="space-y-1.5 mt-1">
                          {taskTemplates.map(tt => (
                            <label key={tt.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${setSelectedTemplates.includes(tt.id) ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-border/60'}`}>
                              <input type="checkbox" checked={setSelectedTemplates.includes(tt.id)} onChange={() => toggleTemplateInSet(tt.id)} className="w-4 h-4 rounded border-input accent-primary" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground">{tt.name}</span>
                                <div className="flex gap-2 text-[10px] text-muted-foreground">
                                  <span>{tt.required_volunteers} vol.</span>
                                  {tt.location && <span>{tt.location}</span>}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveSet} disabled={savingSet || !setForm.name.trim()} className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
                        {savingSet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingSet ? t3(language, 'Opslaan', 'Enregistrer', 'Save') : t3(language, 'Aanmaken', 'Créer', 'Create')}
                      </button>
                      <button onClick={() => setShowSetForm(false)} className="px-4 py-2 text-xs rounded-lg bg-muted text-muted-foreground">{t3(language, 'Annuleren', 'Annuler', 'Cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => openSetForm()} className="flex items-center gap-2 px-4 py-2.5 w-full rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                    <Plus className="w-4 h-4" /> {t3(language, 'Nieuwe wedstrijdset', 'Nouvel ensemble', 'New match set')}
                  </button>
                )}

                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : taskSets.length === 0 && !showSetForm ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t3(language, 'Nog geen wedstrijdsets. Maak een bundel van taaksjablonen.', 'Pas encore d\'ensembles.', 'No match sets yet. Create a bundle of task templates.')}</p>
                  </div>
                ) : taskSets.map(set => {
                  const setTemplateNames = (set.items || []).map(i => {
                    const tt = taskTemplates.find(t => t.id === i.template_id);
                    return tt?.name || '?';
                  });
                  return (
                    <div key={set.id} className="rounded-xl border border-border p-3 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary shrink-0" />
                            <p className="font-semibold text-foreground text-sm truncate">{set.name}</p>
                          </div>
                          {set.description && <p className="text-xs text-muted-foreground mt-0.5">{set.description}</p>}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {setTemplateNames.map((name, i) => (
                              <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">{name}</span>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{(set.items || []).length} {t3(language, 'taken', 'tâches', 'tasks')}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openSetForm(set)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteSet(set.id)} disabled={deleting === set.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            {deleting === set.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EventTemplateDialog;
