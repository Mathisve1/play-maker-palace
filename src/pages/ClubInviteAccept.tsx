import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';

const ClubInviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'accepting' | 'success' | 'error' | 'login'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const accept = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('login');
        return;
      }

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
            body: JSON.stringify({ token, user_id: session.user.id }),
          }
        );
        const data = await resp.json();
        if (resp.ok && data.success) {
          setStatus('success');
          toast.success('Je bent toegevoegd aan de club!');
          setTimeout(() => navigate('/club-dashboard'), 2000);
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Er ging iets mis');
        }
      } catch {
        setStatus('error');
        setErrorMsg('Er ging iets mis bij het accepteren');
      }
    };

    if (token) accept();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <Logo size="md" linkTo="/" />
        </div>
        <div className="bg-card rounded-2xl shadow-elevated p-8">
          {status === 'loading' || status === 'accepting' ? (
            <>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Uitnodiging verwerken...</p>
            </>
          ) : status === 'login' ? (
            <>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">Log eerst in</h2>
              <p className="text-muted-foreground mb-4">Je moet ingelogd zijn om de uitnodiging te accepteren.</p>
              <button
                onClick={() => navigate(`/club-login?redirect=/club-invite/${token}`)}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Inloggen
              </button>
            </>
          ) : status === 'success' ? (
            <>
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">Welkom bij de club!</h2>
              <p className="text-muted-foreground">Je wordt doorgestuurd naar het dashboard...</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">Uitnodiging mislukt</h2>
              <p className="text-muted-foreground mb-4">{errorMsg}</p>
              <button
                onClick={() => navigate('/club-dashboard')}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Naar dashboard
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ClubInviteAccept;
