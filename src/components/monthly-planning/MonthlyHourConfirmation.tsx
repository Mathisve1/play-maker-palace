import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Euro, CheckCircle, Banknote, Loader2 } from 'lucide-react';

interface PlanTask {
  id: string;
  task_date: string;
  title: string;
  compensation_type: string;
  daily_rate: number | null;
  hourly_rate: number | null;
}

interface DaySignupClub {
  id: string;
  plan_task_id: string;
  volunteer_id: string;
  checked_in_at: string | null;
  hour_status: string;
  volunteer_reported_hours: number | null;
  club_approved: boolean;
  volunteer_approved: boolean;
  final_hours: number | null;
  final_amount: number | null;
  volunteer_name?: string;
}

interface MonthlyHourConfirmationProps {
  daySignups: DaySignupClub[];
  tasks: PlanTask[];
  language: string;
  generatingPayout: boolean;
  t3: (nl: string, fr: string, en: string) => string;
  onConfirmHours: (signup: DaySignupClub, task: PlanTask) => void;
  onGeneratePayout: () => void;
  onExportSepa: () => void;
}

const MonthlyHourConfirmation = ({
  daySignups, tasks, language, generatingPayout, t3,
  onConfirmHours, onGeneratePayout, onExportSepa,
}: MonthlyHourConfirmationProps) => {
  const locale = language === 'fr' ? 'fr-BE' : language === 'en' ? 'en-GB' : 'nl-BE';
  const pendingConfirmation = daySignups.filter(ds => ds.checked_in_at && ds.volunteer_approved && !ds.club_approved);
  const confirmedSignups = daySignups.filter(ds => ds.hour_status === 'confirmed');

  return (
    <>
      {pendingConfirmation.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {t3('Uren bevestigen', 'Confirmer les heures', 'Confirm hours')}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">{t3('Deze vrijwilligers hebben hun uren gerapporteerd. Bevestig of pas aan.', 'Ces bénévoles ont rapporté leurs heures. Confirmez ou ajustez.', 'These volunteers reported their hours. Confirm or adjust.')}</p>
            <div className="space-y-2">
              {pendingConfirmation.map(ds => {
                const task = tasks.find(t => t.id === ds.plan_task_id);
                if (!task) return null;
                const d = new Date(task.task_date);
                return (
                  <div key={ds.id} className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50 dark:bg-amber-900/10">
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(locale, { weekday: 'short' })}</p>
                      <p className="text-lg font-bold">{d.getDate()}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ds.volunteer_name} — {task.title}</p>
                      <p className="text-xs text-muted-foreground">{t3('Gerapporteerd', 'Rapporté', 'Reported')}: <strong>{ds.volunteer_reported_hours}{t3('u', 'h', 'h')}</strong></p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onConfirmHours(ds, task)}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> {t3('Akkoord', 'D\'accord', 'Agree')} ({ds.volunteer_reported_hours}{t3('u', 'h', 'h')})
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {confirmedSignups.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Euro className="w-4 h-4 text-primary" /> {t3('Maandafrekening', 'Décompte mensuel', 'Monthly settlement')}</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onGeneratePayout} disabled={generatingPayout}>
                  {generatingPayout ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Banknote className="w-3.5 h-3.5 mr-1" />}
                  {t3('Genereer afrekening', 'Générer le décompte', 'Generate settlement')}
                </Button>
                <Button size="sm" variant="outline" onClick={onExportSepa}>
                  <Euro className="w-3.5 h-3.5 mr-1" /> SEPA export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {confirmedSignups.map(ds => {
                const task = tasks.find(t => t.id === ds.plan_task_id);
                return (
                  <div key={ds.id} className="flex items-center justify-between p-2 rounded border text-sm">
                    <span>{ds.volunteer_name} — {task?.title || '?'}</span>
                    <span className="font-medium text-green-600">{ds.final_hours}{t3('u', 'h', 'h')} · €{(ds.final_amount || 0).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between p-2 mt-2 rounded bg-muted font-semibold text-sm">
                <span>{t3('Totaal', 'Total', 'Total')}</span>
                <span>€{confirmedSignups.reduce((s, ds) => s + (ds.final_amount || 0), 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default MonthlyHourConfirmation;
