import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Handshake } from 'lucide-react';
import Logo from '@/components/Logo';

const PartnerLogin = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    // Verify user is a partner admin
    const { data: partnerAdmins } = await supabase
      .from('partner_admins')
      .select('id')
      .eq('user_id', data.user.id);

    if (!partnerAdmins || partnerAdmins.length === 0) {
      toast.error('Dit account is geen partner-beheerder. Gebruik de vrijwilligers of club login.');
      await supabase.auth.signOut();
      return;
    }

    toast.success('Ingelogd als partner!');
    navigate('/partner-dashboard');
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <Handshake className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-heading font-bold text-foreground">Partner Login</h1>
          </div>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Log in op je partner dashboard
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '...' : t.auth.loginButton}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Club eigenaar?{' '}
            <Link to="/club-login" className="text-secondary font-medium hover:underline">Club login</Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Vrijwilliger?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Log hier in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PartnerLogin;
