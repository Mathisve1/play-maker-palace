import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: string[] = [];

  try {
    // ── Trigger 1: 30 days before season start ──────────────────
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const targetDate = thirtyDaysFromNow.toISOString().slice(0, 10);

    const { data: upcomingSeasons } = await supabase
      .from("seasons")
      .select("id, club_id, name, start_date")
      .eq("is_active", true)
      .gte("start_date", targetDate)
      .lte("start_date", targetDate + "T23:59:59");

    for (const season of upcomingSeasons || []) {
      // Get all club members
      const { data: members } = await supabase
        .from("club_memberships")
        .select("volunteer_id")
        .eq("club_id", season.club_id)
        .eq("status", "active");

      if (!members || members.length === 0) continue;

      // Check if we already sent this notification (prevent duplicates)
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("type", "contract")
        .in(
          "user_id",
          members.map((m) => m.volunteer_id)
        )
        .like("message", `%${season.name}%`)
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        );

      if ((count || 0) > 0) {
        results.push(
          `Season ${season.name}: already notified within 24h, skipping`
        );
        continue;
      }

      const notifications = members.map((m) => ({
        user_id: m.volunteer_id,
        type: "contract",
        title: "Seizoen start binnenkort",
        message: `Het seizoen "${season.name}" start over 30 dagen. Controleer of je contract in orde is.`,
        metadata: { season_id: season.id, action: "season_reminder" },
        action_type: "sign_contract",
        action_data: { season_id: season.id },
      }));

      // Check for pending contracts and add signing_url
      for (const notif of notifications) {
        const { data: contract } = await supabase
          .from("season_contracts")
          .select("signing_url")
          .eq("season_id", season.id)
          .eq("volunteer_id", notif.user_id)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();

        if (contract?.signing_url) {
          (notif.action_data as any).signing_url = contract.signing_url;
        } else {
          // No pending contract = no sign action needed
          notif.action_type = null as any;
          notif.action_data = null as any;
        }
      }

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);
      if (error) results.push(`Season ${season.name}: error - ${error.message}`);
      else
        results.push(
          `Season ${season.name}: notified ${notifications.length} volunteers`
        );
    }

    // ── Trigger 2: Hour confirmation reminder ───────────────────
    // Find task_signups where checked_in_at exists but no hour_confirmation yet
    // and the task has ended more than 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, task_date, club_id")
      .not("task_date", "is", null)
      .lte("task_date", oneHourAgo);

    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map((t) => t.id);
      const taskMap = new Map(tasks.map((t) => [t.id, t]));

      // Get signups that checked in
      const { data: signups } = await supabase
        .from("task_signups")
        .select("id, task_id, volunteer_id, checked_in_at")
        .in("task_id", taskIds)
        .not("checked_in_at", "is", null);

      if (signups && signups.length > 0) {
        // Get existing hour_confirmations for these
        const { data: existingConfs } = await supabase
          .from("hour_confirmations")
          .select("task_id, volunteer_id")
          .in(
            "task_id",
            signups.map((s) => s.task_id)
          );

        const confSet = new Set(
          (existingConfs || []).map(
            (c) => `${c.task_id}:${c.volunteer_id}`
          )
        );

        // Check which we already notified (within last 24h)
        const { data: recentNotifs } = await supabase
          .from("notifications")
          .select("user_id, action_data")
          .eq("action_type", "confirm_hours")
          .gte(
            "created_at",
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          );

        const notifiedSet = new Set(
          (recentNotifs || []).map((n) => {
            const data = n.action_data as any;
            return `${data?.task_id}:${n.user_id}`;
          })
        );

        const toNotify = signups.filter((s) => {
          const key = `${s.task_id}:${s.volunteer_id}`;
          return !confSet.has(key) && !notifiedSet.has(key);
        });

        if (toNotify.length > 0) {
          // Create hour_confirmation records + notifications
          for (const signup of toNotify) {
            const task = taskMap.get(signup.task_id);
            if (!task) continue;

            // Create hour_confirmation if not exists
            const { data: conf } = await supabase
              .from("hour_confirmations")
              .insert({
                task_id: signup.task_id,
                volunteer_id: signup.volunteer_id,
                status: "pending",
              })
              .select("id")
              .maybeSingle();

            if (conf) {
              await supabase.from("notifications").insert({
                user_id: signup.volunteer_id,
                type: "task",
                title: "Bevestig je gewerkte uren",
                message: `Bevestig je gewerkte uren voor "${task.title}".`,
                metadata: {
                  task_id: signup.task_id,
                  action: "confirm_hours",
                },
                action_type: "confirm_hours",
                action_data: {
                  confirmation_id: conf.id,
                  task_id: signup.task_id,
                },
              });
            }
          }
          results.push(
            `Hour confirmations: created ${toNotify.length} reminders`
          );
        } else {
          results.push("Hour confirmations: no new reminders needed");
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
