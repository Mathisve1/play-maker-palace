import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Calendar, ArrowRight, Building2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Language } from '@/i18n/translations';

interface NearbyClub {
  id: string;
  name: string;
  sport: string | null;
  location: string | null;
  logo_url: string | null;
  open_tasks: number;
}

const labels = {
  nl: { title: 'Clubs in de buurt', viewAll: 'Ontdek meer', tasks: 'open taken' },
  fr: { title: 'Clubs à proximité', viewAll: 'Voir plus', tasks: 'tâches ouvertes' },
  en: { title: 'Nearby clubs', viewAll: 'Discover more', tasks: 'open tasks' },
};

const NearbyClubsWidget = ({ userId, language }: { userId: string; language: Language }) => {
  const navigate = useNavigate();
  const l = labels[language as keyof typeof labels] || labels.nl;
  const [clubs, setClubs] = useState<NearbyClub[]>([]);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data: profile } = await supabase.from('profiles').select('city').eq('id', userId).maybeSingle();
      const userCity = profile?.city;
      if (!userCity) return;

      const { data: allClubs } = await supabase.from('clubs').select('id, name, sport, location, logo_url');
      if (!allClubs || allClubs.length === 0) return;

      const cityLower = userCity.toLowerCase();
      const nearbyClubs = allClubs.filter(c => c.location?.toLowerCase().includes(cityLower));
      if (nearbyClubs.length === 0) return;

      const clubIds = nearbyClubs.map(c => c.id);
      const { data: openTasks } = await supabase.from('tasks').select('club_id').in('club_id', clubIds).eq('status', 'open');
      const taskCounts: Record<string, number> = {};
      openTasks?.forEach(t => { taskCounts[t.club_id] = (taskCounts[t.club_id] || 0) + 1; });

      const result = nearbyClubs
        .map(c => ({ ...c, open_tasks: taskCounts[c.id] || 0 }))
        .filter(c => c.open_tasks > 0)
        .sort((a, b) => b.open_tasks - a.open_tasks)
        .slice(0, 5);

      setClubs(result);
    };
    load();
  }, [userId]);

  if (clubs.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" /> {l.title}
        </h3>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/community')}>
          {l.viewAll} <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {clubs.map(club => (
          <div
            key={club.id}
            onClick={() => navigate(`/community/club/${club.id}`)}
            className="min-w-[180px] max-w-[200px] bg-card rounded-xl border border-border/50 p-4 cursor-pointer hover:shadow-card transition-all shrink-0"
          >
            <Avatar className="w-10 h-10 mb-2 border-2 border-background shadow-sm">
              {club.logo_url ? <AvatarImage src={club.logo_url} alt={club.name} /> : null}
              <AvatarFallback className="text-xs font-bold bg-secondary text-secondary-foreground">
                {club.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-sm text-foreground truncate">{club.name}</p>
            {club.location && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-3 h-3" /> {club.location}
              </p>
            )}
            <Badge variant="secondary" className="mt-2 text-[10px]">
              <Calendar className="w-3 h-3 mr-1" /> {club.open_tasks} {l.tasks}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NearbyClubsWidget;
