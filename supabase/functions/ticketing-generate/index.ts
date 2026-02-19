import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Provider adapter stubs - each returns a mock ticket for now
const providerAdapters: Record<string, { createTicket: (config: any, volunteer: any) => Promise<{ ticket_id: string; ticket_url: string; barcode: string }> }> = {
  eventsquare: {
    async createTicket(config, volunteer) {
      // Stub: would POST to EventSquare API
      return { ticket_id: `es_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://eventsquare.co/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `ES${Date.now()}` };
    }
  },
  weezevent: {
    async createTicket(config, volunteer) {
      return { ticket_id: `wz_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://weezevent.com/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `WZ${Date.now()}` };
    }
  },
  eventbrite: {
    async createTicket(config, volunteer) {
      return { ticket_id: `eb_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://eventbrite.com/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `EB${Date.now()}` };
    }
  },
  ticketmaster_sport: {
    async createTicket(config, volunteer) {
      return { ticket_id: `tm_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://ticketmaster.com/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `TM${Date.now()}` };
    }
  },
  roboticket: {
    async createTicket(config, volunteer) {
      return { ticket_id: `rb_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://roboticket.com/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `RB${Date.now()}` };
    }
  },
  tymes: {
    async createTicket(config, volunteer) {
      return { ticket_id: `ty_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://tymes.com/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `TY${Date.now()}` };
    }
  },
  eventix: {
    async createTicket(config, volunteer) {
      return { ticket_id: `ex_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://eventix.io/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `EX${Date.now()}` };
    }
  },
  yourticketprovider: {
    async createTicket(config, volunteer) {
      return { ticket_id: `ytp_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://yourticketprovider.nl/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `YTP${Date.now()}` };
    }
  },
  paylogic_seetickets: {
    async createTicket(config, volunteer) {
      return { ticket_id: `pl_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://seetickets.com/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `PL${Date.now()}` };
    }
  },
  ticketmatic: {
    async createTicket(config, volunteer) {
      return { ticket_id: `tkm_${crypto.randomUUID().slice(0, 8)}`, ticket_url: `https://ticketmatic.com/ticket/${crypto.randomUUID().slice(0, 8)}`, barcode: `TKM${Date.now()}` };
    }
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action, club_id } = body;

    // Get ticketing config
    const { data: config, error: configError } = await supabase
      .from("ticketing_configs")
      .select("*")
      .eq("club_id", club_id)
      .maybeSingle();

    if (configError || !config) {
      return new Response(JSON.stringify({ success: false, error: "No ticketing config found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Test connection
    if (action === "test") {
      const adapter = providerAdapters[config.provider];
      if (!adapter) {
        return new Response(JSON.stringify({ success: false, error: `Unsupported provider: ${config.provider}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Log the test
      await supabase.from("ticketing_logs").insert({
        club_id,
        action: "test_connection",
        request_payload: { provider: config.provider },
        response_payload: { result: "ok" },
        status: "success",
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create ticket
    if (action === "create_ticket") {
      const { event_id, volunteer_id, task_id } = body;
      const adapter = providerAdapters[config.provider];
      if (!adapter) {
        return new Response(JSON.stringify({ success: false, error: `Unsupported provider: ${config.provider}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get volunteer profile
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", volunteer_id).maybeSingle();

      try {
        const result = await adapter.createTicket(config, { id: volunteer_id, name: profile?.full_name, email: profile?.email });

        // Upsert the ticket
        const { data: existing } = await supabase
          .from("volunteer_tickets")
          .select("id")
          .eq("club_id", club_id)
          .eq("volunteer_id", volunteer_id)
          .eq("task_id", task_id)
          .maybeSingle();

        if (existing) {
          await supabase.from("volunteer_tickets").update({
            external_ticket_id: result.ticket_id,
            ticket_url: result.ticket_url,
            barcode: result.barcode,
            status: "sent",
            error_message: null,
          }).eq("id", existing.id);
        } else {
          await supabase.from("volunteer_tickets").insert({
            club_id,
            event_id,
            volunteer_id,
            task_id,
            external_ticket_id: result.ticket_id,
            ticket_url: result.ticket_url,
            barcode: result.barcode,
            status: "sent",
          });
        }

        // Log success
        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_ticket",
          request_payload: { volunteer_id, task_id, provider: config.provider },
          response_payload: result,
          status: "success",
        });

        return new Response(JSON.stringify({ success: true, ticket: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        // Log error
        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_ticket",
          request_payload: { volunteer_id, task_id, provider: config.provider },
          status: "error",
          error_message: e.message,
        });

        // Update ticket with error
        await supabase.from("volunteer_tickets").upsert({
          club_id,
          event_id,
          volunteer_id,
          task_id,
          status: "none",
          error_message: e.message,
        }, { onConflict: "id" });

        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
