import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSignature, CheckCircle, Clock, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

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

interface SeasonContract {
  id: string;
  status: string;
  signing_url: string | null;
  document_url: string | null;
  created_at: string;
  template_name?: string;
  template_category?: string;
  season_name?: string;
  club_name?: string;
}

interface Props {
  contracts: SignatureContract[];
  language: string;
  checkingContract: string | null;
  onCheckStatus: (contractId: string) => void;
  userId?: string;
}

const VolunteerContractsTab = ({ contracts, language, checkingContract, onCheckStatus, userId }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const [seasonContracts, setSeasonContracts] = useState<SeasonContract[]>([]);

  useEffect(() => {
    if (!userId) return;
    const loadSeasonContracts = async () => {
      const { data } = await supabase
        .from('season_contracts')
        .select('id, status, signing_url, document_url, created_at, template_id, season_id, club_id')
        .eq('volunteer_id', userId)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) return;

      // Enrich with template, season, club names
      const templateIds = [...new Set(data.map(d => d.template_id))];
      const seasonIds = [...new Set(data.map(d => d.season_id))];
      const clubIds = [...new Set(data.map(d => d.club_id))];

      const [templatesRes, seasonsRes, clubsRes] = await Promise.all([
        supabase.from('season_contract_templates').select('id, name, category').in('id', templateIds),
        supabase.from('seasons').select('id, name').in('id', seasonIds),
        supabase.from('clubs').select('id, name').in('id', clubIds),
      ]);

      const tmplMap = new Map((templatesRes.data || []).map(t => [t.id, t]));
      const seasonMap = new Map((seasonsRes.data || []).map(s => [s.id, s.name]));
      const clubMap = new Map((clubsRes.data || []).map(c => [c.id, c.name]));

      setSeasonContracts(data.map(d => {
        const tmpl = tmplMap.get(d.template_id);
        return {
          id: d.id,
          status: d.status,
          signing_url: d.signing_url,
          document_url: d.document_url,
          created_at: d.created_at,
          template_name: tmpl?.name || 'Contract',
          template_category: tmpl?.category || '',
          season_name: seasonMap.get(d.season_id) || '',
          club_name: clubMap.get(d.club_id) || '',
        };
      }));
    };
    loadSeasonContracts();
  }, [userId]);

  const categoryLabels: Record<string, string> = {
    steward: 'Steward',
    bar_catering: t('Bar & Catering', 'Bar & Traiteur', 'Bar & Catering'),
    terrain_material: t('Terrein', 'Terrain', 'Terrain'),
    admin_ticketing: 'Admin / Ticketing',
    event_support: 'Event Support',
  };

  const allEmpty = contracts.length === 0 && seasonContracts.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">{t('Contracten', 'Contrats', 'Contracts')}</h1>

      {allEmpty ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('Je hebt nog geen contracten.', 'Aucun contrat.', 'No contracts.')}</p>
        </div>
      ) : (
        <>
          {/* Season contracts */}
          {seasonContracts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('Seizoenscontracten', 'Contrats saisonniers', 'Season contracts')}
              </h2>
              {seasonContracts.map((sc, i) => (
                <motion.div key={sc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`bg-card rounded-2xl p-5 shadow-sm border ${sc.status === 'signed' ? 'border-green-200 dark:border-green-800' : 'border-border'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{sc.template_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {sc.club_name && <span className="text-xs text-muted-foreground">{sc.club_name}</span>}
                        {sc.season_name && <Badge variant="outline" className="text-[10px]">{sc.season_name}</Badge>}
                        {sc.template_category && (
                          <Badge variant="secondary" className="text-[10px]">
                            {categoryLabels[sc.template_category] || sc.template_category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {sc.status === 'signed' ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle className="w-3.5 h-3.5" />{t('Ondertekend', 'Signé', 'Signed')}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-yellow-600"><Clock className="w-3.5 h-3.5" />{t('Wacht op ondertekening', 'En attente de signature', 'Awaiting signature')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {(sc.status === 'pending' || sc.status === 'sent') && sc.signing_url && (
                        <a href={sc.signing_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                          <FileSignature className="w-3.5 h-3.5" />{t('Nu ondertekenen', 'Signer maintenant', 'Sign now')}
                        </a>
                      )}
                      {sc.status === 'signed' && sc.document_url && (
                        <a href={sc.document_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-green-200 text-green-700 hover:bg-green-50 transition-colors">
                          <Download className="w-3.5 h-3.5" />{t('Download', 'Télécharger', 'Download')}
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('Verstuurd op', 'Envoyé le', 'Sent on')}: {new Date(sc.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Legacy task-based contracts */}
          {contracts.length > 0 && (
            <div className="space-y-3">
              {seasonContracts.length > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('Taakcontracten', 'Contrats de tâche', 'Task contracts')}
                </h2>
              )}
              {contracts.map((contract, i) => (
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VolunteerContractsTab;
