import { supabase } from '@/integrations/supabase/client';

// OneSignal App ID - to be configured
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'e0d35921-dd83-4e98-a289-f9d1bb1694cc';

export async function initOneSignal() {
  if (!ONESIGNAL_APP_ID) {
    console.warn('OneSignal App ID not configured');
    return;
  }

  // Dynamically load OneSignal SDK
  const OneSignalModule = await import('react-onesignal').then(m => m.default).catch(() => null);
  if (!OneSignalModule) {
    console.warn('OneSignal SDK not available');
    return;
  }

  try {
    await OneSignalModule.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
    });

    console.log('OneSignal initialized');

    // Listen for subscription changes and link player ID
    OneSignalModule.User.PushSubscription.addEventListener('change', async (event) => {
      const playerId = event.current?.id;
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

export async function promptPushPermission() {
  if (!ONESIGNAL_APP_ID) return;

  try {
    const OneSignalModule = await import('react-onesignal').then(m => m.default).catch(() => null);
    if (OneSignalModule) {
      await OneSignalModule.Notifications.requestPermission();
    }
  } catch (error) {
    console.error('Push permission error:', error);
  }
}
