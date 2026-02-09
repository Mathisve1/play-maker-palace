import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { emailRedirectTo: window.location.origin }
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Check your email to confirm your account!');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-hero-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">12</span>
          </div>
          <span className="font-heading font-bold text-lg text-foreground">De12eMan</span>
        </Link>

        <div className="bg-card rounded-2xl shadow-elevated p-8">
          <h1 className="text-2xl font-heading font-bold text-foreground text-center">{t.auth.signupTitle}</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">{t.auth.signupSubtitle}</p>

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
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
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '...' : t.auth.signupButton}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.auth.hasAccount}{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">{t.auth.loginButton}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
