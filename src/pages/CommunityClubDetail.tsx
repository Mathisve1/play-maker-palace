import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { MapPin, Users, Calendar, Heart, HeartOff, ArrowLeft, Trophy, Clock, Briefcase, Building2, ArrowRight, Star, TrendingUp, Gift, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

interface ClubPartner {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  contact_name: string | null;
}

interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  status: string;
}

const detailLabels = {
  nl: {
    unfollow: 'Ontvolgen', follow: 'Volgen', unfollowed: 'Club ontvolgd', followed: 'Club gevolgd!',
    volunteers: 'Vrijwilligers', openTasks: 'Open taken', events: 'Events', completedTasks: 'Afgeronde taken',
    tasks: 'Taken', partners: 'Partners', noTasks: 'Momenteel geen openstaande taken',
    noPartners: 'Geen partners', noEvents: 'Nog geen events',
  },
  fr: {
    unfollow: 'Ne plus suivre', follow: 'Suivre', unfollowed: 'Club non suivi', followed: 'Club suivi !',
    volunteers: 'Bénévoles', openTasks: 'Tâches ouvertes', events: 'Événements', completedTasks: 'Tâches terminées',
    tasks: 'Tâches', partners: 'Partenaires', noTasks: 'Aucune tâche ouverte',
    noPartners: 'Aucun partenaire', noEvents: 'Pas encore d\'événements',
  },
  en: {
    unfollow: 'Unfollow', follow: 'Follow', unfollowed: 'Club unfollowed', followed: 'Club followed!',
    volunteers: 'Volunteers', openTasks: 'Open tasks', events: 'Events', completedTasks: 'Completed tasks',
    tasks: 'Tasks', partners: 'Partners', noTasks: 'No open tasks at the moment',
    noPartners: 'No partners', noEvents: 'No events yet',
  },
};

const CommunityClubDetail = () => {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const dl = detailLabels[language];
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [tasks, setTasks] = useState<ClubTask[]>([]);
  const [partners, setPartners] = useState<ClubPartner[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [togglingFollow, setTogglingFollow] = useState(false);
  const [stats, setStats] = useState({ volunteers: 0, completedTasks: 0, totalEvents: 0 });
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (!clubId) return;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        const { data: follow } = await supabase.from('club_follows').select('id').eq('user_id', session.user.id).eq('club_id', clubId).maybeSingle();
        setIsFollowing(!!follow);
      }

      const { data: clubData } = await supabase.from('clubs').select('*').eq('id', clubId).maybeSingle();
      if (!clubData) { navigate('/community'); return; }
      setClub(clubData);

      const { data: tasksData } = await supabase.from('tasks').select('id, title, description, task_date, location, spots_available, status').eq('club_id', clubId).eq('status', 'open').order('task_date', { ascending: true });
      
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);
        const { data: signups } = await supabase.from('task_signups').select('task_id').in('task_id', taskIds);
        const counts: Record<string, number> = {};
        signups?.forEach(s => { counts[s.task_id] = (counts[s.task_id] || 0) + 1; });
        setTasks(tasksData.map(t => ({ ...t, signup_count: counts[t.id] || 0 })));
      } else {
        setTasks([]);
      }

      const { data: partnersData } = await supabase.from('external_partners').select('id, name, category, logo_url, contact_name').eq('club_id', clubId);
      setPartners(partnersData || []);

      const { data: eventsData } = await supabase.from('events').select('id, title, description, event_date, location, status').eq('club_id', clubId).neq('status', 'on_hold').order('event_date', { ascending: false }).limit(10);
      setEvents(eventsData || []);

      const { data: allClubTasks } = await supabase.from('tasks').select('id').eq('club_id', clubId);
      const allTaskIds = allClubTasks?.map(t => t.id) || [];
      let uniqueVols = 0;
      if (allTaskIds.length > 0) {
        const { data: allSignups } = await supabase.from('task_signups').select('volunteer_id').in('task_id', allTaskIds);
        uniqueVols = new Set(allSignups?.map(s => s.volunteer_id) || []).size;
      }
      const { count: completedCount } = await supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'completed');
      setStats({
        volunteers: uniqueVols,
        completedTasks: completedCount || 0,
        totalEvents: eventsData?.length || 0,
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
      toast.success(dl.unfollowed);
      setTogglingFollow(false);
    } else {
      // Show referral code dialog before following
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

    // If referral code provided, look up the referrer
    if (code && code.trim()) {
      const trimmedCode = code.trim().toUpperCase();
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', trimmedCode)
        .neq('id', currentUserId)
        .maybeSingle();

      if (referrer) {
        await supabase.from('club_referrals').insert({
          club_id: clubId,
          referrer_id: referrer.id,
          referred_id: currentUserId,
          status: 'pending',
        } as any).then(({ error }) => {
          if (!error) {
            toast.success(language === 'nl' ? 'Referral-code toegepast!' : language === 'fr' ? 'Code de parrainage appliqué !' : 'Referral code applied!');
          }
        });
      } else {
        toast.error(language === 'nl' ? 'Ongeldige referral-code' : language === 'fr' ? 'Code de parrainage invalide' : 'Invalid referral code');
      }
    }

    toast.success(dl.followed);
    setReferralCode('');
    setTogglingFollow(false);
  };

  const dateFmt = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  if (loading || !club) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-20">
          <div className="h-48 rounded-2xl bg-muted animate-pulse mb-6" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-14">
        <div className="h-48 md:h-56 bg-gradient-to-br from-secondary/30 via-primary/15 to-accent/10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--secondary)/0.15),transparent_70%)]" />
        </div>
        <div className="container mx-auto px-4 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row items-start gap-5">
            <Avatar className="w-28 h-28 border-4 border-card shadow-elevated">
              {club.logo_url ? <AvatarImage src={club.logo_url} alt={club.name} /> : null}
              <AvatarFallback className="text-3xl font-bold bg-secondary text-secondary-foreground">
                {club.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-2">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <Button variant="ghost" size="sm" className="mb-2 -ml-3 text-muted-foreground gap-1" onClick={() => navigate('/community')}>
                    <ArrowLeft className="w-4 h-4" /> Community
                  </Button>
                  <h1 className="text-2xl md:text-3xl font-bold font-heading">{club.name}</h1>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {club.sport && <Badge variant="secondary">{club.sport}</Badge>}
                    {club.location && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {club.location}
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
                  {isFollowing ? <><HeartOff className="w-4 h-4" /> {dl.unfollow}</> : <><Heart className="w-4 h-4" /> {dl.follow}</>}
                </Button>
              </div>
              {club.description && (
                <p className="text-muted-foreground mt-3 max-w-2xl">{club.description}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: Users, label: dl.volunteers, value: stats.volunteers, color: 'text-secondary' },
              { icon: Calendar, label: dl.openTasks, value: tasks.length, color: 'text-primary' },
              { icon: Trophy, label: dl.events, value: stats.totalEvents, color: 'text-accent' },
              { icon: TrendingUp, label: dl.completedTasks, value: stats.completedTasks, color: 'text-muted-foreground' },
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

      {/* Tabs */}
      <section className="container mx-auto px-4 py-8 pb-24">
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="tasks" className="rounded-lg text-sm gap-1.5">
              <Calendar className="w-4 h-4" /> {dl.tasks} ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="partners" className="rounded-lg text-sm gap-1.5">
              <Building2 className="w-4 h-4" /> {dl.partners} ({partners.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="rounded-lg text-sm gap-1.5">
              <Trophy className="w-4 h-4" /> {dl.events} ({events.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            {tasks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{dl.noTasks}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {tasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/task/${task.id}`)}
                    className="bg-card rounded-xl border border-border/50 p-4 hover:shadow-card transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">{task.title}</h3>
                        {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          {task.task_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(task.task_date).toLocaleDateString(dateFmt, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          {task.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {task.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {task.signup_count}/{task.spots_available}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="partners" className="mt-6">
            {partners.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{dl.noPartners}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {partners.map((partner, i) => (
                  <motion.div
                    key={partner.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/community/partner/${partner.id}`)}
                    className="bg-card rounded-xl border border-border/50 p-4 hover:shadow-card transition-all cursor-pointer group flex items-center gap-4"
                  >
                    <Avatar className="w-12 h-12 border border-border">
                      {partner.logo_url ? <AvatarImage src={partner.logo_url} alt={partner.name} /> : null}
                      <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
                        {partner.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary transition-colors truncate">{partner.name}</h3>
                      <Badge variant="outline" className="text-[10px] mt-1">{partner.category}</Badge>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            {events.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{dl.noEvents}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate('/dashboard')}
                    className="bg-card rounded-xl border border-border/50 p-4 hover:shadow-card transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{event.title}</h3>
                        {event.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{event.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {event.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(event.event_date).toLocaleDateString(dateFmt, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={event.status === 'open' ? 'default' : 'secondary'} className="text-[10px]">
                        {event.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <Footer />
    </div>
  );
};

export default CommunityClubDetail;
