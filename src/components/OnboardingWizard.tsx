import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, UserCircle, FileSignature, GraduationCap, CalendarCheck, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

type StepKey = 'profile_complete' | 'contract_signed' | 'training_done' | 'first_task';

interface StepDef {
  key: StepKey;
  icon: React.ElementType;
  labels: Record<string, string>;
  descriptions: Record<string, string>;
}

const STEPS: StepDef[] = [
  {
    key: 'profile_complete',
    icon: UserCircle,
    labels: { nl: 'Profiel', fr: 'Profil', en: 'Profile' },
    descriptions: { nl: 'Vul je profiel volledig in', fr: 'Complétez votre profil', en: 'Complete your profile' },
  },
  {
    key: 'contract_signed',
    icon: FileSignature,
    labels: { nl: 'Contract', fr: 'Contrat', en: 'Contract' },
    descriptions: { nl: 'Teken je eerste contract', fr: 'Signez votre premier contrat', en: 'Sign your first contract' },
  },
  {
    key: 'training_done',
    icon: GraduationCap,
    labels: { nl: 'Training', fr: 'Formation', en: 'Training' },
    descriptions: { nl: 'Rond een training af', fr: 'Terminez une formation', en: 'Complete a training' },
  },
  {
    key: 'first_task',
    icon: CalendarCheck,
    labels: { nl: 'Eerste taak', fr: 'Première tâche', en: 'First task' },
    descriptions: { nl: 'Meld je aan voor je eerste taak', fr: 'Inscrivez-vous à votre première tâche', en: 'Sign up for your first task' },
  },
];

interface OnboardingWizardProps {
  userId: string;
  clubId: string;
  language: string;
  /** Auto-detect completion from existing data */
  hasProfile: boolean;
  hasContract: boolean;
  hasTraining: boolean;
  hasTask: boolean;
  onStepAction?: (step: StepKey) => void;
  onDismiss?: () => void;
}

const OnboardingWizard = ({
  userId,
  clubId,
  language,
  hasProfile,
  hasContract,
  hasTraining,
  hasTask,
  onStepAction,
  onDismiss,
}: OnboardingWizardProps) => {
  const [completedSteps, setCompletedSteps] = useState<Set<StepKey>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const lang = ['nl', 'fr'].includes(language) ? language : 'en';

  // Load saved progress
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('volunteer_onboarding_steps')
        .select('step, completed_at, skipped')
        .eq('user_id', userId)
        .eq('club_id', clubId);

      const done = new Set<StepKey>();
      if (data) {
        for (const row of data) {
          if (row.completed_at || row.skipped) done.add(row.step as StepKey);
        }
      }
      setCompletedSteps(done);
    };
    if (userId && clubId) load();
  }, [userId, clubId]);

  // Auto-detect and sync completed steps
  useEffect(() => {
    if (!userId || !clubId) return;
    const detected: { key: StepKey; done: boolean }[] = [
      { key: 'profile_complete', done: hasProfile },
      { key: 'contract_signed', done: hasContract },
      { key: 'training_done', done: hasTraining },
      { key: 'first_task', done: hasTask },
    ];

    const newlyCompleted = detected.filter(d => d.done && !completedSteps.has(d.key));
    if (newlyCompleted.length === 0) return;

    const syncSteps = async () => {
      for (const s of newlyCompleted) {
        await supabase
          .from('volunteer_onboarding_steps')
          .upsert(
            { user_id: userId, club_id: clubId, step: s.key, completed_at: new Date().toISOString() },
            { onConflict: 'user_id,club_id,step' }
          );
      }
      setCompletedSteps(prev => {
        const next = new Set(prev);
        newlyCompleted.forEach(s => next.add(s.key));
        return next;
      });
    };
    syncSteps();
  }, [userId, clubId, hasProfile, hasContract, hasTraining, hasTask]);

  const allDone = STEPS.every(s => completedSteps.has(s.key));
  if (dismissed || allDone) return null;

  const completedCount = STEPS.filter(s => completedSteps.has(s.key)).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  const titles: Record<string, string> = {
    nl: 'Welkom! Voltooi je onboarding',
    fr: 'Bienvenue ! Complétez votre intégration',
    en: 'Welcome! Complete your onboarding',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-heading font-semibold text-foreground">
            {titles[lang]}
          </h2>
          {onDismiss && (
            <button
              onClick={() => { setDismissed(true); onDismiss(); }}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-4">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {completedCount}/{STEPS.length}
          </span>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STEPS.map((step, i) => {
            const done = completedSteps.has(step.key);
            const Icon = step.icon;
            return (
              <motion.button
                key={step.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => !done && onStepAction?.(step.key)}
                disabled={done}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl text-left transition-all w-full',
                  done
                    ? 'bg-accent/10 border border-accent/20'
                    : 'bg-muted/50 border border-border hover:border-primary/30 hover:bg-primary/5 cursor-pointer',
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  done ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground',
                )}>
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    done ? 'text-accent line-through' : 'text-foreground',
                  )}>
                    {step.labels[lang]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.descriptions[lang]}
                  </p>
                </div>
                {!done && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default OnboardingWizard;
