import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Push Reminders — runs on a cron schedule (every 15 min).
 *
 * Handles 4 reminder types:
 * 1. shift_24h  — 24 hours before a task starts
 * 2. shift_2h   — 2 hours before a task starts
 * 3. checkin     — 30 min after task start if no check-in
 * 4. contract_expiry — 14 days and 3 days before season contract ends
 * 5. compliance_deadline — last 7 days of month if no declaration submitted
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sbUrl = Deno.env.get('SUPABASE_URL')!;
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
  const supabase = createClient(sbUrl, sbKey);

  const now = new Date();
  const results: Record<string, number> = {
    shift_24h: 0,
    shift_2h: 0,
    checkin: 0,
    contract_expiry: 0,
    compliance: 0,
  };

  // ── Helper: send push via send-native-push ──
  async function notify(userId: string, title: string, message: string, url: string, type: string, referenceId: string, reminderType: string) {
    // Check if already sent
    const { data: existing } = await supabase
      .from('reminder_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('reminder_type', reminderType)
      .eq('reference_id', referenceId)
      .limit(1);

    if (existing && existing.length > 0) return false;

    // Send push
    try {
      await fetch(`${sbUrl}/functions/v1/send-native-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ user_id: userId, title, message, url, type }),
      });
    } catch (e) {
      console.error(`[Reminder] Push failed for ${userId}:`, e);
    }

    // Log to prevent duplicate
    await supabase.from('reminder_logs').insert({
      user_id: userId,
      reminder_type: reminderType,
      reference_id: referenceId,
    });

    return true;
  }

  try {
    // ════════════════════════════════════════════════════════════════
    // 1. SHIFT REMINDERS (24h + 2h before start)
    // ════════════════════════════════════════════════════════════════

    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23h45 = new Date(now.getTime() + (24 * 60 - 15) * 60 * 1000);
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in1h45 = new Date(now.getTime() + (2 * 60 - 15) * 60 * 1000);

    // Tasks starting in ~24h window
    const { data: tasks24h } = await supabase
      .from('tasks')
      .select('id, title, start_time, task_date')
      .eq('status', 'open')
      .gte('start_time', in23h45.toISOString())
      .lte('start_time', in24h.toISOString());

    // Tasks starting in ~2h window
    const { data: tasks2h } = await supabase
      .from('tasks')
      .select('id, title, start_time, task_date')
      .eq('status', 'open')
      .gte('start_time', in1h45.toISOString())
      .lte('start_time', in2h.toISOString());

    for (const batch of [
      { tasks: tasks24h || [], type: 'shift_24h', titleNl: '⏰ Morgen: ', msgNl: 'begint over 24 uur. Vergeet niet je voor te bereiden!' },
      { tasks: tasks2h || [], type: 'shift_2h', titleNl: '🔔 Bijna zover: ', msgNl: 'begint over 2 uur. Zorg dat je klaar bent!' },
    ]) {
      for (const task of batch.tasks) {
        // Get assigned volunteers
        const { data: signups } = await supabase
          .from('task_signups')
          .select('volunteer_id')
          .eq('task_id', task.id)
          .eq('status', 'assigned');

        for (const s of signups || []) {
          const sent = await notify(
            s.volunteer_id,
            `${batch.titleNl}${task.title}`,
            `"${task.title}" ${batch.msgNl}`,
            `/volunteer-dashboard`,
            'task_reminder',
            `${task.id}_${batch.type}`,
            batch.type,
          );
          if (sent) results[batch.type]++;
        }
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 2. CHECK-IN REMINDER (30 min after start, no check-in)
    // ════════════════════════════════════════════════════════════════

    const min30ago = new Date(now.getTime() - 30 * 60 * 1000);
    const min45ago = new Date(now.getTime() - 45 * 60 * 1000);

    const { data: tasksStarted } = await supabase
      .from('tasks')
      .select('id, title, start_time')
      .eq('status', 'open')
      .gte('start_time', min45ago.toISOString())
      .lte('start_time', min30ago.toISOString());

    for (const task of tasksStarted || []) {
      const { data: signups } = await supabase
        .from('task_signups')
        .select('volunteer_id, checked_in_at')
        .eq('task_id', task.id)
        .eq('status', 'assigned');

      for (const s of signups || []) {
        if ((s as any).checked_in_at) continue;
        const sent = await notify(
          s.volunteer_id,
          `📍 Check-in vergeten?`,
          `"${task.title}" is al begonnen. Vergeet niet in te checken!`,
          `/volunteer-dashboard`,
          'checkin_reminder',
          `${task.id}_checkin`,
          'checkin',
        );
        if (sent) results.checkin++;
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 3. CONTRACT EXPIRY (14 days + 3 days before end)
    // ════════════════════════════════════════════════════════════════

    const in14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const in14dPrev = new Date(in14d.getTime() - 15 * 60 * 1000);
    const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in3dPrev = new Date(in3d.getTime() - 15 * 60 * 1000);

    for (const batch of [
      { from: in14dPrev, to: in14d, type: 'contract_expiry_14d', msg: 'verloopt over 14 dagen' },
      { from: in3dPrev, to: in3d, type: 'contract_expiry_3d', msg: 'verloopt over 3 dagen' },
    ]) {
      const { data: contracts } = await supabase
        .from('season_contracts')
        .select('id, volunteer_id, season_name')
        .eq('status', 'active')
        .gte('end_date', batch.from.toISOString().split('T')[0])
        .lte('end_date', batch.to.toISOString().split('T')[0]);

      for (const c of contracts || []) {
        const sent = await notify(
          c.volunteer_id,
          `📝 Contract ${batch.msg}`,
          `Je seizoenscontract "${c.season_name}" ${batch.msg}. Neem contact op met je club.`,
          `/volunteer-dashboard`,
          'contract_expiry',
          `${c.id}_${batch.type}`,
          batch.type,
        );
        if (sent) results.contract_expiry++;
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 4. COMPLIANCE DEADLINE (last 7 days of month)
    // ════════════════════════════════════════════════════════════════

    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - currentDay;

    if (daysLeft <= 7) {
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Get all volunteers who have push enabled
      const { data: volunteers } = await supabase
        .from('profiles')
        .select('id, push_notifications_enabled')
        .eq('push_notifications_enabled', true);

      // Get existing declarations for this month
      const { data: declarations } = await supabase
        .from('compliance_declarations')
        .select('volunteer_id')
        .eq('declaration_year', currentYear)
        .eq('declaration_month', currentMonth);

      const declaredSet = new Set((declarations || []).map((d: any) => d.volunteer_id));

      for (const v of volunteers || []) {
        if (declaredSet.has(v.id)) continue;

        // Only remind volunteers who have task signups (active volunteers)
        const { count } = await supabase
          .from('task_signups')
          .select('id', { count: 'exact', head: true })
          .eq('volunteer_id', v.id)
          .eq('status', 'assigned')
          .limit(1);

        if (!count || count === 0) continue;

        const refId = `compliance_${currentYear}_${currentMonth}`;
        const sent = await notify(
          v.id,
          `📋 Compliance verklaring indienen`,
          `Vergeet niet je maandelijkse compliance verklaring in te dienen voor einde ${currentMonth}/${currentYear}.`,
          `/volunteer-dashboard`,
          'compliance_reminder',
          refId,
          'compliance',
        );
        if (sent) results.compliance++;
      }
    }

    // ── Cleanup old logs (>90 days) ──
    const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    await supabase.from('reminder_logs').delete().lt('sent_at', cutoff.toISOString());

    return new Response(JSON.stringify({ success: true, results, timestamp: now.toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Reminder] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
