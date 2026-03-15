import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Mail, User, Calendar, Landmark, ShieldCheck, Award, Star } from 'lucide-react';
import { Language } from '@/i18n/translations';
import { supabase } from '@/integrations/supabase/client';

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
    certificates: 'Certificaten',
    noCertificates: 'Nog geen certificaten behaald',
    earnedOn: 'Behaald op',
    score: 'Score',
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
    certificates: 'Certificats',
    noCertificates: 'Aucun certificat obtenu',
    earnedOn: 'Obtenu le',
    score: 'Score',
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
    certificates: 'Certificates',
    noCertificates: 'No certificates earned yet',
    earnedOn: 'Earned on',
    score: 'Score',
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

interface Certificate {
  id: string;
  training_title: string;
  club_name: string;
  issue_date: string;
  score: number | null;
  type: string;
}

const VolunteerProfileDialog = ({
  volunteer,
  open,
  onOpenChange,
  language,
  signupStatus,
  signedUpAt,
}: VolunteerProfileDialogProps) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [ratingInfo, setRatingInfo] = useState<{ avg: number; count: number } | null>(null);
  useEffect(() => {
    if (!volunteer?.id || !open) { setCertificates([]); setRatingInfo(null); return; }
    (async () => {
      // Fetch certificates and reviews in parallel
      const [certRes, reviewRes] = await Promise.all([
        supabase
          .from('volunteer_certificates')
          .select('id, issue_date, score, type, training_id, club_id')
          .eq('volunteer_id', volunteer.id)
          .order('issue_date', { ascending: false }),
        (supabase as any)
          .from('task_reviews')
          .select('rating')
          .eq('reviewee_id', volunteer.id),
      ]);

      // Process reviews
      const reviews = (reviewRes.data || []) as { rating: number }[];
      if (reviews.length > 0) {
        const sum = reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0);
        setRatingInfo({ avg: sum / reviews.length, count: reviews.length });
      } else {
        setRatingInfo(null);
      }

      // Process certificates
      const data = certRes.data;
      if (data && data.length > 0) {
        const trainingIds = [...new Set(data.map(c => c.training_id))];
        const clubIds = [...new Set(data.map(c => c.club_id))];
        const [tRes, cRes] = await Promise.all([
          supabase.from('academy_trainings').select('id, title').in('id', trainingIds),
          supabase.from('clubs').select('id, name').in('id', clubIds),
        ]);
        const tMap = new Map((tRes.data || []).map(t => [t.id, t.title]));
        const cMap = new Map((cRes.data || []).map(c => [c.id, c.name]));
        setCertificates(data.map(c => ({
          id: c.id,
          training_title: tMap.get(c.training_id) || '',
          club_name: cMap.get(c.club_id) || '',
          issue_date: c.issue_date,
          score: c.score,
          type: c.type,
        })));
      } else {
        setCertificates([]);
      }
    })();
  }, [volunteer?.id, open]);

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

        {/* Certificates section */}
        <div className="border-t border-border pt-4 mt-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" />
            {l.certificates}
          </h4>
          {certificates.length > 0 ? (
            <div className="space-y-2">
              {certificates.map(cert => (
                <div key={cert.id} className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200/50 dark:border-yellow-800/30">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{cert.training_title}</p>
                    <p className="text-xs text-muted-foreground">{cert.club_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{l.earnedOn}: {formatDate(cert.issue_date, language)}</span>
                      {cert.score != null && <span className="text-[10px] font-medium text-primary">{l.score}: {cert.score}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{l.noCertificates}</p>
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
