import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROEF_LIMIT = 3; // First 3 check-ins = proefperiode, 4th = actief

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json();
    const { barcode, club_id, action } = body;

    if (!barcode || !club_id) {
      return new Response(
        JSON.stringify({ success: false, error: "barcode and club_id are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ══════════════════════════════════════════════════════════════
    // ── SEASON CONTRACT BARCODE (SC- prefix) ─────────────────────
    // ══════════════════════════════════════════════════════════════
    if (barcode.startsWith("SC-")) {
      const { data: contract, error: scErr } = await serviceClient
        .from("season_contracts")
        .select("id, volunteer_id, club_id, status, checkin_count, volunteer_status, template_id, season_id")
        .eq("barcode", barcode)
        .maybeSingle();

      if (scErr || !contract) {
        return new Response(JSON.stringify({ success: false, error: "Ongeldig seizoensticket" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Verify club
      if (contract.club_id !== club_id) {
        return new Response(JSON.stringify({ success: false, error: "Ticket hoort niet bij deze club" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get volunteer info + template info in parallel
      const [profileRes, templateRes] = await Promise.all([
        serviceClient.from("profiles").select("full_name, avatar_url").eq("id", contract.volunteer_id).maybeSingle(),
        serviceClient.from("season_contract_templates").select("name, category").eq("id", contract.template_id).maybeSingle(),
      ]);

      const volunteerName = profileRes.data?.full_name || "Onbekend";
      const avatarUrl = profileRes.data?.avatar_url || null;
      const templateName = templateRes.data?.name || "";
      const category = templateRes.data?.category || "";

      // ── CHECKOUT for season ──
      if (action === "checkout") {
        // Find the latest open checkin (no check_out_at)
        const { data: openCheckin } = await serviceClient
          .from("season_checkins")
          .select("id, checked_in_at")
          .eq("season_contract_id", contract.id)
          .is("checked_out_at", null)
          .order("checked_in_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!openCheckin) {
          return new Response(JSON.stringify({ success: false, error: "Nog niet ingecheckt" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const now = new Date().toISOString();
        const hoursWorked = Math.round(((new Date(now).getTime() - new Date(openCheckin.checked_in_at).getTime()) / 3600000) * 100) / 100;

        await serviceClient.from("season_checkins")
          .update({ checked_out_at: now, hours_worked: hoursWorked })
          .eq("id", openCheckin.id);

        return new Response(JSON.stringify({
          success: true, status: "checked_out",
          volunteer_name: volunteerName, avatar_url: avatarUrl,
          task_title: templateName, event_title: `Seizoen - ${category}`,
          checked_out_at: now, hours_worked: hoursWorked,
          checkin_count: contract.checkin_count, volunteer_status: contract.volunteer_status,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── CHECK-IN for season ──
      // Check if already checked in today (no checkout)
      const { data: todayOpen } = await serviceClient
        .from("season_checkins")
        .select("id, checked_in_at")
        .eq("season_contract_id", contract.id)
        .is("checked_out_at", null)
        .limit(1)
        .maybeSingle();

      if (todayOpen) {
        return new Response(JSON.stringify({
          success: false, status: "already_checked_in",
          volunteer_name: volunteerName, avatar_url: avatarUrl,
          task_title: templateName, event_title: `Seizoen - ${category}`,
          checked_in_at: todayOpen.checked_in_at,
          checkin_count: contract.checkin_count, volunteer_status: contract.volunteer_status,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const now = new Date().toISOString();
      const newCount = (contract.checkin_count || 0) + 1;

      // Insert checkin record
      await serviceClient.from("season_checkins").insert({
        season_contract_id: contract.id,
        volunteer_id: contract.volunteer_id,
        club_id: contract.club_id,
        checked_in_at: now,
      });

      // Update checkin count + auto 4-keer-regel
      const newVolunteerStatus = newCount >= (PROEF_LIMIT + 1) ? "actief" : "proef";
      await serviceClient.from("season_contracts")
        .update({ checkin_count: newCount, volunteer_status: newVolunteerStatus })
        .eq("id", contract.id);

      // If transitioning from proef to actief, send notification
      if (newCount === PROEF_LIMIT + 1 && contract.volunteer_status === "proef") {
        try {
          // Notify club owner
          const { data: club } = await serviceClient.from("clubs").select("owner_id").eq("id", club_id).maybeSingle();
          if (club?.owner_id) {
            await serviceClient.from("notifications").insert({
              user_id: club.owner_id,
              title: "🎉 Vrijwilliger actief",
              message: `${volunteerName} heeft de proefperiode voltooid (4e check-in) en is nu actief/betalend.`,
              type: "season_activated",
            });
          }
        } catch (_) { /* non-critical */ }
      }

      return new Response(JSON.stringify({
        success: true, status: "checked_in",
        volunteer_name: volunteerName, avatar_url: avatarUrl,
        task_title: templateName, event_title: `Seizoen - ${category}`,
        checked_in_at: now,
        checkin_count: newCount, volunteer_status: newVolunteerStatus,
        proef_remaining: Math.max(0, PROEF_LIMIT - newCount + 1),
        group_name: category, wristband_color: null, wristband_label: null,
        materials_note: newVolunteerStatus === "proef"
          ? `Proefperiode: ${newCount}/${PROEF_LIMIT + 1}`
          : "✅ Actief/Betalend",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ══════════════════════════════════════════════════════════════
    // ── CHECKOUT action (MP- prefix) ─────────────────────────────
    // ══════════════════════════════════════════════════════════════
    if (action === "checkout") {
      if (barcode.startsWith("MP-")) {
        const { data: daySignup, error: dsError } = await serviceClient
          .from("monthly_day_signups")
          .select("id, volunteer_id, plan_task_id, checked_in_at, checked_out_at")
          .eq("ticket_barcode", barcode)
          .maybeSingle();

        if (dsError || !daySignup) {
          return new Response(JSON.stringify({ success: false, error: "Barcode niet gevonden" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (!daySignup.checked_in_at) {
          return new Response(JSON.stringify({ success: false, error: "Nog niet ingecheckt" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (daySignup.checked_out_at) {
          return new Response(JSON.stringify({ success: false, status: "already_checked_out", checked_out_at: daySignup.checked_out_at }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const now = new Date().toISOString();
        const { error: updateError } = await serviceClient
          .from("monthly_day_signups")
          .update({ checked_out_at: now, club_reported_checkout: now, hour_status: "checkout_pending" })
          .eq("id", daySignup.id);

        if (updateError) {
          return new Response(JSON.stringify({ success: false, error: updateError.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const checkedIn = new Date(daySignup.checked_in_at);
        const checkedOut = new Date(now);
        const hoursWorked = Math.round(((checkedOut.getTime() - checkedIn.getTime()) / 3600000) * 100) / 100;

        await serviceClient.from("monthly_day_signups")
          .update({ club_reported_hours: hoursWorked, club_approved: true })
          .eq("id", daySignup.id);

        const [profileRes, taskRes] = await Promise.all([
          serviceClient.from("profiles").select("full_name").eq("id", daySignup.volunteer_id).maybeSingle(),
          serviceClient.from("monthly_plan_tasks").select("title, task_date").eq("id", daySignup.plan_task_id).maybeSingle(),
        ]);

        try {
          await serviceClient.functions.invoke("send-native-push", {
            body: {
              user_id: daySignup.volunteer_id,
              title: "⏰ Bevestig je uitchecktijd",
              message: `Je bent uitgecheckt om ${new Date(now).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })} voor "${taskRes.data?.title || "taak"}". Bevestig of betwist dit.`,
              url: "/dashboard", type: "checkout_confirm",
            },
          });
        } catch (_) { /* non-critical */ }

        return new Response(JSON.stringify({
          success: true, status: "checked_out",
          volunteer_name: profileRes.data?.full_name || "Onbekend",
          task_title: taskRes.data?.title || "",
          checked_out_at: now, hours_worked: hoursWorked,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: false, error: "Checkout voor VT-tickets niet ondersteund" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ══════════════════════════════════════════════════════════════
    // ── MONTHLY PLANNING BARCODE (MP- prefix) ────────────────────
    // ══════════════════════════════════════════════════════════════
    if (barcode.startsWith("MP-")) {
      const { data: daySignup, error: dsError } = await serviceClient
        .from("monthly_day_signups")
        .select("id, volunteer_id, plan_task_id, checked_in_at, enrollment_id, status")
        .eq("ticket_barcode", barcode)
        .maybeSingle();

      if (dsError || !daySignup) {
        return new Response(
          JSON.stringify({ success: false, status: "unknown", error: "Ongeldig maandticket - barcode niet gevonden" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (daySignup.checked_in_at) {
        const { data: profile } = await serviceClient.from("profiles").select("full_name, avatar_url").eq("id", daySignup.volunteer_id).maybeSingle();
        const { data: planTask } = await serviceClient.from("monthly_plan_tasks").select("title, category, task_date").eq("id", daySignup.plan_task_id).maybeSingle();
        return new Response(
          JSON.stringify({
            success: false, status: "already_checked_in",
            volunteer_name: profile?.full_name || "Onbekend",
            avatar_url: profile?.avatar_url || null,
            task_title: planTask?.title || "",
            event_title: `Maandplanning - ${planTask?.category || ""}`,
            checked_in_at: daySignup.checked_in_at,
            group_name: planTask?.category || null,
            wristband_color: null, wristband_label: null, materials_note: null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();
      const { error: updateError } = await serviceClient
        .from("monthly_day_signups")
        .update({ checked_in_at: now })
        .eq("id", daySignup.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: "Kon niet inchecken: " + updateError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const [profileRes, taskRes] = await Promise.all([
        serviceClient.from("profiles").select("full_name, avatar_url").eq("id", daySignup.volunteer_id).maybeSingle(),
        serviceClient.from("monthly_plan_tasks").select("title, category, task_date").eq("id", daySignup.plan_task_id).maybeSingle(),
      ]);

      return new Response(
        JSON.stringify({
          success: true, status: "checked_in",
          volunteer_name: profileRes.data?.full_name || "Onbekend",
          avatar_url: profileRes.data?.avatar_url || null,
          task_title: taskRes.data?.title || "",
          event_title: `Maandplanning - ${taskRes.data?.category || ""}`,
          checked_in_at: now,
          group_name: taskRes.data?.category || null,
          wristband_color: null, wristband_label: null,
          materials_note: `Datum: ${taskRes.data?.task_date || ""}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ══════════════════════════════════════════════════════════════
    // ── STANDARD VT- TICKET FLOW ─────────────────────────────────
    // ══════════════════════════════════════════════════════════════
    const { data: ticket, error: ticketError } = await serviceClient
      .from("volunteer_tickets")
      .select("id, volunteer_id, task_id, event_id, status, checked_in_at, barcode")
      .eq("barcode", barcode)
      .eq("club_id", club_id)
      .maybeSingle();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ success: false, status: "unknown", error: "Ongeldig ticket - barcode niet gevonden" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [profileRes, taskRes, eventRes] = await Promise.all([
      serviceClient.from("profiles").select("full_name, avatar_url").eq("id", ticket.volunteer_id).maybeSingle(),
      ticket.task_id ? serviceClient.from("tasks").select("title, event_group_id").eq("id", ticket.task_id).maybeSingle() : Promise.resolve({ data: null }),
      ticket.event_id ? serviceClient.from("events").select("title").eq("id", ticket.event_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const volunteerName = profileRes.data?.full_name || "Onbekend";
    const avatarUrl = profileRes.data?.avatar_url || null;
    const taskTitle = taskRes.data?.title || "";
    const eventTitle = eventRes.data?.title || "";

    let wristbandColor: string | null = null;
    let wristbandLabel: string | null = null;
    let materialsNote: string | null = null;
    let groupName: string | null = null;

    const eventGroupId = taskRes.data?.event_group_id;
    if (eventGroupId) {
      const { data: groupData } = await serviceClient
        .from("event_groups")
        .select("name, wristband_color, wristband_label, materials_note")
        .eq("id", eventGroupId)
        .maybeSingle();
      if (groupData) {
        groupName = groupData.name || null;
        wristbandColor = groupData.wristband_color || null;
        wristbandLabel = groupData.wristband_label || null;
        materialsNote = groupData.materials_note || null;
      }
    }

    const materialPayload = {
      group_name: groupName,
      wristband_color: wristbandColor,
      wristband_label: wristbandLabel,
      materials_note: materialsNote,
    };

    if (ticket.status === "checked_in") {
      return new Response(
        JSON.stringify({
          success: false, status: "already_checked_in",
          volunteer_name: volunteerName, avatar_url: avatarUrl,
          task_title: taskTitle, checked_in_at: ticket.checked_in_at,
          error: "Al ingecheckt", ...materialPayload,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const { error: updateError } = await serviceClient
      .from("volunteer_tickets")
      .update({ status: "checked_in", checked_in_at: now })
      .eq("id", ticket.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: "Kon ticket niet updaten: " + updateError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    serviceClient.from("ticketing_logs").insert({
      club_id, action: "scan_checkin",
      request_payload: { barcode },
      response_payload: { volunteer_id: ticket.volunteer_id, task_id: ticket.task_id },
      status: "success", volunteer_ticket_id: ticket.id,
    });

    return new Response(
      JSON.stringify({
        success: true, status: "checked_in",
        volunteer_name: volunteerName, avatar_url: avatarUrl,
        task_title: taskTitle, event_title: eventTitle,
        checked_in_at: now, ...materialPayload,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
