import { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ExternalLink, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Language } from '@/i18n/translations';

interface ContractInfo {
  id: string;
  status: string;
  template_name: string;
  signing_url: string | null;
  signed_at: string | null;
}

interface Props {
  contracts: ContractInfo[];
  volunteerId: string;
  volunteerName: string;
  language: Language;
  onResend?: (volunteerId: string) => void;
}

const ContractStatusIndicator = ({ contracts, volunteerId, volunteerName, language, onResend }: Props) => {
  const [showDetail, setShowDetail] = useState(false);
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const hasSigned = contracts.some(c => c.status === 'signed');
  const hasPending = contracts.some(c => c.status === 'sent' || c.status === 'pending');
  const hasNone = contracts.length === 0;

  let icon: React.ReactNode;
  let statusColor: string;

  if (hasSigned) {
    icon = <CheckCircle className="w-5 h-5 text-green-600" />;
    statusColor = 'text-green-600';
  } else if (hasPending) {
    icon = <Clock className="w-5 h-5 text-yellow-600" />;
    statusColor = 'text-yellow-600';
  } else {
    icon = <AlertCircle className="w-5 h-5 text-destructive" />;
    statusColor = 'text-destructive';
  }

  const statusLabel = hasSigned
    ? t('Ondertekend', 'Signé', 'Signed')
    : hasPending
    ? t('Wacht op handtekening', 'En attente de signature', 'Awaiting signature')
    : t('Geen contract', 'Pas de contrat', 'No contract');

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setShowDetail(!showDetail); }}
        className={`flex items-center gap-1 p-1 rounded-lg hover:bg-muted/50 transition-colors ${statusColor}`}
        title={statusLabel}
      >
        {icon}
      </button>

      {showDetail && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDetail(false)} />
          <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-xl shadow-lg p-4 w-72" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground">{volunteerName}</h4>
              <button onClick={() => setShowDetail(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {contracts.length === 0 ? (
              <div className="text-center py-3">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2 opacity-60" />
                <p className="text-sm text-muted-foreground">{t('Geen seizoenscontract actief', 'Aucun contrat saisonnier actif', 'No active season contract')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contracts.map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    {c.status === 'signed' ? (
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{c.template_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.status === 'signed'
                          ? `${t('Ondertekend', 'Signé', 'Signed')} ${c.signed_at ? new Date(c.signed_at).toLocaleDateString(language === 'fr' ? 'fr-BE' : 'nl-BE') : ''}`
                          : t('Wacht op handtekening', 'En attente', 'Awaiting signature')}
                      </p>
                    </div>
                    {c.signing_url && c.status !== 'signed' && (
                      <a href={c.signing_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {onResend && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 gap-1.5 text-xs"
                onClick={() => { onResend(volunteerId); setShowDetail(false); }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {hasPending || hasSigned
                  ? t('Stuur opnieuw', 'Renvoyer', 'Resend')
                  : t('Contract versturen', 'Envoyer contrat', 'Send contract')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ContractStatusIndicator;
