import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileSignature, UserCheck, UserX } from 'lucide-react';

interface Enrollment {
  id: string;
  volunteer_id: string;
  contract_status: string;
  approval_status: string;
  profiles?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}

interface MonthlyEnrollmentsListProps {
  enrollments: Enrollment[];
  plan: { id: string; contract_template_id: string | null } | null;
  language: string;
  t3: (nl: string, fr: string, en: string) => string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSendContract: (enrollment: Enrollment) => void;
}

const MonthlyEnrollmentsList = ({ enrollments, plan, language, t3, onApprove, onReject, onSendContract }: MonthlyEnrollmentsListProps) => {
  if (enrollments.length === 0) return null;

  const approvalBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600 text-[10px]">{t3('Goedgekeurd', 'Approuvé', 'Approved')}</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-[10px]">{t3('Afgewezen', 'Refusé', 'Rejected')}</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{t3('Wacht op goedkeuring', 'En attente d\'approbation', 'Awaiting approval')}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> {t3('Ingeschreven vrijwilligers', 'Bénévoles inscrits', 'Enrolled volunteers')}</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {enrollments.map(e => (
            <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {((e.profiles as any)?.full_name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{(e.profiles as any)?.full_name || (e.profiles as any)?.email || t3('Onbekend', 'Inconnu', 'Unknown')}</p>
                <p className="text-xs text-muted-foreground">{(e.profiles as any)?.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {approvalBadge(e.approval_status)}
                {e.approval_status === 'approved' && (
                  <Badge variant={e.contract_status === 'signed' ? 'default' : 'secondary'}>
                    {e.contract_status === 'signed' ? t3('Contract getekend', 'Contrat signé', 'Contract signed') : e.contract_status === 'sent' ? t3('Verstuurd', 'Envoyé', 'Sent') : t3('Wacht op contract', 'En attente du contrat', 'Awaiting contract')}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {e.approval_status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1 text-green-700" onClick={() => onApprove(e.id)}>
                      <UserCheck className="w-3.5 h-3.5" /> {t3('Goedkeuren', 'Approuver', 'Approve')}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => onReject(e.id)}>
                      <UserX className="w-3.5 h-3.5" /> {t3('Afwijzen', 'Refuser', 'Reject')}
                    </Button>
                  </>
                )}
                {e.approval_status === 'approved' && plan?.contract_template_id && e.contract_status !== 'signed' && (
                  <Button size="sm" variant="outline" onClick={() => onSendContract(e)}>
                    <FileSignature className="w-3.5 h-3.5 mr-1" />
                    {e.contract_status === 'sent' ? t3('Opnieuw', 'Renvoyer', 'Resend') : 'Contract'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyEnrollmentsList;
