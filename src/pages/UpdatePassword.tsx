import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, CheckCircle, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { useLanguage } from '@/i18n/LanguageContext';

type Mode = 'loading' | 'form' | 'success' | 'expired';

const UpdatePassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [mode, setMode] = useState<Mode>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  useEffect(() => {
    const hash = window.location.hash;

    // Detect expired/error token from Supabase redirect
    if (hash.includes('error=')) {
      setMode('expired');
      return;
    }

    // Detect valid recovery token in hash
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setMode('form');
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('form');
      }
    });

    // Fallback: if no signal arrives within 3s, show expired
    const timer = setTimeout(() => {
      setMode(prev => prev === 'loading' ? 'expired' : prev);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('Wachtwoorden komen niet overeen', 'Les mots de passe ne correspondent pas', 'Passwords do not match'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('Minimaal 8 tekens vereist', 'Minimum 8 caractères requis', 'Minimum 8 characters required'));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('same') || error.message.toLowerCase().includes('different')) {
        toast.error(t('Kies een ander wachtwoord dan je huidige', 'Choisissez un mot de passe différent', 'Choose a different password from your current one'));
      } else if (error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid')) {
        setMode('expired');
      } else {
        toast.error(error.message);
      }
    } else {
      setMode('success');
      toast.success(t('Wachtwoord succesvol gewijzigd!', 'Mot de passe modifié avec succès !', 'Password updated successfully!'));
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    }
  };

  const passwordStrength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthColor = passwordStrength <= 1 ? 'bg-destructive' : passwordStrength <= 2 ? 'bg-amber-500' : passwordStrength <= 3 ? 'bg-yellow-400' : 'bg-emerald-500';
  const strengthLabel = passwordStrength <= 1
    ? t('Zwak', 'Faible', 'Weak')
    : passwordStrength <= 2
    ? t('Matig', 'Moyen', 'Fair')
    : passwordStrength <= 3
    ? t('Goed', 'Bien', 'Good')
    : t('Sterk', 'Fort', 'Strong');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {/* Loading */}
        {mode === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 text-muted-foreground"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">{t('Beveiligde link valideren...', 'Validation du lien sécurisé...', 'Validating secure link...')}</p>
          </motion.div>
        )}

        {/* Expired / Invalid */}
        {mode === 'expired' && (
          <motion.div
            key="expired"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md"
          >
            <div className="flex justify-center mb-8">
              <Logo size="md" linkTo="/" />
            </div>
            <div className="bg-card/90 backdrop-blur-xl rounded-3xl border border-border/40 shadow-[0_8px_40px_-8px_hsl(var(--primary)/0.15)] p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-xl font-heading font-bold text-foreground">
                {t('Link verlopen', 'Lien expiré', 'Link expired')}
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {t(
                  'Deze reset-link is verlopen of al gebruikt. Vraag een nieuwe link aan.',
                  'Ce lien de réinitialisation a expiré ou a déjà été utilisé. Demandez un nouveau lien.',
                  'This reset link has expired or was already used. Request a new one.'
                )}
              </p>
              <button
                onClick={() => navigate('/reset-password')}
                className="mt-6 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                {t('Nieuwe link aanvragen', 'Demander un nouveau lien', 'Request new link')}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="mt-3 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('Terug naar inloggen', 'Retour à la connexion', 'Back to login')}
              </button>
            </div>
          </motion.div>
        )}

        {/* Form */}
        {mode === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md"
          >
            <div className="flex justify-center mb-8">
              <Logo size="md" linkTo="/" />
            </div>

            <div className="bg-card/90 backdrop-blur-xl rounded-3xl border border-border/40 shadow-[0_8px_40px_-8px_hsl(var(--primary)/0.15)] p-8">
              {/* Icon header */}
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
              </div>

              <h1 className="text-2xl font-heading font-bold text-foreground text-center tracking-tight">
                {t('Nieuw wachtwoord', 'Nouveau mot de passe', 'New password')}
              </h1>
              <p className="text-sm text-muted-foreground text-center mt-1.5">
                {t('Kies een sterk wachtwoord voor je account.', 'Choisissez un mot de passe solide pour votre compte.', 'Choose a strong password for your account.')}
              </p>

              <form onSubmit={handleUpdate} className="mt-6 space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('Nieuw wachtwoord', 'Nouveau mot de passe', 'New password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      minLength={8}
                      className="w-full h-12 px-4 pr-11 rounded-2xl border border-input bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2"
                    >
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <div
                            key={n}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${n <= passwordStrength ? strengthColor : 'bg-muted'}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{strengthLabel}</p>
                    </motion.div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('Bevestig wachtwoord', 'Confirmer le mot de passe', 'Confirm password')}
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`w-full h-12 px-4 rounded-2xl border text-foreground text-base bg-background focus:outline-none focus:ring-2 transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-destructive focus:ring-destructive'
                        : 'border-input focus:ring-ring'
                    }`}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1.5 text-sm text-destructive">
                      {t('Wachtwoorden komen niet overeen', 'Les mots de passe ne correspondent pas', 'Passwords do not match')}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || (!!confirmPassword && password !== confirmPassword)}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Opslaan...', 'Enregistrement...', 'Saving...')}</>
                    : t('Wachtwoord opslaan', 'Enregistrer le mot de passe', 'Save password')
                  }
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Success */}
        {mode === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md"
          >
            <div className="flex justify-center mb-8">
              <Logo size="md" linkTo="/" />
            </div>
            <div className="bg-card/90 backdrop-blur-xl rounded-3xl border border-border/40 shadow-[0_8px_40px_-8px_hsl(var(--primary)/0.15)] p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5"
              >
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <h1 className="text-xl font-heading font-bold text-foreground">
                {t('Wachtwoord gewijzigd!', 'Mot de passe modifié !', 'Password changed!')}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {t('Je wordt doorgestuurd naar de inlogpagina...', 'Vous allez être redirigé vers la page de connexion...', 'Redirecting to login...')}
              </p>
              <div className="mt-4 w-full h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: 'linear' }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpdatePassword;
