import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';
import ContractTypePicker, { ContractTypeKey, CONTRACT_TYPES } from '@/components/ContractTypePicker';

const t3 = (nl: string, fr: string, en: string, lang: string) => lang === 'fr' ? fr : lang === 'en' ? en : nl;

// Detect browser language for invite page (no LanguageContext available here)
const detectLang = (): string => {
  const saved = localStorage.getItem('de12eman-lang');
  if (saved && ['nl', 'fr', 'en'].includes(saved)) return saved;
  const browserLang = navigator.language?.slice(0, 2).toLowerCase();
  if (['nl', 'fr', 'en'].includes(browserLang)) return browserLang;
  return 'nl';
};

interface InviteInfo {
  role: string;
  status: string;
  expires_at: string;
  club_name: string | null;
  club_logo: string | null;
  club_sport: string | null;
  partner_id: string | null;
  partner_name: string | null;
  partner_member_id?: string | null;
}

const roleLabels: Record<string, Record<string, string>> = {
  nl: { bestuurder: 'Bestuurder', beheerder: 'Beheerder', medewerker: 'Medewerker', partner_admin: 'Partner Beheerder', partner_member: 'Vrijwilliger' },
  fr: { bestuurder: 'Directeur', beheerder: 'Administrateur', medewerker: 'Collaborateur', partner_admin: 'Admin Partenaire', partner_member: 'Bénévole' },
  en: { bestuurder: 'Director', beheerder: 'Administrator', medewerker: 'Staff', partner_admin: 'Partner Admin', partner_member: 'Volunteer' },
};

// Sub-component for contract type selection after successful invite acceptance
const SuccessContractTypePicker = ({ lang }: { lang: string }) => {
  const navigate = useNavigate();
  const [selectedTypes, setSelectedTypes] = useState<Set<ContractTypeKey>>(new Set());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Save contract types to the user's membership
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: memberships } = await supabase
        .from('club_memberships')
        .select('id')
        .eq('volunteer_id', session.user.id)
        .order('joined_at', { ascending: false })
        .limit(1);

      if (memberships?.[0] && selectedTypes.size > 0) {
        const inserts = Array.from(selectedTypes).map(ct => ({
          membership_id: memberships[0].id,
          contract_type: ct,
        }));
        await supabase.from('member_contract_types' as any).insert(inserts);
      }
    }
    setDone(true);
    setSaving(false);
    setTimeout(() => navigate('/dashboard'), 2000);
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-xl font-heading font-bold text-foreground mb-2">
          {t3('Welkom bij de club!', 'Bienvenue dans le club !', 'Welcome to the club!', lang)}
        </h2>
        <p className="text-muted-foreground">
          {t3('Je wordt doorgestuurd...', 'Redirection...', 'Redirecting...', lang)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-xl font-heading font-bold text-foreground mb-2">
          {t3('Welkom bij de club!', 'Bienvenue dans le club !', 'Welcome to the club!', lang)}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t3('Kies je contracttype om verder te gaan:', 'Choisissez votre type de contrat:', 'Choose your contract type to continue:', lang)}
        </p>
      </div>
      <ContractTypePicker
        selected={selectedTypes}
        onChange={setSelectedTypes}
        language={lang as any}
        multiSelect={true}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {saving ? '...' : selectedTypes.size > 0
          ? t3('Opslaan & doorgaan', 'Enregistrer & continuer', 'Save & continue', lang)
          : t3('Overslaan', 'Passer', 'Skip', lang)}
      </button>
    </div>
  );
};

const ClubInviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [lang] = useState(detectLang);
  const [status, setStatus] = useState<'loading' | 'show-options' | 'login' | 'signup' | 'accepting' | 'success' | 'error'>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPartnerInvite = !!inviteInfo?.partner_id;
  const isPartnerMemberInvite = inviteInfo?.role === 'partner_member';
  const partnerId = inviteInfo?.partner_id || null;
  const partnerMemberId = inviteInfo?.partner_member_id || null;

  useEffect(() => {
    if (!token) return;
    const init = async () => {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-invite?action=info&token=${token}`,
          { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await resp.json();
        if (!resp.ok || data.error) {
          setStatus('error');
          setErrorMsg(data.error || t3('Uitnodiging niet gevonden', 'Invitation introuvable', 'Invitation not found', lang));
          return;
        }
        if (data.status !== 'pending') {
          setStatus('error');
          setErrorMsg(t3('Deze uitnodiging is al gebruikt.', 'Cette invitation a déjà été utilisée.', 'This invitation has already been used.', lang));
          return;
        }
        if (new Date(data.expires_at) < new Date()) {
          setStatus('error');
          setErrorMsg(t3('Deze uitnodiging is verlopen.', 'Cette invitation a expiré.', 'This invitation has expired.', lang));
          return;
        }
        setInviteInfo(data);
      } catch {
        setStatus('error');
        setErrorMsg(t3('Kon uitnodiging niet laden.', 'Impossible de charger l\'invitation.', 'Could not load invitation.', lang));
        return;
      }

      setStatus('show-options');
    };
    init();
  }, [token, lang]);

  const acceptWithSession = async (session: { access_token: string; user: { id: string } }) => {
    setStatus('accepting');
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-invite?action=accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token, user_id: session.user.id, partner_id: partnerId, partner_member_id: partnerMemberId }),
        }
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        setStatus('success');
        const dest = data.is_partner ? '/partner-dashboard' : data.is_partner_member ? '/dashboard' : '/club-dashboard';
        toast.success(data.is_partner
          ? t3('Je bent toegevoegd als partner beheerder!', 'Vous avez été ajouté en tant qu\'administrateur partenaire !', 'You have been added as partner admin!', lang)
          : data.is_partner_member
            ? t3('Je bent toegevoegd als vrijwilliger!', 'Vous avez été ajouté comme bénévole !', 'You have been added as volunteer!', lang)
            : t3('Je bent toegevoegd aan de club!', 'Vous avez été ajouté au club !', 'You have been added to the club!', lang)
        );
        setTimeout(() => navigate(dest), 2000);
      } else {
        setStatus('error');
        setErrorMsg(data.error || t3('Er ging iets mis', 'Quelque chose s\'est mal passé', 'Something went wrong', lang));
      }
    } catch {
      setStatus('error');
      setErrorMsg(t3('Er ging iets mis bij het accepteren', 'Erreur lors de l\'acceptation', 'Something went wrong while accepting', lang));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error, data } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    await acceptWithSession(data.session);
    setSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirm) {
      toast.error(t3('Wachtwoorden komen niet overeen', 'Les mots de passe ne correspondent pas', 'Passwords do not match', lang));
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-invite?action=signup-and-accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            token,
            email: signupEmail,
            password: signupPassword,
            full_name: signupName,
            partner_id: partnerId,
          partner_member_id: partnerMemberId,
          }),
        }
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: signupEmail,
          password: signupPassword,
        });
        if (signInErr) {
          toast.error(t3('Account aangemaakt maar kon niet inloggen: ', 'Compte créé mais connexion impossible : ', 'Account created but could not log in: ', lang) + signInErr.message);
          setSubmitting(false);
          return;
        }
        setStatus('success');
        const dest = data.is_partner ? '/partner-dashboard' : data.is_partner_member ? '/dashboard' : '/club-dashboard';
        toast.success(data.is_partner
          ? t3('Account aangemaakt! Je wordt doorgestuurd naar het partner dashboard.', 'Compte créé ! Redirection vers le tableau de bord partenaire.', 'Account created! Redirecting to partner dashboard.', lang)
          : data.is_partner_member
            ? t3('Account aangemaakt! Welkom als vrijwilliger.', 'Compte créé ! Bienvenue comme bénévole.', 'Account created! Welcome as volunteer.', lang)
            : t3('Account aangemaakt en toegevoegd aan de club!', 'Compte créé et ajouté au club !', 'Account created and added to the club!', lang)
        );
        setTimeout(() => navigate(dest), 2000);
      } else {
        toast.error(data.error || t3('Er ging iets mis', 'Quelque chose s\'est mal passé', 'Something went wrong', lang));
      }
    } catch {
      toast.error(t3('Er ging iets mis bij de registratie', 'Erreur lors de l\'inscription', 'Something went wrong during registration', lang));
    }
    setSubmitting(false);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="md" linkTo="/" />
        </div>

        <div className="bg-card rounded-2xl shadow-elevated p-8">
          {inviteInfo && (
            <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-muted/30 border border-border">
              {inviteInfo.club_logo ? (
                <img src={inviteInfo.club_logo} alt="" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {(inviteInfo.partner_name || inviteInfo.club_name || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isPartnerInvite ? inviteInfo.partner_name || 'Partner' : inviteInfo.club_name || 'Club'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t3('Rol', 'Rôle', 'Role', lang)}: {roleLabels[lang]?.[inviteInfo.role] || inviteInfo.role}
                  {isPartnerInvite && inviteInfo.club_name && ` · ${inviteInfo.club_name}`}
                  {!isPartnerInvite && inviteInfo.club_sport && ` · ${inviteInfo.club_sport}`}
                </p>
              </div>
            </div>
          )}

          {(status === 'loading' || status === 'accepting') && (
            <>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-center">
                {status === 'loading'
                  ? t3('Uitnodiging laden...', 'Chargement de l\'invitation...', 'Loading invitation...', lang)
                  : t3('Uitnodiging verwerken...', 'Traitement de l\'invitation...', 'Processing invitation...', lang)}
              </p>
            </>
          )}

          {status === 'show-options' && (
            <>
              <h2 className="text-xl font-heading font-bold text-foreground text-center mb-2">
                {isPartnerInvite
                  ? t3('Partner uitnodiging accepteren', 'Accepter l\'invitation partenaire', 'Accept partner invitation', lang)
                  : t3('Uitnodiging accepteren', 'Accepter l\'invitation', 'Accept invitation', lang)}
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {t3('Heb je al een account of wil je een nieuw account aanmaken?', 'Avez-vous déjà un compte ou souhaitez-vous en créer un nouveau ?', 'Do you already have an account or would you like to create a new one?', lang)}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setStatus('login')}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  {t3('Ik heb al een account', 'J\'ai déjà un compte', 'I already have an account', lang)}
                </button>
                <button
                  onClick={() => setStatus('signup')}
                  className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  {t3('Nieuw account aanmaken', 'Créer un nouveau compte', 'Create new account', lang)}
                </button>
              </div>
            </>
          )}

          {status === 'login' && (
            <>
              <h2 className="text-xl font-heading font-bold text-foreground text-center mb-1">{t3('Inloggen', 'Connexion', 'Log in', lang)}</h2>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {t3('Log in om de uitnodiging te accepteren', 'Connectez-vous pour accepter l\'invitation', 'Log in to accept the invitation', lang)}
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t3('E-mail', 'E-mail', 'Email', lang)}</label>
                  <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Wachtwoord', 'Mot de passe', 'Password', lang)}</label>
                  <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submitting ? '...' : t3('Inloggen & accepteren', 'Se connecter & accepter', 'Log in & accept', lang)}
                </button>
              </form>
              <button onClick={() => setStatus('show-options')} className="mt-3 text-sm text-muted-foreground hover:text-foreground w-full text-center">
                ← {t3('Terug', 'Retour', 'Back', lang)}
              </button>
            </>
          )}

          {status === 'signup' && (
            <>
              <h2 className="text-xl font-heading font-bold text-foreground text-center mb-1">{t3('Account aanmaken', 'Créer un compte', 'Create account', lang)}</h2>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {isPartnerInvite
                  ? t3('Maak een account aan om in te loggen op het partner platform', 'Créez un compte pour vous connecter à la plateforme partenaire', 'Create an account to log in to the partner platform', lang)
                  : t3('Maak een account aan om lid te worden van de club', 'Créez un compte pour rejoindre le club', 'Create an account to join the club', lang)}
              </p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Jouw naam', 'Votre nom', 'Your name', lang)}</label>
                  <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} maxLength={100} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t3('E-mail', 'E-mail', 'Email', lang)} *</label>
                  <input type="email" required value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Wachtwoord', 'Mot de passe', 'Password', lang)} *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      className={inputClass + ' pr-10'}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Bevestig wachtwoord', 'Confirmer le mot de passe', 'Confirm password', lang)} *</label>
                  <input type="password" required minLength={6} value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submitting ? '...' : t3('Registreren & accepteren', 'S\'inscrire & accepter', 'Register & accept', lang)}
                </button>
              </form>
              <button onClick={() => setStatus('show-options')} className="mt-3 text-sm text-muted-foreground hover:text-foreground w-full text-center">
                ← {t3('Terug', 'Retour', 'Back', lang)}
              </button>
            </>
          )}

          {status === 'success' && !isPartnerInvite && (
            <SuccessContractTypePicker lang={lang} />
          )}

          {status === 'success' && isPartnerInvite && !isPartnerMemberInvite && (
            <div className="text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">
                {t3('Welkom als partner!', 'Bienvenue en tant que partenaire !', 'Welcome as partner!', lang)}
              </h2>
              <p className="text-muted-foreground">
                {t3(
                  'Je wordt doorgestuurd naar het partner dashboard...',
                  'Redirection vers le tableau de bord partenaire...',
                  'Redirecting to partner dashboard...',
                  lang
                )}
              </p>
            </div>
          )}

          {status === 'success' && isPartnerMemberInvite && (
            <div className="text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">
                {t3('Welkom als vrijwilliger!', 'Bienvenue comme bénévole !', 'Welcome as volunteer!', lang)}
              </h2>
              <p className="text-muted-foreground">
                {t3(
                  'Je wordt doorgestuurd naar je vrijwilligersdashboard...',
                  'Redirection vers votre tableau de bord bénévole...',
                  'Redirecting to your volunteer dashboard...',
                  lang
                )}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">{t3('Uitnodiging mislukt', 'Invitation échouée', 'Invitation failed', lang)}</h2>
              <p className="text-muted-foreground mb-4">{errorMsg}</p>
              <button
                onClick={() => navigate(isPartnerInvite ? '/partner-login' : '/club-login')}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                {t3('Naar inloggen', 'Se connecter', 'Go to login', lang)}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ClubInviteAccept;
