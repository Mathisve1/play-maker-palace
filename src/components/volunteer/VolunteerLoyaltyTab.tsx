import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Trophy, Star, Award, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';
import { Badge } from '@/components/ui/badge';

// Re-use icon map from VolunteerBadges
import { Star as StarIcon, Trophy as TrophyIcon, Medal, Crown, Clock, Hourglass, Users, Globe, Moon, Zap, Award as AwardIcon, Share2 } from 'lucide-react';

const iconMap: Record<string, any> = {
  star: StarIcon, trophy: TrophyIcon, medal: Medal, crown: Crown,
  clock: Clock, hourglass: Hourglass, users: Users, globe: Globe,
  moon: Moon, zap: Zap, award: AwardIcon,
};

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string | null;
  reward_description: string;
  required_tasks: number;
  required_points: number | null;
  points_based: boolean;
  club_id: string;
  club_name?: string;
}

interface LoyaltyEnrollment {
  id: string;
  tasks_completed: number;
  points_earned: number;
  reward_claimed: boolean;
}

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

interface Props {
  programs: LoyaltyProgram[];
  enrollments: Record<string, LoyaltyEnrollment>;
  language: string;
  enrollingProgram: string | null;
  onEnroll: (programId: string) => void;
  userId: string;
}

const VolunteerLoyaltyTab = ({ programs, enrollments, language, enrollingProgram, onEnroll, userId }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [allBadges, setAllBadges] = useState<BadgeDef[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Map<string, string>>(new Map());
  const [showAllBadges, setShowAllBadges] = useState(false);

  // Load badges
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [{ data: defs }, { data: userBadges }] = await Promise.all([
        supabase.from('badge_definitions').select('*').order('threshold'),
        supabase.from('volunteer_badges').select('badge_id, earned_at').eq('user_id', userId),
      ]);
      if (defs) setAllBadges(defs);
      if (userBadges) {
        setEarnedBadgeIds(new Map(userBadges.map((b: any) => [b.badge_id, b.earned_at])));
      }
    };
    load();
  }, [userId]);

  // Confetti for unclaimed rewards
  useEffect(() => {
    Object.entries(enrollments).forEach(([programId, enrollment]) => {
      if (!enrollment || enrollment.reward_claimed) return;
      const program = programs.find(p => p.id === programId);
      if (!program) return;
      const isGoal = program.points_based && program.required_points
        ? enrollment.points_earned >= program.required_points
        : enrollment.tasks_completed >= program.required_tasks;
      if (!isGoal) return;

      const key = `confetti-shown-${programId}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    });
  }, [enrollments, programs]);

  // KPIs
  const totalPoints = Object.values(enrollments).reduce((s, e) => s + (e?.points_earned || 0), 0);
  const earnedBadgeCount = earnedBadgeIds.size;

  // Badge display
  const earnedBadges = allBadges.filter(b => earnedBadgeIds.has(b.id));
  const lockedBadges = allBadges.filter(b => !earnedBadgeIds.has(b.id));
  const displayBadges = showAllBadges ? [...earnedBadges, ...lockedBadges] : [...earnedBadges, ...lockedBadges].slice(0, 6);

  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  return (
    <div className="space-y-6">
      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 shadow-sm border border-border text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-heading font-bold text-foreground">{totalPoints}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('punten', 'points', 'points')}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl p-5 shadow-sm border border-border text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-accent/10 flex items-center justify-center mb-2">
            <Trophy className="w-5 h-5 text-accent-foreground" />
          </div>
          <p className="text-2xl font-heading font-bold text-foreground">{earnedBadgeCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('badges', 'badges', 'badges')}</p>
        </motion.div>
      </div>

      {/* Reward banners */}
      {programs.map(program => {
        const enrollment = enrollments[program.id];
        if (!enrollment || enrollment.reward_claimed) return null;
        const isGoal = program.points_based && program.required_points
          ? enrollment.points_earned >= program.required_points
          : enrollment.tasks_completed >= program.required_tasks;
        if (!isGoal) return null;
        return (
          <motion.div key={`reward-${program.id}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl p-4">
            <span className="text-2xl">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t('Beloning verdiend!', 'Récompense gagnée !', 'Reward earned!')}
              </p>
              <p className="text-xs text-muted-foreground truncate">{program.name} — {program.reward_description}</p>
            </div>
          </motion.div>
        );
      })}

      {/* Programs */}
      {programs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("Geen programma's.", 'Aucun programme.', 'No programs.')}</p>
        </div>
      ) : (
        programs.map((program, i) => {
          const enrollment = enrollments[program.id];
          const isPointsBased = program.points_based && program.required_points;
          const progress = enrollment
            ? (isPointsBased
              ? Math.min(100, (enrollment.points_earned / (program.required_points || 1)) * 100)
              : Math.min(100, (enrollment.tasks_completed / program.required_tasks) * 100))
            : 0;

          return (
            <motion.div key={program.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    <h3 className="font-heading font-semibold text-foreground">{program.name}</h3>
                  </div>
                  {program.club_name && <p className="text-xs text-muted-foreground mt-0.5">{program.club_name}</p>}
                  {program.description && <p className="text-sm text-muted-foreground mt-1">{program.description}</p>}
                  <p className="text-sm mt-2">🎁 {program.reward_description}</p>
                </div>
                <div className="shrink-0">
                  {!enrollment ? (
                    <button onClick={() => onEnroll(program.id)} disabled={enrollingProgram === program.id}
                      className="px-3 py-1.5 text-xs rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                      {t('Deelnemen', 'Rejoindre', 'Join')}
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
                      {isPointsBased ? `${enrollment.points_earned}/${program.required_points}` : `${enrollment.tasks_completed}/${program.required_tasks}`}
                    </span>
                  )}
                </div>
              </div>
              {enrollment && (
                <div className="mt-3">
                  <div className="bg-muted rounded-full h-2 w-full">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })
      )}

      {/* Badges grid */}
      {allBadges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            {t('Mijn badges', 'Mes badges', 'My badges')}
            <span className="text-xs font-normal text-muted-foreground">{earnedBadgeCount}/{allBadges.length}</span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {displayBadges.map(badge => {
              const isEarned = earnedBadgeIds.has(badge.id);
              const Icon = iconMap[badge.icon] || AwardIcon;
              const name = language === 'nl' ? badge.name_nl : language === 'fr' ? badge.name_fr : badge.name_en;
              const earnedAt = isEarned ? earnedBadgeIds.get(badge.id) : null;

              return (
                <div key={badge.id}
                  className={`bg-card rounded-2xl p-3 border text-center transition-all ${isEarned ? 'border-primary/20 shadow-sm' : 'border-border opacity-40 grayscale'}`}>
                  <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-1.5 ${isEarned ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Icon className={`w-5 h-5 ${isEarned ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <p className={`text-[11px] font-semibold truncate ${isEarned ? 'text-foreground' : 'text-muted-foreground'}`}>{name}</p>
                  {isEarned && earnedAt ? (
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {new Date(earnedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                    </p>
                  ) : (
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {badge.threshold} {t(
                        badge.condition_type === 'tasks_completed' ? 'taken' : badge.condition_type === 'hours_worked' ? 'uren' : 'nodig',
                        badge.condition_type === 'tasks_completed' ? 'tâches' : badge.condition_type === 'hours_worked' ? 'heures' : 'requis',
                        badge.condition_type === 'tasks_completed' ? 'tasks' : badge.condition_type === 'hours_worked' ? 'hours' : 'needed'
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {!showAllBadges && (earnedBadges.length + lockedBadges.length) > 6 && (
            <button onClick={() => setShowAllBadges(true)}
              className="text-xs font-medium text-primary hover:underline">
              {t('Bekijk alle badges', 'Voir tous les badges', 'View all badges')} →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default VolunteerLoyaltyTab;
