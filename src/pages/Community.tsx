import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useClubContext } from '@/contexts/ClubContext';
import { motion } from 'framer-motion';
import { Search, MapPin, Users, Heart, HeartOff, Trophy, Calendar, Building2, ArrowRight, Sparkles, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClubWithStats {
  id: string;
  name: string;
  sport: string | null;
  location: string | null;
  logo_url: string | null;
  description: string | null;
  task_count: number;
  upcoming_task_count: number;
  volunteer_count: number;
  event_count: number;
  partner_count: number;
  is_following: boolean;
  avg_rating: number;
  rating_count: number;
}

const BELGIAN_PROVINCES = [
  'Antwerpen', 'Brussel', 'Henegouwen', 'Limburg', 'Luik',
  'Luxemburg', 'Namen', 'Oost-Vlaanderen', 'Vlaams-Brabant',
  'Waals-Brabant', 'West-Vlaanderen',
];

const communityLabels: Record<'nl' | 'fr' | 'en', Record<string, string>> = {
  nl: {
    badge: 'Community',
    heroTitle: 'Ontdek sportclubs',
    heroSubtitle: 'Volg jouw favoriete clubs en krijg hun taken op je feed. Ontdek partners en evenementen.',
    searchPlaceholder: 'Zoek op naam of locatie...',
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
    recommended: 'Aanbevolen voor jou',
    sportFilter: 'Sport',
    cityFilter: 'Stad/regio',
    openOnly: 'Enkel clubs met open taken',
  },
  fr: {
    badge: 'Communauté',
    heroTitle: 'Découvrez les clubs sportifs',
    heroSubtitle: 'Suivez vos clubs préférés et recevez leurs tâches dans votre fil. Découvrez les partenaires et événements.',
    searchPlaceholder: 'Rechercher par nom ou lieu...',
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
    recommended: 'Recommandé pour vous',
    sportFilter: 'Sport',
    cityFilter: 'Ville/région',
    openOnly: 'Uniquement les clubs avec des tâches ouvertes',
  },
  en: {
    badge: 'Community',
    heroTitle: 'Discover sports clubs',
    heroSubtitle: 'Follow your favourite clubs and get their tasks in your feed. Discover partners and events.',
    searchPlaceholder: 'Search by name or location...',
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
    recommended: 'Recommended for you',
    sportFilter: 'Sport',
    cityFilter: 'City/region',
    openOnly: 'Only clubs with open tasks',
  },
};

const Community = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const cl = communityLabels[language];
  const [clubs, setClubs] = useState<ClubWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSport, setFilterSport] = useState<string>('__all__');
  const [cityQuery, setCityQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [togglingFollow, setTogglingFollow] = useState<string | null>(null);
  const [sports, setSports] = useState<string[]>([]);
  const [userCity, setUserCity] = useState<string | null>(null);

  const { userId: contextUserId } = useClubContext();

  useEffect(() => {
    const load = async () => {
      if (contextUserId) setCurrentUserId(contextUserId);

      const [clubsRes, followsRes, profileRes] = await Promise.all([
        supabase.from('clubs').select('*'),
        contextUserId
          ? supabase.from('club_follows').select('club_id').eq('user_id', contextUserId)
          : Promise.resolve({ data: [] as any[] }),
        contextUserId
          ? (supabase as any).from('profiles').select('city').eq('id', contextUserId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const clubsData = clubsRes.data;
      if (!clubsData) { setLoading(false); return; }

      if (profileRes.data?.city) setUserCity(profileRes.data.city);

      const followSet = new Set<string>(followsRes.data?.map((f: any) => f.club_id) || []);
      setFollowingIds(followSet);

      const clubIds = clubsData.map(c => c.id);

      const [tasksRes, signupsRes, eventsRes, partnersRes, allTasksRes, reviewsRes] = await Promise.all([
        supabase.from('tasks').select('club_id').in('club_id', clubIds).eq('status', 'open'),
        supabase.from('task_signups').select('task_id, volunteer_id'),
        supabase.from('events').select('club_id').in('club_id', clubIds),
        supabase.from('external_partners').select('club_id').in('club_id', clubIds),
        supabase.from('tasks').select('id, club_id').in('club_id', clubIds),
        (supabase as any).from('task_reviews').select('rating, task_id, reviewer_role').eq('reviewer_role', 'volunteer'),
      ]);

      const taskCounts: Record<string, number> = {};
      tasksRes.data?.forEach(t => { taskCounts[t.club_id] = (taskCounts[t.club_id] || 0) + 1; });

      const fullTaskClubMap: Record<string, string> = {};
      allTasksRes.data?.forEach((t: any) => { fullTaskClubMap[t.id] = t.club_id; });

      const volunteerSets: Record<string, Set<string>> = {};
      signupsRes.data?.forEach((s: any) => {
        const cid = fullTaskClubMap[s.task_id];
        if (cid) {
          if (!volunteerSets[cid]) volunteerSets[cid] = new Set();
          volunteerSets[cid].add(s.volunteer_id);
        }
      });

      const eventCounts: Record<string, number> = {};
      eventsRes.data?.forEach((e: any) => { eventCounts[e.club_id] = (eventCounts[e.club_id] || 0) + 1; });

      const partnerCounts: Record<string, number> = {};
      partnersRes.data?.forEach((p: any) => { partnerCounts[p.club_id] = (partnerCounts[p.club_id] || 0) + 1; });

      // Compute avg rating per club
      const clubRatings: Record<string, { sum: number; count: number }> = {};
      (reviewsRes.data || []).forEach((r: any) => {
        const cid = fullTaskClubMap[r.task_id];
        if (cid && r.rating) {
          if (!clubRatings[cid]) clubRatings[cid] = { sum: 0, count: 0 };
          clubRatings[cid].sum += r.rating;
          clubRatings[cid].count += 1;
        }
      });

      const enriched: ClubWithStats[] = clubsData.map(c => ({
        ...c,
        task_count: taskCounts[c.id] || 0,
        volunteer_count: volunteerSets[c.id]?.size || 0,
        event_count: eventCounts[c.id] || 0,
        partner_count: partnerCounts[c.id] || 0,
        is_following: followSet.has(c.id),
        avg_rating: clubRatings[c.id] ? Math.round((clubRatings[c.id].sum / clubRatings[c.id].count) * 10) / 10 : 0,
        rating_count: clubRatings[c.id]?.count || 0,
      }));

      const sportMap = new Map<string, string>();
      enriched.forEach(c => {
        if (c.sport) {
          const key = c.sport.toLowerCase();
          if (!sportMap.has(key)) sportMap.set(key, c.sport);
        }
      });
      setSports([...sportMap.values()]);
      setClubs(enriched);
      setLoading(false);
    };
    load();
  }, [contextUserId]);

  const toggleFollow = async (clubId: string) => {
    if (!currentUserId) { navigate('/login'); return; }
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
      c.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSport = filterSport === '__all__' || c.sport?.toLowerCase() === filterSport.toLowerCase();
    const matchCity = !cityQuery || c.location?.toLowerCase().includes(cityQuery.toLowerCase());
    const matchOpen = !openOnly || c.task_count > 0;
    return matchSearch && matchSport && matchCity && matchOpen;
  });

  // Recommended: clubs in same city, not yet following, max 3
  const recommended = userCity
    ? filtered
        .filter(c => !c.is_following && c.location?.toLowerCase().includes(userCity.toLowerCase()))
        .sort((a, b) => b.task_count - a.task_count)
        .slice(0, 3)
    : [];

  const followedClubs = filtered.filter(c => c.is_following);
  const recommendedIds = new Set(recommended.map(c => c.id));
  const otherClubs = filtered.filter(c => !c.is_following && !recommendedIds.has(c.id));

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

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto space-y-3"
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
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filterSport} onValueChange={setFilterSport}>
                <SelectTrigger className="w-[160px] h-9 rounded-xl text-xs bg-card">
                  <SelectValue placeholder={cl.sportFilter} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{cl.all}</SelectItem>
                  {sports.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1 min-w-[140px] max-w-[200px]">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder={cl.cityFilter}
                  value={cityQuery}
                  onChange={e => setCityQuery(e.target.value)}
                  className="pl-8 h-9 text-xs rounded-xl bg-card"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox checked={openOnly} onCheckedChange={v => setOpenOnly(v === true)} />
                {cl.openOnly}
              </label>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Recommended */}
            {recommended.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-xl font-bold font-heading">{cl.recommended}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommended.map((club, i) => (
                    <ClubCard key={club.id} club={club} index={i} onToggleFollow={toggleFollow} toggling={togglingFollow} />
                  ))}
                </div>
              </div>
            )}

            {/* Followed Clubs */}
            {followedClubs.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-primary fill-primary" />
                  <h2 className="text-xl font-bold font-heading">{cl.yourClubs}</h2>
                  <Badge variant="secondary" className="ml-2">{followedClubs.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {followedClubs.map((club, i) => (
                    <ClubCard key={club.id} club={club} index={i} onToggleFollow={toggleFollow} toggling={togglingFollow} />
                  ))}
                </div>
              </div>
            )}

            {/* All / Other Clubs */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-bold font-heading">
                  {followedClubs.length > 0 ? cl.otherClubs : cl.allClubs}
                </h2>
                <Badge variant="outline" className="ml-2">{otherClubs.length}</Badge>
              </div>
              {otherClubs.length === 0 && filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>{cl.noClubs}</p>
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
  const { language } = useLanguage();
  const cl = communityLabels[language];

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
              <Heart className="w-3 h-3 fill-current" /> {cl.following}
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
        {club.avg_rating > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="font-medium text-foreground">{club.avg_rating}</span>
            <span>({club.rating_count})</span>
          </p>
        )}
        {club.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{club.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" /> {club.task_count} {cl.tasks}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-secondary" /> {club.volunteer_count} {cl.volunteers}
          </span>
          <span className="flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-accent" /> {club.event_count} {cl.events}
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
                <HeartOff className="w-3.5 h-3.5" /> {cl.unfollow}
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5" /> {cl.follow}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9 text-xs gap-1 rounded-xl"
            onClick={() => navigate(`/community/club/${club.id}`)}
          >
            {cl.view} <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default Community;
