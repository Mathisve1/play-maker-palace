import { motion } from 'framer-motion';
import { FileSignature, CheckCircle, Clock, Download } from 'lucide-react';

interface SignatureContract {
  id: string;
  task_id: string;
  status: string;
  signing_url: string | null;
  document_url: string | null;
  created_at: string;
  updated_at: string;
  task_title?: string;
  club_name?: string;
}

interface Props {
  contracts: SignatureContract[];
  language: string;
  checkingContract: string | null;
  onCheckStatus: (contractId: string) => void;
}

const VolunteerContractsTab = ({ contracts, language, checkingContract, onCheckStatus }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{t('Contracten', 'Contrats', 'Contracts')}</h1>
      {contracts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('Je hebt nog geen contracten.', 'Aucun contrat.', 'No contracts.')}</p>
        </div>
      ) : (
        contracts.map((contract, i) => (
          <motion.div key={contract.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-card rounded-2xl p-5 shadow-sm border ${contract.status === 'completed' ? 'border-green-200 dark:border-green-800' : 'border-border'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{contract.task_title || 'Contract'}</p>
                {contract.club_name && <p className="text-xs text-muted-foreground">{contract.club_name}</p>}
                <div className="flex items-center gap-2 mt-2">
                  {contract.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle className="w-3.5 h-3.5" />{t('Ondertekend', 'Signé', 'Signed')}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-yellow-600"><Clock className="w-3.5 h-3.5" />{t('Wacht op ondertekening', 'En attente de signature', 'Awaiting signature')}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {contract.status === 'pending' && contract.signing_url && (
                  <a href={contract.signing_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                    <FileSignature className="w-3.5 h-3.5" />{t('Nu ondertekenen', 'Signer maintenant', 'Sign now')}
                  </a>
                )}
                {contract.status === 'pending' && (
                  <button onClick={() => onCheckStatus(contract.id)} disabled={checkingContract === contract.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">
                    <Clock className="w-3 h-3" />{t('Status ophalen', 'Vérifier le statut', 'Check status')}
                  </button>
                )}
                {contract.status === 'completed' && contract.document_url && (
                  <a href={contract.document_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                    <Download className="w-3.5 h-3.5" />{t('Download contract', 'Télécharger le contrat', 'Download contract')}
                  </a>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('Verstuurd op', 'Envoyé le', 'Sent on')}: {new Date(contract.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default VolunteerContractsTab;
