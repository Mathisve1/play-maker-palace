import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Upload, X } from 'lucide-react';
import Logo from '@/components/Logo';

const ClubSignup = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [clubName, setClubName] = useState('');
  const [sport, setSport] = useState('');
  const [location, setLocation] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const t3 = (nl: string, fr: string, en: string) => language === 'nl' ? nl : language === 'fr' ? fr : en;

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t3('Logo mag maximaal 5MB zijn', 'Le logo ne peut pas dépasser 5 Mo', 'Logo must be 5MB or less'));
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(t3('Wachtwoorden komen niet overeen', 'Les mots de passe ne correspondent pas', 'Passwords do not match'));
      return;
    }
    if (!clubName.trim()) {
      toast.error(t3('Clubnaam is verplicht', 'Le nom du club est obligatoire', 'Club name is required'));
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            club_name: clubName.trim(),
            sport: sport.trim() || null,
            location: location.trim() || null,
          }),
        }
      );
      const data = await resp.json();
      if (!resp.ok || data.error) {
        toast.error(data.error || t3('Er ging iets mis', 'Une erreur est survenue', 'Something went wrong'));
        setLoading(false);
        return;
      }

      if (logoFile && data.user_id) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) {
          const ext = logoFile.name.split('.').pop();
          const filePath = `${data.user_id}/logo.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('club-logos')
            .upload(filePath, logoFile, { upsert: true });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('club-logos')
              .getPublicUrl(filePath);

            const { data: clubs } = await supabase
              .from('clubs')
              .select('id')
              .eq('owner_id', data.user_id)
              .limit(1);

            if (clubs && clubs.length > 0) {
              await supabase
                .from('clubs')
                .update({ logo_url: urlData.publicUrl })
                .eq('id', clubs[0].id);
            }
          }
          await supabase.auth.signOut();
        }
      }

      toast.success(t3(
        'Account en club aangemaakt! Je kunt nu inloggen.',
        'Compte et club créés ! Vous pouvez maintenant vous connecter.',
        'Account and club created! You can now log in.'
      ));
      navigate('/club-login');
    } catch {
      toast.error(t3('Er ging iets mis bij de registratie', 'Erreur lors de l\'inscription', 'Something went wrong during registration'));
    }
    setLoading(false);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
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
            {t3('Registreer je club', 'Enregistrez votre club', 'Register your club')}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {t3('Maak een account aan en registreer je sportclub', 'Créez un compte et enregistrez votre club sportif', 'Create an account and register your sports club')}
          </p>

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t3('Club logo', 'Logo du club', 'Club logo')}
              </label>
              {logoPreview ? (
                <div className="relative w-20 h-20">
                  <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-xl object-cover border border-border" />
                  <button type="button" onClick={removeLogo} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-input bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t3('Upload logo (max 5MB)', 'Télécharger logo (max 5 Mo)', 'Upload logo (max 5MB)')}</span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Clubnaam', 'Nom du club', 'Club name')} *</label>
              <input type="text" value={clubName} onChange={e => setClubName(e.target.value)} required maxLength={200}
                placeholder={t3('bv. FC De Kampioenen', 'ex. FC Les Champions', 'e.g. FC The Champions')} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sport</label>
                <input type="text" value={sport} onChange={e => setSport(e.target.value)} maxLength={100}
                  placeholder={t3('bv. Voetbal', 'ex. Football', 'e.g. Football')} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Locatie', 'Lieu', 'Location')}</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} maxLength={200}
                  placeholder={t3('bv. Antwerpen', 'ex. Bruxelles', 'e.g. Brussels')} className={inputClass} />
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t3('Jouw naam', 'Votre nom', 'Your name')}</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.email} *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.password} *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className={inputClass + ' pr-10'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.confirmPassword} *</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} className={inputClass} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? '...' : t3('Registreer club', 'Enregistrer le club', 'Register club')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.auth.hasAccount}{' '}
            <Link to="/club-login" className="text-secondary font-medium hover:underline">{t.auth.loginButton}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ClubSignup;
