import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import {
  MapPin, Users, Calendar, Heart, HeartOff, ArrowLeft, Trophy, Clock,
  Building2, ArrowRight, Star, Gift, X, Award, Sparkles, CheckCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface ClubDetail {
  id: string;
  name: string;
  sport: string | null;
  location: string | null;
  logo_url: string | null;
  description: string | null;
  why_volunteer?: string | null;
}

interface ClubTask {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  status: string;
  signup_count: number;
}

interface BadgeDef {
  id: string;
  icon: string;
  key: string;
  name_nl: string;
  name_fr: string;
  name_en: string;
  description_nl: string | null;
  description_fr: string | null;
  description_en: string | null;
}

const CommunityClubDetail = () => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [tasks, setTasks] = useState<ClubTask[]>([]);
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [togglingFollow, setTogglingFollow] = useState(false);
  const [stats, setStats] = useState({ volunteers: 0, events: 0, avgRating: 0, ratingCount: 0 });
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [interestSending, setInterestSending] = useState(false);

  // SEO
  useEffect(() => {
    if (!club) return;
    document.title = `${club.name} — ${t3('Word vrijwilliger', 'Devenez bénévole', 'Become a volunteer')}`;
    const metaDesc = document.querySelector('meta[name="description"]');
    const desc = `${t3('Vrijwilligen bij', 'Bénévolat chez', 'Volunteer at')} ${club.name}${club.sport ? ` (${club.sport})` : ''}${club.location ? ` in ${club.location}` : ''}. ${club.description?.slice(0, 120) || ''}`;
    if (metaDesc) metaDesc.setAttribute('content', desc);
    else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = desc;
      document.head.appendChild(meta);
    }
    return () => { document.title = 'PlayMaker Palace'; };
  }, [club, language]);

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      // Check auth (optional)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        const [followRes, membershipRes] = await Promise.all([
          supabase.from('club_follows').select('id').eq('user_id', session.user.id).eq('club_id', clubId).maybeSingle(),
          supabase.from('club_memberships').select('id').eq('volunteer_id', session.user.id).eq('club_id', clubId).maybeSingle(),
        ]);
        setIsFollowing(!!followRes.data);
        setIsMember(!!membershipRes.data);
      }

      // Load club data (use clubs_safe view for public access, fallback to clubs)
      const { data: clubData } = await (supabase as any).from('clubs_safe').select('*').eq('id', clubId).maybeSingle();
      if (!clubData) { navigate('/community'); return; }
      setClub(clubData);

      // Parallel: tasks, badges, stats
      const now = new Date().toISOString();
      const [tasksRes, badgesRes, membershipsRes, eventsRes, reviewsRes] = await Promise.all([
        supabase.from('tasks').select('id, title, description, task_date, location, spots_available, status')
          .eq('club_id', clubId).eq('status', 'open').gte('task_date', now).order('task_date', { ascending: true }).limit(20),
        supabase.from('badge_definitions').select('id, icon, key, name_nl, name_fr, name_en, description_nl, description_fr, description_en'),
        supabase.from('club_memberships').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'actief'),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('club_id', clubId),
        (supabase as any).from('task_reviews').select('rating, task_id, reviewer_role')
          .eq('reviewer_role', 'volunteer'),
      ]);

      // Count signups per task
      const taskRows = tasksRes.data || [];
      if (taskRows.length > 0) {
        const taskIds = taskRows.map(t => t.id);
        const { data: signups } = await supabase.from('task_signups').select('task_id').in('task_id', taskIds);
        const counts: Record<string, number> = {};
        signups?.forEach(s => { counts[s.task_id] = (counts[s.task_id] || 0) + 1; });
        setTasks(taskRows.map(t => ({ ...t, signup_count: counts[t.id] || 0 })));
      } else {
        setTasks([]);
      }

      setBadges(badgesRes.data || []);

      // Filter reviews for this club's tasks
      const allClubTaskIds = new Set(taskRows.map(t => t.id));
      // We need all task ids for this club to match reviews
      const { data: allTasksForClub } = await supabase.from('tasks').select('id').eq('club_id', clubId);
      const clubTaskIds = new Set((allTasksForClub || []).map(t => t.id));
      const clubReviews = (reviewsRes.data || []).filter((r: any) => clubTaskIds.has(r.task_id));
      const avgRating = clubReviews.length > 0
        ? clubReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / clubReviews.length
        : 0;

      setStats({
        volunteers: membershipsRes.count || 0,
        events: eventsRes.count || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount: clubReviews.length,
      });

      setLoading(false);
    };
    load();
  }, [clubId, navigate]);

  const toggleFollow = async () => {
    if (!currentUserId) { navigate('/login'); return; }
    setTogglingFollow(true);
    if (isFollowing) {
      await supabase.from('club_follows').delete().eq('user_id', currentUserId).eq('club_id', clubId!);
      setIsFollowing(false);
      toast.success(t3('Club ontvolgd', 'Club non suivi', 'Club unfollowed'));
      setTogglingFollow(false);
    } else {
      setShowReferralDialog(true);
      setTogglingFollow(false);
    }
  };

  const confirmFollow = async (code?: string) => {
    if (!currentUserId || !clubId) return;
    setShowReferralDialog(false);
    setTogglingFollow(true);
    await supabase.from('club_follows').insert({ user_id: currentUserId, club_id: clubId });
    setIsFollowing(true);

    if (code && code.trim()) {
      const trimmedCode = code.trim().toUpperCase();
      const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', trimmedCode).neq('id', currentUserId).maybeSingle();
      if (referrer) {
        await supabase.from('club_referrals').insert({ club_id: clubId, referrer_id: referrer.id, referred_id: currentUserId, status: 'pending' } as any);
        toast.success(t3('Referral-code toegepast!', 'Code de parrainage appliqué !', 'Referral code applied!'));
      } else {
        toast.error(t3('Ongeldige referral-code', 'Code invalide', 'Invalid referral code'));
      }
    }
    toast.success(t3('Club gevolgd!', 'Club suivi !', 'Club followed!'));
    setReferralCode('');
    setTogglingFollow(false);
  };

  const handleSignup = (taskId: string) => {
    if (!currentUserId) { navigate('/login'); return; }
    navigate(`/task/${taskId}`);
  };

  const handleInterest = async () => {
    if (!currentUserId || !clubId) { navigate('/login'); return; }
    setInterestSending(true);
    try {
      await supabase.from('club_memberships').insert({
        volunteer_id: currentUserId,
        club_id: clubId,
        status: 'pending',
        club_role: 'volunteer',
      });
      // Notify club owner
      if (club) {
        const { data: clubData } = await supabase.from('clubs').select('owner_id').eq('id', clubId).maybeSingle();
        if (clubData?.owner_id) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).maybeSingle();
          await supabase.from('notifications').insert({
            user_id: clubData.owner_id,
            title: t3('Nieuwe interesse', 'Nouvel intérêt', 'New interest'),
            message: `${profile?.full_name || 'Iemand'} ${t3('wil lid worden van', 'souhaite rejoindre', 'wants to join')} ${club.name}`,
            type: 'task',
            metadata: { club_id: clubId, volunteer_id: currentUserId, action: 'interest' },
          });
        }
      }
      setIsMember(true);
      toast.success(t3('Interesse gemeld!', 'Intérêt signalé !', 'Interest registered!'));
    } catch {
      toast.error(t3('Er ging iets mis', 'Quelque chose a mal tourné', 'Something went wrong'));
    }
    setInterestSending(false);
  };

  const dateFmt = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  if (loading || !club) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-20">
          <div className="h-56 rounded-2xl bg-muted animate-pulse mb-6" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  const badgeName = (b: BadgeDef) => language === 'nl' ? b.name_nl : language === 'fr' ? b.name_fr : b.name_en;
  const badgeDesc = (b: BadgeDef) => language === 'nl' ? b.description_nl : language === 'fr' ? b.description_fr : b.description_en;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-14">
        <div className="h-56 md:h-64 bg-gradient-to-br from-secondary/30 via-primary/15 to-accent/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--secondary)/0.15),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.1),transparent_60%)]" />
        </div>
        <div className="container mx-auto px-4 -mt-20 relative z-10">
          <div className="flex flex-col md:flex-row items-start gap-5">
            <Avatar className="w-32 h-32 border-4 border-card shadow-elevated">
              {club.logo_url ? <AvatarImage src={club.logo_url} alt={club.name} /> : null}
              <AvatarFallback className="text-4xl font-bold bg-secondary text-secondary-foreground">
                {club.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-2">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-muted-foreground gap-1" onClick={() => navigate('/community')}>
                    <ArrowLeft className="w-4 h-4" /> Community
                  </Button>
                  <h1 className="text-3xl md:text-4xl font-bold font-heading text-foreground">{club.name}</h1>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {club.sport && <Badge variant="secondary" className="text-sm">{club.sport}</Badge>}
                    {club.location && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {club.location}
                      </span>
                    )}
                    {stats.avgRating > 0 && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {stats.avgRating} ({stats.ratingCount})
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={toggleFollow}
                  disabled={togglingFollow}
                  variant={isFollowing ? 'outline' : 'default'}
                  className="gap-2 rounded-xl"
                >
                  {isFollowing ? <><HeartOff className="w-4 h-4" /> {t3('Ontvolgen', 'Ne plus suivre', 'Unfollow')}</> : <><Heart className="w-4 h-4" /> {t3('Volgen', 'Suivre', 'Follow')}</>}
                </Button>
                {isMember === false && (
                  <Button
                    onClick={handleInterest}
                    disabled={interestSending}
                    variant="secondary"
                    className="gap-2 rounded-xl"
                  >
                    <Users className="w-4 h-4" />
                    {t3('Meld interesse', 'Signaler intérêt', 'Register interest')}
                  </Button>
                )}
                {isMember === true && (
                  <Badge variant="secondary" className="h-10 px-4 flex items-center gap-1.5 text-sm">
                    <CheckCircle className="w-4 h-4" /> {t3('Lid', 'Membre', 'Member')}
                  </Badge>
                )}
              </div>
              {club.description && (
                <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-relaxed">{club.description}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: Users, label: t3('Actieve vrijwilligers', 'Bénévoles actifs', 'Active volunteers'), value: stats.volunteers, color: 'text-secondary' },
              { icon: Calendar, label: t3('Open posities', 'Postes ouverts', 'Open positions'), value: tasks.length, color: 'text-primary' },
              { icon: Trophy, label: t3('Evenementen', 'Événements', 'Events'), value: stats.events, color: 'text-accent' },
              { icon: Star, label: t3('Beoordeling', 'Évaluation', 'Rating'), value: stats.avgRating > 0 ? `${stats.avgRating}/5` : '—', color: 'text-yellow-500' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-card rounded-xl border border-border/50 p-4 text-center shadow-card"
              >
                <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
                <p className="text-2xl font-bold font-heading">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="container mx-auto px-4 py-10">
        <h2 className="text-xl font-heading font-bold text-foreground mb-5 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {t3('Open posities', 'Postes ouverts', 'Open positions')}
        </h2>
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border/50">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t3('Momenteel geen openstaande posities', 'Aucune position ouverte', 'No open positions at the moment')}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl border border-border/50 p-5 hover:shadow-card transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-lg">{task.title}</h3>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {task.spots_available - task.signup_count} {t3('plaatsen', 'places', 'spots')}
                  </Badge>
                </div>
                {task.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap mb-4">
                  {task.task_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(task.task_date).toLocaleDateString(dateFmt, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  {task.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {task.location}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full rounded-xl gap-1.5"
                  onClick={() => handleSignup(task.id)}
                  disabled={task.signup_count >= task.spots_available}
                >
                  <CheckCircle className="w-4 h-4" />
                  {task.signup_count >= task.spots_available
                    ? t3('Volzet', 'Complet', 'Full')
                    : t3('Inschrijven', 'S\'inscrire', 'Sign up')}
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Why Volunteer */}
      {club.why_volunteer && (
        <section className="container mx-auto px-4 pb-10">
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border/50 p-8">
            <h2 className="text-xl font-heading font-bold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t3('Waarom vrijwilliger worden?', 'Pourquoi devenir bénévole ?', 'Why volunteer?')}
            </h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{club.why_volunteer}</p>
          </div>
        </section>
      )}

      {/* Badges & Benefits */}
      {badges.length > 0 && (
        <section className="container mx-auto px-4 pb-10">
          <h2 className="text-xl font-heading font-bold text-foreground mb-5 flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" />
            {t3('Badges & voordelen', 'Badges & avantages', 'Badges & benefits')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-xl border border-border/50 p-4 text-center hover:shadow-card transition-all"
              >
                <span className="text-3xl block mb-2">{badge.icon}</span>
                <p className="text-sm font-semibold text-foreground">{badgeName(badge)}</p>
                {badgeDesc(badge) && (
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{badgeDesc(badge)}</p>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Block */}
      <section className="container mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 rounded-2xl border border-primary/20 p-8 md:p-12 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">
            {t3(
              `Word vrijwilliger bij ${club.name}`,
              `Devenez bénévole chez ${club.name}`,
              `Become a volunteer at ${club.name}`,
            )}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            {t3(
              'Maak deel uit van een geweldig team en draag bij aan onvergetelijke evenementen.',
              'Rejoignez une équipe formidable et contribuez à des événements inoubliables.',
              'Join an amazing team and contribute to unforgettable events.',
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="rounded-xl gap-2 text-base px-8" onClick={() => navigate(currentUserId ? '/dashboard' : '/signup')}>
              <Users className="w-5 h-5" />
              {t3('Word vrijwilliger', 'Devenez bénévole', 'Become a volunteer')}
            </Button>
            {!isFollowing && (
              <Button size="lg" variant="outline" className="rounded-xl gap-2 text-base px-8" onClick={toggleFollow}>
                <Heart className="w-5 h-5" />
                {t3('Volg deze club', 'Suivre ce club', 'Follow this club')}
              </Button>
            )}
          </div>
        </motion.div>
      </section>

      <Footer />

      {/* Referral Code Dialog */}
      {showReferralDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => { setShowReferralDialog(false); confirmFollow(); }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl shadow-elevated p-6 w-full max-w-sm space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">
                  {t3('Referral-code', 'Code de parrainage', 'Referral code')}
                </h3>
              </div>
              <button onClick={() => { setShowReferralDialog(false); confirmFollow(); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t3(
                `Heb je een uitnodigingscode gekregen van iemand die al vrijwilliger is bij ${club.name}?`,
                `Avez-vous reçu un code d'invitation d'un bénévole de ${club.name} ?`,
                `Got a referral code from someone volunteering at ${club.name}?`,
              )}
            </p>
            <Input
              placeholder={t3('Bijv. AC241A17', 'Ex. AC241A17', 'E.g. AC241A17')}
              value={referralCode}
              onChange={e => setReferralCode(e.target.value.toUpperCase())}
              className="text-center text-lg tracking-widest font-mono"
              maxLength={12}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowReferralDialog(false); confirmFollow(); }}>
                {t3('Overslaan', 'Passer', 'Skip')}
              </Button>
              <Button className="flex-1" onClick={() => confirmFollow(referralCode)} disabled={!referralCode.trim()}>
                {t3('Toepassen & volgen', 'Appliquer & suivre', 'Apply & follow')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CommunityClubDetail;
