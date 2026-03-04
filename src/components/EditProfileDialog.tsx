import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, User, Mail, Phone, Building2, ShieldCheck, AlertTriangle, ExternalLink, Loader2, CreditCard, BarChart3, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Language } from '@/i18n/translations';
import { Checkbox } from '@/components/ui/checkbox';
import { useComplianceData, YEARLY_LIMIT, HOURS_LIMIT } from '@/hooks/useComplianceData';
import ComplianceBadge from './ComplianceBadge';
import MonthlyComplianceDialog from './MonthlyComplianceDialog';

interface ProfileData {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  date_of_birth: string | null;
  bank_iban: string | null;
  bank_holder_name: string | null;
  bank_consent_given: boolean;
  bank_consent_date: string | null;
  bank_consent_text: string | null;
  stripe_account_id?: string | null;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  language: Language;
  onProfileUpdated: (profile: ProfileData) => void;
  isFirstLogin?: boolean;
}

const labels = {
  nl: {
    title: 'Mijn profiel',
    personalInfo: 'Persoonlijke gegevens',
    name: 'Volledige naam',
    email: 'E-mailadres',
    phone: 'Telefoonnummer',
    dateOfBirth: 'Geboortedatum',
    bio: 'Over mij',
    bioPlaceholder: 'Vertel iets over jezelf, je interesses en ervaring als vrijwilliger...',
    changePhoto: 'Foto wijzigen',
    bankDetails: 'Bankgegevens voor onkostenvergoedingen',
    iban: 'IBAN-rekeningnummer',
    ibanPlaceholder: 'BE00 0000 0000 0000',
    accountHolder: 'Rekeninghouder',
    accountHolderPlaceholder: 'Naam zoals op uw bankrekening',
    bankConsent: 'Juridische toestemming',
    bankConsentText: (name: string) =>
      `Ik, ${name || '[uw naam]'}, verklaar hierbij uitdrukkelijk dat ik akkoord ga dat alle onkostenvergoedingen voortvloeiend uit mijn vrijwilligerswerk worden overgemaakt op bovenstaand rekeningnummer. Deze toestemming is geldig voor alle huidige en toekomstige opdrachten tot schriftelijke herroeping. Deze verklaring is opgesteld in overeenstemming met de Europese wetgeving inzake betalingsdiensten (PSD2) en de Belgische wet betreffende de rechten van vrijwilligers.`,
    consentAgree: 'Ik ga akkoord met bovenstaande verklaring',
    consentDate: 'Toestemming gegeven op',
    save: 'Opslaan',
    saving: 'Opslaan...',
    saved: 'Profiel bijgewerkt!',
    legalWarning: 'Deze toestemming is juridisch bindend conform de Europese regelgeving. U kunt deze op elk moment schriftelijk intrekken.',
    requiredForBank: 'Vul eerst uw naam en IBAN in om toestemming te geven.',
    firstLoginTitle: 'Welkom! Vul je profiel aan',
    firstLoginDescription: 'Vul je gegevens in zodat clubs je beter leren kennen.',
  },
  fr: {
    title: 'Mon profil',
    personalInfo: 'Informations personnelles',
    name: 'Nom complet',
    email: 'Adresse e-mail',
    phone: 'Numéro de téléphone',
    dateOfBirth: 'Date de naissance',
    bio: 'À propos de moi',
    bioPlaceholder: 'Parlez de vous, vos intérêts et votre expérience en tant que bénévole...',
    changePhoto: 'Modifier la photo',
    bankDetails: 'Coordonnées bancaires pour remboursements',
    iban: 'Numéro IBAN',
    ibanPlaceholder: 'BE00 0000 0000 0000',
    accountHolder: 'Titulaire du compte',
    accountHolderPlaceholder: 'Nom tel qu\'il figure sur votre compte',
    bankConsent: 'Consentement juridique',
    bankConsentText: (name: string) =>
      `Je, ${name || '[votre nom]'}, déclare expressément accepter que toutes les indemnités de frais résultant de mon bénévolat soient versées sur le numéro de compte ci-dessus. Ce consentement est valable pour toutes les missions actuelles et futures jusqu'à révocation écrite. Cette déclaration est établie conformément à la législation européenne sur les services de paiement (PSD2) et à la loi belge relative aux droits des bénévoles.`,
    consentAgree: 'J\'accepte la déclaration ci-dessus',
    consentDate: 'Consentement donné le',
    save: 'Enregistrer',
    saving: 'Enregistrement...',
    saved: 'Profil mis à jour !',
    legalWarning: 'Ce consentement est juridiquement contraignant conformément à la réglementation européenne. Vous pouvez le révoquer à tout moment par écrit.',
    requiredForBank: 'Veuillez d\'abord remplir votre nom et IBAN pour donner votre consentement.',
    firstLoginTitle: 'Bienvenue ! Complétez votre profil',
    firstLoginDescription: 'Remplissez vos informations pour que les clubs vous connaissent mieux.',
  },
  en: {
    title: 'My profile',
    personalInfo: 'Personal information',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone number',
    dateOfBirth: 'Date of birth',
    bio: 'About me',
    bioPlaceholder: 'Tell us about yourself, your interests and volunteering experience...',
    changePhoto: 'Change photo',
    bankDetails: 'Bank details for expense reimbursements',
    iban: 'IBAN account number',
    ibanPlaceholder: 'BE00 0000 0000 0000',
    accountHolder: 'Account holder',
    accountHolderPlaceholder: 'Name as on your bank account',
    bankConsent: 'Legal consent',
    bankConsentText: (name: string) =>
      `I, ${name || '[your name]'}, hereby expressly declare that I agree that all expense reimbursements arising from my volunteer work will be transferred to the account number stated above. This consent is valid for all current and future assignments until written revocation. This declaration is drawn up in accordance with European payment services legislation (PSD2) and Belgian law concerning the rights of volunteers.`,
    consentAgree: 'I agree to the above declaration',
    consentDate: 'Consent given on',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Profile updated!',
    legalWarning: 'This consent is legally binding under European regulations. You may revoke it in writing at any time.',
    requiredForBank: 'Please fill in your name and IBAN first to give consent.',
    firstLoginTitle: 'Welcome! Complete your profile',
    firstLoginDescription: 'Fill in your details so clubs can get to know you better.',
  },
};

const formatIban = (value: string) => {
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
};

const EditProfileDialog = ({ open, onOpenChange, userId, language, onProfileUpdated, isFirstLogin = false }: EditProfileDialogProps) => {
  const l = labels[language];
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bankIban, setBankIban] = useState('');
  const [bankHolderName, setBankHolderName] = useState('');
  const [bio, setBio] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bankConsentGiven, setBankConsentGiven] = useState(false);
  const [bankConsentDate, setBankConsentDate] = useState<string | null>(null);
  const [bankConsentText, setBankConsentText] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [profileLanguage, setProfileLanguage] = useState<'nl' | 'fr' | 'en'>(language);
  const { setLanguage: setGlobalLanguage } = useLanguage();
  

  const { data: compliance, loading: complianceLoading, refresh: refreshCompliance } = useComplianceData(userId);

  useEffect(() => {
    if (!open) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, phone, bio, date_of_birth, bank_iban, bank_holder_name, bank_consent_given, bank_consent_date, bank_consent_text, stripe_account_id')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setFullName(data.full_name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar_url);
        setBankIban(data.bank_iban ? formatIban(data.bank_iban) : '');
        setBio(data.bio || '');
        setDateOfBirth(data.date_of_birth || '');
        setBankHolderName(data.bank_holder_name || '');
        setBankConsentGiven(data.bank_consent_given || false);
        setBankConsentDate(data.bank_consent_date);
        setBankConsentText(data.bank_consent_text);
        setStripeAccountId(data.stripe_account_id);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [open, userId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecteer een afbeelding');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const newUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;

    await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', userId);
    setAvatarUrl(newUrl);
    setUploadingAvatar(false);
    toast.success('Foto bijgewerkt!');
  };

  const handleSave = async () => {
    setSaving(true);
    const cleanIban = bankIban.replace(/\s/g, '').toUpperCase();

    const consentText = l.bankConsentText(fullName);
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      date_of_birth: dateOfBirth || null,
      bank_iban: cleanIban || null,
      bank_holder_name: bankHolderName.trim() || null,
      bank_consent_given: bankConsentGiven,
      bank_consent_date: bankConsentGiven && !bankConsentDate ? now : bankConsentDate,
      bank_consent_text: bankConsentGiven ? consentText : null,
      avatar_url: avatarUrl,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(l.saved);
      if (bankConsentGiven && !bankConsentDate) {
        setBankConsentDate(now);
      }
      onProfileUpdated({
        full_name: fullName.trim() || null,
        email,
        avatar_url: avatarUrl,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        date_of_birth: dateOfBirth || null,
        bank_iban: cleanIban || null,
        bank_holder_name: bankHolderName.trim() || null,
        bank_consent_given: bankConsentGiven,
        bank_consent_date: bankConsentGiven ? (bankConsentDate || now) : null,
        bank_consent_text: bankConsentGiven ? consentText : null,
      });
      onOpenChange(false);
    }
    setSaving(false);
  };

  const canGiveConsent = fullName.trim().length > 0 && bankIban.replace(/\s/g, '').length >= 8;
  const initials = (fullName || email || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5";

  if (loading && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {isFirstLogin ? l.firstLoginTitle : l.title}
          </DialogTitle>
          {isFirstLogin && (
            <p className="text-sm text-muted-foreground mt-1">{l.firstLoginDescription}</p>
          )}
        </DialogHeader>

        {/* Avatar section */}
        <div className="flex flex-col items-center pt-2 pb-4">
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative group"
          >
            <Avatar className="w-24 h-24">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          <p className="text-xs text-muted-foreground mt-2">{l.changePhoto}</p>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>

        {/* Personal info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            {l.personalInfo}
          </h3>

          <div>
            <label className={labelClass}>{l.name}</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Jan Janssens"
            />
          </div>

          <div>
            <label className={labelClass}>{l.email}</label>
            <input
              type="email"
              value={email}
              disabled
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
            <p className="text-[10px] text-muted-foreground mt-1">E-mail kan niet gewijzigd worden</p>
          </div>

          <div>
            <label className={labelClass}>{l.phone}</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className={inputClass}
              placeholder="+32 470 00 00 00"
            />
          </div>
          <div>
            <label className={labelClass}>{l.dateOfBirth} *</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              className={inputClass}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className={labelClass}>{l.bio}</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              className={inputClass + ' resize-none'}
              placeholder={l.bioPlaceholder}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        {/* Bank details */}
        <div className="space-y-4 mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {l.bankDetails}
          </h3>

          <div>
            <label className={labelClass}>{l.iban}</label>
            <input
              type="text"
              value={bankIban}
              onChange={e => setBankIban(formatIban(e.target.value))}
              className={inputClass}
              placeholder={l.ibanPlaceholder}
              maxLength={42}
            />
          </div>

          <div>
            <label className={labelClass}>{l.accountHolder}</label>
            <input
              type="text"
              value={bankHolderName}
              onChange={e => setBankHolderName(e.target.value)}
              className={inputClass}
              placeholder={l.accountHolderPlaceholder}
            />
          </div>

          {/* Legal consent */}
          <div className="mt-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              {l.bankConsent}
            </h4>

            <div className="bg-muted/50 rounded-xl p-4 border border-border text-xs text-muted-foreground leading-relaxed">
              {l.bankConsentText(fullName)}
            </div>

            <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
              <p className="text-[11px] text-primary/80 leading-snug">{l.legalWarning}</p>
            </div>

            {canGiveConsent ? (
              <label className="flex items-start gap-3 cursor-pointer group">
                <Checkbox
                  checked={bankConsentGiven}
                  onCheckedChange={(checked) => setBankConsentGiven(checked === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                  {l.consentAgree}
                </span>
              </label>
            ) : (
              <p className="text-xs text-muted-foreground italic">{l.requiredForBank}</p>
            )}

            {bankConsentGiven && bankConsentDate && (
              <p className="text-[11px] text-accent flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {l.consentDate}: {new Date(bankConsentDate).toLocaleDateString(
                  language === 'nl' ? 'nl-BE' : language === 'fr' ? 'fr-BE' : 'en-GB',
                  { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                )}
              </p>
            )}
          </div>
        </div>

        {/* Stripe Connect for payments - temporarily disabled, using SEPA only */}

        {/* Compliance Status Section */}
        <div className="space-y-3 mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            {language === 'nl' ? 'Compliance Status 2026' : language === 'fr' ? 'Statut de conformité 2026' : 'Compliance Status 2026'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {language === 'nl' ? 'Bekijk je jaarlijkse vergoedingsstatus en geef externe inkomsten op.' :
             language === 'fr' ? 'Consultez votre statut annuel de rémunération et déclarez vos revenus externes.' :
             'View your yearly reimbursement status and declare external income.'}
          </p>

          {complianceLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : compliance ? (
            <div className="space-y-3">
              <ComplianceBadge compliance={compliance} language={language} showProgress />
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                  <p className="text-muted-foreground">{language === 'nl' ? 'Interne uren (taken)' : language === 'fr' ? 'Heures internes (tâches)' : 'Internal hours (tasks)'}</p>
                  <p className="font-semibold text-foreground">{(compliance.internalHours || 0).toFixed(1)}h</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                  <p className="text-muted-foreground">{language === 'nl' ? 'Externe uren' : language === 'fr' ? 'Heures externes' : 'External hours'}</p>
                  <p className="font-semibold text-foreground">{compliance.externalHours}h</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                  <p className="text-muted-foreground">{language === 'nl' ? 'Intern inkomen' : language === 'fr' ? 'Revenus internes' : 'Internal income'}</p>
                  <p className="font-semibold text-foreground">€ {compliance.internalIncome.toFixed(2)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50 border border-border">
                  <p className="text-muted-foreground">{language === 'nl' ? 'Extern inkomen' : language === 'fr' ? 'Revenus externes' : 'External income'}</p>
                  <p className="font-semibold text-foreground">€ {compliance.externalIncome.toFixed(2)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowComplianceDialog(true)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                {language === 'nl' ? 'Maandelijkse verklaring invullen / wijzigen' : 
                 language === 'fr' ? 'Remplir / modifier la déclaration mensuelle' : 
                 'Fill in / edit monthly declaration'}
              </button>

              {compliance.declarationsPending && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                  <p className="text-[11px] text-orange-700 dark:text-orange-400">
                    {language === 'nl' ? 'Er zijn nog openstaande maandelijkse verklaringen.' :
                     language === 'fr' ? 'Il y a encore des déclarations mensuelles en attente.' :
                     'There are outstanding monthly declarations.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {language === 'nl' ? 'Geen compliance data beschikbaar.' : language === 'fr' ? 'Aucune donnée de conformité disponible.' : 'No compliance data available.'}
            </p>
          )}
        </div>

        <MonthlyComplianceDialog
          open={showComplianceDialog}
          onOpenChange={setShowComplianceDialog}
          userId={userId}
          language={language}
          onCompleted={() => {
            refreshCompliance();
          }}
        />

        <div className="mt-6 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? l.saving : l.save}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
