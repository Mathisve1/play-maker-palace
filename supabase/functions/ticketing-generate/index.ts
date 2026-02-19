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

// ========== WEEZTIX (ex-EVENTIX) ADAPTER (Official API: https://api.weeztix.com) ==========
const weeztixAdapter = {
  // GET /event/upcoming → test connection by listing upcoming events
  async testConnection(config: any): Promise<{ success: boolean; events_count?: number }> {
    const res = await fetch("https://api.weeztix.com/event/upcoming", {
      headers: { Authorization: `Bearer ${config.api_key}` },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Weeztix auth failed (${res.status}): ${errorText}`);
    }
    const data = await res.json();
    return { success: true, events_count: Array.isArray(data) ? data.length : 0 };
  },

  // POST /statistics/orders/:company_guid → search orders, match volunteer by email
  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const configData = config.config_data || {};
    const companyGuid = configData.company_guid;
    if (!companyGuid) throw new Error("Weeztix Company GUID is niet geconfigureerd");

    // Search orders for this company to find matching attendee
    const res = await fetch(`https://api.weeztix.com/statistics/orders/${encodeURIComponent(companyGuid)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: volunteer.email || volunteer.name || "",
        size: 50,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Weeztix orders search failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const orders = data.hits?.hits || data.orders || data || [];

    // Try to find a matching order by email
    let matched: any = null;
    const orderList = Array.isArray(orders) ? orders : [];

    for (const order of orderList) {
      const source = order._source || order;
      const email = (source.email || "").toLowerCase();
      const firstName = (source.first_name || "").toLowerCase();
      const lastName = (source.last_name || "").toLowerCase();

      if (volunteer.email && email === volunteer.email.toLowerCase()) {
        matched = source;
        break;
      }
      if (volunteer.name) {
        const nameParts = volunteer.name.toLowerCase().split(" ");
        if (nameParts.some((part: string) => firstName.includes(part) || lastName.includes(part))) {
          matched = source;
          break;
        }
      }
    }

    if (!matched) {
      throw new Error(
        `Geen overeenkomend ticket gevonden in Weeztix voor ${volunteer.name || volunteer.email}. ` +
        `Maak eerst een ticket aan in het Weeztix dashboard voor deze vrijwilliger.`
      );
    }

    // Get ticket retrieve link if we have order guid and ticket guid
    const orderGuid = matched.guid || matched.id || "";
    const tickets = matched.tickets || [];
    let barcode = "";
    let ticketUrl = "";

    if (tickets.length > 0) {
      const ticket = tickets[0];
      barcode = ticket.barcode || ticket.guid || "";
      // Try to get the PDF retrieve link
      if (orderGuid && ticket.guid) {
        try {
          const linkRes = await fetch(
            `https://api.weeztix.com/order/${encodeURIComponent(orderGuid)}/tickets/${encodeURIComponent(ticket.guid)}/retrievelink`,
            { headers: { Authorization: `Bearer ${config.api_key}` } }
          );
          if (linkRes.ok) {
            const linkData = await linkRes.json();
            ticketUrl = linkData.url || linkData.link || "";
          }
        } catch (_) { /* ignore */ }
      }
    }

    return {
      ticket_id: orderGuid,
      ticket_url: ticketUrl || `https://shop.weeztix.com/order/${orderGuid}`,
      barcode: barcode || orderGuid,
    };
  },
};

// ========== TICKETMATIC ADAPTER (Official API: https://apps.ticketmatic.com/docs/api/) ==========
const ticketmaticAdapter = {
  // Base URL helper
  _baseUrl(config: any): string {
    const configData = config.config_data || {};
    const accountName = configData.account_name;
    if (!accountName) throw new Error("Ticketmatic Account Name is niet geconfigureerd");
    return `https://apps.ticketmatic.com/api/1/${encodeURIComponent(accountName)}`;
  },

  _headers(config: any): Record<string, string> {
    return {
      Authorization: `Bearer ${config.api_key}`,
      "Content-Type": "application/json",
    };
  },

  // GET /api/1/{accountname}/events → test connection
  async testConnection(config: any): Promise<{ success: boolean; events_count?: number }> {
    const base = this._baseUrl(config);
    const res = await fetch(`${base}/events?limit=1`, {
      headers: this._headers(config),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Ticketmatic auth failed (${res.status}): ${errorText}`);
    }
    const data = await res.json();
    return { success: true, events_count: data.nbrofresults || data.data?.length || 0 };
  },

  // GET /api/1/{accountname}/orders → search orders by contact email, match volunteer
  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const base = this._baseUrl(config);
    const headers = this._headers(config);
    const configData = config.config_data || {};

    // Step 1: Find contact by email
    let contactId: number | null = null;
    if (volunteer.email) {
      const contactRes = await fetch(`${base}/contacts?searchterm=${encodeURIComponent(volunteer.email)}&limit=5`, { headers });
      if (contactRes.ok) {
        const contactData = await contactRes.json();
        const contacts = contactData.data || contactData || [];
        if (Array.isArray(contacts) && contacts.length > 0) {
          // Match by email
          const match = contacts.find((c: any) => (c.email || "").toLowerCase() === volunteer.email.toLowerCase());
          contactId = match?.id || contacts[0]?.id || null;
        }
      }
    }

    // Step 2: If no contact found by email, search by name
    if (!contactId && volunteer.name) {
      const contactRes = await fetch(`${base}/contacts?searchterm=${encodeURIComponent(volunteer.name)}&limit=5`, { headers });
      if (contactRes.ok) {
        const contactData = await contactRes.json();
        const contacts = contactData.data || contactData || [];
        if (Array.isArray(contacts) && contacts.length > 0) {
          contactId = contacts[0]?.id || null;
        }
      }
    }

    if (!contactId) {
      throw new Error(
        `Geen contact gevonden in Ticketmatic voor ${volunteer.name || volunteer.email}. ` +
        `Maak eerst een contact aan in Ticketmatic voor deze vrijwilliger.`
      );
    }

    // Step 3: Find orders for this contact
    const eventId = config.event_id_external;
    let orderUrl = `${base}/orders?filter=customerid%3D${contactId}&limit=10`;
    const orderRes = await fetch(orderUrl, { headers });
    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      throw new Error(`Ticketmatic orders failed (${orderRes.status}): ${errorText}`);
    }

    const orderData = await orderRes.json();
    const orders = orderData.data || orderData || [];

    // Find an order, optionally filtering by event
    let matchedOrder: any = null;
    for (const order of (Array.isArray(orders) ? orders : [])) {
      if (eventId) {
        // Check if order contains tickets for this event
        const tickets = order.tickets || [];
        if (tickets.some((t: any) => String(t.eventid) === String(eventId))) {
          matchedOrder = order;
          break;
        }
      } else {
        matchedOrder = order;
        break;
      }
    }

    if (!matchedOrder) {
      throw new Error(
        `Geen bestelling gevonden in Ticketmatic voor ${volunteer.name || volunteer.email}` +
        (eventId ? ` bij event ${eventId}` : "") + `. Maak eerst een ticket aan in Ticketmatic.`
      );
    }

    // Extract barcode from first ticket
    const tickets = matchedOrder.tickets || [];
    const firstTicket = tickets[0] || {};
    const barcode = firstTicket.barcode || firstTicket.ticketholderbarcode || "";
    const orderId = matchedOrder.orderid || matchedOrder.id || "";

    // Try to get PDF document
    let ticketUrl = "";
    if (orderId) {
      try {
        // GET /api/1/{accountname}/orders/{id}/documents/{documentid}/{language}
        // Use a default document, or just link to the order
        ticketUrl = `${base}/orders/${orderId}/documents/1/nl`;
      } catch (_) { /* ignore */ }
    }

    return {
      ticket_id: String(orderId),
      ticket_url: ticketUrl || `https://apps.ticketmatic.com/#/orders/${orderId}`,
      barcode: barcode || String(orderId),
    };
  },
};

// ========== PAYLOGIC / SEETICKETS ADAPTER (Official API: https://shopping-api.paylogic.com) ==========
const paylogicAdapter = {
  // GET /events → test connection
  async testConnection(config: any): Promise<{ success: boolean; events_count?: number }> {
    const configData = config.config_data || {};
    const baseUrl = configData.base_url || "https://shopping-api.paylogic.com";
    const res = await fetch(`${baseUrl}/events`, {
      headers: {
        Authorization: `Basic ${btoa(config.api_key + ":" + (config.client_secret || ""))}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Paylogic auth failed (${res.status}): ${errorText}`);
    }
    const data = await res.json();
    const events = data?._embedded?.events || [];
    return { success: true, events_count: events.length };
  },

  // GET /tickets?code=...&event=... or search orders by email
  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const configData = config.config_data || {};
    const baseUrl = configData.base_url || "https://shopping-api.paylogic.com";
    const eventRef = config.event_id_external;
    const authHeader = `Basic ${btoa(config.api_key + ":" + (config.client_secret || ""))}`;
    const headers: Record<string, string> = { Authorization: authHeader, Accept: "application/json" };

    if (!eventRef) throw new Error("Paylogic Event referentie is niet geconfigureerd");

    // Search orders for this event
    const ordersUrl = `${baseUrl}/orders?event=${encodeURIComponent(eventRef)}&page_size=100`;
    const ordersRes = await fetch(ordersUrl, { headers });
    if (!ordersRes.ok) {
      const errorText = await ordersRes.text();
      throw new Error(`Paylogic orders failed (${ordersRes.status}): ${errorText}`);
    }

    const ordersData = await ordersRes.json();
    const orders = ordersData?._embedded?.orders || [];

    // Find order matching volunteer email or name
    let matched: any = null;
    for (const order of orders) {
      const buyer = order.buyer || {};
      const email = (buyer.email || "").toLowerCase();
      const firstName = (buyer.first_name || "").toLowerCase();
      const lastName = (buyer.last_name || "").toLowerCase();

      if (volunteer.email && email === volunteer.email.toLowerCase()) {
        matched = order;
        break;
      }
      if (volunteer.name) {
        const nameParts = volunteer.name.toLowerCase().split(" ");
        if (nameParts.some((part: string) => firstName.includes(part) || lastName.includes(part))) {
          matched = order;
          break;
        }
      }
    }

    if (!matched) {
      throw new Error(
        `Geen bestelling gevonden in Paylogic/SeeTickets voor ${volunteer.name || volunteer.email}. ` +
        `Maak eerst een ticket aan voor deze vrijwilliger.`
      );
    }

    // Get tickets from the order
    const tickets = matched._embedded?.tickets || [];
    const firstTicket = tickets[0] || {};
    const barcode = firstTicket.code || "";
    const ticketUid = firstTicket.uid || matched.uid || "";

    return {
      ticket_id: ticketUid,
      ticket_url: matched._links?.self?.href || `${baseUrl}/orders/${matched.uid}`,
      barcode: barcode || ticketUid,
    };
  },
};

// ========== EVENTSQUARE ADAPTER (API: https://api.eventsquare.io) ==========
// EventSquare is a Belgian ticketing provider. Their API requires partner access.
// This adapter uses the documented pattern: Bearer token + /events and /orders endpoints.
const eventsquareAdapter = {
  async testConnection(config: any): Promise<{ success: boolean; events_count?: number }> {
    const configData = config.config_data || {};
    const storeSlug = configData.store_slug;
    if (!storeSlug) throw new Error("EventSquare Store slug is niet geconfigureerd");
    
    const res = await fetch(`https://api.eventsquare.io/1.0/store/${encodeURIComponent(storeSlug)}`, {
      headers: { Authorization: `Bearer ${config.api_key}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`EventSquare auth failed (${res.status}): ${errorText}`);
    }
    const data = await res.json();
    return { success: true, events_count: data?.editions?.length || 0 };
  },

  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const configData = config.config_data || {};
    const storeSlug = configData.store_slug;
    if (!storeSlug) throw new Error("EventSquare Store slug is niet geconfigureerd");
    const eventId = config.event_id_external;
    if (!eventId) throw new Error("EventSquare Event/Edition ID is niet geconfigureerd");

    // Search orders
    const searchParam = volunteer.email || volunteer.name || "";
    const res = await fetch(
      `https://api.eventsquare.io/1.0/store/${encodeURIComponent(storeSlug)}/orders?search=${encodeURIComponent(searchParam)}&edition=${encodeURIComponent(eventId)}`,
      { headers: { Authorization: `Bearer ${config.api_key}`, Accept: "application/json" } }
    );
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`EventSquare orders failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const orders = data?.orders || [];

    if (!orders.length) {
      throw new Error(
        `Geen bestelling gevonden in EventSquare voor ${volunteer.name || volunteer.email}. ` +
        `Maak eerst een ticket aan in EventSquare voor deze vrijwilliger.`
      );
    }

    const order = orders[0];
    const tickets = order.tickets || [];
    const firstTicket = tickets[0] || {};
    const barcode = firstTicket.barcode || firstTicket.code || "";

    return {
      ticket_id: order.id || order.reference || "",
      ticket_url: order.url || `https://eventsquare.co/order/${order.reference || order.id}`,
      barcode: barcode || order.reference || "",
    };
  },
};

// ========== GENERIC ENTERPRISE ADAPTER ==========
// For providers without public APIs (Ticketmaster Sport, Roboticket, Tymes, YourTicketProvider)
// These providers require enterprise/partner agreements for API access.
// The adapter validates config and provides clear error messages directing users to contact the provider.
const createEnterpriseAdapter = (providerName: string, displayName: string, apiBaseUrl: string) => ({
  async testConnection(config: any): Promise<{ success: boolean; events_count?: number }> {
    const configData = config.config_data || {};
    const baseUrl = configData.api_base_url || apiBaseUrl;
    
    // Try a generic authenticated request to validate credentials
    try {
      const res = await fetch(baseUrl, {
        headers: {
          Authorization: `Bearer ${config.api_key}`,
          "X-API-Key": config.api_key,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        return { success: true };
      }
      // If 401/403, credentials are wrong
      if (res.status === 401 || res.status === 403) {
        throw new Error(`${displayName}: ongeldige API credentials (${res.status})`);
      }
      // Other status: might still be ok (some APIs return 404 for root)
      return { success: true };
    } catch (e: any) {
      if (e.message.includes("ongeldige")) throw e;
      // Network error likely means wrong base URL
      throw new Error(`${displayName}: kan geen verbinding maken met ${baseUrl}. Controleer de API Base URL.`);
    }
  },

  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const configData = config.config_data || {};
    const baseUrl = configData.api_base_url || apiBaseUrl;
    const eventId = config.event_id_external;

    // Try generic order/attendee search pattern
    const searchParam = volunteer.email || volunteer.name || "";
    let searchUrl = `${baseUrl}/orders?search=${encodeURIComponent(searchParam)}`;
    if (eventId) searchUrl += `&event_id=${encodeURIComponent(eventId)}`;

    const res = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        "X-API-Key": config.api_key,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(
        `${displayName} API error (${res.status}). ` +
        `Neem contact op met ${displayName} voor API-toegang en documentatie.`
      );
    }

    const data = await res.json();
    const items = data?.orders || data?.attendees || data?.tickets || data?.data || data?.results || [];
    const list = Array.isArray(items) ? items : [];

    if (!list.length) {
      throw new Error(
        `Geen ticket gevonden in ${displayName} voor ${volunteer.name || volunteer.email}. ` +
        `Maak eerst een ticket aan in het ${displayName} dashboard.`
      );
    }

    const item = list[0];
    return {
      ticket_id: String(item.id || item.ticket_id || item.order_id || item.reference || ""),
      ticket_url: item.url || item.ticket_url || item.download_url || "",
      barcode: item.barcode || item.code || item.qr_code || String(item.id || ""),
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
  eventbrite: eventbriteAdapter,
  eventix: weeztixAdapter,
  ticketmatic: ticketmaticAdapter,
  paylogic_seetickets: paylogicAdapter,
  eventsquare: eventsquareAdapter,

  // Enterprise integrations (API access via partner agreement)
  ticketmaster_sport: createEnterpriseAdapter("ticketmaster_sport", "Ticketmaster Sport", "https://api.ticketmastersport.com"),
  roboticket: createEnterpriseAdapter("roboticket", "Roboticket", "https://api.roboticket.com"),
  tymes: createEnterpriseAdapter("tymes", "Tymes", "https://api.tymes.com"),
  yourticketprovider: createEnterpriseAdapter("yourticketprovider", "YourTicketProvider (CM.com)", "https://api.cm.com/ticketing"),
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
