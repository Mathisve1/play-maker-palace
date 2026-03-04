import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'e0d35921-dd83-4e98-a289-f9d1bb1694cc';

let oneSignalInitPromise: Promise<void> | null = null;
let oneSignalInitialized = false;

export async function initOneSignal() {
  if (!ONESIGNAL_APP_ID) {
    console.warn('OneSignal App ID not configured');
    return;
  }

  if (oneSignalInitialized) return;
  if (oneSignalInitPromise) return oneSignalInitPromise;

  oneSignalInitPromise = (async () => {
    const OneSignalModule = await import('react-onesignal').then(m => m.default).catch(() => null);
    if (!OneSignalModule) {
      console.warn('OneSignal SDK not available');
      return;
    }

    try {
      await OneSignalModule.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: 'web.onesignal.auto.00b75e31-4d41-4106-ab79-a5c68121f393',
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: '/push/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/push/' },
        notifyButton: { enable: true },
        promptOptions: {
          autoPrompt: false, // We handle prompting ourselves after login
        },
      });

      oneSignalInitialized = true;
      console.log('OneSignal initialized');

      // Tie browser subscription to logged-in app user for reliable targeting
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await OneSignalModule.login(user.id).catch(() => null);
      }

      // Listen for subscription changes and link player ID
      OneSignalModule.User.PushSubscription.addEventListener('change', async (event) => {
        const playerId = event.current?.id || OneSignalModule.User.PushSubscription.id;
        if (playerId) {
          await linkPlayerIdToProfile(playerId);
        }
      });

      // Check if already subscribed
      const currentId = OneSignalModule.User.PushSubscription.id;
      if (currentId) {
        await linkPlayerIdToProfile(currentId);
      }
    } catch (error) {
      console.error('OneSignal init error:', error);
    }
  })();

  return oneSignalInitPromise;
}

async function linkPlayerIdToProfile(playerId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ onesignal_player_id: playerId } as any)
      .eq('id', user.id);

    console.log('OneSignal Player ID linked:', playerId);
  } catch (error) {
    console.error('Failed to link OneSignal Player ID:', error);
  }
}

/**
 * Automatically request push permission if not yet decided.
 * Call this after user logs in to prompt them once.
 * If they deny, we respect that and don't ask again.
 */
export async function autoPromptPushPermission() {
  if (!ONESIGNAL_APP_ID) return;

  try {
    await initOneSignal();

    const OneSignalModule = await import('react-onesignal').then(m => m.default).catch(() => null);
    if (!OneSignalModule) return;

    // Check current permission state
    const permission = OneSignalModule.Notifications.permission;

    // Only prompt if permission hasn't been decided yet (not granted AND not denied)
    if (!permission) {
      // Small delay so the dashboard loads first, then prompt
      setTimeout(async () => {
        try {
          await OneSignalModule.Notifications.requestPermission();
        } catch (e) {
          console.log('Push permission prompt dismissed or denied');
        }
      }, 2000);
    }
  } catch (error) {
    console.error('Auto push permission error:', error);
  }
}

export async function promptPushPermission() {
  if (!ONESIGNAL_APP_ID) return;

  try {
    await initOneSignal();

    const OneSignalModule = await import('react-onesignal').then(m => m.default).catch(() => null);
    if (OneSignalModule) {
      await OneSignalModule.Notifications.requestPermission();

      const currentId = OneSignalModule.User.PushSubscription.id;
      if (currentId) {
        await linkPlayerIdToProfile(currentId);
      }
    }
  } catch (error) {
    console.error('Push permission error:', error);
  }
}
