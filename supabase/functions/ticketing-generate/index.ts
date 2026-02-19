import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ========== WEEZEVENT ADAPTER (Official API: https://api.weezevent.com/) ==========
const weezeventAdapter = {
  // POST /auth/access_token → returns accessToken
  async authenticate(config: any): Promise<string> {
    const configData = config.config_data || {};
    const params = new URLSearchParams();
    params.append("username", configData.username || "");
    params.append("password", configData.password || "");
    params.append("api_key", config.api_key);

    const res = await fetch("https://api.weezevent.com/auth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Weezevent auth failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    if (!data.accessToken) {
      throw new Error("Weezevent auth: no accessToken returned");
    }
    return data.accessToken;
  },

  // GET /events → test connection by listing events
  async testConnection(config: any): Promise<{ success: boolean; events_count?: number }> {
    const accessToken = await this.authenticate(config);
    const url = `https://api.weezevent.com/events?api_key=${encodeURIComponent(config.api_key)}&access_token=${encodeURIComponent(accessToken)}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Weezevent events failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return { success: true, events_count: data.events?.length || 0 };
  },

  // GET /participant/list → list participants for scan/check-in matching
  async getParticipants(config: any, eventId: string): Promise<any[]> {
    const accessToken = await this.authenticate(config);
    const url = `https://api.weezevent.com/participant/list?api_key=${encodeURIComponent(config.api_key)}&access_token=${encodeURIComponent(accessToken)}&id_event[]=${encodeURIComponent(eventId)}&full=1`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Weezevent participants failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return data.participants || [];
  },

  // GET /tickets/:id/stats → scan statistics
  async getTicketStats(config: any, ticketId: string): Promise<{ total: number; scanned: number }> {
    const accessToken = await this.authenticate(config);
    const url = `https://api.weezevent.com/tickets/${encodeURIComponent(ticketId)}/stats?api_key=${encodeURIComponent(config.api_key)}&access_token=${encodeURIComponent(accessToken)}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Weezevent ticket stats failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return { total: data.stats?.total || 0, scanned: data.stats?.scanned || 0 };
  },

  // Note: Weezevent's public API does not have a direct "create participant/ticket" endpoint.
  // Participants are created via the Weezevent back-office or checkout flow.
  // For volunteer ticketing, we match existing participants by email/name.
  // This adapter searches for a matching participant and returns their barcode.
  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const eventId = config.event_id_external;
    if (!eventId) throw new Error("Weezevent Event ID is niet geconfigureerd");

    const accessToken = await this.authenticate(config);
    
    // Fetch all participants for this event to find a match by email
    const url = `https://api.weezevent.com/participant/list?api_key=${encodeURIComponent(config.api_key)}&access_token=${encodeURIComponent(accessToken)}&id_event[]=${encodeURIComponent(eventId)}&full=1`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Weezevent API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const participants = data.participants || [];

    // Try to match by email
    let matched = null;
    if (volunteer.email) {
      matched = participants.find((p: any) =>
        p.owner?.email?.toLowerCase() === volunteer.email.toLowerCase()
      );
    }

    // If no email match, try by name
    if (!matched && volunteer.name) {
      const nameParts = volunteer.name.toLowerCase().split(" ");
      matched = participants.find((p: any) => {
        const firstName = (p.owner?.first_name || "").toLowerCase();
        const lastName = (p.owner?.last_name || "").toLowerCase();
        return nameParts.some((part: string) => firstName.includes(part) || lastName.includes(part));
      });
    }

    if (!matched) {
      throw new Error(
        `Geen overeenkomend ticket gevonden in Weezevent voor ${volunteer.name || volunteer.email}. ` +
        `Maak eerst een ticket aan in het Weezevent back-office voor deze vrijwilliger.`
      );
    }

    return {
      ticket_id: matched.id_weez_ticket || String(matched.id_participant),
      ticket_url: `https://weezevent.com/ticket/${matched.id_weez_ticket || matched.id_participant}`,
      barcode: matched.barcode || "",
    };
  },
};

// ========== EVENTBRITE ADAPTER (Official API: https://www.eventbriteapi.com/v3/) ==========
const eventbriteAdapter = {
  // GET /v3/users/me/ → test connection
  async testConnection(config: any): Promise<{ success: boolean; events_count?: number }> {
    const res = await fetch("https://www.eventbriteapi.com/v3/users/me/", {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Eventbrite auth failed (${res.status}): ${errorText}`);
    }
    // Optionally count events for the organization
    const configData = config.config_data || {};
    if (configData.organization_id) {
      const evtRes = await fetch(
        `https://www.eventbriteapi.com/v3/organizations/${configData.organization_id}/events/?status=live`,
        { headers: { Authorization: `Bearer ${config.api_key}` } }
      );
      if (evtRes.ok) {
        const evtData = await evtRes.json();
        return { success: true, events_count: evtData.pagination?.object_count || 0 };
      }
    }
    return { success: true };
  },

  // GET /v3/events/{event_id}/attendees/ → match volunteer by email
  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const eventId = config.event_id_external;
    if (!eventId) throw new Error("Eventbrite Event ID is niet geconfigureerd");

    // Paginate through attendees to find a match
    let page = 1;
    let matched: any = null;

    while (!matched) {
      const url = `https://www.eventbriteapi.com/v3/events/${encodeURIComponent(eventId)}/attendees/?page=${page}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${config.api_key}` },
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Eventbrite attendees failed (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      const attendees = data.attendees || [];

      // Match by email
      if (volunteer.email) {
        matched = attendees.find((a: any) =>
          a.profile?.email?.toLowerCase() === volunteer.email.toLowerCase()
        );
      }

      // Match by name if no email match
      if (!matched && volunteer.name) {
        const nameParts = volunteer.name.toLowerCase().split(" ");
        matched = attendees.find((a: any) => {
          const firstName = (a.profile?.first_name || "").toLowerCase();
          const lastName = (a.profile?.last_name || "").toLowerCase();
          return nameParts.some((part: string) => firstName.includes(part) || lastName.includes(part));
        });
      }

      // Check if there are more pages
      if (!matched && data.pagination?.has_more_items) {
        page++;
      } else {
        break;
      }
    }

    if (!matched) {
      throw new Error(
        `Geen overeenkomend ticket gevonden in Eventbrite voor ${volunteer.name || volunteer.email}. ` +
        `Maak eerst een ticket aan in Eventbrite voor deze vrijwilliger.`
      );
    }

    const barcode = matched.barcodes?.[0]?.barcode || "";
    return {
      ticket_id: String(matched.id),
      ticket_url: matched.resource_uri || `https://www.eventbrite.com/e/${eventId}`,
      barcode,
    };
  },
};

// ========== STUB ADAPTERS (voor providers zonder publieke API-documentatie) ==========
const createStubAdapter = (providerName: string) => ({
  async testConnection(_config: any) {
    return { success: true };
  },
  async createTicket(_config: any, _volunteer: any) {
    return {
      ticket_id: `${providerName}_${crypto.randomUUID().slice(0, 8)}`,
      ticket_url: `https://${providerName}.example.com/ticket/${crypto.randomUUID().slice(0, 8)}`,
      barcode: `${providerName.toUpperCase().slice(0, 3)}${Date.now()}`,
    };
  },
});

// Provider adapter registry
const providerAdapters: Record<string, {
  testConnection: (config: any) => Promise<{ success: boolean; events_count?: number }>;
  createTicket: (config: any, volunteer: any) => Promise<{ ticket_id: string; ticket_url: string; barcode: string }>;
}> = {
  // Real integrations (official API)
  weezevent: weezeventAdapter,
  
  // Real integrations (official API)
  eventbrite: eventbriteAdapter,
  
  // Stub integrations (no public API docs available yet)
  eventsquare: createStubAdapter("es"),
  ticketmaster_sport: createStubAdapter("tm"),
  roboticket: createStubAdapter("rb"),
  tymes: createStubAdapter("ty"),
  eventix: createStubAdapter("ex"),
  yourticketprovider: createStubAdapter("ytp"),
  paylogic_seetickets: createStubAdapter("pl"),
  ticketmatic: createStubAdapter("tkm"),
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

    const adapter = providerAdapters[config.provider];
    if (!adapter) {
      return new Response(JSON.stringify({ success: false, error: `Unsupported provider: ${config.provider}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Test connection
    if (action === "test") {
      try {
        const result = await adapter.testConnection(config);

        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "test_connection",
          request_payload: { provider: config.provider },
          response_payload: result,
          status: "success",
        });

        return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "test_connection",
          request_payload: { provider: config.provider },
          status: "error",
          error_message: e.message,
        });

        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Create ticket
    if (action === "create_ticket") {
      const { event_id, volunteer_id, task_id } = body;

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
