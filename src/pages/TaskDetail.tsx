import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Calendar, Users, Clock, Euro, FileText,
  AlertCircle, Share2, CheckCircle, Info, Navigation
} from 'lucide-react';
import Logo from '@/components/Logo';
import TaskMap from '@/components/TaskMap';
import { Language } from '@/i18n/translations';

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  status: string;
  club_id: string;
  created_at: string;
  expense_reimbursement: boolean;
  expense_amount: number | null;
  briefing_time: string | null;
  briefing_location: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  clubs: { name: string; sport: string | null; location: string | null } | null;
}

const labels = {
  nl: {
    back: 'Terug naar overzicht',
    when: 'Wanneer',
    where: 'Waar',
    meetingPoint: 'Verzamelpunt',
    spotsAvailable: 'Beschikbare plaatsen',
    volunteersNeeded: 'Vrijwilligers gezocht',
    alreadySignedUp: 'Reeds aangemeld',
    remaining: 'Nog beschikbaar',
    expense: 'Onkostenvergoeding',
    noExpense: 'Geen onkostenvergoeding voorzien',
    expenseYes: 'Er is een onkostenvergoeding voorzien',
    perVolunteer: 'per vrijwilliger',
    briefing: 'Briefing vooraf',
    briefingInfo: 'Er is een verplichte briefing voor aanvang van de taak',
    noBriefing: 'Geen briefing voorzien — je kan rechtstreeks naar het verzamelpunt komen',
    schedule: 'Tijdsschema',
    start: 'Start',
    end: 'Einde',
    duration: 'Duur',
    hours: 'uur',
    notes: 'Bijkomende informatie',
    signUp: 'Inschrijven voor deze taak',
    signedUp: '✓ Je bent ingeschreven',
    cancelSignup: 'Uitschrijven',
    club: 'Sportclub',
    sport: 'Sport',
    share: 'Delen',
    directions: 'Routebeschrijving',
    loading: 'Laden...',
    notFound: 'Taak niet gevonden',
    goBack: 'Terug naar dashboard',
    persons: 'personen',
    aboutTask: 'Over deze taak',
    practicalInfo: 'Praktische info',
  },
  fr: {
    back: 'Retour à l\'aperçu',
    when: 'Quand',
    where: 'Où',
    meetingPoint: 'Point de rassemblement',
    spotsAvailable: 'Places disponibles',
    volunteersNeeded: 'Bénévoles recherchés',
    alreadySignedUp: 'Déjà inscrits',
    remaining: 'Encore disponibles',
    expense: 'Indemnité de frais',
    noExpense: 'Aucune indemnité de frais prévue',
    expenseYes: 'Une indemnité de frais est prévue',
    perVolunteer: 'par bénévole',
    briefing: 'Briefing préalable',
    briefingInfo: 'Un briefing obligatoire est prévu avant le début de la tâche',
    noBriefing: 'Pas de briefing prévu — vous pouvez vous rendre directement au point de rassemblement',
    schedule: 'Horaire',
    start: 'Début',
    end: 'Fin',
    duration: 'Durée',
    hours: 'heures',
    notes: 'Informations complémentaires',
    signUp: 'S\'inscrire pour cette tâche',
    signedUp: '✓ Vous êtes inscrit',
    cancelSignup: 'Se désinscrire',
    club: 'Club sportif',
    sport: 'Sport',
    share: 'Partager',
    directions: 'Itinéraire',
    loading: 'Chargement...',
    notFound: 'Tâche non trouvée',
    goBack: 'Retour au tableau de bord',
    persons: 'personnes',
    aboutTask: 'À propos de cette tâche',
    practicalInfo: 'Infos pratiques',
  },
  en: {
    back: 'Back to overview',
    when: 'When',
    where: 'Where',
    meetingPoint: 'Meeting point',
    spotsAvailable: 'Spots available',
    volunteersNeeded: 'Volunteers needed',
    alreadySignedUp: 'Already signed up',
    remaining: 'Still available',
    expense: 'Expense reimbursement',
    noExpense: 'No expense reimbursement provided',
    expenseYes: 'An expense reimbursement is provided',
    perVolunteer: 'per volunteer',
    briefing: 'Pre-briefing',
    briefingInfo: 'A mandatory briefing is scheduled before the task',
    noBriefing: 'No briefing scheduled — you can go directly to the meeting point',
    schedule: 'Schedule',
    start: 'Start',
    end: 'End',
    duration: 'Duration',
    hours: 'hours',
    notes: 'Additional information',
    signUp: 'Sign up for this task',
    signedUp: '✓ You are signed up',
    cancelSignup: 'Unsubscribe',
    club: 'Sports club',
    sport: 'Sport',
    share: 'Share',
    directions: 'Directions',
    loading: 'Loading...',
    notFound: 'Task not found',
    goBack: 'Back to dashboard',
    persons: 'persons',
    aboutTask: 'About this task',
    practicalInfo: 'Practical info',
  },
};

const formatDate = (dateStr: string | null, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

const formatTime = (dateStr: string | null, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

const getDurationHours = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
};

const getMapUrl = (location: string) => {
  const encoded = encodeURIComponent(location);
  return `https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=&query=${encoded}`;
};

const getDirectionsUrl = (location: string) => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
};

const langLabels: Record<Language, string> = { nl: 'NL', fr: 'FR', en: 'EN' };

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupCount, setSignupCount] = useState(0);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [signingUp, setSigningUp] = useState(false);

  const l = labels[language];

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, clubs(name, sport, location)')
        .eq('id', id!)
        .maybeSingle();

      if (!taskData) { setLoading(false); return; }
      setTask(taskData as unknown as Task);

      // Count signups
      const { count } = await supabase
        .from('task_signups')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', id!);
      setSignupCount(count || 0);

      // Check if user signed up
      const { data: mySignup } = await supabase
        .from('task_signups')
        .select('id')
        .eq('task_id', id!)
        .eq('volunteer_id', session.user.id)
        .maybeSingle();
      setIsSignedUp(!!mySignup);

      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const handleSignup = async () => {
    setSigningUp(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('task_signups').insert({
      task_id: id!,
      volunteer_id: session.user.id,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.volunteer.step3Title + '!');
      setIsSignedUp(true);
      setSignupCount(prev => prev + 1);
    }
    setSigningUp(false);
  };

  const handleCancel = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('task_signups')
      .delete()
      .eq('task_id', id!)
      .eq('volunteer_id', session.user.id);

    if (error) {
      toast.error(error.message);
    } else {
      setIsSignedUp(false);
      setSignupCount(prev => Math.max(prev - 1, 0));
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: task?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link gekopieerd!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{l.notFound}</p>
        <button onClick={() => navigate('/dashboard')} className="text-primary hover:underline text-sm">
          ← {l.goBack}
        </button>
      </div>
    );
  }

  const taskLocation = task.location || task.clubs?.location || '';
  const meetingPoint = task.briefing_location || taskLocation;
  const duration = getDurationHours(task.start_time || task.task_date, task.end_time);
  const spotsRemaining = task.spots_available - signupCount;
  const fillPercentage = Math.min((signupCount / task.spots_available) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{l.back}</span>
            </button>
          </div>
          <Logo size="sm" linkTo="/dashboard" />
          <div className="flex items-center gap-2">
            {(['nl', 'fr', 'en'] as Language[]).map(lang => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  language === lang ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {langLabels[lang]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Hero section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary/10 text-secondary">
              {task.clubs?.sport || 'Sport'}
            </span>
            <span className="text-xs text-muted-foreground">
              {task.clubs?.name}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground leading-tight">
            {task.title}
          </h1>
          {task.description && (
            <p className="text-muted-foreground mt-3 text-lg leading-relaxed">{task.description}</p>
          )}

          {/* Quick action bar */}
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> {l.share}
            </button>
            {taskLocation && (
              <a
                href={getDirectionsUrl(taskLocation)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" /> {l.directions}
              </a>
            )}
          </div>
        </motion.div>

        <div className="grid gap-6">
          {/* Schedule card */}
          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl p-6 shadow-card border border-transparent"
          >
            <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              {l.schedule}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{l.start}</p>
                <p className="font-heading font-semibold text-foreground text-lg">
                  {formatTime(task.start_time || task.task_date, language) || '—'}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatDate(task.start_time || task.task_date, language)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{l.end}</p>
                <p className="font-heading font-semibold text-foreground text-lg">
                  {formatTime(task.end_time, language) || '—'}
                </p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{l.duration}</p>
                <p className="font-heading font-semibold text-foreground text-lg">
                  {duration ? `${duration} ${l.hours}` : '—'}
                </p>
              </div>
            </div>
          </motion.section>

          {/* Location & Map */}
          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 shadow-card border border-transparent"
          >
            <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              {l.where}
            </h2>
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{taskLocation || '—'}</p>
                  <p className="text-sm text-muted-foreground">{l.meetingPoint}: {meetingPoint}</p>
                </div>
              </div>
            </div>
            {taskLocation && (
              <TaskMap
                location={taskLocation}
                meetingPoint={meetingPoint}
                directionsLabel={l.directions}
              />
            )}
          </motion.section>

          {/* Volunteers / Spots */}
          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl p-6 shadow-card border border-transparent"
          >
            <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              {l.volunteersNeeded}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div className="text-center bg-muted/50 rounded-xl p-4">
                <p className="text-3xl font-heading font-bold text-foreground">{task.spots_available}</p>
                <p className="text-xs text-muted-foreground mt-1">{l.volunteersNeeded}</p>
              </div>
              <div className="text-center bg-muted/50 rounded-xl p-4">
                <p className="text-3xl font-heading font-bold text-primary">{signupCount}</p>
                <p className="text-xs text-muted-foreground mt-1">{l.alreadySignedUp}</p>
              </div>
              <div className="text-center bg-muted/50 rounded-xl p-4">
                <p className={`text-3xl font-heading font-bold ${spotsRemaining <= 0 ? 'text-destructive' : 'text-accent'}`}>
                  {Math.max(spotsRemaining, 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{l.remaining}</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary rounded-full h-3 transition-all duration-500"
                style={{ width: `${fillPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {signupCount} / {task.spots_available} {l.persons}
            </p>
          </motion.section>

          {/* Practical info */}
          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl p-6 shadow-card border border-transparent"
          >
            <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-primary" />
              {l.practicalInfo}
            </h2>
            <div className="space-y-5">
              {/* Expense */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Euro className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{l.expense}</p>
                  {task.expense_reimbursement ? (
                    <div>
                      <p className="text-sm text-accent font-medium mt-0.5">
                        {l.expenseYes}
                      </p>
                      {task.expense_amount && (
                        <p className="text-2xl font-heading font-bold text-foreground mt-1">
                          €{task.expense_amount.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{l.perVolunteer}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">{l.noExpense}</p>
                  )}
                </div>
              </div>

              {/* Briefing */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{l.briefing}</p>
                  {task.briefing_time ? (
                    <div className="mt-1 bg-primary/5 rounded-xl p-3 border border-primary/10">
                      <p className="text-sm text-foreground">{l.briefingInfo}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(task.briefing_time, language)}
                        </span>
                        {task.briefing_location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {task.briefing_location}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">{l.noBriefing}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {task.notes && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{l.notes}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{task.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* Club info */}
          {task.clubs && (
            <motion.section
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl p-6 shadow-card border border-transparent"
            >
              <h2 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-primary" />
                {l.club}
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{l.club}</p>
                  <p className="font-medium text-foreground">{task.clubs.name}</p>
                </div>
                {task.clubs.sport && (
                  <div>
                    <p className="text-muted-foreground">{l.sport}</p>
                    <p className="font-medium text-foreground">{task.clubs.sport}</p>
                  </div>
                )}
                {task.clubs.location && (
                  <div>
                    <p className="text-muted-foreground">{l.where}</p>
                    <p className="font-medium text-foreground">{task.clubs.location}</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </div>

        {/* Sticky signup bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="sticky bottom-0 mt-8 -mx-4 px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background to-transparent"
        >
          <div className="max-w-3xl mx-auto">
            {isSignedUp ? (
              <div className="flex gap-3">
                <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/20 text-primary font-medium">
                  <CheckCircle className="w-5 h-5" />
                  {l.signedUp}
                </div>
                <button
                  onClick={handleCancel}
                  className="px-5 py-3 rounded-2xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                >
                  {l.cancelSignup}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignup}
                disabled={signingUp || spotsRemaining <= 0}
                className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shadow-warm"
              >
                {signingUp ? '...' : l.signUp}
              </button>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default TaskDetail;
