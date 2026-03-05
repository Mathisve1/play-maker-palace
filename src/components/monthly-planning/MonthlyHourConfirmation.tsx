import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Euro, CheckCircle, Banknote, Loader2, AlertTriangle, MessageCircle } from 'lucide-react';

interface PlanTask {
  id: string;
  task_date: string;
  title: string;
  compensation_type: string;
  daily_rate: number | null;
  hourly_rate: number | null;
  start_time: string | null;
  end_time: string | null;
}

interface DaySignupClub {
  id: string;
  plan_task_id: string;
  volunteer_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  hour_status: string;
  volunteer_reported_hours: number | null;
  club_reported_hours: number | null;
  club_approved: boolean;
  volunteer_approved: boolean;
  final_hours: number | null;
  final_amount: number | null;
  dispute_status: string;
  dispute_escalated_at: string | null;
  club_reported_checkout: string | null;
  volunteer_reported_checkout: string | null;
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
  onEscalateDispute?: (signup: DaySignupClub) => void;
  onResolveDispute?: (signup: DaySignupClub, task: PlanTask) => void;
}

const MonthlyHourConfirmation = ({
  daySignups, tasks, language, generatingPayout, t3,
  onConfirmHours, onGeneratePayout, onExportSepa, onEscalateDispute, onResolveDispute,
}: MonthlyHourConfirmationProps) => {
  const locale = language === 'fr' ? 'fr-BE' : language === 'en' ? 'en-GB' : 'nl-BE';
  
  // Pending: checked in, volunteer approved hours, club hasn't approved yet
  const pendingConfirmation = daySignups.filter(ds => ds.checked_in_at && ds.volunteer_approved && !ds.club_approved && ds.dispute_status === 'none');
  
  // Disputes: open or escalated
  const disputes = daySignups.filter(ds => ds.dispute_status === 'open' || ds.dispute_status === 'escalated');
  
  // Checkout pending: volunteer needs to confirm checkout time
  const checkoutPending = daySignups.filter(ds => ds.hour_status === 'checkout_pending' && !ds.volunteer_approved);
  
  const confirmedSignups = daySignups.filter(ds => ds.hour_status === 'confirmed');

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Checkout pending confirmation */}
      {checkoutPending.length > 0 && (
        <Card className="border-orange-300">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-orange-600" /> {t3('Wacht op uitcheck-bevestiging', 'En attente de confirmation de sortie', 'Awaiting checkout confirmation')} ({checkoutPending.length})</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">{t3('Deze vrijwilligers moeten hun uitchecktijd bevestigen.', 'Ces bénévoles doivent confirmer leur heure de sortie.', 'These volunteers need to confirm their checkout time.')}</p>
            <div className="space-y-2">
              {checkoutPending.map(ds => {
                const task = tasks.find(t => t.id === ds.plan_task_id);
                if (!task) return null;
                return (
                  <div key={ds.id} className="flex items-center gap-3 p-3 rounded-lg border bg-orange-50 dark:bg-orange-900/10">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ds.volunteer_name} — {task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t3('Ingecheckt', 'Enregistré', 'Checked in')}: {formatTime(ds.checked_in_at)} · {t3('Uitgecheckt', 'Sorti', 'Checked out')}: {formatTime(ds.checked_out_at)}
                        {ds.club_reported_hours && ` · ${ds.club_reported_hours.toFixed(1)}${t3('u', 'h', 'h')}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-300 text-[10px]">{t3('Wacht op vrijwilliger', 'Attente bénévole', 'Awaiting volunteer')}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disputes */}
      {disputes.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> {t3('Geschillen', 'Litiges', 'Disputes')} ({disputes.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {disputes.map(ds => {
                const task = tasks.find(t => t.id === ds.plan_task_id);
                if (!task) return null;
                const isEscalated = ds.dispute_status === 'escalated';
                const escalatedAt = ds.dispute_escalated_at ? new Date(ds.dispute_escalated_at) : null;
                const hoursUntilAuto = escalatedAt ? Math.max(0, 48 - ((Date.now() - escalatedAt.getTime()) / 3600000)) : null;
                
                return (
                  <div key={ds.id} className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{ds.volunteer_name} — {task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t3('Club', 'Club', 'Club')}: {formatTime(ds.club_reported_checkout)} ({ds.club_reported_hours?.toFixed(1) || '?'}h) · 
                          {t3('Vrijwilliger', 'Bénévole', 'Volunteer')}: {formatTime(ds.volunteer_reported_checkout)} ({ds.volunteer_reported_hours?.toFixed(1) || '?'}h)
                        </p>
                        {isEscalated && hoursUntilAuto !== null && hoursUntilAuto > 0 && (
                          <p className="text-xs text-destructive mt-1">
                            ⏰ {t3(`Auto-resolutie in ${Math.ceil(hoursUntilAuto)}u`, `Résolution auto dans ${Math.ceil(hoursUntilAuto)}h`, `Auto-resolve in ${Math.ceil(hoursUntilAuto)}h`)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {!isEscalated && onEscalateDispute && (
                          <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => onEscalateDispute(ds)}>
                            <AlertTriangle className="w-3.5 h-3.5" /> {t3('Escaleer', 'Escalader', 'Escalate')}
                          </Button>
                        )}
                        {isEscalated && hoursUntilAuto !== null && hoursUntilAuto <= 0 && onResolveDispute && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => onResolveDispute(ds, task)}>
                            <CheckCircle className="w-3.5 h-3.5" /> {t3('Gemiddelde toepassen', 'Appliquer la moyenne', 'Apply average')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
