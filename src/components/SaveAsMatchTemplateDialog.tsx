import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Save, Trophy, AlertCircle, Clock } from 'lucide-react';

interface EventTaskInput {
  id: string;
  title: string;
  spots_available: number;
  event_group_id: string | null;
  start_time: string | null;
  end_time: string | null;
  briefing_time?: string | null;
  briefing_location?: string | null;
  description?: string | null;
  notes?: string | null;
  compensation_type?: string;
  expense_amount?: number | null;
  hourly_rate?: number | null;
  estimated_hours?: number | null;
  daily_rate?: number | null;
  loyalty_points?: number | null;
  loyalty_eligible?: boolean;
}

interface EventGroupInput {
  id: string; name: string; color: string; sort_order: number;
  wristband_color: string | null; wristband_label: string | null; materials_note: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  eventLocation: string | null;
  eventKickoffTime: string | null;
  groups: EventGroupInput[];
  tasks: EventTaskInput[];
}

const SaveAsMatchTemplateDialog = ({ open, onClose, eventId, eventTitle, eventDate, eventLocation, eventKickoffTime, groups, tasks }: Props) => {
  const { clubId } = useClubContext();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t3 = (nl: string, fr: string, en: string) => language === 'fr' ? fr : language === 'en' ? en : nl;

  const [name, setName] = useState(eventTitle);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(eventLocation || '');
  const [saving, setSaving] = useState(false);

  // Determine kickoff datetime in ms — needed to compute offsets
  const kickoffMs = (() => {
    if (!eventDate) return null;
    if (eventKickoffTime) {
      const [h, m] = eventKickoffTime.split(':').map(Number);
      const d = new Date(eventDate);
      d.setHours(h, m, 0, 0);
      return d.getTime();
    }
    return new Date(eventDate).getTime();
  })();

  const canSave = !!kickoffMs && tasks.length > 0;

  function offsetMinutes(timeStr: string | null): number | null {
    if (!timeStr || !kickoffMs) return null;
    const taskMs = new Date(timeStr).getTime();
    return Math.round((kickoffMs - taskMs) / 60_000);
  }

  function formatOffset(minutes: number | null): string {
    if (minutes == null) return '—';
    const abs = Math.abs(minutes);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const sign = minutes >= 0 ? t3('voor aftrap', 'avant', 'before') : t3('na aftrap', 'après', 'after');
    const parts = [];
    if (h > 0) parts.push(`${h}u`);
    if (m > 0) parts.push(`${m}min`);
    if (parts.length === 0) return t3('op aftrap', 'au coup d\'envoi', 'at kickoff');
    return `${parts.join(' ')} ${sign}`;
  }

  async function handleSave() {
    if (!clubId || !name.trim() || !canSave) return;
    setSaving(true);
    try {
      // 1. Create match template
      const { data: tpl, error: tplErr } = await (supabase as any).from('match_templates').insert({
        club_id: clubId, name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
      }).select('*').maybeSingle();
      if (tplErr || !tpl) { toast.error(tplErr?.message || 'Failed'); setSaving(false); return; }

      // 2. Create groups, build id map
      const groupIdMap = new Map<string, string>();
      for (const g of groups.sort((a, b) => a.sort_order - b.sort_order)) {
        const { data: newG } = await (supabase as any).from('match_template_groups').insert({
          match_template_id: tpl.id, name: g.name, color: g.color, sort_order: g.sort_order,
          wristband_color: g.wristband_color, wristband_label: g.wristband_label,
          materials_note: g.materials_note,
        }).select('*').maybeSingle();
        if (newG) groupIdMap.set(g.id, newG.id);
      }

      // 3. Create tasks with offsets
      let sortIdx = 0;
      for (const t of tasks) {
        const startOffset = offsetMinutes(t.start_time) ?? 60;
        const endOffset = offsetMinutes(t.end_time) ?? -120;
        const briefingOffset = offsetMinutes(t.briefing_time || null);
        const tplGroupId = t.event_group_id ? groupIdMap.get(t.event_group_id) || null : null;

        await (supabase as any).from('match_template_tasks').insert({
          match_template_id: tpl.id,
          group_id: tplGroupId,
          title: t.title,
          description: t.description || null,
          spots_available: t.spots_available,
          start_offset_minutes: startOffset,
          end_offset_minutes: endOffset,
          briefing_offset_minutes: briefingOffset,
          briefing_location: t.briefing_location || null,
          notes: t.notes || null,
          compensation_type: t.compensation_type || 'none',
          expense_amount: t.expense_amount || null,
          hourly_rate: t.hourly_rate || null,
          estimated_hours: t.estimated_hours || null,
          daily_rate: t.daily_rate || null,
          loyalty_points: t.loyalty_points || null,
          loyalty_eligible: t.loyalty_eligible !== false,
          sort_order: sortIdx++,
        });
      }

      toast.success(t3('Sjabloon opgeslagen!', 'Modèle enregistré!', 'Template saved!'));
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-xl max-h-[90vh] overflow-y-auto my-auto"
        >
          <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-heading font-semibold text-lg text-foreground">
                {t3('Opslaan als wedstrijdsjabloon', 'Enregistrer comme modèle', 'Save as match template')}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted touch-target">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {!canSave && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  {!eventDate
                    ? t3('Dit event heeft geen datum. Voeg eerst een datum toe.', 'Cet événement n\'a pas de date.', 'This event has no date.')
                    : tasks.length === 0
                      ? t3('Dit event heeft nog geen taken om mee te nemen in het sjabloon.', 'Cet événement n\'a pas de tâches.', 'This event has no tasks.')
                      : t3('Het sjabloon kan niet worden aangemaakt.', 'Le modèle ne peut pas être créé.', 'Template cannot be created.')}
                </div>
              </div>
            )}

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span className="text-foreground">
                {t3('Tijden worden omgezet naar offsets t.o.v. de aftrap zodat het sjabloon op elke wedstrijd toepasbaar is.',
                  'Les heures sont converties en décalages par rapport au coup d\'envoi.',
                  'Times will be converted to offsets relative to kickoff so this template works for any future match.')}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Naam sjabloon', 'Nom du modèle', 'Template name')} *</label>
              <input
                value={name} onChange={e => setName(e.target.value)} autoFocus
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Beschrijving', 'Description', 'Description')}</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder={t3('Bv. Standaard thuiswedstrijd met 4 stewardgroepen', 'Ex: Match à domicile standard', 'E.g. Standard home match')}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Standaard locatie', 'Lieu par défaut', 'Default location')}</label>
              <input
                value={location} onChange={e => setLocation(e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground"
              />
            </div>

            {/* Preview offsets */}
            {canSave && (
              <div className="bg-muted/30 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {t3('Voorvertoning offsets', 'Aperçu des décalages', 'Offset preview')}
                </h4>
                <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-2 py-1 border-b border-border/50 last:border-0">
                      <span className="truncate text-foreground">{t.title}</span>
                      <span className="font-mono text-muted-foreground shrink-0">
                        {formatOffset(offsetMinutes(t.start_time))} → {formatOffset(offsetMinutes(t.end_time))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-border flex justify-between gap-2 sticky bottom-0 bg-card">
            <button
              onClick={() => { onClose(); navigate('/match-templates'); }}
              className="px-4 py-3 rounded-lg text-sm hover:bg-muted text-muted-foreground touch-target"
            >
              {t3('Alle sjablonen', 'Tous les modèles', 'All templates')}
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-3 rounded-lg border border-border hover:bg-muted touch-target">
                {t3('Annuleren', 'Annuler', 'Cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !canSave || !name.trim()}
                className="px-5 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2 font-medium touch-target"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t3('Opslaan', 'Enregistrer', 'Save')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SaveAsMatchTemplateDialog;
