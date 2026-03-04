import { supabase } from '@/integrations/supabase/client';

// Public VAPID key — safe to embed client-side
const VAPID_PUBLIC_KEY = 'BCSABD6Xi9m9nc4sQFxlxbmJXNS1v3RIwWnOdwOgFdU_OMqFjLApLZ2JaGzRI5MnSaPWnNtpSUh-qiiCi26vNOI';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the push service worker and subscribe the browser to Web Push.
 * Stores the subscription in the push_subscriptions table.
 */
export async function subscribeToPush(): Promise<{ enabled: boolean; reason: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { enabled: false, reason: 'not_authenticated' };

  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { enabled: false, reason: 'unsupported' };
  }

  // Request permission via user gesture
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'denied' };
  }

  try {
    // Register push service worker
    const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/push/' });
    await navigator.serviceWorker.ready;

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    // Reuse existing subscription when possible; if key changed, resubscribe.
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint || '';
    const p256dh = subJson.keys?.p256dh || '';
    const auth = subJson.keys?.auth || '';

    if (!endpoint || !p256dh || !auth) {
      throw new Error('invalid_subscription_payload');
    }

    // Upsert subscription in database
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      throw error;
    }

    // Update profile only after successful subscription persist
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: true, push_prompt_seen: true } as any)
      .eq('id', user.id);

    console.log('[Push] ✅ Subscribed successfully');
    return { enabled: true, reason: 'enabled' };
  } catch (err) {
    console.error('[Push] Subscribe error:', err);
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'error' };
  }
}

/**
 * Unsubscribe from push and remove subscription from database.
 */
export async function unsubscribeFromPush(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        // Remove from DB
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint);
      }
    }
  } catch (e) {
    console.error('[Push] Unsubscribe error:', e);
  }

  await supabase
    .from('profiles')
    .update({ push_notifications_enabled: false } as any)
    .eq('id', user.id);
}

/**
 * Toggle push preference. Used by profile settings and banner.
 */
export async function setPushPreference(enabled: boolean): Promise<{ enabled: boolean; reason: string }> {
  if (!enabled) {
    await unsubscribeFromPush();
    return { enabled: false, reason: 'disabled' };
  }
  return subscribeToPush();
}

/**
 * Mark the push prompt as seen so the banner doesn't show again.
 */
export async function markPushPromptSeen(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;
  await supabase
    .from('profiles')
    .update({ push_prompt_seen: true } as any)
    .eq('id', user.id);
}
