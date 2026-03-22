import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { useLanguage } from '@/i18n/LanguageContext';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const t = (nl: string, fr: string, en: string) =>
    language === 'nl' ? nl : language === 'fr' ? fr : en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="w-full max-w-md"
          >
            <div className="flex justify-center mb-8">
              <Logo size="md" linkTo="/" />
            </div>

            <div className="bg-card/90 backdrop-blur-xl rounded-3xl border border-border/40 shadow-[0_8px_40px_-8px_hsl(var(--primary)/0.15)] p-8">
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
              </div>

              <h1 className="text-2xl font-heading font-bold text-foreground text-center tracking-tight">
                {t('Wachtwoord vergeten?', 'Mot de passe oublié ?', 'Forgot password?')}
              </h1>
              <p className="text-sm text-muted-foreground text-center mt-1.5 leading-relaxed">
                {t(
                  'Vul je e-mailadres in. We sturen je een link om een nieuw wachtwoord in te stellen.',
                  'Entrez votre e-mail. Nous vous enverrons un lien pour définir un nouveau mot de passe.',
                  'Enter your email. We\'ll send you a link to set a new password.'
                )}
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('E-mailadres', 'Adresse e-mail', 'Email address')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder={t('jouw@email.be', 'votre@email.be', 'your@email.com')}
                    className="w-full h-12 px-4 rounded-2xl border border-input bg-background text-foreground text-base focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Versturen...', 'Envoi...', 'Sending...')}</>
                    : t('Reset-link versturen', 'Envoyer le lien', 'Send reset link')
                  }
                </button>
              </form>

              <button
                onClick={() => navigate('/login')}
                className="mt-4 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('Terug naar inloggen', 'Retour à la connexion', 'Back to login')}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
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
                className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5"
              >
                <CheckCircle className="w-10 h-10 text-primary" />
              </motion.div>
              <h1 className="text-xl font-heading font-bold text-foreground">
                {t('E-mail verstuurd!', 'E-mail envoyé !', 'Email sent!')}
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {t(
                  `We hebben een reset-link gestuurd naar ${email}. De link is 1 uur geldig.`,
                  `Nous avons envoyé un lien de réinitialisation à ${email}. Le lien est valable 1 heure.`,
                  `We sent a reset link to ${email}. The link is valid for 1 hour.`
                )}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-3">
                {t(
                  'Geen e-mail ontvangen? Controleer je spammap.',
                  "Pas reçu l'e-mail ? Vérifiez vos spams.",
                  "Didn't receive an email? Check your spam folder."
                )}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                {t('Terug naar inloggen', 'Retour à la connexion', 'Back to login')}
              </button>
              <button
                onClick={() => setSent(false)}
                className="mt-3 w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('Opnieuw proberen', 'Réessayer', 'Try again')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResetPassword;
