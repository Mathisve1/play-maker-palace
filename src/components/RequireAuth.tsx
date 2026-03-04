import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import PushPermissionBanner from './PushPermissionBanner';
import { syncOneSignalUser } from '@/lib/onesignal';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Central auth guard component.
 * Wraps any page that requires authentication.
 * Redirects to login if no active session.
 * Listens to auth state changes and redirects on sign-out.
 */
const RequireAuth = ({ children, redirectTo = '/login' }: RequireAuthProps) => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);

  const ensureProfileExists = async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, any> }) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (profile) return;

    await supabase.from('profiles').insert({
      id: sessionUser.id,
      email: sessionUser.email || null,
      full_name: (sessionUser.user_metadata?.full_name as string) || null,
    } as any);
  };

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session) {
          navigate(redirectTo, { replace: true });
          return;
        }

        await ensureProfileExists(session.user);
        if (cancelled) return;

        setAuthenticated(true);
        void syncOneSignalUser(session.user.id).catch((error) => {
          console.error('OneSignal sync failed:', error);
        });
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session && !cancelled) {
        navigate(redirectTo, { replace: true });
        return;
      }

      if (session && !cancelled) {
        await ensureProfileExists(session.user);
        setAuthenticated(true);
        setChecked(true);
        void syncOneSignalUser(session.user.id).catch((error) => {
          console.error('OneSignal sync failed:', error);
        });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, redirectTo]);

  if (!checked || !authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PushPermissionBanner />
      {children}
    </>
  );
};

export default RequireAuth;
