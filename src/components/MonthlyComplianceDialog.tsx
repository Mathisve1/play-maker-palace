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
import { ShieldCheck, FileSignature, Loader2, CheckCircle } from 'lucide-react';
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

const labels = {
  nl: {
    title: 'Maandelijkse Compliance Check',
    description: 'Bevestig je externe inkomsten en uren in de sportsector van afgelopen maand.',
    externalIncome: 'Extern verdiend bedrag (€)',
    externalHours: 'Externe gewerkte uren',
    noExternal: 'Ik heb vorige maand geen externe inkomsten of uren gehad',
    oath: 'Ik verklaar op eer dat bovenstaande gegevens correct zijn. Ik begrijp dat onjuiste informatie kan leiden tot RSZ-boetes.',
    confirm: 'Bevestigen & Ondertekenen',
    confirming: 'Verwerken...',
    success: 'Verklaring succesvol ingediend!',
    forMonth: 'Voor de maand',
    currentStatus: 'Huidig jaaroverzicht',
    limitWarning: 'Let op: je nadert het jaarplafond van €3.233,91.',
    limitReached: 'Je hebt het jaarplafond bereikt. Verdere vergoedingen vallen onder Art. 17 (10% RSZ).',
  },
  fr: {
    title: 'Vérification mensuelle de conformité',
    description: 'Confirmez vos revenus et heures externes dans le secteur sportif du mois dernier.',
    externalIncome: 'Revenus externes (€)',
    externalHours: 'Heures externes travaillées',
    noExternal: 'Je n\'ai eu aucun revenu ni heure externe le mois dernier',
    oath: 'Je déclare sur l\'honneur que les informations ci-dessus sont correctes. Je comprends que des informations incorrectes peuvent entraîner des amendes ONSS.',
    confirm: 'Confirmer & Signer',
    confirming: 'Traitement...',
    success: 'Déclaration soumise avec succès!',
    forMonth: 'Pour le mois de',
    currentStatus: 'Aperçu annuel actuel',
    limitWarning: 'Attention: vous approchez le plafond annuel de €3.233,91.',
    limitReached: 'Vous avez atteint le plafond annuel. Les remboursements futurs relèvent de l\'Art. 17 (10% ONSS).',
  },
  en: {
    title: 'Monthly Compliance Check',
    description: 'Confirm your external income and hours in the sports sector from last month.',
    externalIncome: 'External income earned (€)',
    externalHours: 'External hours worked',
    noExternal: 'I had no external income or hours last month',
    oath: 'I declare on oath that the above information is correct. I understand that incorrect information may lead to social security fines.',
    confirm: 'Confirm & Sign',
    confirming: 'Processing...',
    success: 'Declaration submitted successfully!',
    forMonth: 'For the month of',
    currentStatus: 'Current yearly overview',
    limitWarning: 'Warning: you are approaching the yearly limit of €3,233.91.',
    limitReached: 'You have reached the yearly limit. Further reimbursements fall under Art. 17 (10% social security).',
  },
};

const MonthlyComplianceDialog = ({ open, onOpenChange, userId, language, onCompleted }: MonthlyComplianceDialogProps) => {
  const t = labels[language];
  const now = new Date();
  // We ask about the previous month
  const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // Previous month (1-12)
  const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const monthLabel = monthNames[language][targetMonth - 1];

  const [externalIncome, setExternalIncome] = useState('0');
  const [externalHours, setExternalHours] = useState('0');
  const [noExternal, setNoExternal] = useState(false);
  const [oathAccepted, setOathAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyDeclared, setAlreadyDeclared] = useState(false);

  const { data: compliance } = useComplianceData(userId);

  useEffect(() => {
    if (!open || !userId) return;
    // Check if already declared for this month
    const check = async () => {
      const { data } = await supabase
        .from('compliance_declarations')
        .select('id')
        .eq('volunteer_id', userId)
        .eq('declaration_year', targetYear)
        .eq('declaration_month', targetMonth)
        .maybeSingle();
      if (data) setAlreadyDeclared(true);
    };
    check();
  }, [open, userId, targetYear, targetMonth]);

  const handleSubmit = async () => {
    if (!oathAccepted) return;
    setSubmitting(true);

    try {
      const income = noExternal ? 0 : parseFloat(externalIncome) || 0;
      const hours = noExternal ? 0 : parseInt(externalHours) || 0;

      // Insert declaration
      const { error } = await supabase
        .from('compliance_declarations')
        .insert({
          volunteer_id: userId,
          declaration_year: targetYear,
          declaration_month: targetMonth,
          external_income: income,
          external_hours: hours,
          signature_status: 'completed', // Will be updated when DocuSeal is integrated
          declared_at: new Date().toISOString(),
        });

      if (error) throw error;

      // TODO: Trigger DocuSeal signature for the declaration
      // For now, we mark it as completed inline

      toast.success(t.success);
      onCompleted?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
    setSubmitting(false);
  };

  if (alreadyDeclared) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t.title}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {language === 'nl' ? `Je verklaring voor ${monthLabel} ${targetYear} is al ingediend.`
                : language === 'fr' ? `Votre déclaration pour ${monthLabel} ${targetYear} a déjà été soumise.`
                : `Your declaration for ${monthLabel} ${targetYear} has already been submitted.`}
            </p>
          </div>
          {compliance && (
            <ComplianceBadge compliance={compliance} language={language} showProgress />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Target month */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">{t.forMonth}</p>
            <p className="text-sm font-semibold text-foreground capitalize">{monthLabel} {targetYear}</p>
          </div>

          {/* Current compliance overview */}
          {compliance && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{t.currentStatus}</p>
              <ComplianceBadge compliance={compliance} language={language} showProgress />
            </div>
          )}

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
                {language === 'nl' ? 'Verklaring op eer' : language === 'fr' ? 'Déclaration sur l\'honneur' : 'Sworn declaration'}
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
