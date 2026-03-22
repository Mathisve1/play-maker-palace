import { useState, useEffect } from 'react';
import { trackEvent } from '@/lib/posthog';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRightIcon, Handshake } from 'lucide-react';
import Logo from '@/components/Logo';
import { OnboardingForm } from '@/components/OnboardingForm';

const Signup = () => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Partner invite link: /signup?partner_id=<uuid>
  const partnerId = searchParams.get('partner_id');
  const [partnerName, setPartnerName] = useState<string | null>(null);

  // Step 0 = account creation, Step 1 = onboarding
  const [phase, setPhase] = useState<'account' | 'onboarding'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');

  // Resolve partner name for branding banner
  useEffect(() => {
    if (!partnerId) return;
    (supabase as any)
      .from('external_partners')
      .select('name')
      .eq('id', partnerId)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }: any) => { if (data) setPartnerName(data.name); });
  }, [partnerId]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    // JS email validation (browser validation disabled via noValidate)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError(
        language === 'nl' ? 'Dit e-mailadres klopt niet'
        : language === 'fr' ? 'Cette adresse e-mail n\'est pas valide'
        : 'This email address is not valid'
      );
      return;
    }
    setEmailError('');
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
      trackEvent('volunteer_signup_completed');
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
          bank_bic: formData.bic?.trim() || null,
          bank_holder_name: formData.bankHolderName.trim(),
          bank_consent_given: true,
          bank_consent_date: new Date().toISOString(),
          bank_consent_text: consentText,
          language: formData.language || language,
        } as any)
        .eq('id', userId);

      if (error) throw error;

      // If user registered via a partner invite link, link them to the partner pool
      if (partnerId) {
        const { error: partnerErr } = await (supabase as any).rpc('complete_partner_registration', {
          p_user_id:    userId,
          p_partner_id: partnerId,
        });
        if (partnerErr) {
          // Non-fatal: profile is saved, partner linking can be retried
          console.error('Partner registration link error:', partnerErr.message);
        }
      }

      const welcomeMsg = partnerId && partnerName
        ? (language === 'nl' ? `Welkom bij ${partnerName}! Je profiel is klaar.` : language === 'fr' ? `Bienvenue chez ${partnerName}! Profil complété.` : `Welcome to ${partnerName}! Profile complete.`)
        : (language === 'nl' ? 'Profiel compleet! Welkom!' : language === 'fr' ? 'Profil complet ! Bienvenue !' : 'Profile complete! Welcome!');
      toast.success(welcomeMsg);
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
              {/* Partner branding banner — shown when arriving via invite link */}
              {partnerName && (
                <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                    <Handshake className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {language === 'nl' ? 'Uitnodiging via partner' : language === 'fr' ? 'Invitation partenaire' : 'Partner invitation'}
                    </p>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{partnerName}</p>
                  </div>
                </div>
              )}
              <h1 className="text-2xl font-heading font-bold text-foreground text-center">{t.auth.signupTitle}</h1>
              <p className="text-sm text-muted-foreground text-center mt-1">{t.auth.signupSubtitle}</p>

              <form onSubmit={handleCreateAccount} noValidate className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.email}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ${emailError ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
                  />
                  {emailError && (
                    <p className="mt-1.5 text-sm text-destructive">{emailError}</p>
                  )}
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
                    className={`w-full px-4 py-2.5 rounded-xl border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ${confirmPassword && password !== confirmPassword ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1.5 text-sm text-destructive">
                      {language === 'nl' ? 'Wachtwoorden komen niet overeen' : language === 'fr' ? 'Les mots de passe ne correspondent pas' : 'Passwords do not match'}
                    </p>
                  )}
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
              onLanguageChange={(lang) => setLanguage(lang)}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
