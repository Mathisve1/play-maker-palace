import { useEffect, useState, useRef } from 'react';
import VolunteerBriefingView from '@/components/VolunteerBriefingView';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Calendar, Users, Clock, Euro, FileText,
  AlertCircle, Share2, CheckCircle, Info, Navigation, Heart, MessageCircle, Camera, ListOrdered, ArrowLeftRight
} from 'lucide-react';
import ShiftSwapDialog from '@/components/ShiftSwapDialog';
import TaskNotesSection from '@/components/TaskNotesSection';
import { downloadTaskIcs } from '@/components/CalendarSyncSection';
import ShiftReviewForm from '@/components/ShiftReviewForm';
import WeatherWidget from '@/components/WeatherWidget';
import BreakTimer from '@/components/BreakTimer';
import LiveEventFeed from '@/components/LiveEventFeed';
import { sendPush } from '@/lib/sendPush';
import Logo from '@/components/Logo';
import TaskMap from '@/components/TaskMap';
import LikeButton from '@/components/LikeButton';
import SignatureStatus from '@/components/SignatureStatus';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  event_id?: string | null;
  clubs: { name: string; sport: string | null; location: string | null; owner_id?: string } | null;
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
    messageClub: 'Bericht club',
    joinWaitlist: 'Op wachtlijst zetten',
    onWaitlist: 'Je staat op de wachtlijst',
    leaveWaitlist: 'Wachtlijst verlaten',
    waitlistPosition: 'Positie',
    waitlistCount: 'Op wachtlijst',
    taskFull: 'Taak is vol',
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
    messageClub: 'Message au club',
    joinWaitlist: 'Rejoindre la liste d\'attente',
    onWaitlist: 'Vous êtes sur la liste d\'attente',
    leaveWaitlist: 'Quitter la liste d\'attente',
    waitlistPosition: 'Position',
    waitlistCount: 'En attente',
    taskFull: 'Tâche complète',
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
    messageClub: 'Message club',
    joinWaitlist: 'Join waitlist',
    onWaitlist: 'You are on the waitlist',
    leaveWaitlist: 'Leave waitlist',
    waitlistPosition: 'Position',
    waitlistCount: 'On waitlist',
    taskFull: 'Task is full',
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
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null; avatar_url: string | null } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState(0);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [allowShiftSwaps, setAllowShiftSwaps] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [hasBriefing, setHasBriefing] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [contractStatus, setContractStatus] = useState<'signed' | 'pending' | 'none' | 'loading'>('loading');
  const [myZone, setMyZone] = useState<{ name: string; max_capacity: number | null } | null>(null);

  const l = labels[language];

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setCurrentUserId(session.user.id);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();
      setProfile(profileData);

      const { data: taskData } = await supabase
        .from('tasks')
        .select('*, clubs(name, sport, location, owner_id)')
        .eq('id', id!)
        .maybeSingle();

      if (!taskData) { setLoading(false); return; }
      setTask(taskData as unknown as Task);
      setWaitlistEnabled((taskData as any).waitlist_enabled || false);

      // Check if club allows shift swaps
      supabase.from('clubs').select('allow_shift_swaps').eq('id', taskData.club_id).maybeSingle().then(({ data: clubData }) => {
        if (clubData) setAllowShiftSwaps(!!clubData.allow_shift_swaps);
      });

      // Check if task has a briefing
      supabase.from('briefings').select('id').eq('task_id', id!).limit(1).then(({ data: briefData }) => {
        setHasBriefing(!!(briefData && briefData.length > 0));
      });

      // Load zone assignment for this volunteer
      supabase.from('task_zone_assignments').select('zone_id, task_zones(name, max_capacity)').eq('volunteer_id', session.user.id).then(({ data: zoneData }) => {
        if (zoneData && zoneData.length > 0) {
          // Filter to zones belonging to this task
          const matchingZone = zoneData.find((z: any) => z.task_zones);
          if (matchingZone && (matchingZone as any).task_zones) {
            const tz = (matchingZone as any).task_zones;
            setMyZone({ name: tz.name, max_capacity: tz.max_capacity });
          }
        }
      });

      // Check season contract status for this club
      supabase.from('season_contracts').select('status').eq('volunteer_id', session.user.id).eq('club_id', taskData.club_id).then(({ data: scData }) => {
        const contracts = scData || [];
        if (contracts.some((c: any) => c.status === 'signed')) setContractStatus('signed');
        else if (contracts.some((c: any) => c.status === 'sent' || c.status === 'pending')) setContractStatus('pending');
        else setContractStatus('none');
      });

      // Count signups + waitlist + likes in parallel
      const [signupRes, mySignupRes, likeRes, myLikeRes, waitlistRes, myWaitlistRes] = await Promise.all([
        supabase.from('task_signups').select('id', { count: 'exact', head: true }).eq('task_id', id!),
        supabase.from('task_signups').select('id').eq('task_id', id!).eq('volunteer_id', session.user.id).maybeSingle(),
        supabase.from('task_likes').select('id', { count: 'exact', head: true }).eq('task_id', id!),
        supabase.from('task_likes').select('id').eq('task_id', id!).eq('user_id', session.user.id).maybeSingle(),
        supabase.from('task_waitlist').select('id', { count: 'exact', head: true }).eq('task_id', id!),
        supabase.from('task_waitlist').select('id, position').eq('task_id', id!).eq('volunteer_id', session.user.id).maybeSingle(),
      ]);

      setSignupCount(signupRes.count || 0);
      setIsSignedUp(!!mySignupRes.data);
      setLikeCount(likeRes.count || 0);
      setIsLiked(!!myLikeRes.data);
      setWaitlistCount(waitlistRes.count || 0);
      if (myWaitlistRes.data) {
        setIsOnWaitlist(true);
        setWaitlistPosition(myWaitlistRes.data.position || 1);
      }

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

      // Auto-promote first person from waitlist
      if (waitlistEnabled && waitlistCount > 0) {
        const { data: nextInLine } = await supabase
          .from('task_waitlist')
          .select('id, volunteer_id')
          .eq('task_id', id!)
          .order('position', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextInLine) {
          // Promote: create signup and remove from waitlist
          await supabase.from('task_signups').insert({
            task_id: id!,
            volunteer_id: nextInLine.volunteer_id,
          });
          await supabase.from('task_waitlist').delete().eq('id', nextInLine.id);
          setWaitlistCount(prev => Math.max(prev - 1, 0));
          setSignupCount(prev => prev + 1);

          // Send push notification to promoted volunteer
          sendPush({
            userId: nextInLine.volunteer_id,
            title: language === 'nl' ? 'Plaats vrijgekomen!' : language === 'fr' ? 'Place libérée !' : 'Spot available!',
            message: language === 'nl'
              ? `Er is een plek vrijgekomen voor "${task?.title}". Je bent automatisch ingeschreven!`
              : language === 'fr'
              ? `Une place s'est libérée pour "${task?.title}". Vous êtes automatiquement inscrit !`
              : `A spot opened up for "${task?.title}". You've been automatically signed up!`,
            url: `/task/${id}`,
            type: 'waitlist_promoted',
          });
        }
      }
    }
  };

  const handleJoinWaitlist = async () => {
    setJoiningWaitlist(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setJoiningWaitlist(false); return; }

    const newPosition = waitlistCount + 1;
    const { error } = await supabase.from('task_waitlist').insert({
      task_id: id!,
      volunteer_id: session.user.id,
      position: newPosition,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setIsOnWaitlist(true);
      setWaitlistPosition(newPosition);
      setWaitlistCount(prev => prev + 1);
      toast.success(language === 'nl' ? 'Je staat op de wachtlijst!' : language === 'fr' ? 'Vous êtes sur la liste d\'attente !' : 'You\'re on the waitlist!');
    }
    setJoiningWaitlist(false);
  };

  const handleLeaveWaitlist = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('task_waitlist')
      .delete()
      .eq('task_id', id!)
      .eq('volunteer_id', session.user.id);

    if (error) {
      toast.error(error.message);
    } else {
      setIsOnWaitlist(false);
      setWaitlistCount(prev => Math.max(prev - 1, 0));
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'fr' ? 'Sélectionnez une image' : language === 'en' ? 'Select an image' : 'Selecteer een afbeelding');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'fr' ? 'L\'image ne peut pas dépasser 5 Mo' : language === 'en' ? 'Image must be under 5MB' : 'Afbeelding mag maximaal 5MB zijn');
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${currentUserId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', currentUserId);

    if (updateError) {
      toast.error(updateError.message);
    } else {
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      toast.success(language === 'fr' ? 'Photo de profil mise à jour !' : language === 'en' ? 'Profile photo updated!' : 'Profielfoto bijgewerkt!');
    }
    setUploadingAvatar(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: task?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(language === 'fr' ? 'Lien copié !' : language === 'en' ? 'Link copied!' : 'Link gekopieerd!');
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
      <header className="border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="px-4 h-14 flex items-center justify-between max-w-3xl mx-auto">
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
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative group ml-1"
              title={language === 'fr' ? 'Modifier la photo' : language === 'en' ? 'Change photo' : 'Profielfoto wijzigen'}
            >
              <Avatar className="w-8 h-8">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name || ''} />
                )}
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 pb-tab-bar max-w-3xl mx-auto">
        {/* Contract warning banner */}
        {contractStatus !== 'loading' && contractStatus !== 'signed' && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {language === 'nl'
                  ? `Je hebt nog geen geldig seizoenscontract voor ${task.clubs?.name || 'deze club'}. Je kunt je inschrijven maar de club moet je nog goedkeuren.`
                  : language === 'fr'
                  ? `Vous n'avez pas encore de contrat saisonnier valide pour ${task.clubs?.name || 'ce club'}. Vous pouvez vous inscrire mais le club doit encore vous approuver.`
                  : `You don't have a valid season contract for ${task.clubs?.name || 'this club'} yet. You can sign up but the club still needs to approve you.`}
              </p>
              <button
                onClick={() => navigate('/volunteer-dashboard?tab=contracts')}
                className="mt-2 text-xs font-medium text-yellow-700 dark:text-yellow-300 hover:underline"
              >
                {language === 'nl' ? 'Bekijk mijn contracten →' : language === 'fr' ? 'Voir mes contrats →' : 'View my contracts →'}
              </button>
            </div>
          </motion.div>
        )}
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
            <LikeButton
              taskId={id!}
              liked={isLiked}
              count={likeCount}
              size="md"
              onToggle={(_, liked) => {
                setIsLiked(liked);
                setLikeCount(prev => liked ? prev + 1 : Math.max(prev - 1, 0));
              }}
            />
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
            {task.clubs?.owner_id && (
              <button
                onClick={() => navigate(`/chat?taskId=${id}&clubOwnerId=${task.clubs!.owner_id}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" /> {l.messageClub}
              </button>
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

          {/* Task notes & photos */}
          {currentUserId && (
            <TaskNotesSection taskId={id!} userId={currentUserId} language={language} isAssigned={isSignedUp} />
          )}

          {/* Calendar download */}
          {isSignedUp && task.task_date && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <button
                onClick={() => downloadTaskIcs(task)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                {language === 'nl' ? 'Toevoegen aan kalender' : language === 'fr' ? 'Ajouter au calendrier' : 'Add to calendar'}
              </button>
            </motion.div>
          )}

          {/* Briefing view */}
          {isSignedUp && hasBriefing && currentUserId && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
              {showBriefing ? (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="p-3 border-b border-border flex justify-between items-center">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {language === 'nl' ? 'Briefing' : language === 'fr' ? 'Briefing' : 'Briefing'}
                    </span>
                    <button onClick={() => setShowBriefing(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
                  </div>
                  <VolunteerBriefingView taskId={id!} language={language} userId={currentUserId} />
                </div>
              ) : (
                <button
                  onClick={() => setShowBriefing(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  {language === 'nl' ? 'Briefing bekijken' : language === 'fr' ? 'Voir le briefing' : 'View briefing'}
                </button>
              )}
            </motion.div>
          )}

          {/* Weather widget */}
          {task.task_date && (task.location || task.clubs?.location) && (
            <WeatherWidget
              location={task.location || task.clubs?.location || ''}
              date={task.task_date}
              language={language}
            />
          )}

          {/* Break timer (only for assigned volunteers) */}
          {isSignedUp && currentUserId && (
            <BreakTimer taskId={id!} userId={currentUserId} language={language} />
          )}

          {/* Live event feed */}
          {task.event_id && isSignedUp && (
            <LiveEventFeed eventId={task.event_id} language={language} />
          )}

          {/* Shift review (for past assigned tasks) */}
          {isSignedUp && task.task_date && new Date(task.task_date) < new Date() && currentUserId && (
            <ShiftReviewForm
              taskId={id!}
              clubId={task.club_id}
              userId={currentUserId}
              taskTitle={task.title}
              language={language}
            />
          )}

          {/* E-signature status */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SignatureStatus taskId={id!} language={language} />
          </motion.div>
        </div>

        {/* Sticky signup bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="sticky bottom-0 mt-8 -mx-4 px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background to-transparent"
        >
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Waitlist info badge */}
            {waitlistEnabled && waitlistCount > 0 && !isSignedUp && !isOnWaitlist && spotsRemaining <= 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ListOrdered className="w-3.5 h-3.5" />
                {waitlistCount} {l.waitlistCount}
              </div>
            )}

            {isSignedUp ? (
              <div className="flex gap-3">
                <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/20 text-primary font-medium">
                  <CheckCircle className="w-5 h-5" />
                  {l.signedUp}
                </div>
                {allowShiftSwaps && signupCount > 1 && (
                  <button
                    onClick={() => setShowSwapDialog(true)}
                    className="px-4 py-3 rounded-2xl text-sm font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/20 transition-colors"
                    title={language === 'nl' ? 'Shift ruilen' : 'Swap shift'}
                  >
                    <ArrowLeftRight className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  className="px-5 py-3 rounded-2xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                >
                  {l.cancelSignup}
                </button>
              </div>
            ) : isOnWaitlist ? (
              <div className="flex gap-3">
                <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary-foreground font-medium">
                  <ListOrdered className="w-5 h-5" />
                  {l.onWaitlist} — #{waitlistPosition}
                </div>
                <button
                  onClick={handleLeaveWaitlist}
                  className="px-5 py-3 rounded-2xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                >
                  {l.leaveWaitlist}
                </button>
              </div>
            ) : spotsRemaining <= 0 && waitlistEnabled ? (
              <button
                onClick={handleJoinWaitlist}
                disabled={joiningWaitlist}
                className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
              >
                {joiningWaitlist ? '...' : (
                  <span className="flex items-center justify-center gap-2">
                    <ListOrdered className="w-4 h-4" />
                    {l.joinWaitlist}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={handleSignup}
                disabled={signingUp || spotsRemaining <= 0}
                className="w-full px-4 py-3.5 rounded-2xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shadow-warm"
              >
                {signingUp ? '...' : spotsRemaining <= 0 ? l.taskFull : l.signUp}
              </button>
            )}
          </div>
        </motion.div>
      </main>
      {task && showSwapDialog && (
        <ShiftSwapDialog
          open={showSwapDialog}
          onClose={() => setShowSwapDialog(false)}
          taskId={task.id}
          taskTitle={task.title}
          clubId={task.club_id}
          currentUserId={currentUserId}
          language={language}
        />
      )}
    </div>
  );
};

export default TaskDetail;
