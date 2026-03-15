import { useEffect, useState } from 'react';
import { Gift, Trophy, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { sendPush } from '@/lib/sendPush';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { Language } from '@/i18n/translations';

interface Enrollment {
  id: string;
  tasks_completed: number;
  points_earned: number;
  reward_claimed: boolean;
  claimed_at: string | null;
  program: {
    id: string;
    name: string;
    required_tasks: number;
    required_points: number | null;
    points_based: boolean;
    reward_description: string;
    club_id: string;
    club_name: string;
  };
}

const labels = {
  nl: { title: 'Mijn loyaliteitsbeloningen', inProgress: 'Bezig', rewardAvailable: 'Beloning beschikbaar!', claimed: 'Beloning opgeëist', claim: 'Beloning claimen', tasks: 'taken', points: 'punten', claimedOn: 'Opgeëist op' },
  fr: { title: 'Mes récompenses de fidélité', inProgress: 'En cours', rewardAvailable: 'Récompense disponible!', claimed: 'Récompense réclamée', claim: 'Réclamer', tasks: 'tâches', points: 'points', claimedOn: 'Réclamé le' },
  en: { title: 'My loyalty rewards', inProgress: 'In progress', rewardAvailable: 'Reward available!', claimed: 'Reward claimed', claim: 'Claim reward', tasks: 'tasks', points: 'points', claimedOn: 'Claimed on' },
};

interface Props {
  userId: string;
  language: Language;
}

const VolunteerLoyaltyProgress = ({ userId, language }: Props) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const l = labels[language as keyof typeof labels] || labels.nl;

  useEffect(() => {
    loadEnrollments();
  }, [userId]);

  const loadEnrollments = async () => {
    const { data } = await supabase
      .from('loyalty_enrollments')
      .select('id, tasks_completed, points_earned, reward_claimed, claimed_at, program_id, loyalty_programs(id, name, required_tasks, required_points, points_based, reward_description, club_id, clubs(name))')
      .eq('volunteer_id', userId);

    if (data) {
      const mapped: Enrollment[] = data
        .filter((e: any) => e.loyalty_programs)
        .map((e: any) => ({
          id: e.id,
          tasks_completed: e.tasks_completed,
          points_earned: e.points_earned,
          reward_claimed: e.reward_claimed,
          claimed_at: e.claimed_at,
          program: {
            id: e.loyalty_programs.id,
            name: e.loyalty_programs.name,
            required_tasks: e.loyalty_programs.required_tasks,
            required_points: e.loyalty_programs.required_points,
            points_based: e.loyalty_programs.points_based,
            reward_description: e.loyalty_programs.reward_description,
            club_id: e.loyalty_programs.club_id,
            club_name: e.loyalty_programs.clubs?.name || '',
          },
        }));
      setEnrollments(mapped);
    }
    setLoading(false);
  };

  const getStatus = (e: Enrollment): 'in_progress' | 'available' | 'claimed' => {
    if (e.reward_claimed) return 'claimed';
    const threshold = e.program.points_based
      ? (e.program.required_points || 0)
      : e.program.required_tasks;
    const current = e.program.points_based ? e.points_earned : e.tasks_completed;
    return current >= threshold ? 'available' : 'in_progress';
  };

  const handleClaim = async (enrollment: Enrollment) => {
    setClaiming(enrollment.id);
    const { error } = await supabase
      .from('loyalty_enrollments')
      .update({ reward_claimed: true, claimed_at: new Date().toISOString() })
      .eq('id', enrollment.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: '🎁',
        description: enrollment.program.reward_description,
      });
      // Notify club owner
      sendPush({
        userId,
        title: '🎁 Beloning opgeëist!',
        message: `Je hebt je beloning opgeëist bij ${enrollment.program.club_name}: ${enrollment.program.reward_description}`,
        url: '/dashboard',
        type: 'loyalty',
      });
      loadEnrollments();
    }
    setClaiming(null);
  };

  if (loading || enrollments.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-lg font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        {l.title}
      </h2>
      <div className="space-y-3">
        {enrollments.map((enrollment) => {
          const status = getStatus(enrollment);
          const isPB = enrollment.program.points_based;
          const threshold = isPB ? (enrollment.program.required_points || 0) : enrollment.program.required_tasks;
          const current = isPB ? enrollment.points_earned : enrollment.tasks_completed;
          const pct = threshold > 0 ? Math.min(100, (current / threshold) * 100) : 0;

          return (
            <div
              key={enrollment.id}
              className={`bg-card rounded-2xl p-4 shadow-sm border transition-all ${
                status === 'available' ? 'border-primary/30 bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{enrollment.program.name}</p>
                  <p className="text-xs text-muted-foreground">{enrollment.program.club_name}</p>
                </div>
                <div className="shrink-0">
                  {status === 'claimed' && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent-foreground flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {l.claimed}
                    </span>
                  )}
                  {status === 'available' && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary flex items-center gap-1 animate-pulse">
                      <Gift className="w-3 h-3" /> {l.rewardAvailable}
                    </span>
                  )}
                  {status === 'in_progress' && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
                      {l.inProgress}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{current} / {threshold} {isPB ? l.points : l.tasks}</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                🎁 {enrollment.program.reward_description}
              </p>

              {status === 'available' && (
                <Button
                  size="sm"
                  className="mt-3 w-full rounded-xl"
                  onClick={() => handleClaim(enrollment)}
                  disabled={claiming === enrollment.id}
                >
                  <Gift className="w-4 h-4 mr-1.5" />
                  {l.claim}
                </Button>
              )}

              {status === 'claimed' && enrollment.claimed_at && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  {l.claimedOn} {new Date(enrollment.claimed_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default VolunteerLoyaltyProgress;
