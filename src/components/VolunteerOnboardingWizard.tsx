import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Language } from '@/i18n/translations';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import VolunteerStepper, { StepStatus } from '@/components/VolunteerStepper';
import {
  ArrowRight, ArrowLeft, PartyPopper, FileSignature, User, Building2,
  Loader2, ExternalLink, CheckCircle
} from 'lucide-react';

// Belgian bank BIC mapping (reuse from OnboardingForm)
const BELGIAN_BANKS: Record<string, string> = {
  'KBC': 'KREDBEBB', 'BNP Paribas Fortis': 'GEBABEBB', 'ING': 'BBRUBEBB',
  'Belfius': 'GKCCBEBB', 'Argenta': 'ARSPBE22', 'Crelan': 'NICABEBB',
  'AXA Bank': 'AXABBE22', 'CBC': 'CREGBEBB', 'Deutsche Bank': 'DEUTBEBE',
  'Triodos': 'TRIOBEBB', 'Keytrade Bank': 'KEYTBEBB', 'VDK Bank': 'VDSPBE91',
  'Europabank': 'EURBBE99', 'MeDirect': 'MEDSBE22', 'Nagelmackers': 'BNAGBE5S',
};
const bankDropdownOptions = [...new Set(Object.keys(BELGIAN_BANKS))].sort();
const findBic = (name: string) => {
  const lower = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(BELGIAN_BANKS)) {
    if (k.toLowerCase() === lower || k.toLowerCase().includes(lower)) return v;
  }
  return '';
};
const formatIban = (v: string) => v.replace(/\s/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();

interface Props {
  userId: string;
  clubId: string;
  clubName: string;
  clubLogoUrl: string | null;
  language: Language;
  seasonContract: { id: string; signing_url: string | null; status: string } | null;
  onComplete: () => void;
  onLater: () => void;
}

const VolunteerOnboardingWizard = ({
  userId, clubId, clubName, clubLogoUrl, language, seasonContract, onComplete, onLater,
}: Props) => {
  const t = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 2: profile
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 3: IBAN
  const [iban, setIban] = useState('');
  const [ibanConfirm, setIbanConfirm] = useState('');
  const [bankName, setBankName] = useState('');
  const [bic, setBic] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [bankConsent, setBankConsent] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [isCustomBank, setIsCustomBank] = useState(false);

  // Step 5: confetti
  const [showConfetti, setShowConfetti] = useState(false);

  const STEP_COUNT = 5;
  const stepLabels = [
    t('Welkom', 'Bienvenue', 'Welcome'),
    t('Profiel', 'Profil', 'Profile'),
    t('IBAN', 'IBAN', 'IBAN'),
    t('Contract', 'Contrat', 'Contract'),
    t('Klaar', 'Prêt', 'Done'),
  ];

  const stepStatuses: StepStatus[] = stepLabels.map((_, i) =>
    i < step ? 'completed' : i === step ? 'active' : 'upcoming'
  );

  // Load existing profile data
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select('date_of_birth, phone, bank_iban, bank_holder_name, bank_bic').eq('id', userId).maybeSingle();
      if (data) {
        if (data.date_of_birth) setDateOfBirth(data.date_of_birth);
        if (data.phone) setPhone(data.phone);
        if (data.bank_iban) { setIban(formatIban(data.bank_iban)); setIbanConfirm(formatIban(data.bank_iban)); }
        if (data.bank_holder_name) setBankHolder(data.bank_holder_name);
        if (data.bank_bic) setBic(data.bank_bic);
      }
    };
    load();
  }, [userId]);

  const validateProfile = () => {
    const errs: Record<string, string> = {};
    if (!dateOfBirth) errs.dateOfBirth = t('Verplicht', 'Obligatoire', 'Required');
    if (!phone.trim()) errs.phone = t('Verplicht', 'Obligatoire', 'Required');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateIban = () => {
    const errs: Record<string, string> = {};
    const cleanIban = iban.replace(/\s/g, '');
    if (!cleanIban) errs.iban = t('Verplicht', 'Obligatoire', 'Required');
    if (cleanIban !== ibanConfirm.replace(/\s/g, '')) errs.ibanConfirm = t('IBAN komt niet overeen', 'L\'IBAN ne correspond pas', 'IBAN does not match');
    if (!bankName.trim()) errs.bankName = t('Verplicht', 'Obligatoire', 'Required');
    if (!bankHolder.trim()) errs.bankHolder = t('Verplicht', 'Obligatoire', 'Required');
    if (!bankConsent) errs.consent = t('Verplicht', 'Obligatoire', 'Required');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveStep = async (stepKey: 'profile_complete' | 'contract_signed') => {
    await supabase.from('volunteer_onboarding_steps').upsert(
      { user_id: userId, club_id: clubId, step: stepKey, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,club_id,step' }
    );
  };

  const handleNext = async () => {
    setErrors({});
    if (step === 1) {
      if (!validateProfile()) return;
      setSaving(true);
      await supabase.from('profiles').update({
        date_of_birth: dateOfBirth,
        phone,
      }).eq('id', userId);
      await saveStep('profile_complete');
      setSaving(false);
    }
    if (step === 2) {
      if (!validateIban()) return;
      setSaving(true);
      await supabase.from('profiles').update({
        bank_iban: iban.replace(/\s/g, ''),
        bank_holder_name: bankHolder,
        bank_bic: bic,
        bank_name: bankName,
      }).eq('id', userId);
      setSaving(false);
    }
    if (step === 4) {
      // Mark all steps complete
      for (const s of ['profile_complete', 'contract_signed', 'training_done', 'first_task'] as const) {
        await supabase.from('volunteer_onboarding_steps').upsert(
          { user_id: userId, club_id: clubId, step: s, completed_at: new Date().toISOString() },
          { onConflict: 'user_id,club_id,step' }
        );
      }
      onComplete();
      return;
    }
    if (step + 1 === 4) {
      // Entering "Klaar" step — show confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    setStep(step + 1);
  };

  const handleBankSelect = (name: string) => {
    if (name === '__other__') {
      setIsCustomBank(true);
      setBankName('');
      setBic('');
    } else {
      setIsCustomBank(false);
      setBankName(name);
      setBic(findBic(name));
    }
    setShowBankDropdown(false);
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: 0,
                  opacity: 1,
                }}
                animate={{
                  y: window.innerHeight + 20,
                  rotate: Math.random() * 720 - 360,
                  opacity: 0,
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeOut',
                }}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['hsl(var(--primary))', 'hsl(45 93% 47%)', 'hsl(142 71% 45%)', 'hsl(280 60% 60%)', 'hsl(15 80% 55%)'][i % 5],
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl p-6 space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <VolunteerStepper steps={stepLabels.map((label, i) => ({ label, status: stepStatuses[i] }))} />
        </div>
        <Progress value={((step + 1) / STEP_COUNT) * 100} className="h-1.5" />

        {/* Step content */}
        <div className="min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* STEP 0: Welcome */}
              {step === 0 && (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                    {clubLogoUrl ? (
                      <img src={clubLogoUrl} alt={clubName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">🏟️</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-heading font-bold text-foreground">
                      {t('Welkom bij', 'Bienvenue chez', 'Welcome to')} {clubName}!
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {t(
                        'Super dat je erbij bent! We helpen je in een paar stappen om je profiel in te stellen en je seizoenscontract te ondertekenen.',
                        'Super de vous avoir ! Nous vous aiderons à configurer votre profil et signer votre contrat saisonnier.',
                        'Great to have you! We\'ll help you set up your profile and sign your season contract in a few steps.'
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 1: Profile */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-lg font-heading font-bold text-foreground">
                      {t('Jouw profiel', 'Votre profil', 'Your profile')}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('Deze gegevens zijn nodig voor je seizoenscontract.', 'Ces données sont nécessaires pour votre contrat.', 'This info is needed for your season contract.')}
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>{t('Geboortedatum', 'Date de naissance', 'Date of birth')} *</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={e => { setDateOfBirth(e.target.value); setErrors(p => ({ ...p, dateOfBirth: '' })); }}
                      className={cn(inputClass, errors.dateOfBirth && 'border-destructive')}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {errors.dateOfBirth && <p className="text-xs text-destructive mt-1">{errors.dateOfBirth}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>{t('Telefoonnummer', 'Numéro de téléphone', 'Phone number')} *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })); }}
                      className={cn(inputClass, errors.phone && 'border-destructive')}
                      placeholder="+32 470 00 00 00"
                    />
                    {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>{t('Adres', 'Adresse', 'Address')}</label>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className={inputClass}
                      placeholder={t('Straat 1, 1000 Brussel', 'Rue 1, 1000 Bruxelles', 'Street 1, 1000 Brussels')}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: IBAN */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-lg font-heading font-bold text-foreground">
                      {t('Bankgegevens', 'Coordonnées bancaires', 'Bank details')}
                    </h2>
                  </div>

                  <div>
                    <label className={labelClass}>IBAN *</label>
                    <input
                      type="text"
                      value={iban}
                      onChange={e => { setIban(formatIban(e.target.value)); setErrors(p => ({ ...p, iban: '' })); }}
                      className={cn(inputClass, errors.iban && 'border-destructive')}
                      placeholder="BE00 0000 0000 0000"
                      maxLength={42}
                    />
                    {errors.iban && <p className="text-xs text-destructive mt-1">{errors.iban}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>{t('Bevestig IBAN', 'Confirmez IBAN', 'Confirm IBAN')} *</label>
                    <input
                      type="text"
                      value={ibanConfirm}
                      onChange={e => { setIbanConfirm(formatIban(e.target.value)); setErrors(p => ({ ...p, ibanConfirm: '' })); }}
                      className={cn(inputClass, errors.ibanConfirm && 'border-destructive')}
                      placeholder="BE00 0000 0000 0000"
                      maxLength={42}
                    />
                    {errors.ibanConfirm && <p className="text-xs text-destructive mt-1">{errors.ibanConfirm}</p>}
                  </div>

                  <div className="relative">
                    <label className={labelClass}>{t('Bank', 'Banque', 'Bank')} *</label>
                    <button
                      type="button"
                      onClick={() => setShowBankDropdown(!showBankDropdown)}
                      className={cn(inputClass, 'text-left flex items-center justify-between', errors.bankName && 'border-destructive', !bankName && !isCustomBank && 'text-muted-foreground')}
                    >
                      <span>{isCustomBank ? t('Andere', 'Autre', 'Other') : bankName || t('Selecteer', 'Sélectionner', 'Select')}</span>
                      <svg className={cn('w-4 h-4 text-muted-foreground transition-transform', showBankDropdown && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {showBankDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {bankDropdownOptions.map(b => (
                          <button key={b} type="button" className={cn('w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors', bankName === b && !isCustomBank && 'bg-primary/10 text-primary font-medium')} onClick={() => handleBankSelect(b)}>
                            {b}
                          </button>
                        ))}
                        <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-t border-border font-medium" onClick={() => handleBankSelect('__other__')}>
                          {t('Andere', 'Autre', 'Other')}
                        </button>
                      </div>
                    )}
                    {errors.bankName && <p className="text-xs text-destructive mt-1">{errors.bankName}</p>}
                  </div>

                  {isCustomBank && (
                    <>
                      <div>
                        <label className={labelClass}>{t('Naam bank', 'Nom banque', 'Bank name')} *</label>
                        <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>BIC *</label>
                        <input type="text" value={bic} onChange={e => setBic(e.target.value)} className={inputClass} />
                      </div>
                    </>
                  )}

                  <div>
                    <label className={labelClass}>{t('Rekeninghouder', 'Titulaire du compte', 'Account holder')} *</label>
                    <input
                      type="text"
                      value={bankHolder}
                      onChange={e => { setBankHolder(e.target.value); setErrors(p => ({ ...p, bankHolder: '' })); }}
                      className={cn(inputClass, errors.bankHolder && 'border-destructive')}
                    />
                    {errors.bankHolder && <p className="text-xs text-destructive mt-1">{errors.bankHolder}</p>}
                  </div>

                  <label className={cn('flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-colors', bankConsent ? 'border-primary/30 bg-primary/5' : 'border-border', errors.consent && 'border-destructive')}>
                    <Checkbox checked={bankConsent} onCheckedChange={(c) => { setBankConsent(c === true); setErrors(p => ({ ...p, consent: '' })); }} className="mt-0.5" />
                    <span className="text-xs text-foreground leading-snug">
                      {t(
                        'Ik ga akkoord dat vergoedingen op dit rekeningnummer worden gestort.',
                        'J\'accepte que les compensations soient versées sur ce numéro de compte.',
                        'I agree that compensations will be transferred to this account.'
                      )}
                    </span>
                  </label>
                  {errors.consent && <p className="text-xs text-destructive mt-1">{errors.consent}</p>}
                </div>
              )}

              {/* STEP 3: Season contract */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
                      <FileSignature className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-lg font-heading font-bold text-foreground">
                      {t('Jouw seizoenscontract', 'Votre contrat saisonnier', 'Your season contract')}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('De club heeft een seizoenscontract voor je klaargelegd.', 'Le club a préparé un contrat saisonnier.', 'The club has prepared a season contract for you.')}
                    </p>
                  </div>

                  {seasonContract?.signing_url && seasonContract.status !== 'signed' ? (
                    <div className="space-y-4">
                      <div className="bg-muted/30 rounded-xl p-4 text-center">
                        <FileSignature className="w-10 h-10 mx-auto mb-3 text-primary" />
                        <p className="text-sm font-medium text-foreground mb-1">
                          {t('Contract klaar voor ondertekening', 'Contrat prêt à signer', 'Contract ready to sign')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {clubName}
                        </p>
                      </div>
                      <Button
                        onClick={async () => {
                          window.open(seasonContract.signing_url!, '_blank');
                          await saveStep('contract_signed');
                        }}
                        className="w-full h-12 text-base"
                        size="lg"
                      >
                        <FileSignature className="w-5 h-5 mr-2" />
                        {t('Onderteken contract', 'Signer le contrat', 'Sign contract')}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        {t('Opent in een nieuw tabblad via DocuSeal', 'S\'ouvre dans un nouvel onglet via DocuSeal', 'Opens in a new tab via DocuSeal')}
                      </p>
                    </div>
                  ) : seasonContract?.status === 'signed' ? (
                    <div className="bg-muted/30 rounded-xl p-6 text-center">
                      <CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
                      <p className="text-sm font-medium text-foreground">
                        {t('Contract is al ondertekend!', 'Le contrat est déjà signé!', 'Contract already signed!')}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-xl p-6 text-center">
                      <FileSignature className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                      <p className="text-sm text-muted-foreground">
                        {t('Er is nog geen contract klaargelegd. Je kunt dit later ondertekenen.', 'Aucun contrat n\'est encore prêt. Vous pourrez le signer plus tard.', 'No contract has been prepared yet. You can sign it later.')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Done */}
              {step === 4 && (
                <div className="text-center space-y-4 py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                    className="w-20 h-20 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center"
                  >
                    <PartyPopper className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h2 className="text-xl font-heading font-bold text-foreground">
                    {t('Je bent klaar! 🎉', 'Vous êtes prêt ! 🎉', 'You\'re all set! 🎉')}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(
                      'Je profiel is ingesteld en je bent klaar om als vrijwilliger aan de slag te gaan. Bekijk de beschikbare taken op je dashboard.',
                      'Votre profil est configuré et vous êtes prêt à commencer en tant que bénévole.',
                      'Your profile is set up and you\'re ready to start volunteering. Check out the available tasks on your dashboard.'
                    )}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            {step > 0 && step < 4 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} disabled={saving}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t('Terug', 'Retour', 'Back')}
              </Button>
            ) : step === 0 ? (
              <Button variant="ghost" size="sm" onClick={onLater}>
                {t('Later', 'Plus tard', 'Later')}
              </Button>
            ) : null}
          </div>
          <Button onClick={handleNext} disabled={saving} size="sm">
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {step === 4
              ? t('Ga naar mijn dashboard', 'Aller au tableau de bord', 'Go to my dashboard')
              : step === 3
                ? t('Volgende', 'Suivant', 'Next')
                : t('Volgende', 'Suivant', 'Next')
            }
            {step < 4 && <ArrowRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default VolunteerOnboardingWizard;
