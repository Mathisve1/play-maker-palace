import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * accept-shift-swap — called when a replacement volunteer clicks "Ik neem over!".
 *
 * Steps:
 *   1. Verify the swap is still in 'searching' status
 *   2. Insert a task_signup for the replacement volunteer
 *   3. Delete (or cancel) the original volunteer's task_signup
 *   4. Update shift_swaps → status='resolved', replacement_user_id, resolved_at
 *   5. Send a personalized push + in-app notification to the ORIGINAL volunteer
 *      e.g. "Gerda heeft je plek overgenomen. Beterschap Johan! 🙏"
 *
 * Input: { shift_swap_id: string, replacement_user_id: string }
 *
 * This function runs with service_role to bypass RLS for the resolution steps.
 * The caller (frontend) must pass a valid auth token; we verify the caller IS
 * the replacement_user_id before proceeding.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sbUrl = Deno.env.get('SUPABASE_URL')!;
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(sbUrl, sbKey);

  // Extract caller identity from the JWT
  const authHeader = req.headers.get('Authorization') || '';
  const callerClient = createClient(sbUrl, Deno.env.get('SUPABASE_ANON_KEY') || sbKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();

  let shift_swap_id: string;
  let replacement_user_id: string;
  try {
    const body = await req.json();
    shift_swap_id       = body.shift_swap_id;
    replacement_user_id = body.replacement_user_id;
    if (!shift_swap_id || !replacement_user_id) throw new Error('shift_swap_id and replacement_user_id required');
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate caller is the declared replacement
  if (!caller || caller.id !== replacement_user_id) {
    return new Response(JSON.stringify({ error: 'Unauthorized — caller must be the replacement volunteer' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── 1. Load swap + task ───────────────────────────────────────────────────
    const { data: swap, error: swapErr } = await supabase
      .from('shift_swaps')
      .select(`
        id, task_id, original_user_id, status,
        tasks (
          id, title, task_date, start_time, end_time, location, club_id,
          clubs ( name )
        ),
        profiles!shift_swaps_original_user_id_fkey ( full_name )
      `)
      .eq('id', shift_swap_id)
      .single();

    if (swapErr || !swap) {
      return new Response(JSON.stringify({ error: 'Swap not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (swap.status !== 'searching') {
      return new Response(JSON.stringify({ error: 'This swap is no longer available', status: swap.status }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (swap.original_user_id === replacement_user_id) {
      return new Response(JSON.stringify({ error: 'Cannot take over your own shift' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const task      = swap.tasks as any;
    const taskTitle = task.title;
    const clubName  = task.clubs?.name || '';

    // ── 2. Get replacement volunteer's name ───────────────────────────────────
    const { data: replacementProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', replacement_user_id)
      .single();

    const replacementName = replacementProfile?.full_name || 'Een collega';
    const originalName    = (swap.profiles as any)?.full_name || 'jou';

    // ── 3. Insert task_signup for replacement ─────────────────────────────────
    const { error: insertErr } = await supabase
      .from('task_signups')
      .insert({
        volunteer_id: replacement_user_id,
        task_id:      swap.task_id,
        status:       'assigned',
      });

    // Ignore duplicate — replacement may have been inserted by a race
    if (insertErr && !insertErr.message.includes('duplicate')) {
      throw new Error(`Failed to assign replacement: ${insertErr.message}`);
    }

    // ── 4. Remove original volunteer's signup ─────────────────────────────────
    await supabase
      .from('task_signups')
      .delete()
      .eq('volunteer_id', swap.original_user_id)
      .eq('task_id', swap.task_id);

    // ── 5. Resolve the swap record ────────────────────────────────────────────
    await supabase
      .from('shift_swaps')
      .update({
        status:              'resolved',
        replacement_user_id,
        resolved_at:         new Date().toISOString(),
      })
      .eq('id', shift_swap_id);

    // ── 6. Notify original volunteer — personalized & warm ────────────────────
    const pushTitle   = `✅ ${replacementName} neemt je plek over!`;
    const pushMessage = `${replacementName} heeft je slot voor "${taskTitle}" overgenomen. Beterschap ${originalName.split(' ')[0]}! 🙏`;

    const functionUrl = `${sbUrl}/functions/v1/send-native-push`;
    await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`,
      },
      body: JSON.stringify({
        type: 'shift_swap_resolved',
        user_id: swap.original_user_id,
        title: pushTitle,
        message: pushMessage,
        url: '/dashboard',
        data: { shift_swap_id, task_id: swap.task_id },
      }),
    });

    await supabase.from('notifications').insert({
      user_id: swap.original_user_id,
      type:    'shift_swap_resolved',
      title:   pushTitle,
      message: pushMessage,
      data:    { shift_swap_id, task_id: swap.task_id },
      read:    false,
    });

    return new Response(JSON.stringify({
      success: true,
      replacement_name: replacementName,
      original_name: originalName,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('accept-shift-swap error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
