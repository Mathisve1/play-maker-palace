import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, HelpCircle } from 'lucide-react';
import Logo from '@/components/Logo';

const ClubLogin = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error(t3('Vul eerst je e-mailadres in', "Entrez d'abord votre e-mail", 'Enter your email first'));
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(t3('Reset-link verstuurd! Check je inbox.', 'Lien envoyé ! Vérifiez votre boîte.', 'Reset link sent! Check your inbox.'));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = t3('Ongeldig e-mailadres of wachtwoord.', 'E-mail ou mot de passe incorrect.', 'Invalid email or password.');
        setLoginError(msg);
        toast.error(msg);
        return;
      }

      const userId = data.user?.id ?? (await supabase.auth.getUser()).data.user?.id ?? null;
      if (!userId) {
        toast.error(t3('Inloggen gelukt, maar sessie kon niet geladen worden.', 'Connexion réussie, mais session introuvable.', 'Login succeeded, but session could not be loaded.'));
        return;
      }

      toast.success(t3('Ingelogd!', 'Connecté !', 'Logged in!'));

      // Check if this user is a partner admin → redirect to partner dashboard
      // to prevent the redirect loop on /club-dashboard
      try {
        const { data: partnerAdmins } = await supabase
          .from('partner_admins')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        if (partnerAdmins && partnerAdmins.length > 0) {
          navigate('/partner-dashboard', { replace: true });
          return;
        }
      } catch (err) {
        console.warn('ClubLogin: partner_admins check failed', err);
      }

      navigate('/club-dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <Logo size="md" linkTo="/clubs" />
        </div>

        <div className="bg-card rounded-2xl shadow-elevated p-8">
          <h1 className="text-2xl font-heading font-bold text-foreground text-center">
            {t3('Club Login', 'Connexion Club', 'Club Login')}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {t3('Log in op je club dashboard', 'Connectez-vous à votre tableau de bord', 'Log in to your club dashboard')}
          </p>

          {loginError && (
            <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.email}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <HelpCircle className="w-3 h-3" />
                {t3('Wachtwoord vergeten?', 'Mot de passe oublié ?', 'Forgot password?')}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '...' : t.auth.loginButton}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.auth.noAccount}{' '}
            <Link to="/club-signup" className="text-secondary font-medium hover:underline">{t3('Registreer je club', 'Enregistrez votre club', 'Register your club')}</Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {t3('Vrijwilliger?', 'Bénévole ?', 'Volunteer?')}{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">{t3('Log hier in', 'Connectez-vous ici', 'Log in here')}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ClubLogin;
