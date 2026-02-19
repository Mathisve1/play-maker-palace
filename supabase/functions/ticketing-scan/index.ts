import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { barcode, club_id } = body;

    if (!barcode || !club_id) {
      return new Response(
        JSON.stringify({ success: false, error: "barcode and club_id are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for faster lookups (no RLS overhead)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up ticket + volunteer + task + event in parallel
    const { data: ticket, error: ticketError } = await serviceClient
      .from("volunteer_tickets")
      .select("id, volunteer_id, task_id, event_id, status, checked_in_at, barcode")
      .eq("barcode", barcode)
      .eq("club_id", club_id)
      .maybeSingle();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "unknown",
          error: "Ongeldig ticket - barcode niet gevonden",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profile, task, event in parallel
    const [profileRes, taskRes, eventRes] = await Promise.all([
      serviceClient.from("profiles").select("full_name, avatar_url").eq("id", ticket.volunteer_id).maybeSingle(),
      ticket.task_id ? serviceClient.from("tasks").select("title").eq("id", ticket.task_id).maybeSingle() : Promise.resolve({ data: null }),
      ticket.event_id ? serviceClient.from("events").select("title").eq("id", ticket.event_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const volunteerName = profileRes.data?.full_name || "Onbekend";
    const avatarUrl = profileRes.data?.avatar_url || null;
    const taskTitle = taskRes.data?.title || "";
    const eventTitle = eventRes.data?.title || "";

    // Check if already checked in
    if (ticket.status === "checked_in") {
      return new Response(
        JSON.stringify({
          success: false,
          status: "already_checked_in",
          volunteer_name: volunteerName,
          avatar_url: avatarUrl,
          task_title: taskTitle,
          checked_in_at: ticket.checked_in_at,
          error: "Al ingecheckt",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update ticket to checked_in
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

    // Log the scan (fire-and-forget, don't block response)
    serviceClient.from("ticketing_logs").insert({
      club_id,
      action: "scan_checkin",
      request_payload: { barcode },
      response_payload: { volunteer_id: ticket.volunteer_id, task_id: ticket.task_id },
      status: "success",
      volunteer_ticket_id: ticket.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        status: "checked_in",
        volunteer_name: volunteerName,
        avatar_url: avatarUrl,
        task_title: taskTitle,
        event_title: eventTitle,
        checked_in_at: now,
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
