"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, ArrowRightIcon, Camera, Upload, User, Building2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

// Belgian bank BIC mapping
const BELGIAN_BANKS: Record<string, string> = {
  'KBC': 'KREDBEBB',
  'KBC Bank': 'KREDBEBB',
  'BNP Paribas Fortis': 'GEBABEBB',
  'Fortis': 'GEBABEBB',
  'ING': 'BBRUBEBB',
  'ING België': 'BBRUBEBB',
  'Belfius': 'GKCCBEBB',
  'Belfius Bank': 'GKCCBEBB',
  'Argenta': 'ARSPBE22',
  'Argenta Bank': 'ARSPBE22',
  'Crelan': 'NICABEBB',
  'AXA Bank': 'AXABBE22',
  'CBC': 'CREGBEBB',
  'CBC Banque': 'CREGBEBB',
  'Deutsche Bank': 'DEUTBEBE',
  'Triodos': 'TRIOBEBB',
  'Triodos Bank': 'TRIOBEBB',
  'Keytrade Bank': 'KEYTBEBB',
  'Keytrade': 'KEYTBEBB',
  'Rabobank': 'RABOBE22',
  'VDK Bank': 'VDSPBE91',
  'VDK': 'VDSPBE91',
  'Europabank': 'EURBBE99',
  'MeDirect': 'MEDSBE22',
  'Santander': 'BSUI BE BB',
  'ABN AMRO': 'ABNABE2A',
  'Record Bank': 'GEBABEBB',
  'Fintro': 'GEBABEBB',
  'Hello bank!': 'GEBABEBB',
  'CPH Banque': 'CPHBBE75',
  'vdk bank': 'VDSPBE91',
  'Nagelmackers': 'BNAGBE5S',
};

const findBic = (bankName: string): string => {
  const lower = bankName.toLowerCase().trim();
  for (const [name, bic] of Object.entries(BELGIAN_BANKS)) {
    if (name.toLowerCase() === lower) return bic;
  }
  // Partial match
  for (const [name, bic] of Object.entries(BELGIAN_BANKS)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) return bic;
  }
  return '';
};

const bankDropdownOptions = [...new Set(Object.keys(BELGIAN_BANKS))].sort();

const formatIban = (value: string) => {
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
};

interface OnboardingFormData {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  identityConfirmed: boolean;
  iban: string;
  ibanConfirm: string;
  bankName: string;
  bic: string;
  bankHolderName: string;
  bankConsentGiven: boolean;
  language: 'nl' | 'fr' | 'en';
}

interface OnboardingFormProps {
  language: 'nl' | 'fr' | 'en';
  onComplete: (data: OnboardingFormData) => void;
  saving?: boolean;
  onLanguageChange?: (lang: 'nl' | 'fr' | 'en') => void;
}

const labels = {
  nl: {
    step1: 'Persoonlijke gegevens',
    step2: 'Profielfoto',
    step3: 'Bankgegevens',
    name: 'Volledige naam',
    namePlaceholder: 'Jan Janssens',
    dateOfBirth: 'Geboortedatum',
    phone: 'Telefoonnummer',
    phonePlaceholder: '+32 470 00 00 00',
    uploadPhoto: 'Upload een foto van jezelf',
    takePhoto: 'Neem een foto',
    chooseFile: 'Kies een bestand',
    photoRequired: 'Een profielfoto is verplicht',
    identityWarning: 'Je identiteit kan gecontroleerd worden bij het inchecken op basis van je identiteitskaart. Gebruik daarom je echte naam en een herkenbare foto van jezelf. Bij een mismatch kan je de toegang geweigerd worden.',
    identityConfirm: 'Ik bevestig dat dit mijn echte naam en een recente foto van mezelf is',
    identityRequired: 'Je moet bevestigen dat dit je echte gegevens zijn',
    iban: 'IBAN-rekeningnummer',
    ibanPlaceholder: 'BE00 0000 0000 0000',
    ibanConfirm: 'Bevestig IBAN',
    ibanMismatch: 'IBAN komt niet overeen',
    bankName: 'Naam van je bank',
    bankNamePlaceholder: 'Selecteer je bank',
    otherBank: 'Andere',
    customBankPlaceholder: 'Vul de naam van je bank in',
    customBicPlaceholder: 'Vul de BIC-code in',
    bic: 'BIC-code',
    bicAutomatic: 'BIC-code (automatisch)',
    accountHolder: 'Naam rekeninghouder',
    accountHolderPlaceholder: 'Naam zoals op je bankrekening',
    consent: 'Juridische toestemming',
    consentText: (name: string) =>
      `Ik, ${name || '[uw naam]'}, verklaar hierbij uitdrukkelijk dat ik akkoord ga dat alle onkostenvergoedingen voortvloeiend uit mijn vrijwilligerswerk worden overgemaakt op bovenstaand rekeningnummer. Deze toestemming is geldig voor alle huidige en toekomstige opdrachten tot schriftelijke herroeping.`,
    consentAgree: 'Ik ga akkoord met bovenstaande verklaring',
    legalWarning: 'Deze toestemming is juridisch bindend conform de Europese regelgeving.',
    continue: 'Volgende',
    complete: 'Profiel voltooien',
    back: 'Terug',
    allSet: 'Je profiel is compleet!',
    completing: 'Bezig met opslaan...',
  },
  fr: {
    step1: 'Données personnelles',
    step2: 'Photo de profil',
    step3: 'Coordonnées bancaires',
    name: 'Nom complet',
    namePlaceholder: 'Jean Dupont',
    dateOfBirth: 'Date de naissance',
    phone: 'Numéro de téléphone',
    phonePlaceholder: '+32 470 00 00 00',
    uploadPhoto: 'Téléchargez une photo de vous',
    takePhoto: 'Prendre une photo',
    chooseFile: 'Choisir un fichier',
    photoRequired: 'Une photo de profil est obligatoire',
    identityWarning: 'Votre identité peut être vérifiée à l\'entrée sur base de votre carte d\'identité. Utilisez donc votre vrai nom et une photo reconnaissable de vous-même. En cas de non-correspondance, l\'accès peut être refusé.',
    identityConfirm: 'Je confirme qu\'il s\'agit de mon vrai nom et d\'une photo récente de moi-même',
    identityRequired: 'Vous devez confirmer que ce sont vos vraies données',
    iban: 'Numéro IBAN',
    ibanPlaceholder: 'BE00 0000 0000 0000',
    ibanConfirm: 'Confirmez l\'IBAN',
    ibanMismatch: 'L\'IBAN ne correspond pas',
    bankName: 'Nom de votre banque',
    bankNamePlaceholder: 'Sélectionnez votre banque',
    otherBank: 'Autre',
    customBankPlaceholder: 'Entrez le nom de votre banque',
    customBicPlaceholder: 'Entrez le code BIC',
    bic: 'Code BIC',
    bicAutomatic: 'Code BIC (automatique)',
    accountHolder: 'Titulaire du compte',
    accountHolderPlaceholder: 'Nom tel qu\'il figure sur votre compte',
    consent: 'Consentement juridique',
    consentText: (name: string) =>
      `Je, ${name || '[votre nom]'}, déclare expressément accepter que toutes les indemnités de frais résultant de mon bénévolat soient versées sur le numéro de compte ci-dessus. Ce consentement est valable pour toutes les missions actuelles et futures jusqu'à révocation écrite.`,
    consentAgree: 'J\'accepte la déclaration ci-dessus',
    legalWarning: 'Ce consentement est juridiquement contraignant conformément à la réglementation européenne.',
    continue: 'Suivant',
    complete: 'Compléter le profil',
    back: 'Retour',
    allSet: 'Votre profil est complet !',
    completing: 'Enregistrement...',
  },
  en: {
    step1: 'Personal details',
    step2: 'Profile photo',
    step3: 'Bank details',
    name: 'Full name',
    namePlaceholder: 'John Doe',
    dateOfBirth: 'Date of birth',
    phone: 'Phone number',
    phonePlaceholder: '+32 470 00 00 00',
    uploadPhoto: 'Upload a photo of yourself',
    takePhoto: 'Take a photo',
    chooseFile: 'Choose a file',
    photoRequired: 'A profile photo is required',
    identityWarning: 'Your identity may be verified at check-in based on your ID card. Please use your real name and a recognizable photo of yourself. Access may be denied if there is a mismatch.',
    identityConfirm: 'I confirm this is my real name and a recent photo of myself',
    identityRequired: 'You must confirm these are your real details',
    iban: 'IBAN account number',
    ibanPlaceholder: 'BE00 0000 0000 0000',
    ibanConfirm: 'Confirm IBAN',
    ibanMismatch: 'IBAN does not match',
    bankName: 'Your bank',
    bankNamePlaceholder: 'Select your bank',
    otherBank: 'Other',
    customBankPlaceholder: 'Enter your bank name',
    customBicPlaceholder: 'Enter BIC code',
    bic: 'BIC code',
    bicAutomatic: 'BIC code (automatic)',
    accountHolder: 'Account holder name',
    accountHolderPlaceholder: 'Name as on your bank account',
    consent: 'Legal consent',
    consentText: (name: string) =>
      `I, ${name || '[your name]'}, hereby expressly declare that I agree that all expense reimbursements arising from my volunteer work will be transferred to the account number stated above. This consent is valid for all current and future assignments until written revocation.`,
    consentAgree: 'I agree to the above declaration',
    legalWarning: 'This consent is legally binding under European regulations.',
    continue: 'Continue',
    complete: 'Complete profile',
    back: 'Go back',
    allSet: 'Your profile is complete!',
    completing: 'Saving...',
  },
};

const steps = [
  { id: 0, label: 'Language' },
  { id: 1, label: 'Personal' },
  { id: 2, label: 'Photo' },
  { id: 3, label: 'Bank' },
];

export function OnboardingForm({ language, onComplete, saving, onLanguageChange }: OnboardingFormProps) {
  const l = labels[language];
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    avatarFile: null,
    avatarPreview: null,
    identityConfirmed: false,
    iban: '',
    ibanConfirm: '',
    bankName: '',
    bic: '',
    bankHolderName: '',
    bankConsentGiven: false,
    language: language,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [isCustomBank, setIsCustomBank] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof OnboardingFormData, value: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'bankName') {
        const bic = findBic(value as string);
        next.bic = bic;
      }
      return next;
    });
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 0) {
      // Language step - always valid
    }
    if (step === 1) {
      if (!formData.fullName.trim()) errs.fullName = 'Verplicht';
      if (!formData.dateOfBirth) errs.dateOfBirth = 'Verplicht';
      if (!formData.phone.trim()) errs.phone = 'Verplicht';
    }
    if (step === 2) {
      if (!formData.avatarFile && !formData.avatarPreview) errs.avatar = l.photoRequired;
      if (!formData.identityConfirmed) errs.identityConfirmed = (l as any).identityRequired || 'Required';
    }
    if (step === 3) {
      if (!formData.iban.replace(/\s/g, '')) errs.iban = 'Verplicht';
      if (!formData.ibanConfirm.replace(/\s/g, '')) errs.ibanConfirm = 'Verplicht';
      if (formData.iban.replace(/\s/g, '') !== formData.ibanConfirm.replace(/\s/g, '')) errs.ibanConfirm = l.ibanMismatch;
      if (!formData.bankName.trim()) errs.bankName = 'Verplicht';
      if (isCustomBank && !formData.bic.trim()) errs.bic = 'Verplicht';
      if (!formData.bankHolderName.trim()) errs.bankHolderName = 'Verplicht';
      if (!formData.bankConsentGiven) errs.consent = 'Verplicht';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    update('avatarFile', file);
    update('avatarPreview', URL.createObjectURL(file));
  };

  const handleBankSelect = (bankName: string) => {
    if (bankName === '__other__') {
      setIsCustomBank(true);
      update('bankName', '');
      update('bic', '');
    } else {
      setIsCustomBank(false);
      update('bankName', bankName);
    }
    setShowBankDropdown(false);
  };


  const progress = ((currentStep + 1) / steps.length) * 100;
  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5";

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-center gap-1 mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => index < currentStep && setCurrentStep(index)}
              disabled={index > currentStep}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-500",
                "disabled:cursor-not-allowed",
                index < currentStep && "bg-primary/10 text-primary",
                index === currentStep && "bg-primary text-primary-foreground shadow-lg",
                index > currentStep && "bg-muted/50 text-muted-foreground/40",
              )}
            >
              {index < currentStep ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <span className="text-sm font-semibold">{step.id}</span>
              )}
            </button>
            {index < steps.length - 1 && (
              <div className="mx-1.5 flex items-center gap-0.5">
                <div className={cn("h-0.5 w-4 rounded-full transition-colors duration-500", index < currentStep ? "bg-primary" : "bg-border")} />
                <div className={cn("h-0.5 w-4 rounded-full transition-colors duration-500", index < currentStep ? "bg-primary" : "bg-border")} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-muted mb-8 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Step content */}
      <div className="min-h-[340px]">
        {currentStep === 0 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
                <span className="text-2xl">🌍</span>
              </div>
              <h2 className="text-lg font-heading font-bold text-foreground">
                {formData.language === 'nl' ? 'Kies je taal' : formData.language === 'fr' ? 'Choisissez votre langue' : 'Choose your language'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.language === 'nl' ? 'Je kunt dit later wijzigen in je profiel.' : formData.language === 'fr' ? 'Vous pouvez changer cela plus tard dans votre profil.' : 'You can change this later in your profile.'}
              </p>
            </div>

            <div className="space-y-3">
              {([
                { code: 'nl' as const, flag: '🇧🇪', label: 'Nederlands', desc: 'Gebruik de app in het Nederlands' },
                { code: 'fr' as const, flag: '🇫🇷', label: 'Français', desc: 'Utilisez l\'application en français' },
                { code: 'en' as const, flag: '🇬🇧', label: 'English', desc: 'Use the app in English' },
              ]).map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    update('language', lang.code);
                    onLanguageChange?.(lang.code);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all",
                    formData.language === lang.code
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <span className="text-3xl">{lang.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{lang.label}</p>
                    <p className="text-xs text-muted-foreground">{lang.desc}</p>
                  </div>
                  {formData.language === lang.code && (
                    <CheckIcon className="w-5 h-5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
                <User className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-heading font-bold text-foreground">{l.step1}</h2>
            </div>

            <div>
              <label className={labelClass}>{l.name} *</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={e => update('fullName', e.target.value)}
                className={cn(inputClass, errors.fullName && "border-destructive")}
                placeholder={l.namePlaceholder}
                autoFocus
              />
              {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label className={labelClass}>{l.dateOfBirth} *</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={e => update('dateOfBirth', e.target.value)}
                className={cn(inputClass, errors.dateOfBirth && "border-destructive")}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.dateOfBirth && <p className="text-xs text-destructive mt-1">{errors.dateOfBirth}</p>}
            </div>

            <div>
              <label className={labelClass}>{l.phone} *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => update('phone', e.target.value)}
                className={cn(inputClass, errors.phone && "border-destructive")}
                placeholder={l.phonePlaceholder}
              />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-heading font-bold text-foreground">{l.step2}</h2>
              <p className="text-sm text-muted-foreground mt-1">{l.uploadPhoto}</p>
            </div>

            {/* Identity verification warning */}
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl p-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                {(l as any).identityWarning}
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-28 h-28 border-2 border-dashed border-border">
                {formData.avatarPreview && <AvatarImage src={formData.avatarPreview} alt="Preview" />}
                <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                  <User className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>

              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {l.takePhoto}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-card text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {l.chooseFile}
                </button>
              </div>

              <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {errors.avatar && <p className="text-xs text-destructive">{errors.avatar}</p>}
            </div>

            {/* Identity confirmation checkbox */}
            <label className={cn("flex items-start gap-3 cursor-pointer group p-3 rounded-xl border transition-colors", formData.identityConfirmed ? "border-primary/30 bg-primary/5" : "border-border", errors.identityConfirmed && "border-destructive")}>
              <Checkbox
                checked={formData.identityConfirmed}
                onCheckedChange={(checked) => update('identityConfirmed', checked === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                {(l as any).identityConfirm}
              </span>
            </label>
            {errors.identityConfirmed && <p className="text-xs text-destructive">{errors.identityConfirmed}</p>}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-heading font-bold text-foreground">{l.step3}</h2>
            </div>

            <div>
              <label className={labelClass}>{l.iban} *</label>
              <input
                type="text"
                value={formData.iban}
                onChange={e => update('iban', formatIban(e.target.value))}
                className={cn(inputClass, errors.iban && "border-destructive")}
                placeholder={l.ibanPlaceholder}
                maxLength={42}
              />
              {errors.iban && <p className="text-xs text-destructive mt-1">{errors.iban}</p>}
            </div>

            <div>
              <label className={labelClass}>{l.ibanConfirm} *</label>
              <input
                type="text"
                value={formData.ibanConfirm}
                onChange={e => update('ibanConfirm', formatIban(e.target.value))}
                className={cn(inputClass, errors.ibanConfirm && "border-destructive")}
                placeholder={l.ibanPlaceholder}
                maxLength={42}
              />
              {errors.ibanConfirm && <p className="text-xs text-destructive mt-1">{errors.ibanConfirm}</p>}
            </div>

            <div className="relative">
              <label className={labelClass}>{l.bankName} *</label>
              <button
                type="button"
                onClick={() => setShowBankDropdown(!showBankDropdown)}
                className={cn(
                  inputClass,
                  "text-left flex items-center justify-between",
                  errors.bankName && "border-destructive",
                  !formData.bankName && !isCustomBank && "text-muted-foreground"
                )}
              >
                <span>{isCustomBank ? l.otherBank : formData.bankName || l.bankNamePlaceholder}</span>
                <svg className={cn("w-4 h-4 text-muted-foreground transition-transform", showBankDropdown && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {errors.bankName && !isCustomBank && <p className="text-xs text-destructive mt-1">{errors.bankName}</p>}
              {showBankDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {bankDropdownOptions.map(bank => (
                    <button
                      key={bank}
                      type="button"
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors first:rounded-t-xl",
                        formData.bankName === bank && !isCustomBank && "bg-primary/10 text-primary font-medium"
                      )}
                      onClick={() => handleBankSelect(bank)}
                    >
                      {bank}
                      {formData.bic && formData.bankName === bank && !isCustomBank && (
                        <span className="ml-2 text-xs text-muted-foreground font-mono">{formData.bic}</span>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors last:rounded-b-xl border-t border-border font-medium",
                      isCustomBank && "bg-primary/10 text-primary"
                    )}
                    onClick={() => handleBankSelect('__other__')}
                  >
                    {l.otherBank}
                  </button>
                </div>
              )}
            </div>

            {isCustomBank && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>{l.bankName} *</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={e => update('bankName', e.target.value)}
                    className={cn(inputClass, errors.bankName && "border-destructive")}
                    placeholder={l.customBankPlaceholder}
                  />
                  {errors.bankName && <p className="text-xs text-destructive mt-1">{errors.bankName}</p>}
                </div>
                <div>
                  <label className={labelClass}>{l.bic} *</label>
                  <input
                    type="text"
                    value={formData.bic}
                    onChange={e => update('bic', e.target.value.toUpperCase())}
                    className={cn(inputClass, errors.bic && "border-destructive")}
                    placeholder={l.customBicPlaceholder}
                    maxLength={11}
                  />
                  {errors.bic && <p className="text-xs text-destructive mt-1">{errors.bic}</p>}
                </div>
              </div>
            )}

            {!isCustomBank && formData.bic && (
              <div>
                <label className={labelClass}>{l.bicAutomatic}</label>
                <div className="px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground font-mono">
                  {formData.bic}
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>{l.accountHolder} *</label>
              <input
                type="text"
                value={formData.bankHolderName}
                onChange={e => update('bankHolderName', e.target.value)}
                className={cn(inputClass, errors.bankHolderName && "border-destructive")}
                placeholder={l.accountHolderPlaceholder}
              />
              {errors.bankHolderName && <p className="text-xs text-destructive mt-1">{errors.bankHolderName}</p>}
            </div>

            {/* Legal consent */}
            <div className="space-y-3 mt-2">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                {l.consent}
              </h4>
              <div className="bg-muted/50 rounded-xl p-3 border border-border text-[11px] text-muted-foreground leading-relaxed">
                {l.consentText(formData.fullName)}
              </div>
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0" />
                <p className="text-[10px] text-primary/80 leading-snug">{l.legalWarning}</p>
              </div>
              <label className={cn("flex items-start gap-3 cursor-pointer group", errors.consent && "text-destructive")}>
                <Checkbox
                  checked={formData.bankConsentGiven}
                  onCheckedChange={(checked) => update('bankConsentGiven', checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                  {l.consentAgree}
                </span>
              </label>
              {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? l.completing : currentStep === steps.length - 1 ? l.complete : l.continue}
          {!saving && <ArrowRightIcon className="w-4 h-4" />}
        </button>

        {currentStep > 0 && (
          <button
            type="button"
            onClick={() => setCurrentStep(currentStep - 1)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {l.back}
          </button>
        )}
      </div>
    </div>
  );
}

export { BELGIAN_BANKS, findBic };
