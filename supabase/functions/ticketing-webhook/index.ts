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
    // Public endpoint - no JWT verification needed
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

    // Extract ticket ID from payload - different providers send different formats
    // We support a generic format: { ticket_id, barcode, event_id, scan_time }
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

    // Find the ticket by external_ticket_id or barcode
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

    // Update status to checked_in
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

    // Log success
    await supabase.from("ticketing_logs").insert({
      club_id,
      volunteer_ticket_id: ticket.id,
      action: "webhook_scan",
      request_payload: body,
      response_payload: { volunteer_id: ticket.volunteer_id, status: "checked_in" },
      status: "success",
    });

    return new Response(JSON.stringify({ success: true, volunteer_id: ticket.volunteer_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
