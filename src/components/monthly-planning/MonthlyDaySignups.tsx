import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Ticket, Mail, UserCheck, UserX, Loader2 } from 'lucide-react';

interface PlanTask {
  id: string;
  task_date: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
}

interface DaySignupClub {
  id: string;
  enrollment_id: string;
  plan_task_id: string;
  volunteer_id: string;
  status: string;
  ticket_barcode: string | null;
  volunteer_name?: string;
  volunteer_email?: string;
}

interface MonthlyDaySignupsProps {
  pendingSignups: DaySignupClub[];
  assignedSignups: DaySignupClub[];
  tasks: PlanTask[];
  language: string;
  generatingTicketIds: Set<string>;
  sendingTicketEmailIds: Set<string>;
  t3: (nl: string, fr: string, en: string) => string;
  onAssign: (id: string) => void;
  onReject: (id: string) => void;
  onGenerateTicket: (signup: DaySignupClub) => void;
  onSendTicketEmail: (signup: DaySignupClub) => void;
}

const MonthlyDaySignups = ({
  pendingSignups, assignedSignups, tasks, language,
  generatingTicketIds, sendingTicketEmailIds, t3,
  onAssign, onReject, onGenerateTicket, onSendTicketEmail,
}: MonthlyDaySignupsProps) => {
  const locale = language === 'fr' ? 'fr-BE' : language === 'en' ? 'en-GB' : 'nl-BE';

  return (
    <>
      {pendingSignups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" /> {t3('Dag-aanmeldingen te bevestigen', 'Inscriptions journalières à confirmer', 'Day signups to confirm')} ({pendingSignups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingSignups.map(ds => {
                const task = tasks.find(t => t.id === ds.plan_task_id);
                if (!task) return null;
                const d = new Date(task.task_date);
                return (
                  <div key={ds.id} className="flex items-center gap-3 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/10">
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(locale, { weekday: 'short' })}</p>
                      <p className="text-lg font-bold">{d.getDate()}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ds.volunteer_name} — {task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.start_time}–{task.end_time} · {task.location || ''}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1 text-green-700" onClick={() => onAssign(ds.id)}>
                        <UserCheck className="w-3.5 h-3.5" /> {t3('Toekennen', 'Attribuer', 'Assign')}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => onReject(ds.id)}>
                        <UserX className="w-3.5 h-3.5" /> {t3('Afwijzen', 'Refuser', 'Reject')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {assignedSignups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" /> {t3('Toegekende dag-aanmeldingen', 'Inscriptions journalières attribuées', 'Assigned day signups')} ({assignedSignups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignedSignups.map(ds => {
                const task = tasks.find(t => t.id === ds.plan_task_id);
                if (!task) return null;
                const d = new Date(task.task_date);
                const hasTicket = !!ds.ticket_barcode;
                return (
                  <div key={ds.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(locale, { weekday: 'short' })}</p>
                      <p className="text-lg font-bold">{d.getDate()}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{ds.volunteer_name} — {task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className="bg-green-600 text-[10px]">{t3('Toegekend', 'Attribué', 'Assigned')}</Badge>
                        {hasTicket && <Badge variant="outline" className="text-[10px]">Ticket: {ds.ticket_barcode}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!hasTicket && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => onGenerateTicket(ds)} disabled={generatingTicketIds.has(ds.id)}>
                          {generatingTicketIds.has(ds.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                          {t3('Ticket genereren', 'Générer ticket', 'Generate ticket')}
                        </Button>
                      )}
                      {hasTicket && ds.volunteer_email && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => onSendTicketEmail(ds)} disabled={sendingTicketEmailIds.has(ds.id)}>
                          {sendingTicketEmailIds.has(ds.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                          {t3('E-mail ticket', 'E-mail ticket', 'Email ticket')}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default MonthlyDaySignups;
