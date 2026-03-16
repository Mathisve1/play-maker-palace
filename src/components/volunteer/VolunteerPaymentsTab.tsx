import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Banknote, CheckCircle, Clock, AlertTriangle, Wallet, CreditCard } from 'lucide-react';

interface SepaPayoutItem {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  error_flag: boolean;
  error_message: string | null;
  batch_status: string;
  batch_reference: string;
  task_title?: string;
  club_name?: string;
}

interface VolunteerPayment {
  id: string;
  task_id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  task_title?: string;
  club_name?: string;
}

interface Props {
  sepaPayouts: SepaPayoutItem[];
  payments: VolunteerPayment[];
  language: string;
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

type UnifiedRow = {
  id: string;
  source: 'sepa' | 'payment';
  amount: number;
  date: string;
  taskTitle: string;
  clubName: string;
  status: 'paid' | 'processing' | 'error';
  statusLabel: string;
  extra?: string;
};

const VolunteerPaymentsTab = ({ sepaPayouts, payments, language }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  const rows = useMemo<UnifiedRow[]>(() => {
    const sepaRows: UnifiedRow[] = sepaPayouts.map(s => {
      const isExported = ['downloaded', 'signed'].includes(s.batch_status);
      let status: UnifiedRow['status'] = 'processing';
      let statusLabel = t('In behandeling', 'En cours', 'Processing');
      if (s.error_flag) {
        status = 'error';
        statusLabel = t('Fout', 'Erreur', 'Error');
      } else if (isExported) {
        status = 'paid';
        statusLabel = t('Betaald', 'Payé', 'Paid');
      }
      const est = addBusinessDays(new Date(s.created_at), 2);
      return {
        id: s.id,
        source: 'sepa',
        amount: s.amount,
        date: s.created_at,
        taskTitle: s.task_title || t('Taak', 'Tâche', 'Task'),
        clubName: s.club_name || '',
        status,
        statusLabel,
        extra: status === 'processing' ? `${t('Verwacht', 'Estimé', 'Expected')}: ${est.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}` : undefined,
      };
    });

    const payRows: UnifiedRow[] = payments.map(p => {
      let status: UnifiedRow['status'] = 'processing';
      let statusLabel = t('In behandeling', 'En cours', 'Processing');
      if (p.status === 'succeeded' || p.status === 'paid') {
        status = 'paid';
        statusLabel = t('Betaald', 'Payé', 'Paid');
      } else if (p.status === 'failed') {
        status = 'error';
        statusLabel = t('Fout', 'Erreur', 'Error');
      }
      return {
        id: p.id,
        source: 'payment',
        amount: p.amount,
        date: p.paid_at || p.created_at,
        taskTitle: p.task_title || t('Taak', 'Tâche', 'Task'),
        clubName: p.club_name || '',
        status,
        statusLabel,
      };
    });

    return [...sepaRows, ...payRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sepaPayouts, payments, language]);

  const totalPaid = rows.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const totalProcessing = rows.filter(r => r.status === 'processing').reduce((s, r) => s + r.amount, 0);

  const statusStyles: Record<UnifiedRow['status'], { bg: string; text: string; icon: typeof CheckCircle }> = {
    paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle },
    processing: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: Clock },
    error: { bg: 'bg-destructive/10', text: 'text-destructive', icon: AlertTriangle },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
        <Wallet className="w-6 h-6 text-primary" />
        {t('Vergoedingen', 'Remboursements', 'Payments')}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('Totaal ontvangen', 'Total reçu', 'Total received')}</p>
          <p className="text-2xl font-heading font-bold text-green-600 dark:text-green-400 mt-1">€{totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('In behandeling', 'En cours', 'Processing')}</p>
          <p className="text-2xl font-heading font-bold text-orange-600 dark:text-orange-400 mt-1">€{totalProcessing.toFixed(2)}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Banknote className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium">{t('Nog geen vergoedingen ontvangen.', 'Aucun remboursement reçu.', 'No payments received yet.')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => {
            const st = statusStyles[row.status];
            const Icon = st.icon;
            return (
              <motion.div key={row.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-xl p-4 shadow-sm border border-border hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{row.taskTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {row.clubName && <p className="text-xs text-muted-foreground">{row.clubName}</p>}
                      {row.source === 'sepa' && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">SEPA</span>
                      )}
                    </div>
                    {row.extra && <p className="text-[11px] text-muted-foreground mt-1">{row.extra}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className={`text-base font-heading font-bold ${row.status === 'paid' ? 'text-green-600 dark:text-green-400' : row.status === 'error' ? 'text-destructive' : 'text-orange-600 dark:text-orange-400'}`}>
                      €{row.amount.toFixed(2)}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                      <Icon className="w-3 h-3" />
                      {row.statusLabel}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(row.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VolunteerPaymentsTab;
