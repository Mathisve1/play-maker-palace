import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fmt = (d: string) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return new Response('Missing token', { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Lookup token
    const { data: tokenRow } = await supabase
      .from('calendar_tokens')
      .select('user_id')
      .eq('token', token)
      .single();

    if (!tokenRow) {
      return new Response('Invalid token', { status: 403, headers: corsHeaders });
    }

    const userId = tokenRow.user_id;

    // Get assigned tasks
    const { data: signups } = await supabase
      .from('task_signups')
      .select('task_id')
      .eq('volunteer_id', userId)
      .eq('status', 'assigned');

    const taskIds = (signups || []).map(s => s.task_id);

    let events: string[] = [];
    if (taskIds.length > 0) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, task_date, start_time, end_time, location, description')
        .in('id', taskIds);

      for (const t of tasks || []) {
        const start = t.start_time || t.task_date;
        const end = t.end_time || t.start_time || t.task_date;
        if (!start) continue;

        events.push([
          'BEGIN:VEVENT',
          `UID:task-${t.id}@playmaker.app`,
          `DTSTART:${fmt(start)}`,
          `DTEND:${fmt(end)}`,
          `SUMMARY:${(t.title || '').replace(/[,;]/g, ' ')}`,
          t.location ? `LOCATION:${t.location.replace(/[,;]/g, ' ')}` : '',
          t.description ? `DESCRIPTION:${t.description.replace(/\n/g, '\\n').replace(/[,;]/g, ' ')}` : '',
          `DTSTAMP:${fmt(new Date().toISOString())}`,
          'END:VEVENT',
        ].filter(Boolean).join('\r\n'));
      }
    }

    // Also get monthly plan tasks
    const { data: enrollments } = await supabase
      .from('monthly_enrollments')
      .select('id, plan_id')
      .eq('volunteer_id', userId)
      .eq('approval_status', 'approved');

    if (enrollments && enrollments.length > 0) {
      const enrollmentIds = enrollments.map(e => e.id);
      const { data: daySignups } = await supabase
        .from('monthly_day_signups')
        .select('plan_task_id')
        .in('enrollment_id', enrollmentIds)
        .eq('status', 'assigned');

      if (daySignups && daySignups.length > 0) {
        const planTaskIds = daySignups.map(d => d.plan_task_id);
        const { data: planTasks } = await supabase
          .from('monthly_plan_tasks')
          .select('id, title, task_date, start_time, end_time, location, description')
          .in('id', planTaskIds);

        for (const t of planTasks || []) {
          const start = t.start_time || t.task_date;
          const end = t.end_time || t.start_time || t.task_date;
          if (!start) continue;

          events.push([
            'BEGIN:VEVENT',
            `UID:monthly-${t.id}@playmaker.app`,
            `DTSTART:${fmt(start)}`,
            `DTEND:${fmt(end)}`,
            `SUMMARY:${(t.title || '').replace(/[,;]/g, ' ')}`,
            t.location ? `LOCATION:${t.location.replace(/[,;]/g, ' ')}` : '',
            `DTSTAMP:${fmt(new Date().toISOString())}`,
            'END:VEVENT',
          ].filter(Boolean).join('\r\n'));
        }
      }
    }

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PlayMaker//Volunteer Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:PlayMaker Shifts',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    return new Response(ical, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="playmaker-shifts.ics"',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
