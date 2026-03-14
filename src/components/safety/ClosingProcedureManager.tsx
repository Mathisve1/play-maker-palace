import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ClipboardList, Plus, Trash2, Camera, FileText, GripVertical,
  Users, ChevronDown, ChevronRight, Save, Copy, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ClosingTemplate {
  id: string;
  club_id: string;
  name: string;
}

interface ClosingTemplateItem {
  id: string;
  template_id: string;
  description: string;
  requires_photo: boolean;
  requires_note: boolean;
  sort_order: number;
}

interface ClosingTask {
  id: string;
  event_id: string;
  description: string;
  requires_photo: boolean;
  requires_note: boolean;
  assigned_volunteer_id: string | null;
  assigned_team_id: string | null;
  status: string;
  photo_url: string | null;
  note: string | null;
  completed_at: string | null;
  sort_order: number;
}

interface Volunteer {
  id: string;
  full_name: string;
}

interface SafetyTeam {
  id: string;
  name: string;
  leader_id: string;
}

interface Props {
  clubId: string;
  eventId: string;
  isLive: boolean;
  eventClosed: boolean;
}

const ClosingProcedureManager = ({ clubId, eventId, isLive, eventClosed }: Props) => {
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [templates, setTemplates] = useState<ClosingTemplate[]>([]);
  const [templateItems, setTemplateItems] = useState<ClosingTemplateItem[]>([]);
  const [closingTasks, setClosingTasks] = useState<ClosingTask[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [teams, setTeams] = useState<SafetyTeam[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editItems, setEditItems] = useState<Array<{ description: string; requires_photo: boolean; requires_note: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [tRes, ctRes, vRes, teamsRes] = await Promise.all([
        supabase.from('closing_templates').select('*').eq('club_id', clubId).order('created_at'),
        supabase.from('closing_tasks').select('*').eq('event_id', eventId).order('sort_order'),
        supabase.from('task_signups').select('volunteer_id').in('task_id',
          (await supabase.from('tasks').select('id').eq('event_id', eventId)).data?.map(t => t.id) || []
        ),
        supabase.from('safety_teams').select('id, name, leader_id').eq('event_id', eventId),
      ]);

      setTemplates(tRes.data || []);
      setClosingTasks(ctRes.data || []);
      setTeams((teamsRes.data || []) as SafetyTeam[]);

      const volIds = [...new Set((vRes.data || []).map((s: any) => s.volunteer_id))];
      if (volIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', volIds);
        setVolunteers((profiles || []).map(p => ({ id: p.id, full_name: p.full_name || t3('Onbekend', 'Inconnu', 'Unknown') })));
      }

      if (tRes.data?.length) {
        const tIds = tRes.data.map((t: any) => t.id);
        const { data: items } = await supabase.from('closing_template_items').select('*').in('template_id', tIds).order('sort_order');
        setTemplateItems(items || []);
      }

      setLoading(false);
    };
    load();
  }, [clubId, eventId]);

  useEffect(() => {
    const ch = supabase
      .channel(`closing-tasks-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'closing_tasks', filter: `event_id=eq.${eventId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setClosingTasks(prev => [...prev, payload.new as ClosingTask]);
          } else if (payload.eventType === 'UPDATE') {
            setClosingTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as ClosingTask : t));
          } else if (payload.eventType === 'DELETE') {
            setClosingTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId]);

  const handleCreateTemplate = () => {
    setEditTemplateName(t3('Nieuwe Afsluitingstemplate', 'Nouveau modèle de clôture', 'New Closing Template'));
    setEditItems([
      { description: t3('Controleer of alle uitgangen vrij zijn', 'Vérifiez que toutes les sorties sont libres', 'Check all exits are clear'), requires_photo: false, requires_note: false },
      { description: t3('Foto van de staat van het terrein', 'Photo de l\'état du terrain', 'Photo of the grounds condition'), requires_photo: true, requires_note: false },
      { description: t3('Meld eventuele schade', 'Signalez les dégâts éventuels', 'Report any damage'), requires_photo: true, requires_note: true },
    ]);
    setShowTemplateEditor(true);
  };

  const handleSaveTemplate = async () => {
    if (!editTemplateName.trim() || editItems.length === 0) return;

    const { data: tmpl, error } = await supabase.from('closing_templates').insert({
      club_id: clubId, name: editTemplateName.trim(),
    }).select('*').single();
    if (error || !tmpl) { toast.error(error?.message || 'Error'); return; }

    const itemInserts = editItems.map((item, i) => ({
      template_id: tmpl.id, description: item.description, requires_photo: item.requires_photo, requires_note: item.requires_note, sort_order: i,
    }));
    const { data: items } = await supabase.from('closing_template_items').insert(itemInserts).select('*');

    setTemplates(prev => [...prev, tmpl]);
    setTemplateItems(prev => [...prev, ...(items || [])]);
    setShowTemplateEditor(false);
    toast.success(t3('Template opgeslagen!', 'Modèle enregistré!', 'Template saved!'));
  };

  const handleApplyTemplate = async (templateId: string) => {
    const items = templateItems.filter(i => i.template_id === templateId);
    if (items.length === 0) { toast.error(t3('Geen items in deze template', 'Pas d\'éléments dans ce modèle', 'No items in this template')); return; }

    await supabase.from('closing_tasks').delete().eq('event_id', eventId);

    const inserts = items.map((item, i) => ({
      event_id: eventId, club_id: clubId, template_item_id: item.id,
      description: item.description, requires_photo: item.requires_photo, requires_note: item.requires_note, sort_order: i,
    }));
    const { data, error } = await supabase.from('closing_tasks').insert(inserts).select('*');
    if (error) { toast.error(error.message); return; }
    setClosingTasks(data || []);
    toast.success(t3(`${items.length} sluitingstaken aangemaakt`, `${items.length} tâches de clôture créées`, `${items.length} closing tasks created`));
  };

  const handleAssignVolunteer = async (taskId: string, volunteerId: string | null) => {
    const { error } = await supabase.from('closing_tasks').update({
      assigned_volunteer_id: volunteerId || null,
      assigned_team_id: null, // Clear team when assigning individual
    }).eq('id', taskId);
    if (error) toast.error(error.message);
    else {
      setClosingTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_volunteer_id: volunteerId || null, assigned_team_id: null } : t));
    }
  };

  const handleAssignTeam = async (taskId: string, teamId: string | null) => {
    const { error } = await supabase.from('closing_tasks').update({
      assigned_team_id: teamId || null,
      assigned_volunteer_id: null, // Clear individual when assigning team
    }).eq('id', taskId);
    if (error) toast.error(error.message);
    else {
      setClosingTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_team_id: teamId || null, assigned_volunteer_id: null } : t));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await supabase.from('closing_tasks').delete().eq('id', taskId);
    setClosingTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const completedCount = closingTasks.filter(t => t.status === 'completed').length;

  if (loading) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> {t3('Sluitingsprocedure', 'Procédure de clôture', 'Closing Procedure')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {closingTasks.length > 0 && (
              <Badge variant={completedCount === closingTasks.length ? 'default' : 'secondary'} className="text-xs">
                {completedCount}/{closingTasks.length}
              </Badge>
            )}
            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {closingTasks.length === 0 && !showTemplateEditor && (
            <div className="space-y-3">
              {templates.length > 0 && (
                <div className="flex gap-2">
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t3('Kies een template...', 'Choisissez un modèle...', 'Choose a template...')} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({templateItems.filter(i => i.template_id === t.id).length} {t3('taken', 'tâches', 'tasks')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => handleApplyTemplate(selectedTemplateId)} disabled={!selectedTemplateId} className="gap-1.5">
                    <Copy className="w-4 h-4" /> {t3('Toepassen', 'Appliquer', 'Apply')}
                  </Button>
                </div>
              )}
              <Button variant="outline" onClick={handleCreateTemplate} className="w-full gap-1.5">
                <Plus className="w-4 h-4" /> {t3('Nieuwe template aanmaken', 'Créer un nouveau modèle', 'Create new template')}
              </Button>
            </div>
          )}

          {showTemplateEditor && (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
              <Input
                value={editTemplateName}
                onChange={e => setEditTemplateName(e.target.value)}
                placeholder={t3('Template naam', 'Nom du modèle', 'Template name')}
                className="font-semibold"
              />
              <div className="space-y-2">
                {editItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 bg-card rounded-lg p-3 border border-border">
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.description}
                        onChange={e => setEditItems(prev => prev.map((it, j) => j === i ? { ...it, description: e.target.value } : it))}
                        placeholder={t3('Taakomschrijving', 'Description de la tâche', 'Task description')}
                        className="text-sm"
                      />
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={item.requires_photo}
                            onCheckedChange={v => setEditItems(prev => prev.map((it, j) => j === i ? { ...it, requires_photo: !!v } : it))}
                          />
                          <Camera className="w-3 h-3" /> {t3('Foto verplicht', 'Photo obligatoire', 'Photo required')}
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={item.requires_note}
                            onCheckedChange={v => setEditItems(prev => prev.map((it, j) => j === i ? { ...it, requires_note: !!v } : it))}
                          />
                          <FileText className="w-3 h-3" /> {t3('Notitie verplicht', 'Note obligatoire', 'Note required')}
                        </label>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => setEditItems(prev => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditItems(prev => [...prev, { description: '', requires_photo: false, requires_note: false }])} className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> {t3('Item toevoegen', 'Ajouter un élément', 'Add item')}
              </Button>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowTemplateEditor(false)} className="flex-1">{t3('Annuleren', 'Annuler', 'Cancel')}</Button>
                <Button onClick={handleSaveTemplate} className="flex-1 gap-1.5">
                  <Save className="w-4 h-4" /> {t3('Opslaan & Toepassen', 'Enregistrer & Appliquer', 'Save & Apply')}
                </Button>
              </div>
            </div>
          )}

          {closingTasks.length > 0 && (
            <div className="space-y-2">
              {closingTasks.map(task => {
                const assignedVol = volunteers.find(v => v.id === task.assigned_volunteer_id);
                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      task.status === 'completed'
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="mt-0.5">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.requires_photo && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Camera className="w-3 h-3" /> {t3('Foto', 'Photo', 'Photo')}
                          </Badge>
                        )}
                        {task.requires_note && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <FileText className="w-3 h-3" /> {t3('Notitie', 'Note', 'Note')}
                          </Badge>
                        )}
                        {task.status === 'completed' && task.photo_url && (
                          <a href={task.photo_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline">{t3('Foto bekijken', 'Voir la photo', 'View photo')}</a>
                        )}
                        {task.status === 'completed' && task.note && (
                          <span className="text-[10px] text-muted-foreground italic">"{task.note}"</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                        {/* Individual assignment */}
                        <Select
                          value={task.assigned_volunteer_id || '__none'}
                          onValueChange={v => handleAssignVolunteer(task.id, v === '__none' ? null : v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-40">
                            <SelectValue placeholder={t3('Persoon...', 'Personne...', 'Person...')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none">{t3('Niet toegewezen', 'Non assigné', 'Unassigned')}</SelectItem>
                            {volunteers.map(v => (
                              <SelectItem key={v.id} value={v.id}>{v.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Team assignment */}
                        {teams.length > 0 && (
                          <>
                            <span className="text-[10px] text-muted-foreground">{t3('of', 'ou', 'or')}</span>
                            <Select
                              value={task.assigned_team_id || '__none'}
                              onValueChange={v => handleAssignTeam(task.id, v === '__none' ? null : v)}
                            >
                              <SelectTrigger className="h-7 text-xs w-40">
                                <SelectValue placeholder={t3('Team...', 'Équipe...', 'Team...')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none">{t3('Geen team', 'Pas d\'équipe', 'No team')}</SelectItem>
                                {teams.map(tm => (
                                  <SelectItem key={tm.id} value={tm.id}>{tm.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>
                    </div>
                    {task.status !== 'completed' && (
                      <Button variant="ghost" size="icon" className="shrink-0 text-destructive/60 hover:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ClosingProcedureManager;
