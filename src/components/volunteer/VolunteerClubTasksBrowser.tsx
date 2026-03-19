import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Language } from '@/i18n/translations';
import { MapPin, Calendar, Clock, Search, Users, ArrowLeft, Loader2, Heart, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClubTask {
  id: string;
  title: string;
  task_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  spots_available: number;
  club_id: string;
  description: string | null;
  signup_count: number;
  clubs: { name: string; logo_url?: string | null; sport?: string | null } | null;
}

const labels = {
  nl: {
    title: 'Taken van jouw clubs',
    subtitle: 'Alle open taken van clubs die je volgt',
    search: 'Zoek taken...',
    signUp: 'Inschrijven',
    signingUp: 'Bezig...',
    signedUp: 'Ingeschreven ✓',
    spotsLeft: 'plaatsen vrij',
    full: 'Volzet',
    noTasks: 'Geen open taken gevonden bij je clubs',
    noClubs: 'Je volgt nog geen clubs. Ga naar de community om clubs te ontdekken!',
    back: 'Terug',
    community: 'Ontdek clubs',
    allClubs: 'Alle clubs',
    success: 'Je bent ingeschreven!',
  },
  fr: {
    title: 'Tâches de vos clubs',
    subtitle: 'Toutes les tâches ouvertes de vos clubs',
    search: 'Chercher des tâches...',
    signUp: "S'inscrire",
    signingUp: 'En cours...',
    signedUp: 'Inscrit ✓',
    spotsLeft: 'places libres',
    full: 'Complet',
    noTasks: 'Aucune tâche ouverte trouvée dans vos clubs',
    noClubs: 'Vous ne suivez aucun club. Découvrez des clubs dans la communauté !',
    back: 'Retour',
    community: 'Découvrir des clubs',
    allClubs: 'Tous les clubs',
    success: 'Vous êtes inscrit !',
  },
  en: {
    title: 'Tasks from your clubs',
    subtitle: 'All open tasks from clubs you follow',
    search: 'Search tasks...',
    signUp: 'Sign up',
    signingUp: 'Signing up...',
    signedUp: 'Signed up ✓',
    spotsLeft: 'spots left',
    full: 'Full',
    noTasks: 'No open tasks found at your clubs',
    noClubs: "You don't follow any clubs yet. Discover clubs in the community!",
    back: 'Back',
    community: 'Discover clubs',
    allClubs: 'All clubs',
    success: "You're signed up!",
  },
};

interface Props {
  language: Language;
  userId: string;
  onBack: () => void;
}

const VolunteerClubTasksBrowser = ({ language, userId, onBack }: Props) => {
  const navigate = useNavigate();
  const l = labels[language];
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  const [tasks, setTasks] = useState<ClubTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [clubFilter, setClubFilter] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState<string | null>(null);
  const [signedUpIds, setSignedUpIds] = useState<Set<string>>(new Set());
  const [clubNames, setClubNames] = useState<Map<string, string>>(new Map());

  const loadTasks = useCallback(async () => {
    setLoading(true);

    // Get followed + member clubs
    const [membershipsRes, followsRes] = await Promise.all([
      supabase.from('club_memberships').select('club_id').eq('volunteer_id', userId).eq('status', 'actief'),
      supabase.from('club_follows').select('club_id').eq('user_id', userId),
    ]);
    const memberClubs = (membershipsRes.data || []).map((m: any) => m.club_id);
    const followClubs = (followsRes.data || []).map((f: any) => f.club_id);
    const allClubIds = [...new Set([...memberClubs, ...followClubs])];

    if (allClubIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const now = new Date().toISOString().split('T')[0];

    // Fetch tasks + existing signups in parallel
    const [tasksRes, signupsRes, signupCountsRes] = await Promise.all([
      supabase.from('tasks')
        .select('id, title, task_date, start_time, end_time, location, spots_available, club_id, description, clubs(name, logo_url, sport)')
        .in('club_id', allClubIds)
        .gte('task_date', now)
        .eq('status', 'open')
        .order('task_date', { ascending: true }),
      supabase.from('task_signups')
        .select('task_id')
        .eq('volunteer_id', userId)
        .in('status', ['pending', 'assigned']),
      supabase.from('task_signups')
        .select('task_id')
        .in('status', ['pending', 'assigned']),
    ]);

    const mySignups = new Set((signupsRes.data || []).map((s: any) => s.task_id));
    setSignedUpIds(mySignups);

    // Count signups per task
    const countMap: Record<string, number> = {};
    (signupCountsRes.data || []).forEach((s: any) => {
      countMap[s.task_id] = (countMap[s.task_id] || 0) + 1;
    });

    const allTasks: ClubTask[] = (tasksRes.data || []).map((t: any) => ({
      ...t,
      signup_count: countMap[t.id] || 0,
    }));

    setTasks(allTasks);

    // Club names for filters
    const names = new Map<string, string>();
    allTasks.forEach(t => {
      if (t.clubs?.name && !names.has(t.club_id)) {
        names.set(t.club_id, t.clubs.name);
      }
    });
    setClubNames(names);

    setLoading(false);
  }, [userId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleSignup = async (taskId: string) => {
    setSigningUp(taskId);
    const { error } = await supabase.from('task_signups').insert({
      task_id: taskId,
      volunteer_id: userId,
      status: 'pending',
    });
    if (error) {
      toast.error(error.message);
    } else {
      setSignedUpIds(prev => new Set(prev).add(taskId));
      toast.success(l.success);
    }
    setSigningUp(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(locale, {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    return timeStr.slice(0, 5);
  };

  // Filter tasks
  const filtered = tasks.filter(t => {
    if (clubFilter && t.club_id !== clubFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.clubs?.name?.toLowerCase().includes(q) || t.location?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tasks.length === 0 && clubNames.size === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <Heart className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
        <p className="text-base text-muted-foreground">{l.noClubs}</p>
        <Button onClick={() => navigate('/community')} className="min-h-[48px] text-base">
          {l.community}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="min-h-[44px] min-w-[44px]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">{l.title}</h2>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={l.search}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-foreground text-base min-h-[48px] focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Club filter pills */}
      {clubNames.size > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-select">
          <button
            onClick={() => setClubFilter(null)}
            className={cn(
              'shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors min-h-[40px]',
              !clubFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted/50'
            )}
          >
            {l.allClubs}
          </button>
          {Array.from(clubNames.entries()).map(([id, name]) => (
            <button
              key={id}
              onClick={() => setClubFilter(clubFilter === id ? null : id)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors min-h-[40px]',
                clubFilter === id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted/50'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClubTasksEmptyIcon />
          <p className="text-base mt-2">{l.noTasks}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task, i) => {
            const freeSpots = task.spots_available - task.signup_count;
            const isSignedUp = signedUpIds.has(task.id);
            const isSigning = signingUp === task.id;

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-card rounded-xl border border-border p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  {/* Club name */}
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-primary">{task.clubs?.name}</span>
                    {task.clubs?.sport && (
                      <Badge variant="outline" className="text-[10px]">{task.clubs.sport}</Badge>
                    )}
                  </div>

                  {/* Task title */}
                  <p className="text-lg font-semibold text-foreground">{task.title}</p>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {task.task_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {formatDate(task.task_date)}
                      </span>
                    )}
                    {task.start_time && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {formatTime(task.start_time)}
                        {task.end_time && ` – ${formatTime(task.end_time)}`}
                      </span>
                    )}
                    {task.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {task.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {freeSpots > 0
                        ? `${freeSpots} ${l.spotsLeft}`
                        : l.full}
                    </span>
                  </div>

                  {/* Description preview */}
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {isSignedUp ? (
                      <Button disabled className="flex-1 min-h-[48px] text-base bg-accent text-accent-foreground">
                        {l.signedUp}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSignup(task.id)}
                        disabled={freeSpots <= 0 || isSigning}
                        className="flex-1 min-h-[48px] text-base"
                      >
                        {isSigning ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{l.signingUp}</>
                        ) : l.signUp}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/task/${task.id}`)}
                      className="min-h-[48px] min-w-[48px]"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ClubTasksEmptyIcon = () => (
  <Search className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
);

export default VolunteerClubTasksBrowser;
