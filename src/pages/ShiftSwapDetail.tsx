import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, MapPin, Clock, CheckCircle2,
  UserCheck, AlertTriangle, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SwapData {
  id: string;
  status: 'searching' | 'resolved' | 'cancelled' | 'expired';
  reason: string;
  task: {
    id: string;
    title: string;
    task_date: string | null;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    description: string | null;
    club_name: string;
    club_logo: string | null;
  };
  original_volunteer: {
    id: string;
    full_name: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const L: Record<Language, Record<string, string>> = {
  nl: {
    back: 'Terug',
    title: 'Vervanging gevraagd',
    needsReplacement: 'heeft een vervanger nodig',
    for: 'voor',
    reason_ziekte: 'Ziekte',
    reason_familie: 'Familie-omstandigheden',
    reason_werk_studie: 'Werk / Studie',
    reason_vervoer: 'Vervoersproblemen',
    reason_agenda: 'Agenda fout',
    reason_anders: 'Andere reden',
    taskDetails: 'Taakdetails',
    takeOver: 'Ik neem over! 🙋',
    takingOver: 'Verwerken...',
    alreadyResolved: 'Deze vervanging is al ingevuld.',
    cancelled: 'Dit verzoek is geannuleerd.',
    expired: 'Dit verzoek is verlopen.',
    successTitle: 'Gelukt! 🎉',
    successMsg: (name: string) => `${name} krijgt meteen een berichtje. Bedankt om te springen!`,
    errorMsg: 'Er ging iets mis. Probeer opnieuw.',
    loading: 'Even laden...',
    notFound: 'Dit verzoek bestaat niet of is al verlopen.',
    goBack: 'Terug naar dashboard',
    yourShift: 'Jij neemt deze shift over',
    yourShiftDesc: 'Als je klikt, word je meteen ingepland.',
  },
  fr: {
    back: 'Retour',
    title: 'Remplacement demandé',
    needsReplacement: 'cherche un remplaçant',
    for: 'pour',
    reason_ziekte: 'Maladie',
    reason_familie: 'Circonstances familiales',
    reason_werk_studie: 'Travail / Études',
    reason_vervoer: 'Problèmes de transport',
    reason_agenda: 'Erreur d\'agenda',
    reason_anders: 'Autre raison',
    taskDetails: 'Détails de la tâche',
    takeOver: 'Je prends le relais ! 🙋',
    takingOver: 'Traitement...',
    alreadyResolved: 'Ce remplacement a déjà été pourvu.',
    cancelled: 'Cette demande a été annulée.',
    expired: 'Cette demande a expiré.',
    successTitle: 'Super ! 🎉',
    successMsg: (name: string) => `${name} reçoit un message immédiatement. Merci de prendre le relais !`,
    errorMsg: 'Une erreur s\'est produite. Réessayez.',
    loading: 'Chargement...',
    notFound: 'Cette demande n\'existe pas ou a déjà expiré.',
    goBack: 'Retour au tableau de bord',
    yourShift: 'Vous prenez ce shift',
    yourShiftDesc: 'En cliquant, vous êtes immédiatement planifié.',
  },
  en: {
    back: 'Back',
    title: 'Replacement Requested',
    needsReplacement: 'needs a replacement',
    for: 'for',
    reason_ziekte: 'Illness',
    reason_familie: 'Family circumstances',
    reason_werk_studie: 'Work / Study',
    reason_vervoer: 'Transport problems',
    reason_agenda: 'Calendar mistake',
    reason_anders: 'Other reason',
    taskDetails: 'Task details',
    takeOver: 'I\'ll take over! 🙋',
    takingOver: 'Processing...',
    alreadyResolved: 'This shift has already been filled.',
    cancelled: 'This request was cancelled.',
    expired: 'This request has expired.',
    successTitle: 'Done! 🎉',
    successMsg: (name: string) => `${name} gets a notification right away. Thanks for stepping up!`,
    errorMsg: 'Something went wrong. Please try again.',
    loading: 'Loading...',
    notFound: 'This request doesn\'t exist or has already expired.',
    goBack: 'Back to dashboard',
    yourShift: 'You\'re taking this shift',
    yourShiftDesc: 'Clicking will immediately add you to the schedule.',
  },
};

const reasonKey = (r: string) => `reason_${r}` as keyof (typeof L)['nl'];

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const ShiftSwapDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = L[language as Language] ?? L.nl;

  const [loading, setLoading] = useState(true);
  const [swap, setSwap] = useState<SwapData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setCurrentUserId(user.id);

      if (!id) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('shift_swaps')
        .select(`
          id, status, reason,
          tasks (
            id, title, task_date, start_time, end_time, location, description,
            clubs ( name, logo_url )
          ),
          profiles!shift_swaps_original_user_id_fkey ( id, full_name )
        `)
        .eq('id', id)
        .single();

      if (error || !data) { setLoading(false); return; }

      const task = data.tasks as any;
      setSwap({
        id: data.id,
        status: data.status as SwapData['status'],
        reason: data.reason,
        task: {
          id: task.id,
          title: task.title,
          task_date: task.task_date,
          start_time: task.start_time,
          end_time: task.end_time,
          location: task.location,
          description: task.description,
          club_name: task.clubs?.name || '',
          club_logo: task.clubs?.logo_url || null,
        },
        original_volunteer: {
          id: (data.profiles as any)?.id || '',
          full_name: (data.profiles as any)?.full_name || '',
        },
      });
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const handleAccept = async () => {
    if (!swap || !currentUserId || accepting) return;
    setAccepting(true);

    try {
      const { data, error } = await supabase.functions.invoke('accept-shift-swap', {
        body: {
          shift_swap_id: swap.id,
          replacement_user_id: currentUserId,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        // Could be a race condition — swap already taken
        if (data.status === 'resolved') {
          toast.info(l.alreadyResolved);
          setSwap(prev => prev ? { ...prev, status: 'resolved' } : prev);
          return;
        }
        throw new Error(data.error);
      }

      setAccepted(true);
      const originalFirstName = swap.original_volunteer.full_name.split(' ')[0];
      toast.success(l.successTitle, {
        description: (l.successMsg as (name: string) => string)(originalFirstName),
        duration: 6000,
      });
    } catch (err) {
      console.error('accept-shift-swap error:', err);
      toast.error(l.errorMsg);
    } finally {
      setAccepting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!swap) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="w-14 h-14 text-muted-foreground/30" />
        <p className="text-lg font-medium text-foreground">{l.notFound}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold"
        >
          {l.goBack}
        </button>
      </div>
    );
  }

  const { task, original_volunteer, status, reason } = swap;

  const dateStr = task.task_date
    ? new Date(task.task_date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    : null;

  const timeStr = task.start_time
    ? `${task.start_time.slice(0, 5)}${task.end_time ? ` – ${task.end_time.slice(0, 5)}` : ''}`
    : null;

  const isOwn      = currentUserId === original_volunteer.id;
  const isSearching = status === 'searching';

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border px-4 flex items-center gap-3 min-h-[60px] pt-[env(safe-area-inset-top)]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-2 rounded-xl hover:bg-muted transition-colors font-semibold text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">{l.back}</span>
        </button>
        <h1 className="text-base font-heading font-bold text-foreground truncate">{l.title}</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* ── Status banner ─────────────────────────────────────────────────── */}
        {!isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 flex items-center gap-3 ${
              status === 'resolved' ? 'bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400' :
              'bg-muted border border-border text-muted-foreground'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="font-medium text-base">
              {status === 'resolved' ? l.alreadyResolved :
               status === 'cancelled' ? l.cancelled : l.expired}
            </p>
          </motion.div>
        )}

        {/* ── Original volunteer card ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-white">
                {(original_volunteer.full_name || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground">{original_volunteer.full_name}</p>
              <p className="text-base text-muted-foreground mt-0.5">
                {l.needsReplacement}
              </p>
            </div>
          </div>

          {/* Reason pill */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
              {l[reasonKey(reason)]}
            </span>
          </div>
        </motion.div>

        {/* ── Task details ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
        >
          <div className="p-5 border-b border-border/60 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-2">
              {task.club_logo ? (
                <img src={task.club_logo} alt={task.club_name} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-[9px] font-bold text-muted-foreground">{(task.club_name || '?')[0].toUpperCase()}</span>
                </div>
              )}
              <span className="text-sm text-muted-foreground">{task.club_name}</span>
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground">{task.title}</h2>
          </div>

          <div className="p-5 space-y-3">
            {dateStr && (
              <div className="flex items-center gap-3 text-base text-foreground">
                <Calendar className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="capitalize">{dateStr}</span>
              </div>
            )}
            {timeStr && (
              <div className="flex items-center gap-3 text-base text-foreground">
                <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                <span>{timeStr}</span>
              </div>
            )}
            {task.location && (
              <div className="flex items-center gap-3 text-base text-foreground">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                <span>{task.location}</span>
              </div>
            )}
            {task.description && (
              <p className="text-sm text-muted-foreground pt-1 border-t border-border/40">
                {task.description}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Accept action ──────────────────────────────────────────────────── */}
        {isSearching && !isOwn && !accepted && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-base text-foreground">{l.yourShift}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{l.yourShiftDesc}</p>
              </div>
            </div>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg shadow-lg shadow-green-600/25 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {l.takingOver}
                </>
              ) : l.takeOver}
            </button>
          </motion.div>
        )}

        {/* ── Accepted confirmation ──────────────────────────────────────────── */}
        {accepted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center space-y-2"
          >
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 dark:text-green-400" />
            <p className="text-xl font-bold text-foreground">{l.successTitle}</p>
            <p className="text-base text-muted-foreground">
              {(l.successMsg as (name: string) => string)(original_volunteer.full_name.split(' ')[0])}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold text-base inline-block"
            >
              {l.goBack}
            </button>
          </motion.div>
        )}

        {/* Own swap indicator */}
        {isOwn && isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-muted-foreground text-sm py-4"
          >
            <Clock className="w-6 h-6 mx-auto mb-1 text-muted-foreground/50" />
            {language === 'nl' ? 'We zoeken actief een vervanger voor jou...' :
             language === 'fr' ? 'Nous cherchons activement un remplaçant pour vous...' :
             'We\'re actively looking for a replacement...'}
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default ShiftSwapDetail;
