import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MapPin, Calendar, Users, Clock, Euro, FileText, UserCheck, AlertCircle, Award } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  description: string | null;
  task_date: string | null;
  location: string | null;
  spots_available: number;
  status: string;
  club_id: string;
  created_at: string;
  expense_reimbursement?: boolean;
  expense_amount?: number | null;
  briefing_time?: string | null;
  briefing_location?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  required_training_id?: string | null;
  clubs?: { name: string; sport: string | null; location: string | null };
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  signupCount: number;
  isSignedUp: boolean;
  onSignup: () => void;
  onCancel: () => void;
  signingUp: boolean;
}

const labels = {
  nl: {
    details: 'Taakdetails',
    when: 'Wanneer',
    where: 'Waar',
    spotsAvailable: 'Plaatsen beschikbaar',
    signedUp: 'Aangemeld',
    expense: 'Onkostenvergoeding',
    noExpense: 'Geen onkostenvergoeding',
    briefing: 'Briefing vooraf',
    time: 'Tijdstip',
    to: 'tot',
    notes: 'Extra info',
    signUp: 'Inschrijven',
    alreadySignedUp: '✓ Ingeschreven',
    cancel: 'Uitschrijven',
    persons: 'personen',
    yes: 'Ja',
    requiredTraining: 'Verplichte training',
    followTraining: 'Volg eerst deze training',
    certified: '✓ Gecertificeerd',
  },
  fr: {
    details: 'Détails de la tâche',
    when: 'Quand',
    where: 'Où',
    spotsAvailable: 'Places disponibles',
    signedUp: 'Inscrits',
    expense: 'Indemnité de frais',
    noExpense: 'Pas d\'indemnité',
    briefing: 'Briefing préalable',
    time: 'Horaire',
    to: 'à',
    notes: 'Info supplémentaire',
    signUp: 'S\'inscrire',
    alreadySignedUp: '✓ Inscrit',
    cancel: 'Se désinscrire',
    persons: 'personnes',
    yes: 'Oui',
    requiredTraining: 'Formation obligatoire',
    followTraining: 'Suivez d\'abord cette formation',
    certified: '✓ Certifié',
  },
  en: {
    details: 'Task details',
    when: 'When',
    where: 'Where',
    spotsAvailable: 'Spots available',
    signedUp: 'Signed up',
    expense: 'Expense reimbursement',
    noExpense: 'No reimbursement',
    briefing: 'Pre-briefing',
    time: 'Time',
    to: 'to',
    notes: 'Additional info',
    signUp: 'Sign up',
    alreadySignedUp: '✓ Signed up',
    cancel: 'Unsubscribe',
    persons: 'persons',
    yes: 'Yes',
    requiredTraining: 'Required training',
    followTraining: 'Complete this training first',
    certified: '✓ Certified',
  },
};

const formatTime = (dateStr: string | null | undefined, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleString(locale, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const formatTimeOnly = (dateStr: string | null | undefined, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

const TaskDetailDialog = ({ task, open, onOpenChange, language, signupCount, isSignedUp, onSignup, onCancel, signingUp }: TaskDetailDialogProps) => {
  const navigate = useNavigate();
  const [trainingName, setTrainingName] = useState<string | null>(null);
  const [isCertified, setIsCertified] = useState(false);
  const [checkingCert, setCheckingCert] = useState(false);

  useEffect(() => {
    if (!task?.required_training_id || !open) { setTrainingName(null); setIsCertified(false); return; }
    setCheckingCert(true);
    (async () => {
      const [tRes, { data: { session } }] = await Promise.all([
        supabase.from('academy_trainings').select('title').eq('id', task.required_training_id!).maybeSingle(),
        supabase.auth.getSession(),
      ]);
      setTrainingName((tRes.data as any)?.title || null);
      if (session) {
        const { data: certs } = await supabase.from('volunteer_certificates').select('id').eq('training_id', task.required_training_id!).eq('volunteer_id', session.user.id).limit(1);
        setIsCertified((certs || []).length > 0);
      }
      setCheckingCert(false);
    })();
  }, [task?.required_training_id, open]);

  if (!task) return null;
  const l = labels[language];
  const needsTraining = !!task.required_training_id && !isCertified && !isSignedUp;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
              {task.clubs?.sport || task.clubs?.name}
            </span>
            {task.clubs?.name && (
              <span className="text-xs text-muted-foreground">{task.clubs.name}</span>
            )}
          </div>
          <DialogTitle className="font-heading text-xl">{task.title}</DialogTitle>
          {task.description && (
            <DialogDescription>{task.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Time slot */}
          {(task.start_time || task.task_date) && (
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{l.time}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(task.start_time || task.task_date, language)}
                  {task.end_time && ` ${l.to} ${formatTimeOnly(task.end_time, language)}`}
                </p>
              </div>
            </div>
          )}

          {/* Location */}
          {(task.location || task.clubs?.location) && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{l.where}</p>
                <p className="text-sm text-muted-foreground">{task.location || task.clubs?.location}</p>
              </div>
            </div>
          )}

          {/* Spots & signups */}
          <div className="flex items-start gap-3">
            <Users className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{l.spotsAvailable}</p>
              <p className="text-sm text-muted-foreground">
                {signupCount} / {task.spots_available} {l.persons} {l.signedUp.toLowerCase()}
              </p>
              <div className="w-full bg-muted rounded-full h-2 mt-1.5">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${Math.min((signupCount / task.spots_available) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Expense reimbursement */}
          <div className="flex items-start gap-3">
            <Euro className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{l.expense}</p>
              <p className="text-sm text-muted-foreground">
                {task.expense_reimbursement
                  ? `${l.yes} — €${(task.expense_amount ?? 0).toFixed(2)}`
                  : l.noExpense}
              </p>
            </div>
          </div>

          {/* Briefing */}
          {task.briefing_time && (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{l.briefing}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(task.briefing_time, language)}
                  {task.briefing_location && ` — ${task.briefing_location}`}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{l.notes}</p>
                <p className="text-sm text-muted-foreground">{task.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Required training badge */}
        {task.required_training_id && trainingName && (
          <div className="flex items-start gap-3 mt-4 pt-4 border-t border-border">
            <Award className={`w-4 h-4 mt-0.5 shrink-0 ${isCertified ? 'text-accent' : 'text-yellow-500'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{l.requiredTraining}</p>
              <p className="text-sm text-muted-foreground">{trainingName}</p>
              {isCertified ? (
                <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-accent"><Award className="w-3 h-3" /> {l.certified}</span>
              ) : (
                <button
                  onClick={() => navigate(`/training/${task.required_training_id}`)}
                  className="mt-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                >
                  {l.followTraining} →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="mt-4 pt-4 border-t border-border">
          {isSignedUp ? (
            <button
              onClick={onCancel}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              {l.alreadySignedUp} — {l.cancel}
            </button>
          ) : needsTraining ? (
            <button
              onClick={() => navigate(`/training/${task.required_training_id}`)}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-yellow-500 text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4" /> {l.followTraining}
            </button>
          ) : (
            <button
              onClick={onSignup}
              disabled={signingUp}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {signingUp ? '...' : l.signUp}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
