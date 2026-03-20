import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * process-shift-swap — triggered by the frontend immediately after a volunteer
 * creates a shift_swap record.
 *
 * Notification priority:
 *   1. Buddies of the original volunteer (warm relationship)
 *   2. Users on the reserve_list for the task's date/event AND the same club
 *   3. Other active club members who have completed at least one task for this club
 *
 * Each candidate receives:
 *   - A push notification (via send-native-push)
 *   - An in-app notification record
 *
 * Input: { shift_swap_id: string }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sbUrl  = Deno.env.get('SUPABASE_URL')!;
  const sbKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(sbUrl, sbKey);

  let shift_swap_id: string;
  try {
    const body = await req.json();
    shift_swap_id = body.shift_swap_id;
    if (!shift_swap_id) throw new Error('shift_swap_id required');
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── 1. Load the swap + task details ─────────────────────────────────────
    const { data: swap, error: swapErr } = await supabase
      .from('shift_swaps')
      .select(`
        id,
        task_id,
        original_user_id,
        reason,
        tasks (
          id, title, task_date, start_time, location, club_id, event_id,
          clubs ( name )
        ),
        profiles!shift_swaps_original_user_id_fkey ( full_name )
      `)
      .eq('id', shift_swap_id)
      .eq('status', 'searching')
      .single();

    if (swapErr || !swap) {
      return new Response(JSON.stringify({ error: 'Swap not found or not in searching state' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const task     = swap.tasks as any;
    const clubId   = task.club_id;
    const eventId  = task.event_id;
    const taskDate = task.task_date;
    const originalName = (swap.profiles as any)?.full_name || 'Een collega';
    const taskTitle    = task.title;
    const clubName     = task.clubs?.name || '';

    // Deep link for the replacement volunteer
    const swapUrl = `/shift-swap/${shift_swap_id}`;

    // Notification texts (NL primary — most Belgian volunteers are NL)
    const pushTitle   = `🔄 Vervanging gevraagd — ${taskTitle}`;
    const pushMessage = `${originalName} zoekt dringend een vervanger voor "${taskTitle}" bij ${clubName}. Jij kunt helpen!`;

    // ── 2. Build candidate pools (deduplicated, excludes original user) ──────
    const excluded = new Set<string>([swap.original_user_id]);
    const candidateOrder: string[] = [];  // ordered: buddy > reserve > team

    // Pool 1: Buddies
    const { data: buddyRows } = await supabase
      .from('volunteer_buddies')
      .select('requester_id, receiver_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${swap.original_user_id},receiver_id.eq.${swap.original_user_id}`);

    const buddyIds = (buddyRows || []).map(b =>
      b.requester_id === swap.original_user_id ? b.receiver_id : b.requester_id
    );
    for (const uid of buddyIds) {
      if (!excluded.has(uid)) { candidateOrder.push(uid); excluded.add(uid); }
    }

    // Pool 2: Reserve list — for this club on this event/date
    const reserveQuery = supabase
      .from('reserve_lists')
      .select('user_id')
      .eq('club_id', clubId);

    // Match on event OR date (whichever is set)
    if (eventId) {
      reserveQuery.or(`event_id.eq.${eventId},event_id.is.null`);
    }
    if (taskDate) {
      reserveQuery.or(`event_date.eq.${taskDate},event_date.is.null`);
    }

    const { data: reserveRows } = await reserveQuery;
    for (const r of (reserveRows || [])) {
      if (!excluded.has(r.user_id)) { candidateOrder.push(r.user_id); excluded.add(r.user_id); }
    }

    // Pool 3: Active club members who completed ≥1 task for this club
    const { data: memberRows } = await supabase
      .from('club_memberships')
      .select('volunteer_id')
      .eq('club_id', clubId)
      .eq('status', 'actief');

    const memberIds = (memberRows || []).map(m => m.volunteer_id).filter(id => !excluded.has(id));

    if (memberIds.length > 0) {
      const { data: completedRows } = await supabase
        .from('task_signups')
        .select('volunteer_id')
        .eq('status', 'completed')
        .in('volunteer_id', memberIds);

      const completedSet = new Set((completedRows || []).map(r => r.volunteer_id));
      for (const uid of memberIds) {
        if (completedSet.has(uid) && !excluded.has(uid)) {
          candidateOrder.push(uid);
          excluded.add(uid);
        }
      }
    }

    if (candidateOrder.length === 0) {
      // Mark notified even with 0 candidates so the frontend knows we ran
      await supabase
        .from('shift_swaps')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', shift_swap_id);

      return new Response(JSON.stringify({ notified: 0, message: 'No candidates found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Send push + in-app notification to each candidate ─────────────────
    const functionUrl = `${sbUrl}/functions/v1/send-native-push`;
    let notified = 0;
    const batchSize = 10;

    for (let i = 0; i < candidateOrder.length; i += batchSize) {
      const batch = candidateOrder.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (uid) => {
          // Push notification
          await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`,
            },
            body: JSON.stringify({
              type: 'shift_swap_request',
              user_id: uid,
              title: pushTitle,
              message: pushMessage,
              url: swapUrl,
              data: { shift_swap_id, task_id: swap.task_id },
            }),
          });

          // In-app notification
          await supabase.from('notifications').insert({
            user_id: uid,
            type: 'shift_swap_request',
            title: pushTitle,
            message: pushMessage,
            data: { shift_swap_id, task_id: swap.task_id, url: swapUrl },
            read: false,
          });

          notified++;
        })
      );
    }

    // ── 4. Mark notified_at ───────────────────────────────────────────────────
    await supabase
      .from('shift_swaps')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', shift_swap_id);

    return new Response(JSON.stringify({ notified, candidates: candidateOrder.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('process-shift-swap error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
