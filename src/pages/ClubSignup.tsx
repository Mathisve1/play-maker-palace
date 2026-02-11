import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Upload, X } from 'lucide-react';
import Logo from '@/components/Logo';

const ClubSignup = () => {
  const { t } = useLanguage();
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo mag maximaal 5MB zijn');
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
      toast.error('Wachtwoorden komen niet overeen');
      return;
    }
    if (!clubName.trim()) {
      toast.error('Clubnaam is verplicht');
      return;
    }

    setLoading(true);
    try {
      // First call the edge function to create user + club
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
        toast.error(data.error || 'Er ging iets mis');
        setLoading(false);
        return;
      }

      // If logo was selected, upload it after signup
      if (logoFile && data.user_id) {
        // Sign in first to get an authenticated session for upload
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

            // Update club with logo URL
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

      toast.success('Account en club aangemaakt! Je kunt nu inloggen.');
      navigate('/club-login');
    } catch {
      toast.error('Er ging iets mis bij de registratie');
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
          <h1 className="text-2xl font-heading font-bold text-foreground text-center">Registreer je club</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Maak een account aan en registreer je sportclub
          </p>

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            {/* Logo upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Club logo</label>
              {logoPreview ? (
                <div className="relative w-20 h-20">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-20 h-20 rounded-xl object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-input bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload logo (max 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Clubnaam *</label>
              <input
                type="text"
                value={clubName}
                onChange={e => setClubName(e.target.value)}
                required
                maxLength={200}
                placeholder="bv. FC De Kampioenen"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sport</label>
                <input
                  type="text"
                  value={sport}
                  onChange={e => setSport(e.target.value)}
                  maxLength={100}
                  placeholder="bv. Voetbal"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Locatie</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  maxLength={200}
                  placeholder="bv. Antwerpen"
                  className={inputClass}
                />
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Jouw naam</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                maxLength={100}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.email} *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.password} *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass + ' pr-10'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t.auth.confirmPassword} *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '...' : 'Registreer club'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Al een account?{' '}
            <Link to="/club-login" className="text-secondary font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ClubSignup;
