import { supabase } from '@/integrations/supabase/client';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'e0d35921-dd83-4e98-a289-f9d1bb1694cc';

let oneSignalInitPromise: Promise<void> | null = null;
let oneSignalInitialized = false;

async function getOneSignalModule() {
  return import('react-onesignal').then(m => m.default).catch(() => null);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getSubscriptionIdWithRetry(OneSignalModule: any, retries = 10, delayMs = 300): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    const id = OneSignalModule?.User?.PushSubscription?.id;
    if (id) return id;
    await wait(delayMs);
  }
  return null;
}

export async function initOneSignal() {
  if (!ONESIGNAL_APP_ID) {
    console.warn('OneSignal App ID not configured');
    return;
  }

  if (oneSignalInitialized) return;
  if (oneSignalInitPromise) return oneSignalInitPromise;

  oneSignalInitPromise = (async () => {
    const OneSignalModule = await getOneSignalModule();
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
        serviceWorkerUpdaterPath: '/push/OneSignalSDKUpdaterWorker.js',
        serviceWorkerParam: { scope: '/push/' },
        notifyButton: { enable: true },
        promptOptions: {
          autoPrompt: false,
        },
      });

      oneSignalInitialized = true;
      console.log('OneSignal initialized');

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await OneSignalModule.login(user.id).catch(() => null);
      }

      OneSignalModule.User.PushSubscription.addEventListener('change', async (event: any) => {
        const playerId = event?.current?.id || event?.current?.subscriptionId || OneSignalModule.User.PushSubscription.id;
        if (playerId) {
          await linkPlayerIdToProfile(playerId);
        }
      });

      const currentId = await getSubscriptionIdWithRetry(OneSignalModule);
      if (currentId) {
        await linkPlayerIdToProfile(currentId);
      }
    } catch (error) {
      console.error('OneSignal init error:', error);
    }
  })();

  return oneSignalInitPromise;
}

export async function syncOneSignalUser(userIdOverride?: string) {
  if (!ONESIGNAL_APP_ID) return;
  await initOneSignal();

  const OneSignalModule = await getOneSignalModule();
  if (!OneSignalModule) return;

  const userId = userIdOverride || (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return;

  await OneSignalModule.login(userId).catch(() => null);
  const currentId = await getSubscriptionIdWithRetry(OneSignalModule);
  if (currentId) {
    await linkPlayerIdToProfile(currentId);
  }
}

async function linkPlayerIdToProfile(playerId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ onesignal_player_id: playerId, push_notifications_enabled: true } as any)
      .eq('id', user.id);

    console.log('OneSignal Player ID linked:', playerId);
  } catch (error) {
    console.error('Failed to link OneSignal Player ID:', error);
  }
}

export async function markPushPromptSeen() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;

  await supabase
    .from('profiles')
    .update({ push_prompt_seen: true } as any)
    .eq('id', user.id);
}

export async function setPushPreference(enabled: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { enabled: false, reason: 'not_authenticated' as const };

  await initOneSignal();
  const OneSignalModule = await getOneSignalModule();
  if (!OneSignalModule) return { enabled: false, reason: 'sdk_unavailable' as const };

  if (!enabled) {
    await OneSignalModule.User.PushSubscription.optOut().catch(() => null);
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false, push_prompt_seen: true } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'disabled' as const };
  }

  if (typeof Notification === 'undefined') {
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false, push_prompt_seen: true } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'unsupported' as const };
  }

  if (Notification.permission !== 'granted') {
    await OneSignalModule.Notifications.requestPermission().catch(() => false);
  }

  if (Notification.permission !== 'granted') {
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false, push_prompt_seen: true } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'denied' as const };
  }

  await OneSignalModule.User.PushSubscription.optIn().catch(() => null);
  await syncOneSignalUser(user.id);

  await supabase
    .from('profiles')
    .update({ push_notifications_enabled: true, push_prompt_seen: true } as any)
    .eq('id', user.id);

  return { enabled: true, reason: 'enabled' as const };
}

export async function autoPromptPushPermission() {
  await setPushPreference(true);
}

export async function promptPushPermission() {
  await setPushPreference(true);
}
