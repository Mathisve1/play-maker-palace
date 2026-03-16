import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileSignature, CheckCircle, Clock, Download, Eye, X, FileText, Info, Building2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  club_id?: string;
  club_logo_url?: string | null;
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
  club_id?: string;
  club_logo_url?: string | null;
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
  const navigate = useNavigate();
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
        supabase.from('clubs').select('id, name, logo_url').in('id', clubIds),
        supabase.from('profiles').select('id, full_name').eq('id', userId).maybeSingle(),
      ]);

      const tmplMap = new Map((templatesRes.data || []).map(t => [t.id, t]));
      const seasonMap = new Map((seasonsRes.data || []).map(s => [s.id, s]));
      const clubMap = new Map((clubsRes.data || []).map(c => [c.id, { name: c.name, logo_url: c.logo_url }]));
      const volunteerName = profileRes.data?.full_name || '';

      setSeasonContracts(data.map(d => {
        const tmpl = tmplMap.get(d.template_id);
        const season = seasonMap.get(d.season_id);
        const club = clubMap.get(d.club_id);
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
          club_name: club?.name || '',
          club_id: d.club_id,
          club_logo_url: club?.logo_url || null,
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

  const statusConfig = (status: string) => {
    switch (status) {
      case 'signed':
      case 'completed':
        return { label: t('Getekend', 'Signé', 'Signed'), icon: CheckCircle, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      case 'voided':
      case 'expired':
        return { label: t('Verlopen', 'Expiré', 'Expired'), icon: X, className: 'bg-destructive/10 text-destructive' };
      default:
        return { label: t('Te tekenen', 'À signer', 'To sign'), icon: Clock, className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    }
  };

  // --- PDF generation (kept as-is) ---
  const generateContractPdf = async (sc: SeasonContract) => {
    setGeneratingPdf(sc.id);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentW = pageW - margin * 2;
      let y = 25;

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
      doc.setTextColor(30, 30, 30);
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

  // --- Group all contracts by club ---
  type AnyContract = { type: 'season'; data: SeasonContract } | { type: 'legacy'; data: SignatureContract };

  const groupedByClub = (() => {
    const map = new Map<string, { clubName: string; clubLogoUrl: string | null; items: AnyContract[] }>();

    seasonContracts.forEach(sc => {
      const key = sc.club_id || sc.club_name || 'unknown';
      if (!map.has(key)) map.set(key, { clubName: sc.club_name || t('Onbekende club', 'Club inconnue', 'Unknown club'), clubLogoUrl: sc.club_logo_url || null, items: [] });
      map.get(key)!.items.push({ type: 'season', data: sc });
    });

    contracts.forEach(c => {
      const key = c.club_id || c.club_name || 'unknown';
      if (!map.has(key)) map.set(key, { clubName: c.club_name || t('Onbekende club', 'Club inconnue', 'Unknown club'), clubLogoUrl: c.club_logo_url || null, items: [] });
      map.get(key)!.items.push({ type: 'legacy', data: c });
    });

    return [...map.entries()];
  })();

  const allEmpty = contracts.length === 0 && seasonContracts.length === 0;

  // --- Render contract card ---
  const renderSeasonCard = (sc: SeasonContract, i: number) => {
    const st = statusConfig(sc.status);
    const StatusIcon = st.icon;
    return (
      <motion.div key={sc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
        className="bg-card rounded-xl p-4 shadow-sm border border-border hover:border-primary/20 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{sc.template_name}</p>
              {sc.template_category && (
                <Badge variant="secondary" className="text-[10px]">
                  {categoryLabels[sc.template_category] || sc.template_category}
                </Badge>
              )}
            </div>
            {sc.season_name && (
              <p className="text-xs text-muted-foreground mt-1">{t('Seizoen', 'Saison', 'Season')}: {sc.season_name}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.className}`}>
                <StatusIcon className="w-3 h-3" />
                {st.label}
              </span>
              {sc.signed_at && sc.status === 'signed' && (
                <span className="text-[10px] text-muted-foreground">{formatDate(sc.signed_at)}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {(sc.status === 'pending' || sc.status === 'sent') && sc.signing_url && (
              <a href={sc.signing_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                <FileSignature className="w-3.5 h-3.5" />{t('Ondertekenen', 'Signer', 'Sign')}
              </a>
            )}
            {sc.document_url && (
              <a href={sc.document_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Eye className="w-3.5 h-3.5" />{t('Bekijk document', 'Voir document', 'View document')}
              </a>
            )}
            <button
              onClick={() => setPreviewContract(sc)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />{t('Details', 'Détails', 'Details')}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderLegacyCard = (c: SignatureContract, i: number) => {
    const st = statusConfig(c.status);
    const StatusIcon = st.icon;
    return (
      <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
        className="bg-card rounded-xl p-4 shadow-sm border border-border hover:border-primary/20 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{c.task_title || 'Contract'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.className}`}>
                <StatusIcon className="w-3 h-3" />
                {st.label}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {c.status === 'pending' && c.signing_url && (
              <a href={c.signing_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                <FileSignature className="w-3.5 h-3.5" />{t('Ondertekenen', 'Signer', 'Sign')}
              </a>
            )}
            {c.status === 'completed' && c.document_url && (
              <a href={c.document_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Eye className="w-3.5 h-3.5" />{t('Bekijk document', 'Voir document', 'View document')}
              </a>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
        <FileSignature className="w-6 h-6 text-primary" />
        {t('Contracten', 'Contrats', 'Contracts')}
      </h1>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/15 p-4">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground/80">
          {t(
            'Een seizoenscontract geldt voor het volledige sportseizoen. Je tekent éénmaal per seizoen per club.',
            'Un contrat de saison est valable pour toute la saison sportive. Vous signez une fois par saison par club.',
            'A season contract covers the full sports season. You sign once per season per club.'
          )}
        </p>
      </div>

      {allEmpty ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileSignature className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium mb-1">
            {t('Nog geen contracten', 'Pas encore de contrats', 'No contracts yet')}
          </p>
          <p className="text-sm mb-6">
            {t(
              'Schrijf je in op een taak om een contract te ontvangen.',
              'Inscrivez-vous à une tâche pour recevoir un contrat.',
              'Sign up for a task to receive a contract.'
            )}
          </p>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/community')}>
            <ExternalLink className="w-4 h-4" />
            {t('Zoek taken', 'Chercher des tâches', 'Find tasks')}
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByClub.map(([clubKey, { clubName, clubLogoUrl, items }]) => (
            <div key={clubKey} className="space-y-3">
              {/* Club header */}
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                {clubLogoUrl ? (
                  <img src={clubLogoUrl} alt={clubName} className="w-8 h-8 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <h2 className="text-base font-bold text-foreground">{clubName}</h2>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {items.length} {items.length === 1 ? 'contract' : t('contracten', 'contrats', 'contracts')}
                </Badge>
              </div>

              {/* Contract cards */}
              <div className="space-y-2">
                {items.map((item, i) =>
                  item.type === 'season'
                    ? renderSeasonCard(item.data, i)
                    : renderLegacyCard(item.data, i)
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contract Preview Dialog — kept as-is */}
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

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">{t('Partijen', 'Parties', 'Parties')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{t('Club / Organisatie', 'Club / Organisation', 'Club / Organization')}</p>
                    <p className="text-sm font-medium text-foreground mt-1">{previewContract.club_name || '—'}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{t('Vrijwilliger', 'Bénévole', 'Volunteer')}</p>
                    <p className="text-sm font-medium text-foreground mt-1">{previewContract.volunteer_name || '—'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">{t('Contractgegevens', 'Détails du contrat', 'Contract details')}</h4>
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

              {previewContract.template_description && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">{t('Beschrijving', 'Description', 'Description')}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                    {previewContract.template_description}
                  </p>
                </div>
              )}

              {(() => {
                const st = statusConfig(previewContract.status);
                const StatusIcon = st.icon;
                return (
                  <div className={`rounded-xl p-4 border ${
                    previewContract.status === 'signed' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : previewContract.status === 'voided' ? 'bg-destructive/5 border-destructive/20'
                    : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-5 h-5" />
                      <div>
                        <p className="text-sm font-semibold">{st.label}</p>
                        {previewContract.signed_at && previewContract.status === 'signed' && (
                          <p className="text-xs opacity-70">{t('Ondertekend op', 'Signé le', 'Signed on')} {formatDate(previewContract.signed_at)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {previewContract.status === 'signed' && previewContract.document_url ? (
                  <Button asChild variant="default" className="gap-2">
                    <a href={previewContract.document_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                      {t('Download ondertekend PDF', 'Télécharger PDF signé', 'Download signed PDF')}
                    </a>
                  </Button>
                ) : (
                  <Button onClick={() => generateContractPdf(previewContract)} disabled={generatingPdf === previewContract.id} variant="default" className="gap-2">
                    <FileText className="w-4 h-4" />
                    {generatingPdf === previewContract.id ? t('Genereren...', 'Génération...', 'Generating...') : t('Download als PDF', 'Télécharger en PDF', 'Download as PDF')}
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
