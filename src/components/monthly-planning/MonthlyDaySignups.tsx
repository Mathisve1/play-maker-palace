import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Ticket, Mail, UserCheck, UserX, Loader2, LogOut, FileSignature } from 'lucide-react';

interface PlanTask {
  id: string;
  task_date: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  compensation_type: string;
}

interface DaySignupClub {
  id: string;
  enrollment_id: string;
  plan_task_id: string;
  volunteer_id: string;
  status: string;
  ticket_barcode: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  hour_status: string;
  dispute_status: string;
  volunteer_name?: string;
  volunteer_email?: string;
  volunteer_avatar_url?: string | null;
  contract_status?: string;
  season_checkin_count?: number;
}

interface MonthlyDaySignupsProps {
  pendingSignups: DaySignupClub[];
  assignedSignups: DaySignupClub[];
  tasks: PlanTask[];
  language: string;
  generatingTicketIds: Set<string>;
  sendingTicketEmailIds: Set<string>;
  checkingOutIds: Set<string>;
  t3: (nl: string, fr: string, en: string) => string;
  onAssign: (id: string) => void;
  onReject: (id: string) => void;
  onGenerateTicket: (signup: DaySignupClub) => void;
  onSendTicketEmail: (signup: DaySignupClub) => void;
  onCheckout: (signup: DaySignupClub) => void;
}

const contractBadge = (status: string | undefined, t3: (nl: string, fr: string, en: string) => string) => {
  if (status === 'signed') return <Badge className="bg-green-600 text-[10px] gap-0.5"><FileSignature className="w-2.5 h-2.5" />{t3('Getekend', 'Signé', 'Signed')}</Badge>;
  if (status === 'sent') return <Badge variant="secondary" className="text-[10px] gap-0.5"><FileSignature className="w-2.5 h-2.5" />{t3('In afwachting', 'En attente', 'Pending')}</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground gap-0.5"><FileSignature className="w-2.5 h-2.5" />{t3('Niet verstuurd', 'Non envoyé', 'Not sent')}</Badge>;
};

const VolunteerInfo = ({ ds, t3 }: { ds: DaySignupClub; t3: (nl: string, fr: string, en: string) => string }) => {
  const initials = (ds.volunteer_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <Avatar className="h-8 w-8 shrink-0">
        {ds.volunteer_avatar_url && <AvatarImage src={ds.volunteer_avatar_url} />}
        <AvatarFallback className="text-[10px] bg-muted">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate">{ds.volunteer_name}</span>
          {contractBadge(ds.contract_status, t3)}
          {typeof ds.season_checkin_count === 'number' && (
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {ds.season_checkin_count} {t3('check-ins', 'check-ins', 'check-ins')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const MonthlyDaySignups = ({
  pendingSignups, assignedSignups, tasks, language,
  generatingTicketIds, sendingTicketEmailIds, checkingOutIds, t3,
  onAssign, onReject, onGenerateTicket, onSendTicketEmail, onCheckout,
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
                    <VolunteerInfo ds={ds} t3={t3} />
                    <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[120px]">{task.title}</span>
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
                const isCheckedIn = !!ds.checked_in_at;
                const isCheckedOut = !!ds.checked_out_at;
                const isHourly = task.compensation_type === 'hourly';
                return (
                  <div key={ds.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs text-muted-foreground capitalize">{d.toLocaleDateString(locale, { weekday: 'short' })}</p>
                      <p className="text-lg font-bold">{d.getDate()}</p>
                    </div>
                    <VolunteerInfo ds={ds} t3={t3} />
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <Badge className="bg-green-600 text-[10px]">{t3('Toegekend', 'Attribué', 'Assigned')}</Badge>
                      {hasTicket && <Badge variant="outline" className="text-[10px]">Ticket</Badge>}
                      {isCheckedIn && <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">✓ {t3('In', 'In', 'In')}</Badge>}
                      {isCheckedOut && <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">⏹ {t3('Uit', 'Sorti', 'Out')}</Badge>}
                      {ds.dispute_status === 'open' && <Badge variant="destructive" className="text-[10px]">{t3('Geschil', 'Litige', 'Dispute')}</Badge>}
                      {ds.dispute_status === 'escalated' && <Badge variant="destructive" className="text-[10px]">⚠️</Badge>}
                    </div>
                    <div className="flex gap-1.5 shrink-0 flex-wrap">
                      {!hasTicket && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => onGenerateTicket(ds)} disabled={generatingTicketIds.has(ds.id)}>
                          {generatingTicketIds.has(ds.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
                          {t3('Ticket', 'Ticket', 'Ticket')}
                        </Button>
                      )}
                      {hasTicket && ds.volunteer_email && !isCheckedIn && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => onSendTicketEmail(ds)} disabled={sendingTicketEmailIds.has(ds.id)}>
                          {sendingTicketEmailIds.has(ds.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                          {t3('E-mail', 'E-mail', 'Email')}
                        </Button>
                      )}
                      {isCheckedIn && !isCheckedOut && isHourly && (
                        <Button size="sm" variant="outline" className="gap-1 text-orange-700" onClick={() => onCheckout(ds)} disabled={checkingOutIds.has(ds.id)}>
                          {checkingOutIds.has(ds.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                          {t3('Uitklokken', 'Pointer sortie', 'Clock out')}
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
