import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Language } from '@/i18n/translations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Clock, Euro, Archive, CheckCircle, Loader2, AlertTriangle, ArrowRight, ArrowLeft, ShieldCheck
} from 'lucide-react';
import VolunteerStepper, { StepStatus } from '@/components/VolunteerStepper';

interface Props {
  open: boolean;
  onClose: () => void;
  clubId: string;
  seasonId: string;
  seasonName: string;
  language: Language;
  onCompleted: () => void;
}

const CloseSeasonWizard = ({ open, onClose, clubId, seasonId, seasonName, language, onCompleted }: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0: hours
  const [pendingHours, setPendingHours] = useState<any[]>([]);
  // Step 1: payouts
  const [unpaidAmount, setUnpaidAmount] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  // Step 2: contracts
  const [signedCount, setSignedCount] = useState(0);
  const [otherCount, setOtherCount] = useState(0);
  // Step 3: summary
  const [closing, setClosing] = useState(false);

  const stepLabels = [
    t('Uren', 'Heures', 'Hours'),
    t('Vergoedingen', 'Compensations', 'Payouts'),
    t('Contracten', 'Contrats', 'Contracts'),
    t('Afsluiten', 'Clôturer', 'Close'),
  ];

  const stepStatuses: StepStatus[] = stepLabels.map((_, i) =>
    i < step ? 'completed' : i === step ? 'active' : 'upcoming'
  );

  useEffect(() => {
    if (open) {
      setStep(0);
      loadStepData();
    }
  }, [open]);

  const loadStepData = async () => {
    setLoading(true);

    // Get season date range
    const { data: season } = await supabase
      .from('seasons')
      .select('start_date, end_date')
      .eq('id', seasonId)
      .single();
    if (!season) { setLoading(false); return; }

    // Get season tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, expense_amount')
      .eq('club_id', clubId)
      .gte('task_date', season.start_date)
      .lte('task_date', season.end_date);
    const taskIds = (tasks || []).map(t => t.id);

    // Parallel loads
    const [pendingRes, confirmedRes, contractsRes] = await Promise.all([
      taskIds.length > 0
        ? supabase.from('hour_confirmations').select('id, volunteer_id, final_hours, final_amount, task_id').eq('status', 'pending').in('task_id', taskIds)
        : Promise.resolve({ data: [] }),
      taskIds.length > 0
        ? supabase.from('hour_confirmations').select('id, final_amount, task_id').in('status', ['confirmed', 'auto_confirmed']).in('task_id', taskIds)
        : Promise.resolve({ data: [] }),
      (supabase.from('season_contracts') as any).select('id, status, archived_at').eq('season_id', seasonId).eq('club_id', clubId),
    ]);

    // Step 0
    setPendingHours((pendingRes.data || []) as any[]);

    // Step 1: find confirmed hours without a sepa_batch_item
    const confirmed = (confirmedRes.data || []) as any[];
    // Check which already have a sepa_batch_item
    if (confirmed.length > 0) {
      const hcIds = confirmed.map((h: any) => h.id);
      const { data: batchItems } = await (supabase
        .from('sepa_batch_items') as any)
        .select('hour_confirmation_id')
        .in('hour_confirmation_id', hcIds);
      const paidIds = new Set((batchItems || []).map((b: any) => b.hour_confirmation_id));
      const unpaid = confirmed.filter((h: any) => !paidIds.has(h.id));
      setUnpaidCount(unpaid.length);
      setUnpaidAmount(unpaid.reduce((s: number, h: any) => s + (h.final_amount || 0), 0));
    } else {
      setUnpaidCount(0);
      setUnpaidAmount(0);
    }

    // Step 2
    const allContracts = (contractsRes.data || []) as any[];
    const signed = allContracts.filter((c: any) => c.status === 'signed' && !c.archived_at);
    const other = allContracts.filter((c: any) => c.status !== 'signed');
    setSignedCount(signed.length);
    setOtherCount(other.length);

    setLoading(false);
  };

  const handleBulkConfirmHours = async () => {
    setLoading(true);
    const ids = pendingHours.map(h => h.id);
    if (ids.length > 0) {
      await supabase
        .from('hour_confirmations')
        .update({ status: 'confirmed' } as any)
        .in('id', ids);
      toast.success(t(`${ids.length} uren bevestigd`, `${ids.length} heures confirmées`, `${ids.length} hours confirmed`));
      setPendingHours([]);
    }
    setLoading(false);
  };

  const handleArchiveContracts = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('season_contracts')
      .update({ archived_at: new Date().toISOString() } as any)
      .eq('season_id', seasonId)
      .eq('club_id', clubId)
      .eq('status', 'signed')
      .is('archived_at', null);

    if (error) {
      toast.error(t('Fout bij archiveren', 'Erreur d\'archivage', 'Archive error'));
    } else {
      toast.success(t('Contracten gearchiveerd', 'Contrats archivés', 'Contracts archived'));
      setSignedCount(0);
    }
    setLoading(false);
  };

  const handleCloseSeason = async () => {
    setClosing(true);
    // Set season inactive
    await supabase.from('seasons').update({ is_active: false }).eq('id', seasonId);

    // Create audit log
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      club_id: clubId,
      actor_id: user?.id || null,
      action: 'season_closed',
      resource_type: 'season',
      resource_id: seasonId,
      new_values: { season_name: seasonName },
    });

    toast.success(t('Seizoen afgesloten!', 'Saison clôturée!', 'Season closed!'));
    setClosing(false);
    onCompleted();
    onClose();
  };

  const renderStep = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('Uren controleren', 'Vérifier les heures', 'Check hours')}</h3>
                <p className="text-xs text-muted-foreground">{t('Bevestig alle openstaande uren voordat je het seizoen afsluit.', 'Confirmez toutes les heures en attente.', 'Confirm all pending hours before closing.')}</p>
              </div>
            </div>

            {pendingHours.length === 0 ? (
              <div className="bg-muted/30 rounded-xl p-6 text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-foreground font-medium">{t('Alle uren zijn bevestigd!', 'Toutes les heures sont confirmées!', 'All hours are confirmed!')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">
                      {pendingHours.length} {t('openstaande uurbevestigingen', 'confirmations d\'heures en attente', 'pending hour confirmations')}
                    </p>
                  </div>
                </div>
                <Button onClick={handleBulkConfirmHours} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {t('Bevestig alle uren in bulk', 'Confirmer toutes les heures', 'Confirm all hours in bulk')}
                </Button>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('Vergoedingen uitbetalen', 'Payer les compensations', 'Pay compensations')}</h3>
                <p className="text-xs text-muted-foreground">{t('Controleer openstaande vergoedingen.', 'Vérifiez les compensations en attente.', 'Check outstanding payouts.')}</p>
              </div>
            </div>

            {unpaidCount === 0 ? (
              <div className="bg-muted/30 rounded-xl p-6 text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-foreground font-medium">{t('Alle vergoedingen zijn uitbetaald!', 'Toutes les compensations sont payées!', 'All payouts are done!')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">{t('Nog uit te betalen', 'Encore à payer', 'Outstanding')}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">€{unpaidAmount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{unpaidCount} {t('items', 'éléments', 'items')}</p>
                </div>
                <Button onClick={() => navigate('/sepa-payouts')} variant="outline" className="w-full">
                  <Euro className="w-4 h-4 mr-1" />
                  {t('Ga naar SEPA uitbetaling', 'Aller aux paiements SEPA', 'Go to SEPA payouts')}
                </Button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Archive className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('Contracten archiveren', 'Archiver les contrats', 'Archive contracts')}</h3>
                <p className="text-xs text-muted-foreground">{t('Archiveer alle ondertekende contracten van dit seizoen.', 'Archivez tous les contrats signés.', 'Archive all signed contracts.')}</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('Ondertekend', 'Signés', 'Signed')}</span>
                <Badge variant="secondary">{signedCount}</Badge>
              </div>
              {otherCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('Niet ondertekend / in afwachting', 'Non signé / en attente', 'Not signed / pending')}</span>
                  <Badge variant="outline">{otherCount}</Badge>
                </div>
              )}
            </div>

            {signedCount > 0 ? (
              <Button onClick={handleArchiveContracts} className="w-full">
                <Archive className="w-4 h-4 mr-1" />
                {t('Archiveer alle ondertekende contracten', 'Archiver tous les contrats signés', 'Archive all signed contracts')}
              </Button>
            ) : (
              <div className="bg-muted/30 rounded-xl p-6 text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-foreground font-medium">{t('Alle contracten gearchiveerd!', 'Tous archivés!', 'All archived!')}</p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('Bevestig afsluiting', 'Confirmer la clôture', 'Confirm closure')}</h3>
                <p className="text-xs text-muted-foreground">{t('Controleer onderstaande samenvatting en sluit het seizoen af.', 'Vérifiez le résumé ci-dessous.', 'Review the summary below.')}</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('Openstaande uren', 'Heures en attente', 'Pending hours')}</span>
                <Badge variant={pendingHours.length === 0 ? 'secondary' : 'destructive'}>{pendingHours.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('Onbetaalde vergoedingen', 'Compensations impayées', 'Unpaid payouts')}</span>
                <Badge variant={unpaidCount === 0 ? 'secondary' : 'outline'}>{unpaidCount} (€{unpaidAmount.toFixed(2)})</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('Niet-gearchiveerde contracten', 'Contrats non archivés', 'Unarchived contracts')}</span>
                <Badge variant={signedCount === 0 ? 'secondary' : 'outline'}>{signedCount}</Badge>
              </div>
            </div>

            {(pendingHours.length > 0 || unpaidCount > 0) && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">
                  {t('Er zijn nog openstaande items. Je kunt het seizoen toch afsluiten, maar deze worden niet automatisch afgehandeld.',
                    'Il reste des éléments en attente. Vous pouvez quand même clôturer.',
                    'There are outstanding items. You can still close, but they won\'t be auto-handled.')}
                </p>
              </div>
            )}

            <Button onClick={handleCloseSeason} disabled={closing} className="w-full" variant="destructive">
              {closing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
              {t('Seizoen definitief afsluiten', 'Clôturer définitivement', 'Close season permanently')}
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {t('Seizoen afsluiten', 'Clôturer la saison', 'Close season')} — {seasonName}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <VolunteerStepper steps={stepLabels.map((label, i) => ({ label, status: stepStatuses[i] }))} />
          <Progress value={((step + 1) / 4) * 100} className="mt-3 h-1.5" />
        </div>

        <div className="min-h-[200px]">
          {renderStep()}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : onClose()} disabled={loading || closing}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {step === 0 ? t('Annuleren', 'Annuler', 'Cancel') : t('Vorige', 'Précédent', 'Back')}
          </Button>
          {step < 3 && (
            <Button onClick={() => setStep(step + 1)} disabled={loading}>
              {t('Volgende', 'Suivant', 'Next')}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseSeasonWizard;
