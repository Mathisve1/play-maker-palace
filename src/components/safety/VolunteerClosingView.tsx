import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, Camera, FileText, CheckCircle2, RefreshCw, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

interface ClosingTask {
  id: string;
  description: string;
  requires_photo: boolean;
  requires_note: boolean;
  status: string;
  photo_url: string | null;
  note: string | null;
  sort_order: number;
}

interface Props {
  eventId: string;
  userId: string;
  eventTitle: string;
}

const VolunteerClosingView = ({ eventId, userId, eventTitle }: Props) => {
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [tasks, setTasks] = useState<ClosingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskNote, setTaskNote] = useState('');
  const [taskPhoto, setTaskPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Get tasks directly assigned to user
      const { data: directTasks } = await supabase
        .from('closing_tasks')
        .select('id, description, requires_photo, requires_note, status, photo_url, note, sort_order, assigned_volunteer_id, assigned_team_id')
        .eq('event_id', eventId)
        .eq('assigned_volunteer_id', userId)
        .order('sort_order');

      // Get tasks assigned to user's teams
      const { data: userTeams } = await supabase
        .from('safety_team_members')
        .select('team_id')
        .eq('volunteer_id', userId);
      
      const { data: leaderTeams } = await supabase
        .from('safety_teams')
        .select('id')
        .eq('leader_id', userId)
        .eq('event_id', eventId);

      const allTeamIds = new Set([
        ...(userTeams || []).map((t: any) => t.team_id),
        ...(leaderTeams || []).map((t: any) => t.id),
      ]);

      let teamTasks: ClosingTask[] = [];
      if (allTeamIds.size > 0) {
        const { data } = await supabase
          .from('closing_tasks')
          .select('id, description, requires_photo, requires_note, status, photo_url, note, sort_order, assigned_volunteer_id, assigned_team_id')
          .eq('event_id', eventId)
          .in('assigned_team_id', Array.from(allTeamIds))
          .order('sort_order');
        teamTasks = (data || []) as ClosingTask[];
      }

      // Also get unassigned tasks (no volunteer AND no team) — visible to everyone
      const { data: unassignedTasks } = await supabase
        .from('closing_tasks')
        .select('id, description, requires_photo, requires_note, status, photo_url, note, sort_order, assigned_volunteer_id, assigned_team_id')
        .eq('event_id', eventId)
        .is('assigned_volunteer_id', null)
        .is('assigned_team_id', null)
        .order('sort_order');

      // Merge and deduplicate
      const allTasks = [...(directTasks || []), ...teamTasks, ...(unassignedTasks || [])];
      const uniqueTasks = Array.from(new Map(allTasks.map(t => [t.id, t])).values());
      uniqueTasks.sort((a, b) => a.sort_order - b.sort_order);

      setTasks(uniqueTasks);
      setLoading(false);
    };
    load();
  }, [eventId, userId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`vol-closing-${eventId}-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'closing_tasks', filter: `event_id=eq.${eventId}` },
        (payload: any) => {
          const task = payload.new as ClosingTask & { assigned_volunteer_id: string; assigned_team_id: string };
          if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === task.id ? task : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
          // For INSERTs, we don't auto-add since we can't reliably check team membership client-side
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId, userId]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTaskPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Validate
    if (task.requires_photo && !taskPhoto && !task.photo_url) {
      toast.error(t3('Een foto is verplicht voor deze taak', 'Une photo est obligatoire pour cette tâche', 'A photo is required for this task'));
      return;
    }
    if (task.requires_note && !taskNote.trim() && !task.note) {
      toast.error(t3('Een notitie is verplicht voor deze taak', 'Une note est obligatoire pour cette tâche', 'A note is required for this task'));
      return;
    }

    setSubmitting(true);

    let photo_url = task.photo_url;
    if (taskPhoto) {
      const ext = taskPhoto.name.split('.').pop();
      const path = `closing/${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('incident-photos').upload(path, taskPhoto);
      if (uploadErr) {
        toast.error(t3('Foto upload mislukt', 'Échec du téléchargement de la photo', 'Photo upload failed'));
        setSubmitting(false);
        return;
      }
      photo_url = supabase.storage.from('incident-photos').getPublicUrl(path).data.publicUrl;
    }

    const updates: any = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: userId,
    };
    if (photo_url) updates.photo_url = photo_url;
    if (taskNote.trim()) updates.note = taskNote.trim();

    const { error } = await supabase.from('closing_tasks').update(updates).eq('id', taskId);
    if (error) {
      toast.error(error.message);
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      toast.success(t3('Taak afgerond! ✓', 'Tâche terminée! ✓', 'Task completed! ✓'));
    }

    setActiveTaskId(null);
    setTaskNote('');
    setTaskPhoto(null);
    setPhotoPreview(null);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) return null;

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pct = Math.round((completedCount / tasks.length) * 100);
  const allDone = completedCount === tasks.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-heading font-bold text-foreground">{t3('Sluitingstaken', 'Tâches de clôture', 'Closing Tasks')}</h2>
        <Badge variant={allDone ? 'default' : 'secondary'} className="ml-auto text-xs">
          {completedCount}/{tasks.length}
        </Badge>
      </div>

      <Progress value={pct} className="h-2.5" />

      <div className="space-y-3">
        {tasks.map((task, i) => {
          const isActive = activeTaskId === task.id;
          const isDone = task.status === 'completed';

          return (
            <motion.div
              key={task.id}
              layout
              className={`rounded-xl border p-4 transition-all ${
                isDone
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : isActive
                  ? 'bg-primary/5 border-primary/30 shadow-md'
                  : 'bg-card border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.requires_photo && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Camera className="w-3 h-3" /> {t3('Foto', 'Photo', 'Photo')} {isDone && task.photo_url ? '✓' : t3('verplicht', 'obligatoire', 'required')}
                      </Badge>
                    )}
                    {task.requires_note && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <FileText className="w-3 h-3" /> {t3('Notitie', 'Note', 'Note')} {isDone && task.note ? '✓' : t3('verplicht', 'obligatoire', 'required')}
                      </Badge>
                    )}
                  </div>

                  {/* Completed details */}
                  {isDone && task.photo_url && (
                    <img src={task.photo_url} alt={t3('Foto', 'Photo', 'Photo')} className="w-full h-28 object-cover rounded-lg mt-2 border border-border" />
                  )}
                  {isDone && task.note && (
                    <p className="text-xs text-muted-foreground italic mt-1">"{task.note}"</p>
                  )}

                  {/* Action button */}
                  {!isDone && !isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 gap-1.5 text-xs"
                      onClick={() => setActiveTaskId(task.id)}
                    >
                      <Upload className="w-3 h-3" /> {t3('Uitvoeren', 'Exécuter', 'Execute')}
                    </Button>
                  )}

                  {/* Active: input form */}
                  {isActive && !isDone && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 space-y-3"
                    >
                      {task.requires_photo && (
                        <div>
                          {photoPreview ? (
                            <div className="relative">
                              <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-border" />
                              <Button variant="destructive" size="icon" className="absolute top-1 right-1 w-6 h-6" onClick={() => { setTaskPhoto(null); setPhotoPreview(null); }}>×</Button>
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors">
                              <Camera className="w-5 h-5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{t3('Maak een foto', 'Prendre une photo', 'Take a photo')}</span>
                              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                            </label>
                          )}
                        </div>
                      )}
                      {task.requires_note && (
                        <Textarea
                          value={taskNote}
                          onChange={e => setTaskNote(e.target.value)}
                          placeholder={t3('Beschrijf de situatie...', 'Décrivez la situation...', 'Describe the situation...')}
                          className="text-sm min-h-[60px]"
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => { setActiveTaskId(null); setTaskNote(''); setTaskPhoto(null); setPhotoPreview(null); }}
                        >
                          {t3('Annuleer', 'Annuler', 'Cancel')}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5"
                          disabled={submitting}
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          {submitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          {t3('Afronden', 'Terminer', 'Complete')}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center"
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">{t3('Alle sluitingstaken afgerond!', 'Toutes les tâches de clôture terminées!', 'All closing tasks completed!')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t3(`Bedankt voor je hulp bij het afsluiten van ${eventTitle}.`, `Merci pour votre aide à la clôture de ${eventTitle}.`, `Thank you for your help closing ${eventTitle}.`)}</p>
        </motion.div>
      )}
    </div>
  );
};

export default VolunteerClosingView;
