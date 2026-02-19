import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const club_id = url.searchParams.get("club_id");

    if (!club_id) {
      return new Response(JSON.stringify({ error: "Missing club_id parameter" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("[ticketing-webhook] Received payload:", JSON.stringify(body));

    // Eventbrite webhook format: { api_url, config: { action, endpoint_url, user_id, webhook_id } }
    if (body.api_url && body.config?.action) {
      return await handleEventbriteWebhook(supabase, club_id, body);
    }

    // Generic webhook format: { ticket_id, barcode, event_id, scan_time }
    return await handleGenericWebhook(supabase, club_id, body);
  } catch (e: any) {
    console.error("[ticketing-webhook] Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function handleEventbriteWebhook(supabase: any, club_id: string, body: any) {
  const action = body.config?.action;
  const apiUrl = body.api_url;

  console.log(`[ticketing-webhook] Eventbrite action: ${action}, api_url: ${apiUrl}`);

  // Log all incoming webhooks
  await supabase.from("ticketing_logs").insert({
    club_id,
    action: `eventbrite_${action}`,
    request_payload: body,
    status: "received",
  });

  // Only process check-in related actions
  const checkinActions = ["barcode.checked_in", "attendee.checked_in", "barcode.un_checked_in", "attendee.updated"];
  if (!checkinActions.includes(action)) {
    console.log(`[ticketing-webhook] Ignoring non-checkin action: ${action}`);
    return new Response(JSON.stringify({ ok: true, skipped: true, action }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Get the club's Eventbrite API key
  const { data: config } = await supabase
    .from("ticketing_configs")
    .select("api_key")
    .eq("club_id", club_id)
    .eq("provider", "eventbrite")
    .eq("is_active", true)
    .maybeSingle();

  if (!config?.api_key) {
    console.error("[ticketing-webhook] No active Eventbrite config found for club");
    await supabase.from("ticketing_logs").insert({
      club_id,
      action: `eventbrite_${action}`,
      request_payload: body,
      status: "error",
      error_message: "No active Eventbrite config found",
    });
    return new Response(JSON.stringify({ error: "No ticketing config found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Fetch attendee data from Eventbrite API
  let attendeeData: any;
  try {
    // The api_url might point to an attendee or an order
    // For barcode.checked_in, it typically points to the attendee
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    if (!res.ok) {
      throw new Error(`Eventbrite API returned ${res.status}: ${await res.text()}`);
    }
    attendeeData = await res.json();
    console.log("[ticketing-webhook] Eventbrite attendee data:", JSON.stringify(attendeeData));
  } catch (err: any) {
    console.error("[ticketing-webhook] Failed to fetch attendee data:", err.message);
    await supabase.from("ticketing_logs").insert({
      club_id,
      action: `eventbrite_${action}`,
      request_payload: body,
      status: "error",
      error_message: `Failed to fetch attendee data: ${err.message}`,
    });
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Extract identifiers from attendee data
  // Eventbrite attendee has: id, order_id, event_id, barcodes[{barcode, status}], checked_in
  const attendeeId = String(attendeeData.id || "");
  const barcodes = (attendeeData.barcodes || []).map((b: any) => String(b.barcode));
  const isCheckedIn = attendeeData.checked_in === true || 
    (attendeeData.barcodes || []).some((b: any) => b.status === "used");

  console.log(`[ticketing-webhook] Attendee ${attendeeId}, barcodes: ${barcodes.join(",")}, checked_in: ${isCheckedIn}`);

  // Find matching ticket in our database
  // Match by external_ticket_id (which contains the attendee id) or by barcode
  let ticket: any = null;

  // Try matching by barcode first
  for (const barcode of barcodes) {
    const { data } = await supabase
      .from("volunteer_tickets")
      .select("id, volunteer_id, status, barcode, external_ticket_id")
      .eq("club_id", club_id)
      .eq("barcode", barcode)
      .maybeSingle();
    if (data) {
      ticket = data;
      break;
    }
  }

  // If not found by barcode, try by external_ticket_id containing the attendee id
  if (!ticket && attendeeId) {
    const { data } = await supabase
      .from("volunteer_tickets")
      .select("id, volunteer_id, status, barcode, external_ticket_id")
      .eq("club_id", club_id)
      .like("external_ticket_id", `%${attendeeId}%`)
      .maybeSingle();
    if (data) {
      ticket = data;
    }
  }

  if (!ticket) {
    console.error(`[ticketing-webhook] No matching ticket found for attendee ${attendeeId}, barcodes: ${barcodes.join(",")}`);
    await supabase.from("ticketing_logs").insert({
      club_id,
      action: `eventbrite_${action}`,
      request_payload: body,
      response_payload: { attendee_id: attendeeId, barcodes },
      status: "error",
      error_message: `No matching ticket found for attendee ${attendeeId}`,
    });
    return new Response(JSON.stringify({ error: "Ticket not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Update ticket status
  const newStatus = isCheckedIn ? "checked_in" : "sent";
  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (isCheckedIn) {
    updateData.checked_in_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("volunteer_tickets")
    .update(updateData)
    .eq("id", ticket.id);

  if (updateError) {
    console.error("[ticketing-webhook] Failed to update ticket:", updateError.message);
    await supabase.from("ticketing_logs").insert({
      club_id,
      volunteer_ticket_id: ticket.id,
      action: `eventbrite_${action}`,
      request_payload: body,
      status: "error",
      error_message: updateError.message,
    });
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Log success
  await supabase.from("ticketing_logs").insert({
    club_id,
    volunteer_ticket_id: ticket.id,
    action: `eventbrite_${action}`,
    request_payload: body,
    response_payload: { volunteer_id: ticket.volunteer_id, status: newStatus, attendee_id: attendeeId },
    status: "success",
  });

  console.log(`[ticketing-webhook] Successfully updated ticket ${ticket.id} to ${newStatus}`);
  return new Response(JSON.stringify({ success: true, volunteer_id: ticket.volunteer_id, status: newStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleGenericWebhook(supabase: any, club_id: string, body: any) {
  const ticketId = body.ticket_id || body.barcode || body.external_ticket_id || body.id;

  if (!ticketId) {
    await supabase.from("ticketing_logs").insert({
      club_id,
      action: "webhook_scan",
      request_payload: body,
      status: "error",
      error_message: "No ticket identifier found in payload",
    });
    return new Response(JSON.stringify({ error: "No ticket identifier found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("volunteer_tickets")
    .select("id, volunteer_id, status")
    .eq("club_id", club_id)
    .or(`external_ticket_id.eq.${ticketId},barcode.eq.${ticketId}`)
    .maybeSingle();

  if (ticketError || !ticket) {
    await supabase.from("ticketing_logs").insert({
      club_id,
      action: "webhook_scan",
      request_payload: body,
      status: "error",
      error_message: `Ticket not found: ${ticketId}`,
    });
    return new Response(JSON.stringify({ error: "Ticket not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { error: updateError } = await supabase
    .from("volunteer_tickets")
    .update({
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  if (updateError) {
    await supabase.from("ticketing_logs").insert({
      club_id,
      volunteer_ticket_id: ticket.id,
      action: "webhook_scan",
      request_payload: body,
      status: "error",
      error_message: updateError.message,
    });
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  await supabase.from("ticketing_logs").insert({
    club_id,
    volunteer_ticket_id: ticket.id,
    action: "webhook_scan",
    request_payload: body,
    response_payload: { volunteer_id: ticket.volunteer_id, status: "checked_in" },
    status: "success",
  });

  return new Response(JSON.stringify({ success: true, volunteer_id: ticket.volunteer_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
