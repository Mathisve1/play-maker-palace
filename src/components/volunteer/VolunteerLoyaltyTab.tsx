import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';

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

interface Props {
  programs: LoyaltyProgram[];
  enrollments: Record<string, LoyaltyEnrollment>;
  language: string;
  enrollingProgram: string | null;
  onEnroll: (programId: string) => void;
}

const VolunteerLoyaltyTab = ({ programs, enrollments, language, enrollingProgram, onEnroll }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  return (
    <div className="space-y-4">
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
    </div>
  );
};

export default VolunteerLoyaltyTab;
