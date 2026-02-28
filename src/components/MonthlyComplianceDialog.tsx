import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';
import { YEARLY_LIMIT, HOURS_LIMIT } from '@/hooks/useComplianceData';
import { ShieldCheck, FileSignature, Loader2, Plus, Trash2, Calendar, Download } from 'lucide-react';
import ComplianceBadge from './ComplianceBadge';
import { useComplianceData } from '@/hooks/useComplianceData';

interface MonthlyComplianceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  language: Language;
  onCompleted?: () => void;
}

const monthNames = {
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

interface ExistingDeclaration {
  id: string;
  declaration_month: number;
  declaration_year: number;
  external_income: number;
  external_hours: number;
  declared_at: string;
  signature_status: string;
  docuseal_submission_id: number | null;
  document_url: string | null;
}

const labels = {
  nl: {
    title: 'Externe Inkomsten & Uren',
    description: 'Voeg je externe inkomsten en uren in de sportsector toe. Je kunt dit onbeperkt doen.',
    externalIncome: 'Extern verdiend bedrag (€)',
    externalHours: 'Externe gewerkte uren',
    noExternal: 'Ik heb deze maand geen externe inkomsten of uren gehad',
    oath: 'Ik verklaar op eer dat bovenstaande gegevens correct zijn. Ik begrijp dat onjuiste informatie kan leiden tot RSZ-boetes.',
    confirm: 'Bevestigen & Ondertekenen',
    confirming: 'Verwerken...',
    success: 'Verklaring succesvol ingediend!',
    forMonth: 'Voor de maand',
    currentStatus: 'Huidig jaaroverzicht',
    limitWarning: 'Let op: je nadert het jaarplafond van €3.233,91.',
    limitReached: 'Je hebt het jaarplafond bereikt. Verdere vergoedingen vallen onder Art. 17 (10% RSZ).',
    existingDeclarations: 'Eerdere verklaringen voor deze maand',
    addNew: 'Nieuwe verklaring toevoegen',
    deleteConfirm: 'Weet je zeker dat je deze verklaring wilt verwijderen?',
    deleted: 'Verklaring verwijderd',
    selectMonth: 'Selecteer maand',
    signingOath: 'Verklaring op eer',
  },
  fr: {
    title: 'Revenus & Heures Externes',
    description: 'Ajoutez vos revenus et heures externes dans le secteur sportif. Vous pouvez le faire de manière illimitée.',
    externalIncome: 'Revenus externes (€)',
    externalHours: 'Heures externes travaillées',
    noExternal: 'Je n\'ai eu aucun revenu ni heure externe ce mois-ci',
    oath: 'Je déclare sur l\'honneur que les informations ci-dessus sont correctes. Je comprends que des informations incorrectes peuvent entraîner des amendes ONSS.',
    confirm: 'Confirmer & Signer',
    confirming: 'Traitement...',
    success: 'Déclaration soumise avec succès!',
    forMonth: 'Pour le mois de',
    currentStatus: 'Aperçu annuel actuel',
    limitWarning: 'Attention: vous approchez le plafond annuel de €3.233,91.',
    limitReached: 'Vous avez atteint le plafond annuel. Les remboursements futurs relèvent de l\'Art. 17 (10% ONSS).',
    existingDeclarations: 'Déclarations précédentes pour ce mois',
    addNew: 'Ajouter une nouvelle déclaration',
    deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cette déclaration?',
    deleted: 'Déclaration supprimée',
    selectMonth: 'Sélectionner le mois',
    signingOath: 'Déclaration sur l\'honneur',
  },
  en: {
    title: 'External Income & Hours',
    description: 'Add your external income and hours in the sports sector. You can do this unlimited times.',
    externalIncome: 'External income earned (€)',
    externalHours: 'External hours worked',
    noExternal: 'I had no external income or hours this month',
    oath: 'I declare on oath that the above information is correct. I understand that incorrect information may lead to social security fines.',
    confirm: 'Confirm & Sign',
    confirming: 'Processing...',
    success: 'Declaration submitted successfully!',
    forMonth: 'For the month of',
    currentStatus: 'Current yearly overview',
    limitWarning: 'Warning: you are approaching the yearly limit of €3,233.91.',
    limitReached: 'You have reached the yearly limit. Further reimbursements fall under Art. 17 (10% social security).',
    existingDeclarations: 'Previous declarations for this month',
    addNew: 'Add new declaration',
    deleteConfirm: 'Are you sure you want to delete this declaration?',
    deleted: 'Declaration deleted',
    selectMonth: 'Select month',
    signingOath: 'Sworn declaration',
  },
};

const MonthlyComplianceDialog = ({ open, onOpenChange, userId, language, onCompleted }: MonthlyComplianceDialogProps) => {
  const t = labels[language];
  const now = new Date();
  const currentYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() === 0 ? 12 : now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getMonth() === 0 ? currentYear - 1 : currentYear);

  const [externalIncome, setExternalIncome] = useState('0');
  const [externalHours, setExternalHours] = useState('0');
  const [noExternal, setNoExternal] = useState(false);
  const [oathAccepted, setOathAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingDeclarations, setExistingDeclarations] = useState<ExistingDeclaration[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const { data: compliance, refresh: refreshCompliance } = useComplianceData(userId);

  const monthLabel = monthNames[language][selectedMonth - 1];

  // Load existing declarations for the selected month
  useEffect(() => {
    if (!open || !userId) return;
    const loadExisting = async () => {
      setLoadingExisting(true);
      const { data } = await supabase
        .from('compliance_declarations')
        .select('id, declaration_month, declaration_year, external_income, external_hours, declared_at, signature_status, docuseal_submission_id, document_url')
        .eq('volunteer_id', userId)
        .eq('declaration_year', selectedYear)
        .eq('declaration_month', selectedMonth)
        .order('declared_at', { ascending: false });
      setExistingDeclarations((data as ExistingDeclaration[]) || []);
      setLoadingExisting(false);
    };
    loadExisting();
  }, [open, userId, selectedYear, selectedMonth]);

  // Reset form when month changes
  useEffect(() => {
    setExternalIncome('0');
    setExternalHours('0');
    setNoExternal(false);
    setOathAccepted(false);
  }, [selectedMonth, selectedYear]);

  const handleSubmit = async () => {
    if (!oathAccepted) return;
    setSubmitting(true);

    try {
      const income = noExternal ? 0 : parseFloat(externalIncome) || 0;
      const hours = noExternal ? 0 : parseInt(externalHours) || 0;

      // Insert new declaration (multiple allowed per month now)
      const { data: newDecl, error } = await supabase
        .from('compliance_declarations')
        .insert({
          volunteer_id: userId,
          declaration_year: selectedYear,
          declaration_month: selectedMonth,
          external_income: income,
          external_hours: hours,
          signature_status: 'pending',
          declared_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger DocuSeal signature
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/docuseal?action=sign-compliance-declaration`;
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              declaration_id: newDecl.id,
              month: selectedMonth,
              year: selectedYear,
              external_income: income,
              external_hours: hours,
            }),
          });
          const result = await resp.json();
          console.log('DocuSeal sign result:', result);
          if (resp.ok && result.signing_url) {
            // Open DocuSeal signing page
            window.open(result.signing_url, '_blank');
          } else if (!result.signing_url) {
            console.warn('No signing URL returned:', result.message || 'Unknown reason');
            toast.error(language === 'nl' ? 'Handtekening kon niet worden gestart. Probeer opnieuw.' : 
                        language === 'fr' ? 'La signature n\'a pas pu être initiée. Réessayez.' :
                        'Signature could not be initiated. Please try again.');
          }
        }
      } catch (docuErr) {
        console.error('DocuSeal signing error:', docuErr);
        toast.error(language === 'nl' ? 'Fout bij het starten van de handtekening.' : 
                    language === 'fr' ? 'Erreur lors de l\'initiation de la signature.' :
                    'Error starting the signature process.');
      }

      toast.success(t.success);
      
      // Refresh data
      setExistingDeclarations(prev => [{
        id: newDecl.id,
        declaration_month: selectedMonth,
        declaration_year: selectedYear,
        external_income: income,
        external_hours: hours,
        declared_at: new Date().toISOString(),
        signature_status: 'pending',
        docuseal_submission_id: null,
        document_url: null,
      }, ...prev]);
      
      setExternalIncome('0');
      setExternalHours('0');
      setNoExternal(false);
      setOathAccepted(false);
      
      refreshCompliance();
      onCompleted?.();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
    setSubmitting(false);
  };

  const handleDelete = async (declId: string) => {
    if (!confirm(t.deleteConfirm)) return;
    
    const { error } = await supabase
      .from('compliance_declarations')
      .delete()
      .eq('id', declId)
      .eq('volunteer_id', userId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setExistingDeclarations(prev => prev.filter(d => d.id !== declId));
    toast.success(t.deleted);
    refreshCompliance();
    onCompleted?.();
  };

  // Generate month options (current year, all months up to current)
  const monthOptions: { month: number; year: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    if (selectedYear < currentYear || m <= now.getMonth() + 1) {
      monthOptions.push({ month: m, year: selectedYear });
    }
  }

  const locale = language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto w-[calc(100vw-2rem)] mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Month selector */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">{t.selectMonth}</Label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {monthOptions.map(({ month }) => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedMonth === month
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {monthNames[language][month - 1].slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Target month display */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">{t.forMonth}</p>
            <p className="text-sm font-semibold text-foreground capitalize">{monthLabel} {selectedYear}</p>
          </div>

          {/* Existing declarations for this month */}
          {loadingExisting ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : existingDeclarations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t.existingDeclarations}</p>
              <div className="space-y-2">
                {existingDeclarations.map(decl => (
                  <div key={decl.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-foreground">€ {Number(decl.external_income).toFixed(2)}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{decl.external_hours}h</span>
                        <span className="text-muted-foreground">·</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          decl.signature_status === 'completed' 
                            ? 'bg-accent/20 text-accent-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {decl.signature_status === 'completed' ? '✓' : '⏳'} {decl.signature_status}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(decl.declared_at).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {decl.signature_status === 'completed' && decl.document_url && (
                        <a
                          href={decl.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(decl.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current compliance overview */}
          {compliance && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{t.currentStatus}</p>
              <ComplianceBadge compliance={compliance} language={language} showProgress />
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Plus className="w-3 h-3" />
              {t.addNew}
            </span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* No external checkbox */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors">
            <Checkbox
              checked={noExternal}
              onCheckedChange={(checked) => {
                setNoExternal(!!checked);
                if (checked) {
                  setExternalIncome('0');
                  setExternalHours('0');
                }
              }}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">{t.noExternal}</span>
          </label>

          {/* Income and hours inputs */}
          {!noExternal && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t.externalIncome}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={externalIncome}
                  onChange={e => setExternalIncome(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">{t.externalHours}</Label>
                <Input
                  type="number"
                  min="0"
                  value={externalHours}
                  onChange={e => setExternalHours(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Warning if approaching limit */}
          {compliance && compliance.status === 'orange' && (
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-xs text-orange-700 dark:text-orange-400">
              ⚠️ {t.limitWarning}
            </div>
          )}
          {compliance && compliance.status === 'red' && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
              🚫 {t.limitReached}
            </div>
          )}

          {/* Oath */}
          <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-primary/20 bg-primary/5 cursor-pointer">
            <Checkbox
              checked={oathAccepted}
              onCheckedChange={(checked) => setOathAccepted(!!checked)}
              className="mt-0.5"
            />
            <div>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <FileSignature className="w-3.5 h-3.5 text-primary" />
                {t.signingOath}
              </span>
              <span className="text-xs text-muted-foreground block mt-1">{t.oath}</span>
            </div>
          </label>

          <Button
            onClick={handleSubmit}
            disabled={!oathAccepted || submitting}
            className="w-full"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t.confirming}</>
            ) : (
              <><FileSignature className="w-4 h-4 mr-2" />{t.confirm}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyComplianceDialog;
