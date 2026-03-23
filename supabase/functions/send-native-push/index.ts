// Native Web Push v3 - parallel batching for 1500+ users
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importJWK } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Base64url helpers ─────────────────────────────────────────────

function b64url(arr: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - b.length % 4) % 4);
  const bin = atob(b + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
  return result;
}

// ── VAPID auth header using jose ──────────────────────────────────

async function createVapidAuth(
  audience: string,
  subject: string,
  vapidPubB64: string,
  privateJwk: any,
): Promise<string> {
  const key = await importJWK(privateJwk, 'ES256');

  const jwt = await new SignJWT({})
    .setProtectedHeader({ typ: 'JWT', alg: 'ES256' })
    .setAudience(audience)
    .setSubject(subject)
    .setExpirationTime('12h')
    .sign(key);

  return `vapid t=${jwt}, k=${vapidPubB64}`;
}

// ── RFC 8291 aes128gcm encryption ─────────────────────────────────

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8
  ));
}

async function encryptPayload(p256dhB64: string, authB64: string, payload: Uint8Array): Promise<Uint8Array> {
  const uaPub = b64urlDecode(p256dhB64);
  const authSecret = b64urlDecode(authB64);
  const enc = new TextEncoder();

  const localKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKP.publicKey));

  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaKey }, localKP.privateKey, 256
  ));

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfoInput = concatBytes(enc.encode('WebPush: info\0'), uaPub, localPubRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfoInput, 32);

  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  const padded = concatBytes(payload, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aesKey, padded
  ));

  const header = new Uint8Array(16 + 4 + 1 + localPubRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = localPubRaw.length;
  header.set(localPubRaw, 21);

  return concatBytes(header, ciphertext);
}

// ── Send push ─────────────────────────────────────────────────────

async function sendPush(
  endpoint: string, p256dh: string, auth: string,
  payloadObj: Record<string, unknown>,
  vapidPub: string, privateJwk: any, vapidSubject: string,
  retries = 2,
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const authorization = await createVapidAuth(audience, vapidSubject, vapidPub, privateJwk);
      const body = await encryptPayload(p256dh, auth, new TextEncoder().encode(JSON.stringify(payloadObj)));

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': authorization,
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          'TTL': '86400',
        },
        body,
      });

      const text = await res.text();
      const status = res.status;

      // Don't retry on permanent failures (gone, not found, forbidden)
      if (status === 410 || status === 404 || status === 403 || (status >= 200 && status < 300)) {
        return { ok: status >= 200 && status < 300, status, body: text };
      }

      // Retry on 429 (rate limit) or 5xx
      if (attempt < retries && (status === 429 || status >= 500)) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // backoff
        continue;
      }

      return { ok: false, status, body: text };
    } catch (e: any) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { ok: false, status: 0, body: e.message };
    }
  }

  return { ok: false, status: 0, body: 'Max retries exceeded' };
}

// ── Parallel batch helper (sends N pushes concurrently) ───────────

const BATCH_CONCURRENCY = 50; // 50 parallel pushes at a time

interface SubRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

async function sendPushBatch(
  subs: SubRecord[],
  payloadObj: Record<string, unknown>,
  vapidPub: string, privateJwk: any, vapidSubject: string,
  supabase: any,
): Promise<{ sent: number; failed: number; staleEndpoints: string[] }> {
  let sent = 0, failed = 0;
  const staleEndpoints: string[] = [];

  // Process in parallel batches of BATCH_CONCURRENCY
  for (let i = 0; i < subs.length; i += BATCH_CONCURRENCY) {
    const batch = subs.slice(i, i + BATCH_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const r = await sendPush(
          sub.endpoint, sub.p256dh, sub.auth,
          payloadObj, vapidPub, privateJwk, vapidSubject
        );
        if (r.ok) {
          sent++;
        } else {
          failed++;
          if (r.status === 410 || r.status === 404) {
            staleEndpoints.push(sub.endpoint);
          }
        }
      })
    );
    // Count promise rejections as failures
    results.forEach(r => {
      if (r.status === 'rejected') failed++;
    });
  }

  // Bulk delete stale subscriptions
  if (staleEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints);
  }

  return { sent, failed, staleEndpoints };
}

// ── Templates ─────────────────────────────────────────────────────

const TPL: Record<string, Record<string, { title: string; message: string }>> = {
  task_reminder: {
    nl: { title: '📋 Taakherinnering', message: 'Je hebt een taak die binnenkort begint.' },
    fr: { title: '📋 Rappel de tâche', message: 'Vous avez une tâche qui commence bientôt.' },
    en: { title: '📋 Task Reminder', message: 'You have a task starting soon.' },
  },
  contract_update: {
    nl: { title: '📝 Contractupdate', message: 'Er is een update voor je contract.' },
    fr: { title: '📝 Mise à jour du contrat', message: 'Il y a une mise à jour de votre contrat.' },
    en: { title: '📝 Contract Update', message: 'There is an update to your contract.' },
  },
  club_invitation: {
    nl: { title: '🎉 Clubuitnodiging', message: 'Je bent uitgenodigd voor een club!' },
    fr: { title: '🎉 Invitation au club', message: 'Vous êtes invité(e) à rejoindre un club !' },
    en: { title: '🎉 Club Invitation', message: 'You have been invited to join a club!' },
  },
};

// ── Paginated fetch helper (bypasses 1000-row Supabase limit) ─────

async function fetchAllRows<T>(
  supabase: any,
  table: string,
  select: string,
  filters?: { column: string; value: any }[],
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const allRows: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(select).range(offset, offset + PAGE_SIZE - 1);
    if (filters) {
      for (const f of filters) query = query.eq(f.column, f.value);
    }
    const { data, error } = await query;
    if (error) throw error;
    allRows.push(...(data || []));
    hasMore = (data?.length || 0) === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return allRows;
}

// ── Main handler ──────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, user_id, title, message, url, data, broadcast, club_id, icon } = body;

    // TEMPORARILY hardcoded until secret rotation propagates
    const vapidPub = 'BL7NNC2ohlSSuBoIooTwOou_M4jm8gX8UHQVF4yHNaKFSc2JB_pxrUL5Z--uGeFinz4wYFKssfPKmkQqAXzi54w';
    const vapidPrivJwkStr = '{"kty":"EC","crv":"P-256","x":"vs00LaiGVJK4GgiihPA6i78ziObyBfxQdBUXjIc1ooU","y":"Sc2JB_pxrUL5Z--uGeFinz4wYFKssfPKmkQqAXzi54w","d":"eDYmMo0ayiIjUCzYxsHnQG5wgqImxsXsVfuNdlrA2dA"}';

    // Debug mode
    if (body.debug_keys === true) {
      return new Response(JSON.stringify({
        vapid_pub: vapidPub,
        vapid_priv_is_json: true,
        source: 'hardcoded',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!vapidPub || !vapidPrivJwkStr) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const privateJwk = JSON.parse(vapidPrivJwkStr);
    const vapidSubject = 'mailto:info@de12eman.be';
    const sbUrl = Deno.env.get('SUPABASE_URL')!;
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(sbUrl, sbKey);

    // ── Resolve club icon ──
    let resolvedIcon: string | undefined = icon;
    if (!resolvedIcon && club_id) {
      const { data: clubRow } = await supabase.from('clubs').select('logo_url').eq('id', club_id).single();
      if (clubRow?.logo_url) resolvedIcon = clubRow.logo_url;
    }

    // ── BROADCAST ──
    if (broadcast) {
      const t = title || '📢 De 12e Man';
      const m = message || 'Je hebt een nieuwe melding.';

      // Paginated fetch to support 1500+ subscriptions
      const [subs, profiles] = await Promise.all([
        fetchAllRows<SubRecord>(supabase, 'push_subscriptions', 'endpoint, p256dh, auth, user_id'),
        fetchAllRows<any>(supabase, 'profiles', 'id, push_notifications_enabled, in_app_notifications_enabled'),
      ]);

      const pushDisabled = new Set(
        profiles.filter((p: any) => p.push_notifications_enabled === false).map((p: any) => p.id)
      );

      const eligibleSubs = subs.filter(sub => !pushDisabled.has(sub.user_id));

      const payloadObj = { title: t, body: m, url: url || '/dashboard', ...(resolvedIcon ? { icon: resolvedIcon } : {}) };

      // Send in parallel batches of 50
      const { sent, failed } = await sendPushBatch(
        eligibleSubs, payloadObj, vapidPub, privateJwk, vapidSubject, supabase
      );

      // Bulk in-app notifications
      const inAppUsers = profiles.filter((p: any) => p.in_app_notifications_enabled !== false);
      if (inAppUsers.length > 0) {
        // Insert in batches of 500 to avoid payload size limits
        for (let i = 0; i < inAppUsers.length; i += 500) {
          const batch = inAppUsers.slice(i, i + 500);
          await supabase.from('notifications').insert(
            batch.map((p: any) => ({ user_id: p.id, type: type || 'broadcast', title: t, message: m }))
          );
        }
      }

      return new Response(JSON.stringify({
        success: true, mode: 'broadcast', sent, failed,
        in_app: inAppUsers.length,
        total_subscriptions: subs.length,
        eligible_subscriptions: eligibleSubs.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── SINGLE USER ──
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id or broadcast=true required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase.from('profiles')
      .select('full_name, language, push_notifications_enabled, in_app_notifications_enabled')
      .eq('id', user_id).single();

    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const lang = profile.language || 'nl';
    let t = title, m = message;
    if (!t && type && TPL[type]) { const tpl = TPL[type][lang] || TPL[type]['nl']; t = tpl.title; m = tpl.message; }
    t = t || '📢 De 12e Man';
    m = m || 'Je hebt een nieuwe melding.';

    let pushResult: any = { skipped: true };

    if (profile.push_notifications_enabled !== false) {
      const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', user_id);
      if (subs && subs.length > 0) {
        let ok = false;
        const details: any[] = [];
        for (const sub of subs) {
          try {
            const r = await sendPush(sub.endpoint, sub.p256dh, sub.auth, { title: t, body: m, url: url || '/dashboard', ...(resolvedIcon ? { icon: resolvedIcon } : {}) }, vapidPub, privateJwk, vapidSubject);
            details.push({ status: r.status, body: r.body?.slice(0, 200) });
            if (r.ok) ok = true;
            else if (r.status === 410 || r.status === 404) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          } catch (e: any) {
            details.push({ error: e.message });
          }
        }
        pushResult = { sent: ok, subscriptions: subs.length, details };
      }
    }

    let inApp = false;
    if (profile.in_app_notifications_enabled !== false) {
      await supabase.from('notifications').insert({ user_id, type: type || 'general', title: t, message: m });
      inApp = true;
    }

    return new Response(JSON.stringify({ success: true, push: pushResult, in_app_sent: inApp }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Push error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
