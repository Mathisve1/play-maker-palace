import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import Logo from '@/components/Logo';

interface InviteInfo {
  role: string;
  status: string;
  expires_at: string;
  club_name: string | null;
  club_logo: string | null;
  club_sport: string | null;
  partner_id: string | null;
  partner_name: string | null;
}

const roleLabels: Record<string, string> = {
  bestuurder: 'Bestuurder',
  beheerder: 'Beheerder',
  medewerker: 'Medewerker',
  partner_admin: 'Partner Beheerder',
};

const ClubInviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'show-options' | 'login' | 'signup' | 'accepting' | 'success' | 'error'>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPartnerInvite = !!inviteInfo?.partner_id || !!searchParams.get('partner_id');
  const partnerId = inviteInfo?.partner_id || searchParams.get('partner_id');

  useEffect(() => {
    if (!token) return;
    const init = async () => {
      try {
        const partnerParam = searchParams.get('partner_id') ? `&partner_id=${searchParams.get('partner_id')}` : '';
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-invite?action=info&token=${token}${partnerParam}`,
          { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await resp.json();
        if (!resp.ok || data.error) {
          setStatus('error');
          setErrorMsg(data.error || 'Uitnodiging niet gevonden');
          return;
        }
        if (data.status !== 'pending') {
          setStatus('error');
          setErrorMsg('Deze uitnodiging is al gebruikt.');
          return;
        }
        if (new Date(data.expires_at) < new Date()) {
          setStatus('error');
          setErrorMsg('Deze uitnodiging is verlopen.');
          return;
        }
        setInviteInfo(data);
      } catch {
        setStatus('error');
        setErrorMsg('Kon uitnodiging niet laden.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Don't auto-accept yet, wait for inviteInfo to be set
        setStatus('show-options');
      } else {
        setStatus('show-options');
      }
    };
    init();
  }, [token]);

  const getRedirectPath = () => isPartnerInvite ? '/partner-dashboard' : '/club-dashboard';

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
          body: JSON.stringify({ token, user_id: session.user.id, partner_id: partnerId }),
        }
      );
      const data = await resp.json();
      if (resp.ok && data.success) {
        setStatus('success');
        const dest = data.is_partner ? '/partner-dashboard' : '/club-dashboard';
        toast.success(data.is_partner ? 'Je bent toegevoegd als partner beheerder!' : 'Je bent toegevoegd aan de club!');
        setTimeout(() => navigate(dest), 2000);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Er ging iets mis');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Er ging iets mis bij het accepteren');
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
      toast.error('Wachtwoorden komen niet overeen');
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
          toast.error('Account aangemaakt maar kon niet inloggen: ' + signInErr.message);
          setSubmitting(false);
          return;
        }
        setStatus('success');
        const dest = data.is_partner ? '/partner-dashboard' : '/club-dashboard';
        toast.success(data.is_partner ? 'Account aangemaakt! Je wordt doorgestuurd naar het partner dashboard.' : 'Account aangemaakt en toegevoegd aan de club!');
        setTimeout(() => navigate(dest), 2000);
      } else {
        toast.error(data.error || 'Er ging iets mis');
      }
    } catch {
      toast.error('Er ging iets mis bij de registratie');
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
          {/* Club/Partner info header */}
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
                  Rol: {roleLabels[inviteInfo.role] || inviteInfo.role}
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
                {status === 'loading' ? 'Uitnodiging laden...' : 'Uitnodiging verwerken...'}
              </p>
            </>
          )}

          {status === 'show-options' && (
            <>
              <h2 className="text-xl font-heading font-bold text-foreground text-center mb-2">
                {isPartnerInvite ? 'Partner uitnodiging accepteren' : 'Uitnodiging accepteren'}
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Heb je al een account of wil je een nieuw account aanmaken?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setStatus('login')}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  Ik heb al een account
                </button>
                <button
                  onClick={() => setStatus('signup')}
                  className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  Nieuw account aanmaken
                </button>
              </div>
            </>
          )}

          {status === 'login' && (
            <>
              <h2 className="text-xl font-heading font-bold text-foreground text-center mb-1">Inloggen</h2>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Log in om de uitnodiging te accepteren
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
                  <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Wachtwoord</label>
                  <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submitting ? '...' : 'Inloggen & accepteren'}
                </button>
              </form>
              <button onClick={() => setStatus('show-options')} className="mt-3 text-sm text-muted-foreground hover:text-foreground w-full text-center">
                ← Terug
              </button>
            </>
          )}

          {status === 'signup' && (
            <>
              <h2 className="text-xl font-heading font-bold text-foreground text-center mb-1">Account aanmaken</h2>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {isPartnerInvite
                  ? 'Maak een account aan om in te loggen op het partner platform'
                  : 'Maak een account aan om lid te worden van de club'}
              </p>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Jouw naam</label>
                  <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} maxLength={100} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">E-mail *</label>
                  <input type="email" required value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Wachtwoord *</label>
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
                  <label className="block text-sm font-medium text-foreground mb-1.5">Bevestig wachtwoord *</label>
                  <input type="password" required minLength={6} value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} className={inputClass} />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submitting ? '...' : 'Registreren & accepteren'}
                </button>
              </form>
              <button onClick={() => setStatus('show-options')} className="mt-3 text-sm text-muted-foreground hover:text-foreground w-full text-center">
                ← Terug
              </button>
            </>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">
                {isPartnerInvite ? 'Welkom als partner!' : 'Welkom bij de club!'}
              </h2>
              <p className="text-muted-foreground">
                Je wordt doorgestuurd naar het {isPartnerInvite ? 'partner' : 'club'} dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">Uitnodiging mislukt</h2>
              <p className="text-muted-foreground mb-4">{errorMsg}</p>
              <button
                onClick={() => navigate(isPartnerInvite ? '/partner-login' : '/club-login')}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Naar inloggen
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ClubInviteAccept;
