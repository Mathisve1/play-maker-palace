import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Search, MapPin, Users, Heart, HeartOff, Trophy, Calendar, Building2, ArrowRight, Sparkles, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/i18n/LanguageContext';

interface ClubWithStats {
  id: string;
  name: string;
  sport: string | null;
  location: string | null;
  logo_url: string | null;
  description: string | null;
  task_count: number;
  volunteer_count: number;
  event_count: number;
  partner_count: number;
  is_following: boolean;
}

const communityLabels: Record<'nl' | 'fr' | 'en', Record<string, string>> = {
  nl: {
    badge: 'Community',
    heroTitle: 'Ontdek sportclubs',
    heroSubtitle: 'Volg jouw favoriete clubs en krijg hun taken op je feed. Ontdek partners en evenementen.',
    searchPlaceholder: 'Zoek op naam, sport of locatie...',
    all: 'Alles',
    yourClubs: 'Jouw clubs',
    otherClubs: 'Andere clubs',
    allClubs: 'Alle clubs',
    noClubs: 'Geen clubs gevonden',
    unfollowed: 'Club ontvolgd',
    followed: 'Club gevolgd! Je ziet nu hun taken in je feed.',
    following: 'Volgend',
    unfollow: 'Ontvolgen',
    follow: 'Volgen',
    view: 'Bekijken',
    tasks: 'taken',
    volunteers: 'vrijwilligers',
    events: 'events',
  },
  fr: {
    badge: 'Communauté',
    heroTitle: 'Découvrez les clubs sportifs',
    heroSubtitle: 'Suivez vos clubs préférés et recevez leurs tâches dans votre fil. Découvrez les partenaires et événements.',
    searchPlaceholder: 'Rechercher par nom, sport ou lieu...',
    all: 'Tout',
    yourClubs: 'Vos clubs',
    otherClubs: 'Autres clubs',
    allClubs: 'Tous les clubs',
    noClubs: 'Aucun club trouvé',
    unfollowed: 'Club non suivi',
    followed: 'Club suivi ! Vous verrez leurs tâches dans votre fil.',
    following: 'Suivi',
    unfollow: 'Ne plus suivre',
    follow: 'Suivre',
    view: 'Voir',
    tasks: 'tâches',
    volunteers: 'bénévoles',
    events: 'événements',
  },
  en: {
    badge: 'Community',
    heroTitle: 'Discover sports clubs',
    heroSubtitle: 'Follow your favourite clubs and get their tasks in your feed. Discover partners and events.',
    searchPlaceholder: 'Search by name, sport or location...',
    all: 'All',
    yourClubs: 'Your clubs',
    otherClubs: 'Other clubs',
    allClubs: 'All clubs',
    noClubs: 'No clubs found',
    unfollowed: 'Club unfollowed',
    followed: 'Club followed! You will now see their tasks in your feed.',
    following: 'Following',
    unfollow: 'Unfollow',
    follow: 'Follow',
    view: 'View',
    tasks: 'tasks',
    volunteers: 'volunteers',
    events: 'events',
  },
};

const Community = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const cl = communityLabels[language];
  const [clubs, setClubs] = useState<ClubWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSport, setFilterSport] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [togglingFollow, setTogglingFollow] = useState<string | null>(null);
  const [sports, setSports] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);

      // Fetch clubs
      const { data: clubsData } = await supabase.from('clubs').select('*');
      if (!clubsData) { setLoading(false); return; }

      // Fetch follows
      let followSet = new Set<string>();
      if (session) {
        const { data: follows } = await supabase.from('club_follows').select('club_id').eq('user_id', session.user.id);
        followSet = new Set(follows?.map(f => f.club_id) || []);
        setFollowingIds(followSet);
      }

      // Fetch stats per club
      const clubIds = clubsData.map(c => c.id);
      
      // Tasks count
      const { data: tasksData } = await supabase.from('tasks').select('club_id').in('club_id', clubIds).eq('status', 'open');
      const taskCounts: Record<string, number> = {};
      tasksData?.forEach(t => { taskCounts[t.club_id] = (taskCounts[t.club_id] || 0) + 1; });

      // Unique volunteers (via signups)
      const { data: signupsData } = await supabase.from('task_signups').select('task_id, volunteer_id');
      const volunteerSets: Record<string, Set<string>> = {};
      const taskClubMap: Record<string, string> = {};
      tasksData?.forEach(t => { taskClubMap[t.club_id] = t.club_id; });
      // We need task->club mapping for all tasks
      const { data: allTasks } = await supabase.from('tasks').select('id, club_id').in('club_id', clubIds);
      const fullTaskClubMap: Record<string, string> = {};
      allTasks?.forEach(t => { fullTaskClubMap[t.id] = t.club_id; });
      signupsData?.forEach(s => {
        const cid = fullTaskClubMap[s.task_id];
        if (cid) {
          if (!volunteerSets[cid]) volunteerSets[cid] = new Set();
          volunteerSets[cid].add(s.volunteer_id);
        }
      });

      // Events count
      const { data: eventsData } = await (supabase as any).from('events').select('club_id').in('club_id', clubIds);
      const eventCounts: Record<string, number> = {};
      eventsData?.forEach((e: any) => { eventCounts[e.club_id] = (eventCounts[e.club_id] || 0) + 1; });

      // Partners count
      const { data: partnersData } = await supabase.from('external_partners').select('club_id').in('club_id', clubIds);
      const partnerCounts: Record<string, number> = {};
      partnersData?.forEach(p => { partnerCounts[p.club_id] = (partnerCounts[p.club_id] || 0) + 1; });

      const enriched: ClubWithStats[] = clubsData.map(c => ({
        ...c,
        task_count: taskCounts[c.id] || 0,
        volunteer_count: volunteerSets[c.id]?.size || 0,
        event_count: eventCounts[c.id] || 0,
        partner_count: partnerCounts[c.id] || 0,
        is_following: followSet.has(c.id),
      }));

      // Extract unique sports
      const uniqueSports = [...new Set(enriched.map(c => c.sport).filter(Boolean))] as string[];
      setSports(uniqueSports);

      setClubs(enriched);
      setLoading(false);
    };
    load();
  }, []);

  const toggleFollow = async (clubId: string) => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    setTogglingFollow(clubId);
    const isFollowing = followingIds.has(clubId);
    
    if (isFollowing) {
      await supabase.from('club_follows').delete().eq('user_id', currentUserId).eq('club_id', clubId);
      setFollowingIds(prev => { const n = new Set(prev); n.delete(clubId); return n; });
      setClubs(prev => prev.map(c => c.id === clubId ? { ...c, is_following: false } : c));
      toast.success(cl.unfollowed);
    } else {
      await supabase.from('club_follows').insert({ user_id: currentUserId, club_id: clubId });
      setFollowingIds(prev => new Set(prev).add(clubId));
      setClubs(prev => prev.map(c => c.id === clubId ? { ...c, is_following: true } : c));
      toast.success(cl.followed);
    }
    setTogglingFollow(null);
  };

  const filtered = clubs.filter(c => {
    const matchSearch = !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sport?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSport = !filterSport || c.sport === filterSport;
    return matchSearch && matchSport;
  });

  const followedClubs = filtered.filter(c => c.is_following);
  const otherClubs = filtered.filter(c => !c.is_following);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              {cl.badge}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-heading mb-3">
              {cl.heroTitle}
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              {cl.heroSubtitle}
            </p>
          </motion.div>

          {/* Search & Filter */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-xl mx-auto"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={cl.searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base rounded-xl border-border/50 bg-card shadow-card"
              />
            </div>
            {sports.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                <button
                  onClick={() => setFilterSport(null)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                   !filterSport ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {cl.all}
                </button>
                {sports.map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterSport(filterSport === s ? null : s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterSport === s ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Followed Clubs */}
            {followedClubs.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-primary fill-primary" />
                  <h2 className="text-xl font-bold font-heading">Jouw clubs</h2>
                  <Badge variant="secondary" className="ml-2">{followedClubs.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {followedClubs.map((club, i) => (
                    <ClubCard key={club.id} club={club} index={i} onToggleFollow={toggleFollow} toggling={togglingFollow} />
                  ))}
                </div>
              </div>
            )}

            {/* All Clubs */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-bold font-heading">
                  {followedClubs.length > 0 ? 'Andere clubs' : 'Alle clubs'}
                </h2>
                <Badge variant="outline" className="ml-2">{otherClubs.length}</Badge>
              </div>
              {otherClubs.length === 0 && filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Geen clubs gevonden</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherClubs.map((club, i) => (
                    <ClubCard key={club.id} club={club} index={i} onToggleFollow={toggleFollow} toggling={togglingFollow} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
};

const ClubCard = ({ club, index, onToggleFollow, toggling }: { 
  club: ClubWithStats; 
  index: number; 
  onToggleFollow: (id: string) => void;
  toggling: string | null;
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative bg-card rounded-2xl border border-border/50 shadow-card hover:shadow-elevated transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => navigate(`/community/club/${club.id}`)}
    >
      {/* Header gradient */}
      <div className="h-24 bg-gradient-to-br from-secondary/20 via-primary/10 to-accent/10 relative">
        {club.is_following && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary/90 text-primary-foreground text-[10px] gap-1">
              <Heart className="w-3 h-3 fill-current" /> Volgend
            </Badge>
          </div>
        )}
        {club.sport && (
          <Badge variant="secondary" className="absolute top-3 right-3 text-[10px]">
            {club.sport}
          </Badge>
        )}
      </div>

      {/* Avatar overlapping header */}
      <div className="px-5 -mt-10 relative z-10">
        <Avatar className="w-16 h-16 border-4 border-card shadow-md">
          {club.logo_url ? (
            <AvatarImage src={club.logo_url} alt={club.name} />
          ) : null}
          <AvatarFallback className="text-lg font-bold bg-secondary text-secondary-foreground">
            {club.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Info */}
      <div className="px-5 pt-3 pb-4">
        <h3 className="font-bold font-heading text-lg group-hover:text-primary transition-colors truncate">
          {club.name}
        </h3>
        {club.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" /> {club.location}
          </p>
        )}
        {club.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{club.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" /> {club.task_count} taken
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-secondary" /> {club.volunteer_count} vrijwilligers
          </span>
          <span className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-accent" /> {club.event_count} events
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant={club.is_following ? 'outline' : 'default'}
            className="flex-1 h-9 text-xs gap-1.5 rounded-xl"
            onClick={() => onToggleFollow(club.id)}
            disabled={toggling === club.id}
          >
            {club.is_following ? (
              <>
                <HeartOff className="w-3.5 h-3.5" /> Ontvolgen
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5" /> Volgen
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 text-xs gap-1 rounded-xl"
            onClick={() => navigate(`/community/club/${club.id}`)}
          >
            Bekijken <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default Community;
