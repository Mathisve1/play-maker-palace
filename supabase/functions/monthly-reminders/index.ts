import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const onesignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const onesignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!onesignalAppId || !onesignalApiKey) {
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate tomorrow's date (in Europe/Brussels timezone)
    const now = new Date();
    // Offset for CET/CEST (approximate: +1 or +2)
    const brusselsOffset = now.getTimezoneOffset() === 0 ? 1 : 1; // Edge runs in UTC
    const brusselsNow = new Date(now.getTime() + brusselsOffset * 60 * 60 * 1000);
    const tomorrow = new Date(brusselsNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`Checking reminders for tasks on ${tomorrowStr}`);

    // Find all plan tasks for tomorrow
    const { data: tomorrowTasks, error: tasksError } = await supabase
      .from('monthly_plan_tasks')
      .select('id, title, start_time, location, plan_id')
      .eq('task_date', tomorrowStr);

    if (tasksError) throw tasksError;
    if (!tomorrowTasks || tomorrowTasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tasks tomorrow', date: tomorrowStr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const taskIds = tomorrowTasks.map(t => t.id);

    // Find all day signups for these tasks
    const { data: signups, error: signupsError } = await supabase
      .from('monthly_day_signups')
      .select('id, volunteer_id, plan_task_id')
      .in('plan_task_id', taskIds)
      .eq('status', 'registered');

    if (signupsError) throw signupsError;
    if (!signups || signups.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No signups for tomorrow', date: tomorrowStr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get volunteer profiles with player IDs
    const volunteerIds = [...new Set(signups.map(s => s.volunteer_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, onesignal_player_id, full_name')
      .in('id', volunteerIds)
      .not('onesignal_player_id', 'is', null);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No volunteers with push subscriptions', date: tomorrowStr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Get plan info for club names
    const planIds = [...new Set(tomorrowTasks.map(t => t.plan_id))];
    const { data: plans } = await supabase
      .from('monthly_plans')
      .select('id, club_id, clubs(name)')
      .in('id', planIds);

    const planMap = new Map((plans || []).map((p: any) => [p.id, p.clubs?.name || 'Club']));

    // Group signups by volunteer to send one notification per person
    const byVolunteer: Record<string, { tasks: typeof tomorrowTasks; clubName: string }> = {};
    for (const signup of signups) {
      const profile = profileMap.get(signup.volunteer_id);
      if (!profile?.onesignal_player_id) continue;

      const task = tomorrowTasks.find(t => t.id === signup.plan_task_id);
      if (!task) continue;

      if (!byVolunteer[signup.volunteer_id]) {
        byVolunteer[signup.volunteer_id] = { tasks: [], clubName: planMap.get(task.plan_id) || 'Club' };
      }
      byVolunteer[signup.volunteer_id].tasks.push(task);
    }

    let sent = 0;
    let failed = 0;

    for (const [volunteerId, { tasks: volTasks, clubName }] of Object.entries(byVolunteer)) {
      const profile = profileMap.get(volunteerId);
      if (!profile?.onesignal_player_id) continue;

      // Build notification message
      const taskSummary = volTasks.length === 1
        ? `${volTasks[0].title}${volTasks[0].start_time ? ` om ${volTasks[0].start_time}` : ''}`
        : `${volTasks.length} taken ingepland`;

      const title = `📋 Herinnering: morgen bij ${clubName}`;
      const message = volTasks.length === 1
        ? `Je bent morgen ingepland voor "${volTasks[0].title}"${volTasks[0].start_time ? ` om ${volTasks[0].start_time}` : ''}${volTasks[0].location ? ` (${volTasks[0].location})` : ''}.`
        : `Je hebt morgen ${volTasks.length} taken: ${volTasks.map(t => t.title).join(', ')}.`;

      try {
        const pushRes = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${onesignalApiKey}`,
          },
          body: JSON.stringify({
            app_id: onesignalAppId,
            include_subscription_ids: [profile.onesignal_player_id],
            headings: { en: title, nl: title },
            contents: { en: message, nl: message },
            url: '/volunteer',
          }),
        });

        if (pushRes.ok) {
          sent++;
          console.log(`Push sent to ${profile.full_name || volunteerId}`);
        } else {
          failed++;
          const err = await pushRes.text();
          console.error(`Push failed for ${volunteerId}:`, err);
        }
      } catch (e) {
        failed++;
        console.error(`Push error for ${volunteerId}:`, e);
      }

      // Also create in-app notification
      await supabase.from('notifications').insert({
        user_id: volunteerId,
        type: 'monthly_reminder',
        title,
        message,
      });
    }

    return new Response(
      JSON.stringify({ success: true, date: tomorrowStr, sent, failed, total: Object.keys(byVolunteer).length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Monthly reminders error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
