import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * pos-integration — Multi-tenant POS API for club cash registers.
 *
 * Authentication (per-club):
 *   Authorization: Bearer <pos_api_key>
 *   The API key identifies WHICH club is calling — no shared secret.
 *
 * Request body:
 *   { "action": "VERIFY" | "CONSUME_CANTEEN", "card_uid": "<string>", "amount_eur"?: number }
 *
 * VERIFY response:
 *   { success: true, user_id, full_name, canteen_balance_eur, fanshop_discount_active }
 *
 * CONSUME_CANTEEN response (success):
 *   { success: true, canteen_balance_eur: <remaining> }
 *
 * CONSUME_CANTEEN response (insufficient balance):
 *   { success: false, reason: "insufficient_balance", canteen_balance_eur: 0 }
 *
 * Error responses:
 *   401 — missing/invalid API key
 *   404 — card_uid not found for this club
 *   400 — missing/invalid body
 *   500 — internal error
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sbUrl = Deno.env.get('SUPABASE_URL')!;
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  // Service role bypasses RLS — used for all reads/writes in this function
  const supabase = createClient(sbUrl, sbKey);

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // ── 1. Extract and validate API key ──────────────────────────────────────

  const authHeader = req.headers.get('Authorization') || '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!apiKey) {
    return json({ success: false, error: 'Missing Authorization header' }, 401);
  }

  // Look up which club owns this API key
  const { data: posSettings, error: posErr } = await supabase
    .from('club_pos_settings')
    .select('club_id')
    .eq('pos_api_key', apiKey)
    .single();

  if (posErr || !posSettings) {
    return json({ success: false, error: 'Invalid API key' }, 401);
  }

  const clubId = posSettings.club_id;

  // ── 2. Parse request body ─────────────────────────────────────────────────

  let action: string;
  let card_uid: string;
  let amount_eur: number;
  try {
    const body = await req.json();
    action     = (body.action || '').toUpperCase();
    card_uid   = (body.card_uid || '').trim();
    amount_eur = typeof body.amount_eur === 'number' && body.amount_eur > 0
      ? body.amount_eur
      : 0.01; // safe fallback minimum
    if (!action || !card_uid) throw new Error('missing fields');
    if (!['VERIFY', 'CONSUME_CANTEEN'].includes(action)) throw new Error('invalid action');
  } catch (e) {
    return json({ success: false, error: `Invalid body: ${String(e)}` }, 400);
  }

  // ── 3. Resolve card_uid → volunteer ──────────────────────────────────────

  const { data: cardRow, error: cardErr } = await supabase
    .from('volunteer_club_cards')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('card_uid', card_uid)
    .single();

  if (cardErr || !cardRow) {
    return json({ success: false, error: 'Card not found for this club' }, 404);
  }

  const userId = cardRow.user_id;

  // ── 4a. VERIFY — return volunteer info + reward balances ─────────────────

  if (action === 'VERIFY') {
    const [profileRes, rewardsRes] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).single(),
      supabase.from('volunteer_rewards')
        .select('canteen_balance_eur, fanshop_discount_active')
        .eq('user_id', userId)
        .eq('club_id', clubId)
        .maybeSingle(),
    ]);

    const rewards = rewardsRes.data;

    return json({
      success: true,
      user_id:                  userId,
      full_name:                profileRes.data?.full_name || 'Onbekend',
      canteen_balance_eur:      rewards?.canteen_balance_eur      ?? 0,
      fanshop_discount_active:  rewards?.fanshop_discount_active  ?? false,
    });
  }

  // ── 4b. CONSUME_CANTEEN — atomically deduct Euro amount from wallet ────────

  if (action === 'CONSUME_CANTEEN') {
    // consume_canteen_balance() is a SECURITY DEFINER RPC that does:
    //   UPDATE volunteer_rewards
    //   SET canteen_balance_eur = canteen_balance_eur - p_amount
    //   WHERE user_id = p_user_id AND club_id = p_club_id
    //     AND canteen_balance_eur >= p_amount
    //   RETURNING canteen_balance_eur
    // Returns NULL if balance was insufficient or row doesn't exist.

    const { data: newBalance, error: consumeErr } = await supabase
      .rpc('consume_canteen_balance', {
        p_user_id: userId,
        p_club_id: clubId,
        p_amount:  amount_eur,
      });

    if (consumeErr) {
      console.error('consume_canteen_balance error:', consumeErr);
      return json({ success: false, error: 'Internal error during canteen deduction' }, 500);
    }

    if (newBalance === null) {
      return json({ success: false, reason: 'insufficient_balance', canteen_balance_eur: 0 });
    }

    return json({ success: true, canteen_balance_eur: newBalance });
  }

  // Should never reach here due to action validation above
  return json({ success: false, error: 'Unknown action' }, 400);
});
