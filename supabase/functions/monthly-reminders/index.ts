import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildReminder(lang: string, clubName: string, tasks: any[]) {
  const l = lang || 'nl';

  if (l === 'fr') {
    const title = `📋 Rappel : demain chez ${clubName}`;
    const message = tasks.length === 1
      ? `Vous êtes planifié(e) demain pour "${tasks[0].title}"${tasks[0].start_time ? ` à ${tasks[0].start_time}` : ''}${tasks[0].location ? ` (${tasks[0].location})` : ''}.`
      : `Vous avez ${tasks.length} tâches demain : ${tasks.map((t: any) => t.title).join(', ')}.`;
    return { title, message };
  }

  if (l === 'en') {
    const title = `📋 Reminder: tomorrow at ${clubName}`;
    const message = tasks.length === 1
      ? `You're scheduled tomorrow for "${tasks[0].title}"${tasks[0].start_time ? ` at ${tasks[0].start_time}` : ''}${tasks[0].location ? ` (${tasks[0].location})` : ''}.`
      : `You have ${tasks.length} tasks tomorrow: ${tasks.map((t: any) => t.title).join(', ')}.`;
    return { title, message };
  }

  const title = `📋 Herinnering: morgen bij ${clubName}`;
  const message = tasks.length === 1
    ? `Je bent morgen ingepland voor "${tasks[0].title}"${tasks[0].start_time ? ` om ${tasks[0].start_time}` : ''}${tasks[0].location ? ` (${tasks[0].location})` : ''}.`
    : `Je hebt morgen ${tasks.length} taken: ${tasks.map((t: any) => t.title).join(', ')}.`;
  return { title, message };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate tomorrow's date (Brussels timezone)
    const now = new Date();
    const brusselsNow = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const tomorrow = new Date(brusselsNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`Checking reminders for tasks on ${tomorrowStr}`);

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

    const taskIds = tomorrowTasks.map((t: any) => t.id);

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

    const volunteerIds = [...new Set(signups.map((s: any) => s.volunteer_id))];

    // Get profiles with language
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, language')
      .in('id', volunteerIds);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No volunteer profiles found', date: tomorrowStr }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

    // Get plan info for club names
    const planIds = [...new Set(tomorrowTasks.map((t: any) => t.plan_id))];
    const { data: plans } = await supabase
      .from('monthly_plans')
      .select('id, club_id, clubs(name)')
      .in('id', planIds);

    const planMap = new Map((plans || []).map((p: any) => [p.id, p.clubs?.name || 'Club']));

    // Group signups by volunteer
    const byVolunteer: Record<string, { tasks: typeof tomorrowTasks; clubName: string }> = {};
    for (const signup of signups) {
      const task = tomorrowTasks.find((t: any) => t.id === signup.plan_task_id);
      if (!task) continue;
      if (!byVolunteer[signup.volunteer_id]) {
        byVolunteer[signup.volunteer_id] = { tasks: [], clubName: planMap.get(task.plan_id) || 'Club' };
      }
      byVolunteer[signup.volunteer_id].tasks.push(task);
    }

    // Send push via send-native-push for each volunteer
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    let sent = 0;
    let failed = 0;

    for (const [volunteerId, { tasks: volTasks, clubName }] of Object.entries(byVolunteer)) {
      const profile = profileMap.get(volunteerId);
      if (!profile) continue;

      const { title, message } = buildReminder(profile.language, clubName, volTasks);

      try {
        const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-native-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            user_id: volunteerId,
            type: 'monthly_reminder',
            title,
            message,
            url: '/volunteer',
          }),
        });

        if (pushRes.ok) {
          sent++;
          console.log(`Reminder sent to ${profile.full_name || volunteerId}`);
        } else {
          failed++;
          console.error(`Reminder failed for ${volunteerId}:`, await pushRes.text());
        }
      } catch (e) {
        failed++;
        console.error(`Reminder error for ${volunteerId}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, date: tomorrowStr, sent, failed, total: Object.keys(byVolunteer).length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Monthly reminders error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
