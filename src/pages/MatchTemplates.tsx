import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, Pencil, Save, X, Loader2, Clock, Users, Layers,
  ChevronDown, ChevronUp, ArrowLeft, Trophy, Copy,
} from 'lucide-react';
import ClubPageLayout from '@/components/ClubPageLayout';

const GROUP_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface MatchTemplate {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  location: string | null;
  closing_template_id: string | null;
  certificate_design_id: string | null;
  created_at: string;
}

interface MTGroup {
  id: string;
  match_template_id: string;
  name: string;
  color: string;
  sort_order: number;
  wristband_color: string | null;
  wristband_label: string | null;
  materials_note: string | null;
}

interface MTTask {
  id: string;
  match_template_id: string;
  group_id: string | null;
  title: string;
  description: string | null;
  spots_available: number;
  start_offset_minutes: number;
  end_offset_minutes: number;
  briefing_offset_minutes: number | null;
  briefing_location: string | null;
  notes: string | null;
  compensation_type: string;
  expense_amount: number | null;
  hourly_rate: number | null;
  estimated_hours: number | null;
  daily_rate: number | null;
  loyalty_points: number | null;
  loyalty_eligible: boolean;
  sort_order: number;
}

const MatchTemplates = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { clubId } = useClubContext();
  const t3 = (nl: string, fr: string, en: string) => language === 'fr' ? fr : language === 'en' ? en : nl;
  const nl = language === 'nl';

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MatchTemplate[]>([]);
  const [groups, setGroups] = useState<MTGroup[]>([]);
  const [tasks, setTasks] = useState<MTTask[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create new template
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLoc, setEditLoc] = useState('');

  // Group editing
  const [addingGroupTo, setAddingGroupTo] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  // Task editing
  const [addingTaskTo, setAddingTaskTo] = useState<{ templateId: string; groupId: string | null } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSpots, setNewTaskSpots] = useState(1);
  const [newTaskStartH, setNewTaskStartH] = useState(2); // hours before kickoff
  const [newTaskStartM, setNewTaskStartM] = useState(0);
  const [newTaskEndH, setNewTaskEndH] = useState(2); // hours after kickoff
  const [newTaskEndM, setNewTaskEndM] = useState(0);
  const [newTaskEndDirection, setNewTaskEndDirection] = useState<'before' | 'after'>('after');

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    loadAll();
  }, [clubId]);

  async function loadAll() {
    if (!clubId) return;
    setLoading(true);
    const [tplRes, grpRes, tskRes] = await Promise.all([
      (supabase as any).from('match_templates').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
      (supabase as any).from('match_template_groups').select('*').order('sort_order'),
      (supabase as any).from('match_template_tasks').select('*').order('sort_order'),
    ]);
    if (tplRes.error) toast.error(tplRes.error.message);
    setTemplates(tplRes.data || []);
    setGroups((grpRes.data || []).filter((g: MTGroup) => (tplRes.data || []).some((t: MatchTemplate) => t.id === g.match_template_id)));
    setTasks((tskRes.data || []).filter((t: MTTask) => (tplRes.data || []).some((tpl: MatchTemplate) => tpl.id === t.match_template_id)));
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId || !newName.trim()) return;
    setCreating(true);
    const { data, error } = await (supabase as any).from('match_templates').insert({
      club_id: clubId,
      name: newName.trim(),
      description: newDescription.trim() || null,
      location: newLocation.trim() || null,
    }).select('*').maybeSingle();
    if (error) { toast.error(error.message); setCreating(false); return; }
    setTemplates(prev => [data, ...prev]);
    toast.success(t3('Sjabloon aangemaakt!', 'Modèle créé!', 'Template created!'));
    setShowCreate(false);
    setNewName(''); setNewDescription(''); setNewLocation('');
    setExpanded(data.id);
    setCreating(false);
  }

  async function handleSaveEdit(id: string) {
    const { error } = await (supabase as any).from('match_templates').update({
      name: editName.trim(), description: editDesc.trim() || null, location: editLoc.trim() || null,
    }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, name: editName.trim(), description: editDesc.trim() || null, location: editLoc.trim() || null } : t));
    setEditingTemplate(null);
    toast.success(t3('Opgeslagen', 'Enregistré', 'Saved'));
  }

  async function handleDelete(id: string) {
    const { error } = await (supabase as any).from('match_templates').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setTemplates(prev => prev.filter(t => t.id !== id));
    setGroups(prev => prev.filter(g => g.match_template_id !== id));
    setTasks(prev => prev.filter(t => t.match_template_id !== id));
    setConfirmDelete(null);
    toast.success(t3('Verwijderd', 'Supprimé', 'Deleted'));
  }

  async function handleAddGroup(templateId: string) {
    if (!newGroupName.trim()) return;
    const tplGroups = groups.filter(g => g.match_template_id === templateId);
    const { data, error } = await (supabase as any).from('match_template_groups').insert({
      match_template_id: templateId,
      name: newGroupName.trim(),
      color: GROUP_COLORS[tplGroups.length % GROUP_COLORS.length],
      sort_order: tplGroups.length,
    }).select('*').maybeSingle();
    if (error) { toast.error(error.message); return; }
    setGroups(prev => [...prev, data]);
    setAddingGroupTo(null); setNewGroupName('');
    toast.success(t3('Groep toegevoegd', 'Groupe ajouté', 'Group added'));
  }

  async function handleDeleteGroup(groupId: string) {
    const { error } = await (supabase as any).from('match_template_groups').delete().eq('id', groupId);
    if (error) { toast.error(error.message); return; }
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setTasks(prev => prev.filter(t => t.group_id !== groupId));
  }

  async function handleAddTask() {
    if (!addingTaskTo || !newTaskTitle.trim()) return;
    const startOffset = newTaskStartH * 60 + newTaskStartM; // positive = before
    const endRaw = newTaskEndH * 60 + newTaskEndM;
    const endOffset = newTaskEndDirection === 'after' ? -endRaw : endRaw;
    const tplTasks = tasks.filter(t => t.match_template_id === addingTaskTo.templateId && t.group_id === addingTaskTo.groupId);
    const { data, error } = await (supabase as any).from('match_template_tasks').insert({
      match_template_id: addingTaskTo.templateId,
      group_id: addingTaskTo.groupId,
      title: newTaskTitle.trim(),
      spots_available: newTaskSpots,
      start_offset_minutes: startOffset,
      end_offset_minutes: endOffset,
      sort_order: tplTasks.length,
    }).select('*').maybeSingle();
    if (error) { toast.error(error.message); return; }
    setTasks(prev => [...prev, data]);
    setAddingTaskTo(null);
    setNewTaskTitle(''); setNewTaskSpots(1); setNewTaskStartH(2); setNewTaskStartM(0); setNewTaskEndH(2); setNewTaskEndM(0); setNewTaskEndDirection('after');
    toast.success(t3('Taak toegevoegd', 'Tâche ajoutée', 'Task added'));
  }

  async function handleDeleteTask(taskId: string) {
    const { error } = await (supabase as any).from('match_template_tasks').delete().eq('id', taskId);
    if (error) { toast.error(error.message); return; }
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  function formatOffset(minutes: number): string {
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const sign = minutes >= 0 ? t3('voor aftrap', 'avant le coup d\'envoi', 'before kickoff') : t3('na aftrap', 'après le coup d\'envoi', 'after kickoff');
    const parts = [];
    if (h > 0) parts.push(`${h}u`);
    if (m > 0) parts.push(`${m}min`);
    if (parts.length === 0) parts.push(t3('aftrap', 'coup d\'envoi', 'kickoff'));
    return `${parts.join(' ')} ${minutes !== 0 ? sign : ''}`.trim();
  }

  if (loading) {
    return (
      <ClubPageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ClubPageLayout>
    );
  }

  return (
    <ClubPageLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/events-manager')} className="p-2 rounded-lg hover:bg-muted transition-colors touch-target">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-7 h-7 text-primary" />
              {t3('Wedstrijdsjablonen', 'Modèles de match', 'Match Templates')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t3(
                'Maak een sjabloon voor wedstrijden zodat je niet steeds alle taken opnieuw moet aanmaken. Geef per taak aan hoeveel tijd voor of na de aftrap deze begint en eindigt.',
                'Créez un modèle pour les matchs afin de ne pas devoir recréer toutes les tâches. Indiquez pour chaque tâche le décalage par rapport au coup d\'envoi.',
                'Create a template for matches so you don\'t have to recreate all tasks. Set offsets per task relative to kickoff time.'
              )}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-card touch-target"
          >
            <Plus className="w-5 h-5" /> {t3('Nieuw sjabloon', 'Nouveau modèle', 'New template')}
          </button>
        </div>

        {/* Empty state */}
        {templates.length === 0 && !showCreate && (
          <div className="mt-12 text-center bg-card border border-dashed border-border rounded-2xl p-10">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg text-foreground">
              {t3('Nog geen sjablonen', 'Pas encore de modèles', 'No templates yet')}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {t3(
                'Sjablonen besparen je veel tijd. Bv. "Thuiswedstrijd 1ste elftal" met groepen Stewards (4u voor aftrap), Bar (3u voor aftrap), Ticketing (2u voor aftrap).',
                'Les modèles vous font gagner du temps. Ex: "Match à domicile" avec groupes Stewards, Bar, Billetterie.',
                'Templates save lots of time. E.g. "Home Match 1st team" with groups Stewards, Bar, Ticketing.'
              )}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium touch-target"
            >
              <Plus className="w-5 h-5" /> {t3('Maak je eerste sjabloon', 'Créer votre premier modèle', 'Create your first template')}
            </button>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreate}
            className="mt-4 bg-card border border-primary/20 rounded-2xl p-5 space-y-3 shadow-card"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg">{t3('Nieuw wedstrijdsjabloon', 'Nouveau modèle de match', 'New match template')}</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t3('Naam', 'Nom', 'Name')} *</label>
              <input
                value={newName} onChange={e => setNewName(e.target.value)} required autoFocus
                placeholder={t3('Bv. Thuiswedstrijd 1ste elftal', 'Ex: Match à domicile', 'E.g. Home Match 1st team')}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t3('Beschrijving', 'Description', 'Description')}</label>
              <textarea
                value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={2}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t3('Standaard locatie', 'Lieu par défaut', 'Default location')}</label>
              <input
                value={newLocation} onChange={e => setNewLocation(e.target.value)}
                placeholder={t3('Bv. Sportpark De Mol', 'Ex: Stade Communal', 'E.g. Sports Park')}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-lg border border-border hover:bg-muted touch-target">
                {t3('Annuleren', 'Annuler', 'Cancel')}
              </button>
              <button type="submit" disabled={creating || !newName.trim()} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2 touch-target">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t3('Aanmaken', 'Créer', 'Create')}
              </button>
            </div>
          </motion.form>
        )}

        {/* Templates list */}
        <div className="mt-6 space-y-4">
          {templates.map((tpl, ti) => {
            const tplGroups = groups.filter(g => g.match_template_id === tpl.id).sort((a, b) => a.sort_order - b.sort_order);
            const tplTasks = tasks.filter(t => t.match_template_id === tpl.id);
            const ungroupedTasks = tplTasks.filter(t => !t.group_id);
            const isExpanded = expanded === tpl.id;
            const isEditing = editingTemplate === tpl.id;

            return (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ti * 0.05 }}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-card"
              >
                {/* Header */}
                <div className="p-5 flex items-start justify-between gap-3">
                  <button onClick={() => setExpanded(isExpanded ? null : tpl.id)} className="flex-1 text-left">
                    {isEditing ? (
                      <div className="space-y-2" onClick={e => e.stopPropagation()}>
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
                        <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder={t3('Beschrijving', 'Description', 'Description')} className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
                        <input value={editLoc} onChange={e => setEditLoc(e.target.value)} placeholder={t3('Locatie', 'Lieu', 'Location')} className="w-full h-10 px-3 rounded-lg border border-input bg-background" />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-heading font-semibold text-lg text-foreground">{tpl.name}</h3>
                        {tpl.description && <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" />{tplGroups.length} {nl ? 'groepen' : 'groups'}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{tplTasks.length} {nl ? 'taken' : 'tasks'}</span>
                          {tpl.location && <span>{tpl.location}</span>}
                        </div>
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSaveEdit(tpl.id)} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 touch-target" title="Save">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingTemplate(null)} className="p-2 rounded-lg hover:bg-muted touch-target">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingTemplate(tpl.id); setEditName(tpl.name); setEditDesc(tpl.description || ''); setEditLoc(tpl.location || ''); }}
                          className="p-2 rounded-lg hover:bg-muted touch-target" title="Edit"
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => setConfirmDelete(tpl.id)} className="p-2 rounded-lg hover:bg-destructive/10 touch-target" title="Delete">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                        <button onClick={() => setExpanded(isExpanded ? null : tpl.id)} className="p-2 rounded-lg hover:bg-muted touch-target">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-5 space-y-4">
                    {/* Groups */}
                    {tplGroups.map(group => {
                      const groupTasks = tplTasks.filter(t => t.group_id === group.id).sort((a, b) => b.start_offset_minutes - a.start_offset_minutes);
                      return (
                        <div key={group.id} className="bg-background rounded-xl p-4 border border-border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                              <h4 className="font-semibold text-foreground">{group.name}</h4>
                              <span className="text-xs text-muted-foreground">({groupTasks.length} {nl ? 'taken' : 'tasks'})</span>
                            </div>
                            <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 rounded hover:bg-destructive/10">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>

                          {/* Tasks in group */}
                          <div className="space-y-2">
                            {groupTasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-foreground">{task.title}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{t3('Start', 'Début', 'Start')}: {formatOffset(task.start_offset_minutes)}</span>
                                    <span className="inline-flex items-center gap-1">{t3('Eind', 'Fin', 'End')}: {formatOffset(task.end_offset_minutes)}</span>
                                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{task.spots_available}</span>
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 rounded hover:bg-destructive/10 shrink-0">
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add task to group */}
                          {addingTaskTo?.templateId === tpl.id && addingTaskTo?.groupId === group.id ? (
                            <TaskAddForm
                              t3={t3}
                              newTaskTitle={newTaskTitle} setNewTaskTitle={setNewTaskTitle}
                              newTaskSpots={newTaskSpots} setNewTaskSpots={setNewTaskSpots}
                              newTaskStartH={newTaskStartH} setNewTaskStartH={setNewTaskStartH}
                              newTaskStartM={newTaskStartM} setNewTaskStartM={setNewTaskStartM}
                              newTaskEndH={newTaskEndH} setNewTaskEndH={setNewTaskEndH}
                              newTaskEndM={newTaskEndM} setNewTaskEndM={setNewTaskEndM}
                              newTaskEndDirection={newTaskEndDirection} setNewTaskEndDirection={setNewTaskEndDirection}
                              onCancel={() => setAddingTaskTo(null)} onAdd={handleAddTask}
                            />
                          ) : (
                            <button
                              onClick={() => setAddingTaskTo({ templateId: tpl.id, groupId: group.id })}
                              className="mt-3 w-full text-sm font-medium text-primary hover:bg-primary/10 py-2 rounded-lg flex items-center justify-center gap-1 touch-target"
                            >
                              <Plus className="w-4 h-4" /> {t3('Taak toevoegen aan deze groep', 'Ajouter une tâche', 'Add task to group')}
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Ungrouped tasks */}
                    {ungroupedTasks.length > 0 && (
                      <div className="bg-background rounded-xl p-4 border border-border">
                        <h4 className="font-semibold text-foreground mb-3 text-sm">{t3('Losse taken (geen groep)', 'Tâches sans groupe', 'Ungrouped tasks')}</h4>
                        <div className="space-y-2">
                          {ungroupedTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{task.title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {t3('Start', 'Début', 'Start')}: {formatOffset(task.start_offset_minutes)} · {t3('Eind', 'Fin', 'End')}: {formatOffset(task.end_offset_minutes)}
                                </div>
                              </div>
                              <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 rounded hover:bg-destructive/10">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add group */}
                    {addingGroupTo === tpl.id ? (
                      <div className="bg-background rounded-xl p-4 border border-primary/30 flex gap-2">
                        <input
                          autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                          placeholder={t3('Bv. Stewards, Bar, Ticketing', 'Ex: Stewards', 'E.g. Stewards')}
                          className="flex-1 h-11 px-3 rounded-lg border border-input bg-background"
                          onKeyDown={e => e.key === 'Enter' && handleAddGroup(tpl.id)}
                        />
                        <button onClick={() => handleAddGroup(tpl.id)} className="px-4 rounded-lg bg-primary text-primary-foreground touch-target">
                          {t3('Toevoegen', 'Ajouter', 'Add')}
                        </button>
                        <button onClick={() => { setAddingGroupTo(null); setNewGroupName(''); }} className="px-3 rounded-lg hover:bg-muted">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingGroupTo(tpl.id)}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 font-medium touch-target"
                      >
                        <Plus className="w-4 h-4" /> {t3('Groep toevoegen', 'Ajouter un groupe', 'Add group')}
                      </button>
                    )}

                    {/* Add ungrouped task */}
                    {addingTaskTo?.templateId === tpl.id && addingTaskTo?.groupId === null ? (
                      <div className="bg-background rounded-xl p-4 border border-primary/30">
                        <TaskAddForm
                          t3={t3}
                          newTaskTitle={newTaskTitle} setNewTaskTitle={setNewTaskTitle}
                          newTaskSpots={newTaskSpots} setNewTaskSpots={setNewTaskSpots}
                          newTaskStartH={newTaskStartH} setNewTaskStartH={setNewTaskStartH}
                          newTaskStartM={newTaskStartM} setNewTaskStartM={setNewTaskStartM}
                          newTaskEndH={newTaskEndH} setNewTaskEndH={setNewTaskEndH}
                          newTaskEndM={newTaskEndM} setNewTaskEndM={setNewTaskEndM}
                          newTaskEndDirection={newTaskEndDirection} setNewTaskEndDirection={setNewTaskEndDirection}
                          onCancel={() => setAddingTaskTo(null)} onAdd={handleAddTask}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingTaskTo({ templateId: tpl.id, groupId: null })}
                        className="w-full py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm touch-target"
                      >
                        <Plus className="w-4 h-4" /> {t3('Losse taak (geen groep)', 'Tâche sans groupe', 'Ungrouped task')}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-card rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="font-heading font-semibold text-lg mb-2">{t3('Sjabloon verwijderen?', 'Supprimer le modèle?', 'Delete template?')}</h3>
              <p className="text-sm text-muted-foreground mb-5">
                {t3('Dit verwijdert het sjabloon en alle bijbehorende groepen en taken. Bestaande wedstrijden worden NIET aangepast.',
                  'Cela supprime le modèle et tous ses groupes et tâches. Les matchs existants ne sont PAS affectés.',
                  'This deletes the template and all its groups and tasks. Existing matches are NOT affected.')}
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 rounded-lg border border-border hover:bg-muted touch-target">
                  {t3('Annuleren', 'Annuler', 'Cancel')}
                </button>
                <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-target">
                  {t3('Verwijderen', 'Supprimer', 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClubPageLayout>
  );
};

interface TaskAddFormProps {
  t3: (nl: string, fr: string, en: string) => string;
  newTaskTitle: string; setNewTaskTitle: (v: string) => void;
  newTaskSpots: number; setNewTaskSpots: (v: number) => void;
  newTaskStartH: number; setNewTaskStartH: (v: number) => void;
  newTaskStartM: number; setNewTaskStartM: (v: number) => void;
  newTaskEndH: number; setNewTaskEndH: (v: number) => void;
  newTaskEndM: number; setNewTaskEndM: (v: number) => void;
  newTaskEndDirection: 'before' | 'after'; setNewTaskEndDirection: (v: 'before' | 'after') => void;
  onCancel: () => void; onAdd: () => void;
}

function TaskAddForm({ t3, newTaskTitle, setNewTaskTitle, newTaskSpots, setNewTaskSpots, newTaskStartH, setNewTaskStartH, newTaskStartM, setNewTaskStartM, newTaskEndH, setNewTaskEndH, newTaskEndM, setNewTaskEndM, newTaskEndDirection, setNewTaskEndDirection, onCancel, onAdd }: TaskAddFormProps) {
  return (
    <div className="space-y-3 mt-3">
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">{t3('Taaknaam', 'Nom de la tâche', 'Task name')} *</label>
        <input
          autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
          placeholder={t3('Bv. Bar opzetten', 'Ex: Installer le bar', 'E.g. Setup bar')}
          className="w-full h-11 px-3 rounded-lg border border-input bg-background"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">{t3('Plekken', 'Places', 'Spots')}</label>
          <input
            type="number" min={1} value={newTaskSpots} onChange={e => setNewTaskSpots(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full h-11 px-3 rounded-lg border border-input bg-background"
          />
        </div>
      </div>
      <div className="bg-muted/40 rounded-lg p-3 space-y-3">
        <div className="text-xs font-semibold text-foreground">{t3('Start (voor aftrap)', 'Début (avant le coup d\'envoi)', 'Start (before kickoff)')}</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t3('Uur', 'Heures', 'Hours')}</label>
            <input type="number" min={0} max={12} value={newTaskStartH} onChange={e => setNewTaskStartH(Math.max(0, parseInt(e.target.value) || 0))} className="w-full h-10 px-2 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t3('Minuten', 'Minutes', 'Minutes')}</label>
            <input type="number" min={0} max={59} step={5} value={newTaskStartM} onChange={e => setNewTaskStartM(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} className="w-full h-10 px-2 rounded-lg border border-input bg-background" />
          </div>
        </div>
      </div>
      <div className="bg-muted/40 rounded-lg p-3 space-y-3">
        <div className="text-xs font-semibold text-foreground">{t3('Eind', 'Fin', 'End')}</div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setNewTaskEndDirection('before')} className={`flex-1 py-2 rounded-lg text-xs font-medium ${newTaskEndDirection === 'before' ? 'bg-primary text-primary-foreground' : 'bg-background border border-input text-foreground'}`}>
            {t3('Voor aftrap', 'Avant', 'Before')}
          </button>
          <button type="button" onClick={() => setNewTaskEndDirection('after')} className={`flex-1 py-2 rounded-lg text-xs font-medium ${newTaskEndDirection === 'after' ? 'bg-primary text-primary-foreground' : 'bg-background border border-input text-foreground'}`}>
            {t3('Na aftrap', 'Après', 'After')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t3('Uur', 'Heures', 'Hours')}</label>
            <input type="number" min={0} max={12} value={newTaskEndH} onChange={e => setNewTaskEndH(Math.max(0, parseInt(e.target.value) || 0))} className="w-full h-10 px-2 rounded-lg border border-input bg-background" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t3('Minuten', 'Minutes', 'Minutes')}</label>
            <input type="number" min={0} max={59} step={5} value={newTaskEndM} onChange={e => setNewTaskEndM(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} className="w-full h-10 px-2 rounded-lg border border-input bg-background" />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm touch-target">
          {t3('Annuleren', 'Annuler', 'Cancel')}
        </button>
        <button onClick={onAdd} disabled={!newTaskTitle.trim()} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm inline-flex items-center gap-1 touch-target">
          <Plus className="w-4 h-4" /> {t3('Toevoegen', 'Ajouter', 'Add')}
        </button>
      </div>
    </div>
  );
}

export default MatchTemplates;
