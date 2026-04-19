import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Trophy, Calendar, Clock, MapPin, Plus, ArrowRight, Users, Layers } from 'lucide-react';

interface MatchTemplate {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
}

interface MTGroup {
  id: string; match_template_id: string; name: string; color: string; sort_order: number;
  wristband_color: string | null; wristband_label: string | null; materials_note: string | null;
}

interface MTTask {
  id: string; match_template_id: string; group_id: string | null;
  title: string; description: string | null; spots_available: number;
  start_offset_minutes: number; end_offset_minutes: number;
  briefing_offset_minutes: number | null; briefing_location: string | null;
  notes: string | null;
  compensation_type: string;
  expense_amount: number | null; hourly_rate: number | null;
  estimated_hours: number | null; daily_rate: number | null;
  loyalty_points: number | null; loyalty_eligible: boolean;
  contract_template_id?: string | null; required_training_id?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateMatchFromTemplateDialog = ({ open, onClose, onCreated }: Props) => {
  const { clubId } = useClubContext();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t3 = (nl: string, fr: string, en: string) => language === 'fr' ? fr : language === 'en' ? en : nl;

  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<MatchTemplate[]>([]);
  const [groups, setGroups] = useState<MTGroup[]>([]);
  const [tasks, setTasks] = useState<MTTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [matchDate, setMatchDate] = useState('');
  const [kickoffTime, setKickoffTime] = useState('15:00');
  const [matchTitle, setMatchTitle] = useState('');
  const [matchLocation, setMatchLocation] = useState('');
  const [creating, setCreating] = useState(false);

  const todayMin = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open || !clubId) return;
    setStep(1); setSelectedId(null); setMatchDate(''); setKickoffTime('15:00'); setMatchTitle(''); setMatchLocation('');
    loadTemplates();
  }, [open, clubId]);

  async function loadTemplates() {
    if (!clubId) return;
    setLoading(true);
    const [tplRes, grpRes, tskRes] = await Promise.all([
      (supabase as any).from('match_templates').select('*').eq('club_id', clubId).order('created_at', { ascending: false }),
      (supabase as any).from('match_template_groups').select('*').order('sort_order'),
      (supabase as any).from('match_template_tasks').select('*').order('sort_order'),
    ]);
    if (tplRes.error) toast.error(tplRes.error.message);
    setTemplates(tplRes.data || []);
    setGroups(grpRes.data || []);
    setTasks(tskRes.data || []);
    setLoading(false);
  }

  function selectTemplate(tpl: MatchTemplate) {
    setSelectedId(tpl.id);
    setMatchTitle(tpl.name);
    setMatchLocation(tpl.location || '');
    setStep(2);
  }

  async function handleCreate() {
    if (!clubId || !selectedId || !matchDate || !kickoffTime || !matchTitle.trim()) return;
    setCreating(true);
    try {
      // Build the kickoff datetime (interpret as wall-clock time, store as ISO with no shift)
      const [h, m] = kickoffTime.split(':').map(Number);
      const baseDate = new Date(matchDate + 'T00:00:00');
      const kickoffMs = baseDate.getTime() + (h * 60 + m) * 60_000;

      // 1. Create event
      const eventDateISO = new Date(kickoffMs).toISOString();
      const { data: newEv, error: evErr } = await (supabase as any).from('events').insert({
        club_id: clubId,
        title: matchTitle.trim(),
        location: matchLocation.trim() || null,
        event_date: eventDateISO,
        kickoff_time: kickoffTime,
        event_type: 'event',
      }).select('*').maybeSingle();

      if (evErr || !newEv) { toast.error(evErr?.message || 'Failed'); setCreating(false); return; }

      // 2. Create groups, mapping template group ids to new event group ids
      const tplGroups = groups.filter(g => g.match_template_id === selectedId);
      const groupIdMap = new Map<string, string>();
      for (const g of tplGroups) {
        const { data: newGrp } = await (supabase as any).from('event_groups').insert({
          event_id: newEv.id, name: g.name, color: g.color, sort_order: g.sort_order,
          wristband_color: g.wristband_color, wristband_label: g.wristband_label,
          materials_note: g.materials_note,
        }).select('*').maybeSingle();
        if (newGrp) groupIdMap.set(g.id, newGrp.id);
      }

      // 3. Create tasks with computed start/end times based on offsets
      const tplTasks = tasks.filter(t => t.match_template_id === selectedId);
      for (const t of tplTasks) {
        const startMs = kickoffMs - t.start_offset_minutes * 60_000;
        const endMs = kickoffMs - t.end_offset_minutes * 60_000;
        const briefingMs = t.briefing_offset_minutes != null ? kickoffMs - t.briefing_offset_minutes * 60_000 : null;
        const eventGroupId = t.group_id ? groupIdMap.get(t.group_id) || null : null;

        await supabase.from('tasks').insert({
          club_id: clubId,
          title: t.title,
          description: t.description,
          spots_available: t.spots_available,
          event_id: newEv.id,
          event_group_id: eventGroupId,
          task_date: new Date(startMs).toISOString(),
          start_time: new Date(startMs).toISOString(),
          end_time: new Date(endMs).toISOString(),
          briefing_time: briefingMs ? new Date(briefingMs).toISOString() : null,
          briefing_location: t.briefing_location,
          notes: t.notes,
          location: matchLocation.trim() || null,
          compensation_type: t.compensation_type === 'none' ? 'fixed' : t.compensation_type,
          expense_amount: t.expense_amount,
          hourly_rate: t.hourly_rate,
          estimated_hours: t.estimated_hours,
          daily_rate: t.daily_rate,
          loyalty_points: t.loyalty_points,
          loyalty_eligible: t.loyalty_eligible,
          contract_template_id: t.contract_template_id || null,
          required_training_id: t.required_training_id || null,
        } as any);
      }

      toast.success(t3('Wedstrijd aangemaakt vanuit sjabloon!', 'Match créé à partir du modèle!', 'Match created from template!'));
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setCreating(false);
    }
  }

  function formatOffset(minutes: number): string {
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const sign = minutes >= 0 ? t3('voor', 'avant', 'before') : t3('na', 'après', 'after');
    const parts = [];
    if (h > 0) parts.push(`${h}u`);
    if (m > 0) parts.push(`${m}min`);
    if (parts.length === 0) return t3('op aftrap', 'au coup d\'envoi', 'at kickoff');
    return `${parts.join(' ')} ${sign}`;
  }

  const selectedTpl = templates.find(t => t.id === selectedId);
  const selectedGroups = selectedId ? groups.filter(g => g.match_template_id === selectedId).sort((a, b) => a.sort_order - b.sort_order) : [];
  const selectedTasks = selectedId ? tasks.filter(t => t.match_template_id === selectedId) : [];

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto my-auto"
        >
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-lg text-foreground">
                  {t3('Wedstrijd uit sjabloon', 'Match depuis un modèle', 'Match from template')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {step === 1 ? t3('Stap 1: Kies een sjabloon', 'Étape 1: Choisir un modèle', 'Step 1: Pick a template') : t3('Stap 2: Vul de details in', 'Étape 2: Détails du match', 'Step 2: Match details')}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted touch-target">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : step === 1 ? (
              <>
                {templates.length === 0 ? (
                  <div className="text-center py-10">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground">{t3('Nog geen sjablonen', 'Pas encore de modèles', 'No templates yet')}</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                      {t3('Maak eerst een wedstrijdsjabloon aan met groepen en taken (met offsets t.o.v. de aftrap).',
                        'Créez d\'abord un modèle de match avec des groupes et des tâches.',
                        'First create a match template with groups and tasks.')}
                    </p>
                    <button
                      onClick={() => { onClose(); navigate('/match-templates'); }}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium touch-target"
                    >
                      <Plus className="w-4 h-4" /> {t3('Sjabloon aanmaken', 'Créer un modèle', 'Create template')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map(tpl => {
                      const tplGroupsCount = groups.filter(g => g.match_template_id === tpl.id).length;
                      const tplTasksCount = tasks.filter(t => t.match_template_id === tpl.id).length;
                      return (
                        <button
                          key={tpl.id}
                          onClick={() => selectTemplate(tpl)}
                          className="w-full text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground">{tpl.name}</h3>
                              {tpl.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>}
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{tplGroupsCount} {t3('groepen', 'groupes', 'groups')}</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{tplTasksCount} {t3('taken', 'tâches', 'tasks')}</span>
                                {tpl.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{tpl.location}</span>}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
                          </div>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { onClose(); navigate('/match-templates'); }}
                      className="w-full p-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-2 touch-target"
                    >
                      <Plus className="w-4 h-4" /> {t3('Nieuw sjabloon aanmaken', 'Nouveau modèle', 'New template')}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Step 2: details */}
                <div className="bg-muted/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{selectedTpl?.name}</span>
                  <button onClick={() => setStep(1)} className="ml-auto text-xs text-primary hover:underline touch-target">
                    {t3('Wijzigen', 'Modifier', 'Change')}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Titel wedstrijd', 'Titre du match', 'Match title')} *</label>
                    <input
                      value={matchTitle} onChange={e => setMatchTitle(e.target.value)} required
                      placeholder={t3('Bv. FC Harelbeke - KSV Roeselare', 'Ex: Match A - Match B', 'E.g. Team A vs Team B')}
                      className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        <Calendar className="inline w-4 h-4 mr-1" />{t3('Datum', 'Date', 'Date')} *
                      </label>
                      <input
                        type="date" min={todayMin} value={matchDate} onChange={e => setMatchDate(e.target.value)} required
                        className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        <Clock className="inline w-4 h-4 mr-1" />{t3('Aftrapuur', 'Coup d\'envoi', 'Kickoff time')} *
                      </label>
                      <input
                        type="time" value={kickoffTime} onChange={e => setKickoffTime(e.target.value)} required
                        className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      <MapPin className="inline w-4 h-4 mr-1" />{t3('Locatie', 'Lieu', 'Location')}
                    </label>
                    <input
                      value={matchLocation} onChange={e => setMatchLocation(e.target.value)}
                      className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground"
                    />
                  </div>

                  {/* Preview */}
                  {matchDate && kickoffTime && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-3">
                        {t3('Wat wordt aangemaakt?', 'Que sera créé?', 'What will be created?')}
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedGroups.map(g => {
                          const gTasks = selectedTasks.filter(t => t.group_id === g.id).sort((a, b) => b.start_offset_minutes - a.start_offset_minutes);
                          return (
                            <div key={g.id} className="bg-background rounded-lg p-3 text-sm">
                              <div className="flex items-center gap-2 font-medium text-foreground mb-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                                {g.name}
                              </div>
                              {gTasks.map(task => {
                                const [h, m] = kickoffTime.split(':').map(Number);
                                const totalMin = h * 60 + m - task.start_offset_minutes;
                                const startH = Math.floor(((totalMin % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
                                const startM = ((totalMin % 60) + 60) % 60;
                                const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
                                return (
                                  <div key={task.id} className="text-xs text-muted-foreground pl-4 flex items-center justify-between gap-2 py-0.5">
                                    <span className="truncate">• {task.title}</span>
                                    <span className="font-mono text-foreground/80 shrink-0">{startStr} ({formatOffset(task.start_offset_minutes)})</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                        {selectedTasks.filter(t => !t.group_id).length > 0 && (
                          <div className="bg-background rounded-lg p-3 text-sm">
                            <div className="font-medium text-foreground mb-1">{t3('Losse taken', 'Tâches libres', 'Loose tasks')}</div>
                            {selectedTasks.filter(t => !t.group_id).map(task => (
                              <div key={task.id} className="text-xs text-muted-foreground pl-4 py-0.5">• {task.title} ({formatOffset(task.start_offset_minutes)})</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {step === 2 && (
            <div className="p-5 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
              <button onClick={() => setStep(1)} className="px-4 py-3 rounded-lg border border-border hover:bg-muted touch-target">
                {t3('Terug', 'Retour', 'Back')}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !matchDate || !kickoffTime || !matchTitle.trim()}
                className="px-5 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2 font-medium touch-target"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t3('Wedstrijd aanmaken', 'Créer le match', 'Create match')}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateMatchFromTemplateDialog;
