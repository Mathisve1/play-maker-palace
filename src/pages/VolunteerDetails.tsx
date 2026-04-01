import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays, Wallet, Trophy, GraduationCap,
  MapPin, CalendarSync, Gift, ListChecks, CreditCard,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/DashboardLayout';
import VolunteerSidebar from '@/components/VolunteerSidebar';
import VolunteerSeasonOverview from '@/components/VolunteerSeasonOverview';
import VolunteerFinancialDashboard from '@/components/VolunteerFinancialDashboard';
import VolunteerBadges from '@/components/VolunteerBadges';
import SkillsPassport from '@/components/SkillsPassport';
import MicroLearningsSection from '@/components/MicroLearningsSection';
import CalendarSyncSection from '@/components/CalendarSyncSection';
import ReferralSection from '@/components/ReferralSection';
import NearbyClubsWidget from '@/components/community/NearbyClubsWidget';
import VolunteerTaskPreferences from '@/components/VolunteerTaskPreferences';
import VolunteerLoyaltyProgress from '@/components/volunteer/VolunteerLoyaltyProgress';
import BuddiesCard from '@/components/volunteer/BuddiesCard';
import MijnClubkaarten from '@/components/volunteer/MijnClubkaarten';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  task_date: string | null;
  location: string | null;
  event_id: string | null;
  club_id: string;
  description: string | null;
}

interface TaskSignup {
  task_id: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_LABELS: Record<Language, Record<string, string>> = {
  nl: {
    title: 'Mijn Details & Voorkeuren',
    back: 'Terug',
    season: 'Mijn Seizoen',
    seasonDesc: 'Overzicht van jouw taken en voortgang dit seizoen',
    financials: 'Vergoedingen',
    financialsDesc: 'Jouw uitbetalingen en openstaande bedragen',
    badges: 'Badges & Loyaliteit',
    badgesDesc: 'Jouw beloningen, punten en prestaties',
    skills: 'Skills & Academy',
    skillsDesc: 'Jouw vaardigheden, certificaten en trainingen',
    clubs: 'Clubs in de buurt',
    clubsDesc: 'Ontdek sportclubs bij jou in de buurt',
    calendar: 'Kalender synchronisatie',
    calendarDesc: 'Verbind jouw takenschema met je agenda',
    referral: 'Vrienden werven',
    referralDesc: 'Nodig vrienden uit en verdien beloningen',
    preferences: 'Taakaanbevelingen',
    preferencesDesc: 'Stel in welke taken het beste bij jou passen',
    buddies: '👫 Mijn Vaste Maatjes',
    buddiesDesc: 'Werk samen met een vast maatje — jij kiest wie, de club ziet wie er al meedoet',
    cards: 'Mijn Clubkaarten',
    cardsDesc: 'Jouw pas, digitale kaart en beloningen per club',
  },
  fr: {
    title: 'Mes Détails & Préférences',
    back: 'Retour',
    season: 'Ma Saison',
    seasonDesc: 'Aperçu de vos tâches et progrès cette saison',
    financials: 'Remboursements',
    financialsDesc: 'Vos paiements et montants en attente',
    badges: 'Badges & Fidélité',
    badgesDesc: 'Vos récompenses, points et réalisations',
    skills: 'Compétences & Académie',
    skillsDesc: 'Vos compétences, certificats et formations',
    clubs: 'Clubs à proximité',
    clubsDesc: 'Découvrez les clubs sportifs près de chez vous',
    calendar: 'Synchronisation calendrier',
    calendarDesc: 'Connectez votre planning de tâches à votre agenda',
    referral: 'Parrainer des amis',
    referralDesc: 'Invitez des amis et gagnez des récompenses',
    preferences: 'Recommandations de tâches',
    preferencesDesc: 'Configurez quelles tâches vous conviennent le mieux',
    buddies: '👫 Mes Équipiers Fixes',
    buddiesDesc: 'Travaillez avec un équipier fixe — vous choisissez, le club voit qui participe',
    cards: 'Mes Cartes de Club',
    cardsDesc: 'Votre carte, carte numérique et récompenses par club',
  },
  en: {
    title: 'My Details & Preferences',
    back: 'Back',
    season: 'My Season',
    seasonDesc: 'Overview of your tasks and progress this season',
    financials: 'Payments',
    financialsDesc: 'Your payouts and outstanding amounts',
    badges: 'Badges & Loyalty',
    badgesDesc: 'Your rewards, points and achievements',
    skills: 'Skills & Academy',
    skillsDesc: 'Your skills, certificates and trainings',
    clubs: 'Nearby clubs',
    clubsDesc: 'Discover sports clubs near you',
    calendar: 'Calendar sync',
    calendarDesc: 'Connect your task schedule to your calendar',
    referral: 'Refer friends',
    referralDesc: 'Invite friends and earn rewards',
    preferences: 'Task recommendations',
    preferencesDesc: 'Configure which tasks suit you best',
    buddies: '👫 My Regular Buddies',
    buddiesDesc: 'Work with a regular buddy — you choose who, the club sees who\'s joining',
    cards: 'My Club Cards',
    cardsDesc: 'Your card, digital card and rewards per club',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────────────────────

interface SectionCardProps {
  headerBg: string;
  iconBg: string;
  iconClass: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  children: React.ReactNode;
  delay?: number;
}

const SectionCard = ({ headerBg, iconBg, iconClass, icon: Icon, title, desc, children, delay = 0 }: SectionCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
  >
    <div className={cn('flex items-center gap-4 p-5 border-b border-border/60', headerBg)}>
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-7 h-7', iconClass)} />
      </div>
      <div className="min-w-0">
        <h2 className="text-xl font-heading font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
    <div className="p-5">{children}</div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const VolunteerDetails = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = PAGE_LABELS[language as Language] ?? PAGE_LABELS.nl;

  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [signups, setSignups] = useState<TaskSignup[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);

      // Fetch tasks relevant to this volunteer
      const { data: signupData } = await supabase
        .from('task_signups')
        .select('task_id, status')
        .eq('volunteer_id', user.id);

      const fetchedSignups: TaskSignup[] = (signupData || []).map(s => ({
        task_id: s.task_id,
        status: s.status,
      }));
      setSignups(fetchedSignups);

      if (fetchedSignups.length > 0) {
        const taskIds = fetchedSignups.map(s => s.task_id);
        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, title, task_date, location, event_id, club_id, description')
          .in('id', taskIds);
        setTasks((taskData || []) as Task[]);
      }

      // Fetch loyalty points
      const { data: enrollments } = await supabase
        .from('loyalty_enrollments')
        .select('points_earned')
        .eq('volunteer_id', user.id);

      const totalPoints = (enrollments || []).reduce((sum, e) => sum + (e.points_earned || 0), 0);
      setLoyaltyPoints(totalPoints);

      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading || !userId) {
    return (
      <DashboardLayout sidebar={<VolunteerSidebar activeTab="dashboard" onTabChange={() => {}} />} userId={userId || undefined} volunteerMode>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const signedUpTaskIds = new Set(signups.map(s => s.task_id));

  return (
    <DashboardLayout sidebar={<VolunteerSidebar activeTab="dashboard" onTabChange={() => {}} />} userId={userId} volunteerMode>
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="text-2xl font-heading font-bold text-foreground">{l.title}</h1>

        {/* 1 — Season */}
        <SectionCard
          delay={0.05}
          headerBg="bg-blue-500/5"
          iconBg="bg-blue-500/15"
          iconClass="text-blue-600 dark:text-blue-400"
          icon={CalendarDays}
          title={l.season}
          desc={l.seasonDesc}
        >
          <VolunteerSeasonOverview userId={userId} language={language as Language} />
        </SectionCard>

        {/* 2 — Financials */}
        <SectionCard
          delay={0.1}
          headerBg="bg-emerald-500/5"
          iconBg="bg-emerald-500/15"
          iconClass="text-emerald-600 dark:text-emerald-400"
          icon={Wallet}
          title={l.financials}
          desc={l.financialsDesc}
        >
          <VolunteerFinancialDashboard userId={userId} language={language as Language} />
        </SectionCard>

        {/* 2b — Club Cards & Rewards */}
        <SectionCard
          delay={0.13}
          headerBg="bg-indigo-500/5"
          iconBg="bg-indigo-500/15"
          iconClass="text-indigo-600 dark:text-indigo-400"
          icon={CreditCard}
          title={l.cards}
          desc={l.cardsDesc}
        >
          <MijnClubkaarten userId={userId} language={language as Language} />
        </SectionCard>

        {/* 3 — Badges & Loyalty */}
        <SectionCard
          delay={0.15}
          headerBg="bg-amber-500/5"
          iconBg="bg-amber-500/15"
          iconClass="text-amber-600 dark:text-amber-400"
          icon={Trophy}
          title={l.badges}
          desc={l.badgesDesc}
        >
          <div className="space-y-5">
            <VolunteerLoyaltyProgress userId={userId} language={language as Language} totalPoints={loyaltyPoints} />
            <VolunteerBadges userId={userId} language={language as Language} />
          </div>
        </SectionCard>

        {/* 4 — Buddies */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.17 }}
        >
          <BuddiesCard userId={userId} language={language as Language} />
        </motion.div>

        {/* 5 — Skills & Academy */}
        <SectionCard
          delay={0.2}
          headerBg="bg-violet-500/5"
          iconBg="bg-violet-500/15"
          iconClass="text-violet-600 dark:text-violet-400"
          icon={GraduationCap}
          title={l.skills}
          desc={l.skillsDesc}
        >
          <div className="space-y-5">
            <SkillsPassport userId={userId} language={language as Language} />
            <MicroLearningsSection userId={userId} language={language as Language} />
          </div>
        </SectionCard>

        {/* 6 — Nearby Clubs */}
        <SectionCard
          delay={0.25}
          headerBg="bg-sky-500/5"
          iconBg="bg-sky-500/15"
          iconClass="text-sky-600 dark:text-sky-400"
          icon={MapPin}
          title={l.clubs}
          desc={l.clubsDesc}
        >
          <NearbyClubsWidget userId={userId} language={language as Language} />
        </SectionCard>

        {/* 7 — Calendar Sync */}
        <SectionCard
          delay={0.3}
          headerBg="bg-rose-500/5"
          iconBg="bg-rose-500/15"
          iconClass="text-rose-600 dark:text-rose-400"
          icon={CalendarSync}
          title={l.calendar}
          desc={l.calendarDesc}
        >
          <CalendarSyncSection userId={userId} language={language as Language} />
        </SectionCard>

        {/* 8 — Referral */}
        <SectionCard
          delay={0.35}
          headerBg="bg-orange-500/5"
          iconBg="bg-orange-500/15"
          iconClass="text-orange-600 dark:text-orange-400"
          icon={Gift}
          title={l.referral}
          desc={l.referralDesc}
        >
          <ReferralSection userId={userId} language={language as Language} />
        </SectionCard>

        {/* 9 — Task Preferences */}
        <SectionCard
          delay={0.4}
          headerBg="bg-slate-500/5"
          iconBg="bg-slate-500/15"
          iconClass="text-slate-600 dark:text-slate-400"
          icon={ListChecks}
          title={l.preferences}
          desc={l.preferencesDesc}
        >
          <VolunteerTaskPreferences
            userId={userId}
            language={language as Language}
            tasks={tasks}
            signedUpTaskIds={signedUpTaskIds}
            onNavigateToTask={(taskId) => navigate(`/task/${taskId}`)}
          />
        </SectionCard>
      </div>
    </DashboardLayout>
  );
};

export default VolunteerDetails;
