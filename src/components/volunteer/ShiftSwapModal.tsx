import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, AlertTriangle, Stethoscope, Users, Briefcase,
  Car, CalendarX, HelpCircle, ArrowRight, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Reason = 'ziekte' | 'familie' | 'werk_studie' | 'vervoer' | 'agenda' | 'anders';

interface ReasonOption {
  id: Reason;
  icon: React.ComponentType<{ className?: string }>;
  nl: string;
  fr: string;
  en: string;
}

const REASONS: ReasonOption[] = [
  { id: 'ziekte',       icon: Stethoscope,  nl: 'Ziekte',                    fr: 'Maladie',              en: 'Illness' },
  { id: 'familie',      icon: Users,        nl: 'Familie-omstandigheden',     fr: 'Circonstances familiales', en: 'Family circumstances' },
  { id: 'werk_studie',  icon: Briefcase,    nl: 'Werk / Studie',              fr: 'Travail / Études',     en: 'Work / Study' },
  { id: 'vervoer',      icon: Car,          nl: 'Vervoersproblemen',          fr: 'Problèmes de transport', en: 'Transport problems' },
  { id: 'agenda',       icon: CalendarX,    nl: 'Agenda fout',                fr: 'Erreur d\'agenda',     en: 'Calendar mistake' },
  { id: 'anders',       icon: HelpCircle,   nl: 'Anders',                     fr: 'Autre',                en: 'Other' },
];

interface Props {
  taskId: string;
  taskTitle: string;
  taskDate?: string | null;
  userId: string;
  language: Language;
  onClose: () => void;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const L = {
  nl: {
    title: 'Vervanging Nodig',
    subtitle: 'Geen stress — wij zoeken een vervanger voor je.',
    reasonLabel: 'Wat is de reden?',
    confirm: 'Zoek Vervanger',
    cancel: 'Annuleren',
    searching: 'Zoeken...',
    successTitle: 'We zijn op zoek!',
    successMsg: 'We sturen nu een melding naar je maatjes en beschikbare vrijwilligers.',
    errorMsg: 'Er ging iets mis. Probeer opnieuw.',
    selectReason: 'Kies een reden om verder te gaan',
  },
  fr: {
    title: 'Remplacement Nécessaire',
    subtitle: 'Pas de stress — nous trouvons quelqu\'un pour vous.',
    reasonLabel: 'Quelle est la raison ?',
    confirm: 'Chercher un Remplaçant',
    cancel: 'Annuler',
    searching: 'Recherche...',
    successTitle: 'Nous cherchons !',
    successMsg: 'Nous envoyons une notification à vos équipiers et aux bénévoles disponibles.',
    errorMsg: 'Une erreur s\'est produite. Réessayez.',
    selectReason: 'Choisissez une raison pour continuer',
  },
  en: {
    title: 'Need a Replacement',
    subtitle: 'No stress — we\'ll find someone to cover your shift.',
    reasonLabel: 'What is the reason?',
    confirm: 'Find Replacement',
    cancel: 'Cancel',
    searching: 'Searching...',
    successTitle: 'We\'re on it!',
    successMsg: 'We\'re notifying your buddies and available volunteers now.',
    errorMsg: 'Something went wrong. Please try again.',
    selectReason: 'Choose a reason to continue',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ShiftSwapModal = ({ taskId, taskTitle, taskDate, userId, language, onClose, onSuccess }: Props) => {
  const l = L[language] ?? L.nl;
  const [selectedReason, setSelectedReason] = useState<Reason | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';
  const dateStr = taskDate
    ? new Date(taskDate).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    : null;

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);

    try {
      // 1. Insert shift_swap record
      const { data: swap, error: insertErr } = await supabase
        .from('shift_swaps')
        .insert({
          task_id: taskId,
          original_user_id: userId,
          reason: selectedReason,
          status: 'searching',
        })
        .select('id')
        .single();

      if (insertErr || !swap) {
        throw new Error(insertErr?.message || 'Insert failed');
      }

      // 2. Trigger notification engine (fire-and-forget — non-blocking)
      supabase.functions.invoke('process-shift-swap', {
        body: { shift_swap_id: swap.id },
      }).catch(err => console.warn('process-shift-swap invoke failed (non-fatal):', err));

      toast.success(l.successTitle, { description: l.successMsg });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('ShiftSwapModal submit error:', err);
      toast.error(l.errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Sheet / Dialog */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 p-6 border-b border-border bg-red-500/5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-heading font-bold text-foreground">{l.title}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{l.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
              aria-label={l.cancel}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Task info */}
            <div className="rounded-2xl bg-muted/50 p-4">
              <p className="font-semibold text-base text-foreground">{taskTitle}</p>
              {dateStr && <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dateStr}</p>}
            </div>

            {/* Reason picker */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                {l.reasonLabel}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {REASONS.map(({ id, icon: Icon, nl, fr, en }) => {
                  const label = language === 'nl' ? nl : language === 'fr' ? fr : en;
                  const active = selectedReason === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedReason(id)}
                      className={`
                        flex items-center gap-3 p-4 rounded-2xl border-2 text-left
                        transition-all min-h-[64px]
                        ${active
                          ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                          : 'border-border bg-card text-foreground hover:border-border/80 hover:bg-muted/50'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
                      <span className="text-base font-medium leading-snug">{label}</span>
                    </button>
                  );
                })}
              </div>
              {!selectedReason && (
                <p className="text-xs text-muted-foreground mt-2 text-center">{l.selectReason}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={!selectedReason || submitting}
                className={`
                  w-full h-14 rounded-2xl flex items-center justify-center gap-2.5
                  text-base font-bold transition-all
                  ${selectedReason && !submitting
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }
                `}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {l.searching}
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    {l.confirm}
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={submitting}
                className="w-full h-12 rounded-2xl text-base font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {l.cancel}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShiftSwapModal;
