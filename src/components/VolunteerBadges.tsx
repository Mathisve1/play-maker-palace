import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, Medal, Crown, Clock, Hourglass, Users, Globe, Moon, Zap, Award, Share2 } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { toast } from 'sonner';

interface BadgeDef {
  id: string;
  key: string;
  name_nl: string;
  name_fr: string;
  name_en: string;
  description_nl: string | null;
  description_fr: string | null;
  description_en: string | null;
  icon: string;
  condition_type: string;
  threshold: number;
}

interface EarnedBadge {
  badge_id: string;
  earned_at: string;
}

const iconMap: Record<string, any> = {
  star: Star, trophy: Trophy, medal: Medal, crown: Crown,
  clock: Clock, hourglass: Hourglass, users: Users, globe: Globe,
  moon: Moon, zap: Zap, award: Award,
};

const t3 = (lang: Language, nl: string, fr: string, en: string) =>
  lang === 'nl' ? nl : lang === 'fr' ? fr : en;

interface VolunteerBadgesProps {
  userId: string;
  language: Language;
  compact?: boolean;
}

const VolunteerBadges = ({ userId, language, compact = false }: VolunteerBadgesProps) => {
  const [allBadges, setAllBadges] = useState<BadgeDef[]>([]);
  const [earned, setEarned] = useState<Map<string, string>>(new Map());
  const [newBadgeId, setNewBadgeId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: defs }, { data: userBadges }] = await Promise.all([
        supabase.from('badge_definitions').select('*').order('threshold'),
        supabase.from('volunteer_badges').select('badge_id, earned_at').eq('user_id', userId),
      ]);
      if (defs) setAllBadges(defs);
      if (userBadges) {
        setEarned(new Map(userBadges.map((b: EarnedBadge) => [b.badge_id, b.earned_at])));
      }
    };
    load();
  }, [userId]);

  // Check & award badges client-side
  useEffect(() => {
    if (!userId || allBadges.length === 0) return;
    const checkBadges = async () => {
      // Get stats
      const { count: taskCount } = await supabase.from('task_signups').select('id', { count: 'exact', head: true }).eq('volunteer_id', userId).eq('status', 'assigned');
      const { data: hourData } = await supabase.from('hour_confirmations').select('final_hours').eq('volunteer_id', userId).eq('status', 'confirmed');
      const totalHours = (hourData || []).reduce((s, h) => s + (h.final_hours || 0), 0);
      
      const { data: clubData } = await supabase.from('task_signups').select('tasks!inner(club_id)').eq('volunteer_id', userId).eq('status', 'assigned');
      const clubSet = new Set((clubData || []).map((d: any) => d.tasks?.club_id).filter(Boolean));

      const stats: Record<string, number> = {
        tasks_completed: taskCount || 0,
        hours_worked: totalHours,
        clubs_helped: clubSet.size,
        night_shift: 0, // Would need task time data
        weekend_tasks: 0,
      };

      for (const badge of allBadges) {
        if (earned.has(badge.id)) continue;
        const val = stats[badge.condition_type] || 0;
        if (val >= badge.threshold) {
          // Award badge
          const { error } = await (supabase as any).from('volunteer_badges').insert({
            user_id: userId,
            badge_id: badge.id,
          });
          if (!error) {
            setEarned(prev => new Map(prev).set(badge.id, new Date().toISOString()));
            setNewBadgeId(badge.id);
            const name = language === 'nl' ? badge.name_nl : language === 'fr' ? badge.name_fr : badge.name_en;
            toast.success(`🏆 ${t3(language, 'Nieuwe badge verdiend', 'Nouveau badge gagné', 'New badge earned')}: ${name}!`);
            setTimeout(() => setNewBadgeId(null), 3000);
          }
        }
      }
    };
    checkBadges();
  }, [userId, allBadges.length]);

  const handleShare = (badge: BadgeDef) => {
    const name = language === 'nl' ? badge.name_nl : language === 'fr' ? badge.name_fr : badge.name_en;
    const text = t3(language,
      `Ik heb de "${name}" badge verdiend als vrijwilliger! 🏆`,
      `J'ai gagné le badge "${name}" en tant que bénévole ! 🏆`,
      `I earned the "${name}" badge as a volunteer! 🏆`
    );
    if (navigator.share) {
      navigator.share({ title: name, text, url: window.location.origin });
    } else {
      navigator.clipboard.writeText(text);
      toast.success(t3(language, 'Gekopieerd!', 'Copié !', 'Copied!'));
    }
  };

  if (allBadges.length === 0) return null;

  const earnedBadges = allBadges.filter(b => earned.has(b.id));
  const lockedBadges = allBadges.filter(b => !earned.has(b.id));

  if (compact && earnedBadges.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        {t3(language, 'Badges & Achievements', 'Badges & Réalisations', 'Badges & Achievements')}
        {earnedBadges.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            {earnedBadges.length}/{allBadges.length}
          </span>
        )}
      </h2>

      {/* Earned badges */}
      {earnedBadges.length > 0 && (
        <div className={`grid ${compact ? 'grid-cols-5' : 'grid-cols-3 sm:grid-cols-5'} gap-2`}>
          {earnedBadges.map(badge => {
            const Icon = iconMap[badge.icon] || Award;
            const name = language === 'nl' ? badge.name_nl : language === 'fr' ? badge.name_fr : badge.name_en;
            const isNew = newBadgeId === badge.id;
            return (
              <motion.div
                key={badge.id}
                initial={isNew ? { scale: 0 } : false}
                animate={isNew ? { scale: [0, 1.3, 1] } : {}}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative group bg-card rounded-2xl p-3 border border-primary/20 text-center shadow-sm"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-1.5">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-[11px] font-semibold text-foreground truncate">{name}</p>
                {!compact && (
                  <button
                    onClick={() => handleShare(badge)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted"
                  >
                    <Share2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Locked badges */}
      {!compact && lockedBadges.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {lockedBadges.map(badge => {
            const Icon = iconMap[badge.icon] || Award;
            const name = language === 'nl' ? badge.name_nl : language === 'fr' ? badge.name_fr : badge.name_en;
            const desc = language === 'nl' ? badge.description_nl : language === 'fr' ? badge.description_fr : badge.description_en;
            return (
              <div key={badge.id} className="bg-card rounded-2xl p-3 border border-border text-center opacity-40 grayscale" title={desc || ''}>
                <div className="w-10 h-10 mx-auto rounded-xl bg-muted flex items-center justify-center mb-1.5">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-[11px] font-medium text-muted-foreground truncate">{name}</p>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default VolunteerBadges;
