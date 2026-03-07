import { supabase } from '@/integrations/supabase/client';

// Public VAPID key — safe to embed client-side
const VAPID_PUBLIC_KEY = 'BL7NNC2ohlSSuBoIooTwOou_M4jm8gX8UHQVF4yHNaKFSc2JB_pxrUL5Z--uGeFinz4wYFKssfPKmkQqAXzi54w';

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
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { enabled: false, reason: 'unsupported' };
  }

  // Request permission IMMEDIATELY — before any async network call.
  // iOS Safari requires this to happen synchronously within the user gesture.
  const permission = await Notification.requestPermission();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { enabled: false, reason: 'not_authenticated' };
  if (permission !== 'granted') {
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false } as any)
      .eq('id', user.id);
    return { enabled: false, reason: 'denied' };
  }

  try {
    // Register push service worker and force update
    const registration = await navigator.serviceWorker.register('/push-sw.js');
    await registration.update();
    await navigator.serviceWorker.ready;

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    // Always unsubscribe first to clear any stale/mismatched VAPID subscriptions
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      console.log('[Push] Removing existing subscription before re-subscribing');
      try { await existingSub.unsubscribe(); } catch (e) { console.warn('[Push] Unsubscribe old failed:', e); }
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array(applicationServerKey) as BufferSource,
    });

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

/**
 * Auto-resubscribe: if the user has push_notifications_enabled=true
 * but no active subscription in push_subscriptions, silently re-register.
 * This handles cases where subscriptions were cleared (e.g. VAPID key rotation).
 */
export async function autoResubscribeIfNeeded(): Promise<void> {
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Auto-resub: not supported');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.log('[Push] Auto-resub: no user');
      return;
    }
    const user = session.user;

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_notifications_enabled')
      .eq('id', user.id)
      .single();

    if (!profile?.push_notifications_enabled) {
      console.log('[Push] Auto-resub: push not enabled in profile');
      return;
    }

    // Check if there's already a subscription in the DB
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (subs && subs.length > 0) {
      console.log('[Push] Auto-resub: already has subscription');
      return;
    }

    console.log('[Push] Auto-resubscribing — profile has push enabled but no subscription found');

    // Force update the service worker
    const registration = await navigator.serviceWorker.register('/push-sw.js');
    await registration.update();
    await navigator.serviceWorker.ready;

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    // Unsubscribe any existing browser subscription (may have old VAPID key)
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log('[Push] Unsubscribing old browser subscription');
      try { await subscription.unsubscribe(); } catch (e) { console.warn('[Push] Unsubscribe failed:', e); }
    }

    // If permission isn't granted, request it
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        console.log('[Push] Auto-resub: permission denied');
        await supabase.from('profiles').update({ push_notifications_enabled: false } as any).eq('id', user.id);
        return;
      }
    }

    // Subscribe with new VAPID key
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array(applicationServerKey) as BufferSource,
    });

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint || '';
    const p256dh = subJson.keys?.p256dh || '';
    const auth = subJson.keys?.auth || '';

    if (!endpoint || !p256dh || !auth) {
      console.error('[Push] Auto-resub: invalid subscription payload');
      return;
    }

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
      console.error('[Push] Auto-resub DB error:', error);
    } else {
      console.log('[Push] ✅ Auto-resubscribed successfully');
    }
  } catch (err) {
    console.error('[Push] Auto-resubscribe error:', err);
  }
}
