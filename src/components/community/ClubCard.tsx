import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Users, Calendar, Heart, HeartOff, ArrowRight, Trophy, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useLanguage } from '@/i18n/LanguageContext';

export interface ClubWithStats {
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
  avg_rating?: number;
  rating_count?: number;
}

const communityLabels: Record<'nl' | 'fr' | 'en', Record<string, string>> = {
  nl: { following: 'Volgend', unfollow: 'Ontvolgen', follow: 'Volgen', view: 'Bekijken', tasks: 'taken', volunteers: 'vrijwilligers', events: 'events' },
  fr: { following: 'Suivi', unfollow: 'Ne plus suivre', follow: 'Suivre', view: 'Voir', tasks: 'tâches', volunteers: 'bénévoles', events: 'événements' },
  en: { following: 'Following', unfollow: 'Unfollow', follow: 'Follow', view: 'View', tasks: 'tasks', volunteers: 'volunteers', events: 'events' },
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
      <div className="h-24 bg-gradient-to-br from-secondary/20 via-primary/10 to-accent/10 relative">
        {club.is_following && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary/90 text-primary-foreground text-[10px] gap-1">
              <Heart className="w-3 h-3 fill-current" /> {cl.following}
            </Badge>
          </div>
        )}
        {club.sport && (
          <Badge variant="secondary" className="absolute top-3 right-3 text-[10px]">{club.sport}</Badge>
        )}
      </div>

      <div className="px-5 -mt-10 relative z-10">
        <Avatar className="w-16 h-16 border-4 border-card shadow-md">
          {club.logo_url ? <AvatarImage src={club.logo_url} alt={club.name} /> : null}
          <AvatarFallback className="text-lg font-bold bg-secondary text-secondary-foreground">
            {club.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="px-5 pt-3 pb-4">
        <h3 className="font-bold font-heading text-lg group-hover:text-primary transition-colors truncate">{club.name}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {club.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {club.location}
            </p>
          )}
          {(club.avg_rating ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              {club.avg_rating!.toFixed(1)}
              <span className="text-[10px]">({club.rating_count})</span>
            </span>
          )}
        </div>
        {club.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{club.description}</p>
        )}

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

        <div className="flex items-center gap-2 mt-4" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant={club.is_following ? 'outline' : 'default'}
            className="flex-1 h-9 text-xs gap-1.5 rounded-xl"
            onClick={() => onToggleFollow(club.id)}
            disabled={toggling === club.id}
          >
            {club.is_following ? (
              <><HeartOff className="w-3.5 h-3.5" /> {cl.unfollow}</>
            ) : (
              <><Heart className="w-3.5 h-3.5" /> {cl.follow}</>
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

export default ClubCard;
