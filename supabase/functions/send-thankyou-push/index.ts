import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * send-thankyou-push — scheduled function (run daily).
 *
 * For every completed task_signup (checked_in_at IS NOT NULL, task_date ≤ today)
 * where no thank-you has been sent yet:
 *   1. Sends an emotional push notification (no financial language)
 *   2. Creates an in-app notification record
 *   3. Sets thankyou_sent_at to prevent re-sending
 *
 * Safe to retry — the thankyou_sent_at guard makes it idempotent.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const sbUrl = Deno.env.get('SUPABASE_URL')!;
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
  const supabase = createClient(sbUrl, sbKey);

  const today = new Date().toISOString().split('T')[0];
  let sent = 0;
  let failed = 0;

  try {
    // ── Fetch all signups that need a thank-you ─────────────────────────────
    const { data: signups, error } = await supabase
      .from('task_signups')
      .select(`
        id,
        volunteer_id,
        task_id,
        tasks (
          title,
          task_date,
          clubs ( name )
        )
      `)
      .not('checked_in_at', 'is', null)
      .is('thankyou_sent_at', null)
      .lte('tasks.task_date', today);

    if (error) throw error;

    for (const signup of signups || []) {
      const task = (signup as any).tasks;
      if (!task || !task.task_date) continue;

      // Extra guard: skip tasks in the future (join filter doesn't always apply)
      if (task.task_date > today) continue;

      const clubName: string = task?.clubs?.name || 'de club';
      const taskTitle: string = task?.title || 'jouw taak';
      const volunteerId: string = signup.volunteer_id;

      const title = `Bedankt! 🙏`;
      const message = `Geweldig gedaan bij "${taskTitle}"! ${clubName} is blij met jou. Jij maakt het verschil!`;
      const url = `/dashboard`;

      // 1. Push notification via send-native-push
      try {
        await fetch(`${sbUrl}/functions/v1/send-native-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            type: 'thankyou',
            user_id: volunteerId,
            title,
            message,
            url,
          }),
        });
      } catch (pushError) {
        console.error(`[ThankYou] Push failed for ${volunteerId}:`, pushError);
        // Don't fail the whole run — still mark sent so we don't re-attempt push
      }

      // 2. In-app notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: volunteerId,
        type: 'thankyou',
        title,
        message,
        data: { task_id: signup.task_id, url },
        read: false,
      });

      if (notifError) {
        console.error(`[ThankYou] Notification insert failed for ${volunteerId}:`, notifError);
        failed++;
        continue;
      }

      // 3. Mark as sent — idempotency guard
      const { error: updateError } = await supabase
        .from('task_signups')
        .update({ thankyou_sent_at: new Date().toISOString() })
        .eq('id', signup.id);

      if (updateError) {
        console.error(`[ThankYou] Failed to mark signup ${signup.id}:`, updateError);
        failed++;
      } else {
        sent++;
      }
    }

    console.log(`[ThankYou] Done. Sent: ${sent}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[ThankYou] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
