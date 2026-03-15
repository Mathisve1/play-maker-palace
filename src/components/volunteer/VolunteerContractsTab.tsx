import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSignature, CheckCircle, Clock, Download, Eye, CalendarDays, X, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  signed_at: string | null;
  template_name?: string;
  template_category?: string;
  template_description?: string;
  season_name?: string;
  season_start?: string;
  season_end?: string;
  club_name?: string;
  volunteer_name?: string;
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
  const [previewContract, setPreviewContract] = useState<SeasonContract | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const loadSeasonContracts = async () => {
      const { data } = await supabase
        .from('season_contracts')
        .select('id, status, signing_url, document_url, created_at, signed_at, template_id, season_id, club_id, volunteer_id')
        .eq('volunteer_id', userId)
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) return;

      const templateIds = [...new Set(data.map(d => d.template_id))];
      const seasonIds = [...new Set(data.map(d => d.season_id))];
      const clubIds = [...new Set(data.map(d => d.club_id))];

      const [templatesRes, seasonsRes, clubsRes, profileRes] = await Promise.all([
        supabase.from('season_contract_templates').select('id, name, category, description').in('id', templateIds),
        supabase.from('seasons').select('id, name, start_date, end_date').in('id', seasonIds),
        supabase.from('clubs').select('id, name').in('id', clubIds),
        supabase.from('profiles').select('id, full_name').eq('id', userId).maybeSingle(),
      ]);

      const tmplMap = new Map((templatesRes.data || []).map(t => [t.id, t]));
      const seasonMap = new Map((seasonsRes.data || []).map(s => [s.id, s]));
      const clubMap = new Map((clubsRes.data || []).map(c => [c.id, c.name]));
      const volunteerName = profileRes.data?.full_name || '';

      setSeasonContracts(data.map(d => {
        const tmpl = tmplMap.get(d.template_id);
        const season = seasonMap.get(d.season_id);
        return {
          id: d.id,
          status: d.status,
          signing_url: d.signing_url,
          document_url: d.document_url,
          created_at: d.created_at,
          signed_at: d.signed_at,
          template_name: tmpl?.name || 'Contract',
          template_category: tmpl?.category || '',
          template_description: tmpl?.description || '',
          season_name: season?.name || '',
          season_start: season?.start_date || '',
          season_end: season?.end_date || '',
          club_name: clubMap.get(d.club_id) || '',
          volunteer_name: volunteerName,
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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(
      language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );
  };

  const generateContractPdf = async (sc: SeasonContract) => {
    setGeneratingPdf(sc.id);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentW = pageW - margin * 2;
      let y = 25;

      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageW, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(t('SEIZOENSCONTRACT', 'CONTRAT SAISONNIER', 'SEASON CONTRACT'), margin, y);
      y += 9;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(t(
        'Vrijwilligersovereenkomst — Belgisch Vrijwilligersstatuut',
        'Convention de bénévolat — Statut belge du volontariat',
        'Volunteer Agreement — Belgian Volunteer Statute'
      ), margin, y);
      y = 50;

      // Reset text color
      doc.setTextColor(30, 30, 30);

      // Club & Volunteer info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Partijen', 'Parties', 'Parties'), margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const infoLines = [
        [t('Club / Organisatie', 'Club / Organisation', 'Club / Organization'), sc.club_name || '—'],
        [t('Vrijwilliger', 'Bénévole', 'Volunteer'), sc.volunteer_name || '—'],
        [t('Contracttype', 'Type de contrat', 'Contract type'), sc.template_name || '—'],
        [t('Categorie', 'Catégorie', 'Category'), categoryLabels[sc.template_category || ''] || sc.template_category || '—'],
      ];

      infoLines.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '', margin + 55, y);
        y += 6;
      });

      y += 4;

      // Season info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Seizoensinformatie', 'Informations saison', 'Season information'), margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const seasonLines = [
        [t('Seizoen', 'Saison', 'Season'), sc.season_name || '—'],
        [t('Startdatum', 'Date de début', 'Start date'), formatDate(sc.season_start)],
        [t('Einddatum', 'Date de fin', 'End date'), formatDate(sc.season_end)],
      ];

      seasonLines.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '', margin + 55, y);
        y += 6;
      });

      y += 4;

      // Description
      if (sc.template_description) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(t('Beschrijving', 'Description', 'Description'), margin, y);
        y += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(sc.template_description, contentW);
        doc.text(descLines, margin, y);
        y += descLines.length * 5 + 4;
      }

      // Legal reference
      y += 6;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(t(
        'Wet van 3 juli 2005 betreffende de rechten van vrijwilligers (B.S. 29/08/2005)',
        'Loi du 3 juillet 2005 relative aux droits des volontaires (M.B. 29/08/2005)',
        'Law of 3 July 2005 on the rights of volunteers (B.S. 29/08/2005)'
      ), margin, y);
      y += 10;

      // Signature status
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Ondertekening', 'Signature', 'Signature'), margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (sc.status === 'signed' && sc.signed_at) {
        doc.setTextColor(22, 163, 74);
        doc.text(`✓ ${t('Ondertekend op', 'Signé le', 'Signed on')} ${formatDate(sc.signed_at)}`, margin, y);
      } else {
        doc.setTextColor(202, 138, 4);
        doc.text(`○ ${t('Wacht op ondertekening', 'En attente de signature', 'Awaiting signature')}`, margin, y);
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setTextColor(160, 160, 160);
      doc.setFontSize(8);
      doc.text(`${t('Gegenereerd op', 'Généré le', 'Generated on')} ${formatDate(new Date().toISOString())}`, margin, footerY);
      doc.text(`Contract ID: ${sc.id.slice(0, 8)}`, pageW - margin - 40, footerY);

      const fileName = `contract-${sc.template_name?.replace(/\s+/g, '-').toLowerCase()}-${sc.season_name?.replace(/\s+/g, '-').toLowerCase() || 'season'}.pdf`;
      doc.save(fileName);
      toast.success(t('PDF gedownload!', 'PDF téléchargé !', 'PDF downloaded!'));
    } catch (err: any) {
      toast.error(err.message || 'PDF generation failed');
    }
    setGeneratingPdf(null);
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
          {/* Season contracts grouped by season */}
          {seasonContracts.length > 0 && (() => {
            const grouped = new Map<string, SeasonContract[]>();
            seasonContracts.forEach(sc => {
              const key = sc.season_name || t('Onbekend seizoen', 'Saison inconnue', 'Unknown season');
              if (!grouped.has(key)) grouped.set(key, []);
              grouped.get(key)!.push(sc);
            });
            return [...grouped.entries()].map(([seasonName, scs]) => (
              <div key={seasonName} className="space-y-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  {seasonName}
                </h2>
                {scs.map((sc, i) => (
                  <motion.div key={sc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className={`bg-card rounded-2xl p-5 shadow-sm border ${sc.status === 'signed' ? 'border-green-200 dark:border-green-800' : 'border-border'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{sc.template_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {sc.club_name && <span className="text-xs text-muted-foreground">{sc.club_name}</span>}
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
                          {sc.signed_at && (
                            <span className="text-[10px] text-muted-foreground">
                              ({formatDate(sc.signed_at)})
                            </span>
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
                        {/* View contract preview */}
                        <button
                          onClick={() => setPreviewContract(sc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />{t('Bekijk contract', 'Voir contrat', 'View contract')}
                        </button>
                        {/* Download PDF - DocuSeal URL or client-generated */}
                        {sc.status === 'signed' && sc.document_url ? (
                          <a href={sc.document_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-green-200 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                            <Download className="w-3.5 h-3.5" />{t('Download PDF', 'Télécharger PDF', 'Download PDF')}
                          </a>
                        ) : (
                          <button
                            onClick={() => generateContractPdf(sc)}
                            disabled={generatingPdf === sc.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {generatingPdf === sc.id
                              ? t('Genereren...', 'Génération...', 'Generating...')
                              : t('Download PDF', 'Télécharger PDF', 'Download PDF')}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('Verstuurd op', 'Envoyé le', 'Sent on')}: {new Date(sc.created_at).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </motion.div>
                ))}
              </div>
            ));
          })()}

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

      {/* Contract Preview Dialog */}
      <Dialog open={!!previewContract} onOpenChange={(open) => { if (!open) setPreviewContract(null); }}>
        <DialogContent className="w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-primary" />
              {previewContract?.template_name || 'Contract'}
            </DialogTitle>
            <DialogDescription>
              {previewContract?.club_name} — {previewContract?.season_name}
            </DialogDescription>
          </DialogHeader>

          {previewContract && (
            <div className="space-y-6">
              {/* Contract header */}
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                <h3 className="text-base font-bold text-foreground mb-1">
                  {t('Seizoenscontract', 'Contrat saisonnier', 'Season Contract')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'Vrijwilligersovereenkomst conform de Belgische wet van 3 juli 2005',
                    'Convention de bénévolat conformément à la loi belge du 3 juillet 2005',
                    'Volunteer agreement under the Belgian law of 3 July 2005'
                  )}
                </p>
              </div>

              {/* Parties */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  {t('Partijen', 'Parties', 'Parties')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                      {t('Club / Organisatie', 'Club / Organisation', 'Club / Organization')}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">{previewContract.club_name || '—'}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                      {t('Vrijwilliger', 'Bénévole', 'Volunteer')}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">{previewContract.volunteer_name || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Contract details */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  {t('Contractgegevens', 'Détails du contrat', 'Contract details')}
                </h4>
                <div className="space-y-2">
                  {[
                    [t('Contracttype', 'Type de contrat', 'Contract type'), previewContract.template_name],
                    [t('Categorie', 'Catégorie', 'Category'), categoryLabels[previewContract.template_category || ''] || previewContract.template_category],
                    [t('Seizoen', 'Saison', 'Season'), previewContract.season_name],
                    [t('Startdatum', 'Date de début', 'Start date'), formatDate(previewContract.season_start)],
                    [t('Einddatum', 'Date de fin', 'End date'), formatDate(previewContract.season_end)],
                    [t('Verstuurd op', 'Envoyé le', 'Sent on'), formatDate(previewContract.created_at)],
                  ].map(([label, value], idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-border last:border-b-0">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs font-medium text-foreground">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {previewContract.template_description && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    {t('Beschrijving', 'Description', 'Description')}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                    {previewContract.template_description}
                  </p>
                </div>
              )}

              {/* Signature status */}
              <div className={`rounded-xl p-4 border ${previewContract.status === 'signed' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'}`}>
                <div className="flex items-center gap-2">
                  {previewContract.status === 'signed' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                          {t('Ondertekend', 'Signé', 'Signed')}
                        </p>
                        <p className="text-xs text-green-600/80 dark:text-green-400/70">
                          {t('Ondertekend op', 'Signé le', 'Signed on')} {formatDate(previewContract.signed_at)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                          {t('Wacht op ondertekening', 'En attente de signature', 'Awaiting signature')}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {previewContract.status === 'signed' && previewContract.document_url ? (
                  <Button asChild variant="default" className="gap-2">
                    <a href={previewContract.document_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                      {t('Download ondertekend PDF', 'Télécharger PDF signé', 'Download signed PDF')}
                    </a>
                  </Button>
                ) : (
                  <Button
                    onClick={() => generateContractPdf(previewContract)}
                    disabled={generatingPdf === previewContract.id}
                    variant="default"
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {generatingPdf === previewContract.id
                      ? t('Genereren...', 'Génération...', 'Generating...')
                      : t('Download als PDF', 'Télécharger en PDF', 'Download as PDF')}
                  </Button>
                )}
                {(previewContract.status === 'pending' || previewContract.status === 'sent') && previewContract.signing_url && (
                  <Button asChild variant="outline" className="gap-2">
                    <a href={previewContract.signing_url} target="_blank" rel="noopener noreferrer">
                      <FileSignature className="w-4 h-4" />
                      {t('Nu ondertekenen', 'Signer maintenant', 'Sign now')}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VolunteerContractsTab;
