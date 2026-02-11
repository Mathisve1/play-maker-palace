import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Mail, User, Calendar, Landmark, ShieldCheck } from 'lucide-react';
import { Language } from '@/i18n/translations';

interface VolunteerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at?: string;
  phone?: string | null;
  bio?: string | null;
  bank_iban?: string | null;
  bank_holder_name?: string | null;
  bank_consent_given?: boolean;
  bank_consent_date?: string | null;
}

interface VolunteerProfileDialogProps {
  volunteer: VolunteerProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: Language;
  signupStatus?: string;
  signedUpAt?: string;
}

const labels = {
  nl: {
    profile: 'Vrijwilligersprofiel',
    name: 'Naam',
    email: 'E-mail',
    memberSince: 'Lid sinds',
    signupDate: 'Aangemeld op',
    status: 'Status',
    assigned: 'Toegekend',
    pending: 'In afwachting',
    unknown: 'Onbekend',
    phone: 'Telefoon',
    bankDetails: 'Bankgegevens',
    iban: 'IBAN',
    holderName: 'Rekeninghouder',
    consentGiven: 'Toestemming gegeven',
    consentNotGiven: 'Geen toestemming',
    consentDate: 'Toestemming op',
    noBankDetails: 'Nog geen bankgegevens ingevuld',
  },
  fr: {
    profile: 'Profil bénévole',
    name: 'Nom',
    email: 'E-mail',
    memberSince: 'Membre depuis',
    signupDate: 'Inscrit le',
    status: 'Statut',
    assigned: 'Attribué',
    pending: 'En attente',
    unknown: 'Inconnu',
    phone: 'Téléphone',
    bankDetails: 'Coordonnées bancaires',
    iban: 'IBAN',
    holderName: 'Titulaire du compte',
    consentGiven: 'Consentement donné',
    consentNotGiven: 'Pas de consentement',
    consentDate: 'Consentement le',
    noBankDetails: 'Pas encore de coordonnées bancaires',
  },
  en: {
    profile: 'Volunteer profile',
    name: 'Name',
    email: 'Email',
    memberSince: 'Member since',
    signupDate: 'Signed up on',
    status: 'Status',
    assigned: 'Assigned',
    pending: 'Pending',
    unknown: 'Unknown',
    phone: 'Phone',
    bankDetails: 'Bank details',
    iban: 'IBAN',
    holderName: 'Account holder',
    consentGiven: 'Consent given',
    consentNotGiven: 'No consent',
    consentDate: 'Consent on',
    noBankDetails: 'No bank details provided yet',
  },
};

const formatDate = (dateStr: string | null | undefined, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateTime = (dateStr: string | null | undefined, lang: Language) => {
  if (!dateStr) return null;
  const locale = lang === 'nl' ? 'nl-BE' : lang === 'fr' ? 'fr-BE' : 'en-GB';
  return new Date(dateStr).toLocaleString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const VolunteerProfileDialog = ({
  volunteer,
  open,
  onOpenChange,
  language,
  signupStatus,
  signedUpAt,
}: VolunteerProfileDialogProps) => {
  if (!volunteer) return null;
  const l = labels[language];
  const initials = (volunteer.full_name || volunteer.email || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{l.profile}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center pt-2 pb-4">
          <Avatar className="w-20 h-20 mb-3">
            {volunteer.avatar_url && (
              <AvatarImage src={volunteer.avatar_url} alt={volunteer.full_name || ''} />
            )}
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-base font-semibold text-foreground">
            {volunteer.full_name || l.unknown}
          </h3>
          {volunteer.email && (
            <p className="text-sm text-muted-foreground">{volunteer.email}</p>
          )}
          {volunteer.bio && (
            <p className="text-sm text-muted-foreground text-center mt-1 italic">"{volunteer.bio}"</p>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          {volunteer.full_name && (
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{l.name}</p>
                <p className="text-sm font-medium text-foreground">{volunteer.full_name}</p>
              </div>
            </div>
          )}

          {volunteer.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{l.email}</p>
                <p className="text-sm font-medium text-foreground">{volunteer.email}</p>
              </div>
            </div>
          )}

          {volunteer.created_at && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{l.memberSince}</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(volunteer.created_at, language)}
                </p>
              </div>
            </div>
          )}

          {signedUpAt && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{l.signupDate}</p>
                <p className="text-sm font-medium text-foreground">
                  {formatDateTime(signedUpAt, language)}
                </p>
              </div>
            </div>
          )}

          {signupStatus && (
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full shrink-0 ${
                signupStatus === 'assigned' ? 'bg-accent' : 'bg-muted-foreground/30'
              }`} />
              <div>
                <p className="text-xs text-muted-foreground">{l.status}</p>
                <p className="text-sm font-medium text-foreground">
                  {signupStatus === 'assigned' ? l.assigned : l.pending}
                </p>
              </div>
            </div>
          )}

          {volunteer.phone && (
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{l.phone}</p>
                <p className="text-sm font-medium text-foreground">{volunteer.phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bank details section */}
        <div className="border-t border-border pt-4 mt-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5" />
            {l.bankDetails}
          </h4>
          {volunteer.bank_iban ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Landmark className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{l.iban}</p>
                  <p className="text-sm font-medium text-foreground font-mono">{volunteer.bank_iban}</p>
                </div>
              </div>
              {volunteer.bank_holder_name && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{l.holderName}</p>
                    <p className="text-sm font-medium text-foreground">{volunteer.bank_holder_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-4 h-4 shrink-0 ${volunteer.bank_consent_given ? 'text-accent' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {volunteer.bank_consent_given ? l.consentGiven : l.consentNotGiven}
                  </p>
                  {volunteer.bank_consent_given && volunteer.bank_consent_date && (
                    <p className="text-xs text-muted-foreground">
                      {l.consentDate}: {formatDate(volunteer.bank_consent_date, language)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{l.noBankDetails}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VolunteerProfileDialog;
