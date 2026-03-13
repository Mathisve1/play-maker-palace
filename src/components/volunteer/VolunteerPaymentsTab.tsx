import { motion } from 'framer-motion';
import { Banknote, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

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

interface Props {
  sepaPayouts: SepaPayoutItem[];
  language: string;
}

const VolunteerPaymentsTab = ({ sepaPayouts, language }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const paidTotal = sepaPayouts.filter(s => s.batch_status === 'downloaded' && !s.error_flag).reduce((s, p) => s + p.amount, 0);
  const processingTotal = sepaPayouts.filter(s => ['signed', 'awaiting_signature', 'pending'].includes(s.batch_status) && !s.error_flag).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{t('Vergoedingen', 'Remboursements', 'Payments')}</h1>
      {sepaPayouts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('Je hebt nog geen vergoedingen ontvangen.', 'Aucun remboursement.', 'No payments yet.')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('Betaald', 'Payé', 'Paid')}</p>
              <p className="text-2xl font-heading font-bold text-green-600 mt-1">€{paidTotal.toFixed(2)}</p>
            </div>
            <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('Verwerken', 'En cours', 'Processing')}</p>
              <p className="text-2xl font-heading font-bold text-primary mt-1">€{processingTotal.toFixed(2)}</p>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-2">
            <Banknote className="w-4 h-4 text-primary" />{t('SEPA Vergoedingen', 'Remboursements SEPA', 'SEPA Payments')}
          </h3>
          {sepaPayouts.map((payout, i) => {
            const isExported = ['downloaded', 'signed'].includes(payout.batch_status);
            return (
              <motion.div key={payout.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`bg-card rounded-2xl p-5 shadow-sm border ${payout.error_flag ? 'border-destructive/30' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{payout.task_title || t('Taak', 'Tâche', 'Task')}</p>
                    {payout.club_name && <p className="text-xs text-muted-foreground">{payout.club_name}</p>}
                    <p className="text-lg font-heading font-bold text-foreground mt-1">€{payout.amount.toFixed(2)}</p>
                  </div>
                  <div className="shrink-0">
                    {payout.error_flag ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive">
                        <AlertTriangle className="w-3.5 h-3.5" />{payout.error_message || t('Fout', 'Erreur', 'Error')}
                      </span>
                    ) : isExported ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                        <CheckCircle className="w-3.5 h-3.5" />{t('Geëxporteerd', 'Exporté', 'Exported')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />{t('In verwerking', 'En cours', 'Processing')}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ref: {payout.batch_reference} · {new Date(payout.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </motion.div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default VolunteerPaymentsTab;
