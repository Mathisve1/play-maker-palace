import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRightIcon } from 'lucide-react';
import Logo from '@/components/Logo';
import { OnboardingForm } from '@/components/OnboardingForm';

const Signup = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Step 0 = account creation, Step 1 = onboarding
  const [phase, setPhase] = useState<'account' | 'onboarding'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(language === 'nl' ? 'Wachtwoorden komen niet overeen' : language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.user) {
      setUserId(data.user.id);
      setPhase('onboarding');
    } else {
      toast.success(language === 'nl' ? 'Controleer je e-mail om je account te bevestigen!' : language === 'fr' ? 'Vérifiez votre e-mail pour confirmer votre compte !' : 'Check your email to confirm your account!');
      navigate('/login');
    }
  };

  const handleOnboardingComplete = async (formData: any) => {
    if (!userId) return;
    setLoading(true);

    try {
      // Upload avatar
      let avatarUrl: string | null = null;
      if (formData.avatarFile) {
        const ext = formData.avatarFile.name.split('.').pop() || 'jpg';
        const filePath = `${userId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, formData.avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;
      }

      const cleanIban = formData.iban.replace(/\s/g, '').toUpperCase();
      const consentText = language === 'nl'
        ? `Ik, ${formData.fullName}, verklaar hierbij uitdrukkelijk dat ik akkoord ga dat alle onkostenvergoedingen voortvloeiend uit mijn vrijwilligerswerk worden overgemaakt op bovenstaand rekeningnummer.`
        : `I, ${formData.fullName}, hereby expressly declare that I agree that all expense reimbursements arising from my volunteer work will be transferred to the account number stated above.`;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName.trim(),
          date_of_birth: formData.dateOfBirth,
          phone: formData.phone.trim() || null,
          avatar_url: avatarUrl,
          bank_iban: cleanIban,
          bank_holder_name: formData.bankHolderName.trim(),
          bank_consent_given: true,
          bank_consent_date: new Date().toISOString(),
          bank_consent_text: consentText,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(language === 'nl' ? 'Profiel compleet! Welkom!' : language === 'fr' ? 'Profil complet ! Bienvenue !' : 'Profile complete! Welcome!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Error saving profile');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <Logo size="md" linkTo="/" />
        </div>

        <div className="bg-card rounded-2xl shadow-elevated p-8">
          {phase === 'account' ? (
            <>
              <h1 className="text-2xl font-heading font-bold text-foreground text-center">{t.auth.signupTitle}</h1>
              <p className="text-sm text-muted-foreground text-center mt-1">{t.auth.signupSubtitle}</p>

              <form onSubmit={handleCreateAccount} className="mt-6 space-y-4">
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
                      minLength={6}
                      className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.confirmPassword}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? '...' : (
                    <>
                      {language === 'nl' ? 'Account aanmaken' : language === 'fr' ? 'Créer un compte' : 'Create account'}
                      <ArrowRightIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {t.auth.hasAccount}{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">{t.auth.loginButton}</Link>
              </p>
            </>
          ) : (
            <OnboardingForm
              language={language}
              onComplete={handleOnboardingComplete}
              saving={loading}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
