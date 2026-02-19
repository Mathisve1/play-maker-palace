import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ========== WEEZEVENT ADAPTER ==========
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

  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const eventId = config.event_id_external;
    if (!eventId) throw new Error("Weezevent Event ID is niet geconfigureerd");

    const accessToken = await this.authenticate(config);
    
    const url = `https://api.weezevent.com/participant/list?api_key=${encodeURIComponent(config.api_key)}&access_token=${encodeURIComponent(accessToken)}&id_event[]=${encodeURIComponent(eventId)}&full=1`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Weezevent API error (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const participants = data.participants || [];

    let matched = null;
    if (volunteer.email) {
      matched = participants.find((p: any) =>
        p.owner?.email?.toLowerCase() === volunteer.email.toLowerCase()
      );
    }

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

// ========== EVENTBRITE ADAPTER (with auto-sync) ==========
const eventbriteAdapter = {
  _getToken(config: any): string {
    return config.api_key; // Private token stored as api_key
  },

  // GET /v3/users/me/ → test connection
  async testConnection(config: any): Promise<{ success: boolean; events_count?: number }> {
    const token = this._getToken(config);
    const res = await fetch("https://www.eventbriteapi.com/v3/users/me/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Eventbrite auth failed (${res.status}): ${errorText}`);
    }
    const configData = config.config_data || {};
    if (configData.organization_id) {
      const evtRes = await fetch(
        `https://www.eventbriteapi.com/v3/organizations/${configData.organization_id}/events/?status=live`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (evtRes.ok) {
        const evtData = await evtRes.json();
        return { success: true, events_count: evtData.pagination?.object_count || 0 };
      }
    }
    return { success: true };
  },

  // GET /v3/users/me/organizations/ → auto get org id
  async getOrganizations(config: any): Promise<{ organizations: { id: string; name: string }[] }> {
    const token = this._getToken(config);
    const res = await fetch("https://www.eventbriteapi.com/v3/users/me/organizations/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Eventbrite organizations failed (${res.status}): ${errorText}`);
    }
    const data = await res.json();
    const orgs = (data.organizations || []).map((o: any) => ({ id: String(o.id), name: o.name }));
    return { organizations: orgs };
  },

  // POST /v3/organizations/{org_id}/events/ → create event + publish it
  async createEvent(config: any, eventData: { title: string; start: string; end: string; timezone: string; currency?: string; location?: string }): Promise<{ event_id: string; event_url: string }> {
    const token = this._getToken(config);
    const configData = config.config_data || {};
    const orgId = configData.organization_id;
    if (!orgId) throw new Error("Organization ID is niet beschikbaar. Sync eerst je organisatie.");

    const payload: any = {
      event: {
        name: { html: eventData.title },
        start: { timezone: eventData.timezone || "Europe/Brussels", utc: eventData.start },
        end: { timezone: eventData.timezone || "Europe/Brussels", utc: eventData.end },
        currency: eventData.currency || "EUR",
        online_event: false,
        listed: false, // Don't list volunteer events publicly
      },
    };

    const res = await fetch(`https://www.eventbriteapi.com/v3/organizations/${orgId}/events/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Eventbrite create event failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const eventId = String(data.id);
    const eventUrl = data.url || `https://www.eventbrite.com/e/${eventId}`;

    // Publish the event so tickets can be ordered
    try {
      const publishRes = await fetch(`https://www.eventbriteapi.com/v3/events/${eventId}/publish/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!publishRes.ok) {
        const publishErr = await publishRes.text();
        console.warn(`Eventbrite publish warning (${publishRes.status}): ${publishErr}`);
        // Don't throw - event is created, publish may need a ticket class first
      }
    } catch (e) {
      console.warn("Eventbrite publish attempt failed:", e);
    }

    return { event_id: eventId, event_url: eventUrl };
  },

  // POST /v3/events/{event_id}/ticket_classes/ → create free ticket class, then publish event
  async createTicketClass(config: any, eventId: string, taskName: string, quantity?: number): Promise<{ ticket_class_id: string }> {
    const token = this._getToken(config);

    const payload = {
      ticket_class: {
        name: taskName,
        free: true,
        quantity_total: quantity || 100,
        minimum_quantity: 1,
        maximum_quantity: 1,
      },
    };

    const res = await fetch(`https://www.eventbriteapi.com/v3/events/${eventId}/ticket_classes/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Eventbrite create ticket class failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    const ticketClassId = String(data.id);

    // Now that a ticket class exists, try to publish the event
    try {
      const publishRes = await fetch(`https://www.eventbriteapi.com/v3/events/${eventId}/publish/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!publishRes.ok) {
        const publishErr = await publishRes.text();
        console.warn(`Eventbrite publish after ticket-class (${publishRes.status}): ${publishErr}`);
      } else {
        console.log(`Eventbrite event ${eventId} published successfully`);
      }
    } catch (e) {
      console.warn("Eventbrite publish attempt failed:", e);
    }

    return { ticket_class_id: ticketClassId };
  },

  // Assign ticket internally with a unique barcode for check-in scanning.
  // Eventbrite API does not support direct attendee creation (405 Method Not Allowed),
  // so we generate a scannable barcode linked to the volunteer in our own system.
  async createAttendee(_config: any, eventId: string, ticketClassId: string, volunteer: { name?: string; email?: string }): Promise<{ ticket_id: string; ticket_url: string | null; barcode: string }> {
    // Generate a unique, scannable barcode
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const barcode = `EB${eventId.slice(-6)}${ticketClassId.slice(-4)}${timestamp}${random}`;
    const ticketId = `eb-${eventId}-${ticketClassId}-${timestamp}`;

    return {
      ticket_id: ticketId,
      ticket_url: null, // No external link for privacy
      barcode,
    };
  },

  // Legacy: search existing attendees (fallback for non-auto-sync events)
  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const token = this._getToken(config);
    const eventId = config.event_id_external;
    if (!eventId) throw new Error("Eventbrite Event ID is niet geconfigureerd");

    let page = 1;
    let matched: any = null;

    while (!matched) {
      const url = `https://www.eventbriteapi.com/v3/events/${encodeURIComponent(eventId)}/attendees/?page=${page}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Eventbrite attendees failed (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      const attendees = data.attendees || [];

      if (volunteer.email) {
        matched = attendees.find((a: any) =>
          a.profile?.email?.toLowerCase() === volunteer.email.toLowerCase()
        );
      }

      if (!matched && volunteer.name) {
        const nameParts = volunteer.name.toLowerCase().split(" ");
        matched = attendees.find((a: any) => {
          const firstName = (a.profile?.first_name || "").toLowerCase();
          const lastName = (a.profile?.last_name || "").toLowerCase();
          return nameParts.some((part: string) => firstName.includes(part) || lastName.includes(part));
        });
      }

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

// ========== WEEZTIX (ex-EVENTIX) ADAPTER ==========
const weeztixAdapter = {
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

  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const configData = config.config_data || {};
    const companyGuid = configData.company_guid;
    if (!companyGuid) throw new Error("Weeztix Company GUID is niet geconfigureerd");

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

    const orderGuid = matched.guid || matched.id || "";
    const tickets = matched.tickets || [];
    let barcode = "";
    let ticketUrl = "";

    if (tickets.length > 0) {
      const ticket = tickets[0];
      barcode = ticket.barcode || ticket.guid || "";
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

// ========== TICKETMATIC ADAPTER ==========
const ticketmaticAdapter = {
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

  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const base = this._baseUrl(config);
    const headers = this._headers(config);

    let contactId: number | null = null;
    if (volunteer.email) {
      const contactRes = await fetch(`${base}/contacts?searchterm=${encodeURIComponent(volunteer.email)}&limit=5`, { headers });
      if (contactRes.ok) {
        const contactData = await contactRes.json();
        const contacts = contactData.data || contactData || [];
        if (Array.isArray(contacts) && contacts.length > 0) {
          const match = contacts.find((c: any) => (c.email || "").toLowerCase() === volunteer.email.toLowerCase());
          contactId = match?.id || contacts[0]?.id || null;
        }
      }
    }

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

    const eventId = config.event_id_external;
    let orderUrl = `${base}/orders?filter=customerid%3D${contactId}&limit=10`;
    const orderRes = await fetch(orderUrl, { headers });
    if (!orderRes.ok) {
      const errorText = await orderRes.text();
      throw new Error(`Ticketmatic orders failed (${orderRes.status}): ${errorText}`);
    }

    const orderData = await orderRes.json();
    const orders = orderData.data || orderData || [];

    let matchedOrder: any = null;
    for (const order of (Array.isArray(orders) ? orders : [])) {
      if (eventId) {
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

    const tickets = matchedOrder.tickets || [];
    const firstTicket = tickets[0] || {};
    const barcode = firstTicket.barcode || firstTicket.ticketholderbarcode || "";
    const orderId = matchedOrder.orderid || matchedOrder.id || "";

    let ticketUrl = "";
    if (orderId) {
      try {
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

// ========== PAYLOGIC / SEETICKETS ADAPTER ==========
const paylogicAdapter = {
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

  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const configData = config.config_data || {};
    const baseUrl = configData.base_url || "https://shopping-api.paylogic.com";
    const eventRef = config.event_id_external;
    const authHeader = `Basic ${btoa(config.api_key + ":" + (config.client_secret || ""))}`;
    const headers: Record<string, string> = { Authorization: authHeader, Accept: "application/json" };

    if (!eventRef) throw new Error("Paylogic Event referentie is niet geconfigureerd");

    const ordersUrl = `${baseUrl}/orders?event=${encodeURIComponent(eventRef)}&page_size=100`;
    const ordersRes = await fetch(ordersUrl, { headers });
    if (!ordersRes.ok) {
      const errorText = await ordersRes.text();
      throw new Error(`Paylogic orders failed (${ordersRes.status}): ${errorText}`);
    }

    const ordersData = await ordersRes.json();
    const orders = ordersData?._embedded?.orders || [];

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

// ========== EVENTSQUARE ADAPTER ==========
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
const createEnterpriseAdapter = (providerName: string, displayName: string, apiBaseUrl: string) => ({
  async testConnection(config: any): Promise<{ success: boolean; events_count?: number }> {
    const configData = config.config_data || {};
    const baseUrl = configData.api_base_url || apiBaseUrl;
    
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
      if (res.status === 401 || res.status === 403) {
        throw new Error(`${displayName}: ongeldige API credentials (${res.status})`);
      }
      return { success: true };
    } catch (e: any) {
      if (e.message.includes("ongeldige")) throw e;
      throw new Error(`${displayName}: kan geen verbinding maken met ${baseUrl}. Controleer de API Base URL.`);
    }
  },

  async createTicket(config: any, volunteer: any): Promise<{ ticket_id: string; ticket_url: string; barcode: string }> {
    const configData = config.config_data || {};
    const baseUrl = configData.api_base_url || apiBaseUrl;
    const eventId = config.event_id_external;

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
  weezevent: weezeventAdapter,
  eventbrite: eventbriteAdapter,
  eventix: weeztixAdapter,
  ticketmatic: ticketmaticAdapter,
  paylogic_seetickets: paylogicAdapter,
  eventsquare: eventsquareAdapter,
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

    // ========== ACTION: test ==========
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

    // ========== ACTION: auto_get_org (Eventbrite only) ==========
    if (action === "auto_get_org") {
      if (config.provider !== "eventbrite") {
        return new Response(JSON.stringify({ success: false, error: "auto_get_org is only supported for Eventbrite" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      try {
        const result = await eventbriteAdapter.getOrganizations(config);
        const orgs = result.organizations;
        if (orgs.length === 0) {
          throw new Error("Geen organisaties gevonden bij dit Eventbrite-account.");
        }
        // Use the first org
        const orgId = orgs[0].id;
        const orgName = orgs[0].name;

        // Save org ID in config_data
        const existingData = (config as any).config_data || {};
        await supabase.from("ticketing_configs").update({
          config_data: { ...existingData, organization_id: orgId, organization_name: orgName },
        }).eq("id", config.id);

        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "auto_get_org",
          request_payload: { provider: "eventbrite" },
          response_payload: { organization_id: orgId, organization_name: orgName, total_orgs: orgs.length },
          status: "success",
        });

        return new Response(JSON.stringify({ success: true, organization_id: orgId, organization_name: orgName, organizations: orgs }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "auto_get_org",
          request_payload: { provider: "eventbrite" },
          status: "error",
          error_message: e.message,
        });
        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ========== ACTION: create_event (Eventbrite only) ==========
    if (action === "create_event") {
      if (config.provider !== "eventbrite") {
        return new Response(JSON.stringify({ success: false, error: "create_event is only supported for Eventbrite" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      try {
        const { event_title, event_start, event_end, timezone, internal_event_id } = body;
        
        const result = await eventbriteAdapter.createEvent(config, {
          title: event_title,
          start: event_start,
          end: event_end,
          timezone: timezone || "Europe/Brussels",
        });

        // Save external_event_id on the internal event
        if (internal_event_id) {
          await supabase.from("events").update({ external_event_id: result.event_id } as any).eq("id", internal_event_id);
        }

        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_event",
          request_payload: { event_title, internal_event_id },
          response_payload: result,
          status: "success",
        });

        return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_event",
          request_payload: body,
          status: "error",
          error_message: e.message,
        });
        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ========== ACTION: create_ticket_class (Eventbrite only) ==========
    if (action === "create_ticket_class") {
      if (config.provider !== "eventbrite") {
        return new Response(JSON.stringify({ success: false, error: "create_ticket_class is only supported for Eventbrite" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      try {
        const { external_event_id, task_name, task_id, quantity } = body;
        
        const result = await eventbriteAdapter.createTicketClass(config, external_event_id, task_name, quantity);

        // Save external_ticket_class_id on the task
        if (task_id) {
          await supabase.from("tasks").update({ external_ticket_class_id: result.ticket_class_id } as any).eq("id", task_id);
        }

        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_ticket_class",
          request_payload: { external_event_id, task_name, task_id },
          response_payload: result,
          status: "success",
        });

        return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_ticket_class",
          request_payload: body,
          status: "error",
          error_message: e.message,
        });
        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ========== ACTION: create_attendee (Eventbrite only) ==========
    if (action === "create_attendee") {
      if (config.provider !== "eventbrite") {
        return new Response(JSON.stringify({ success: false, error: "create_attendee is only supported for Eventbrite" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      try {
        const { external_event_id, ticket_class_id, volunteer_id, event_id, task_id } = body;

        // Get volunteer profile
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", volunteer_id).maybeSingle();

        const result = await eventbriteAdapter.createAttendee(config, external_event_id, ticket_class_id, {
          name: profile?.full_name,
          email: profile?.email,
        });

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

        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_attendee",
          request_payload: { volunteer_id, task_id, external_event_id, ticket_class_id },
          response_payload: result,
          status: "success",
        });

        return new Response(JSON.stringify({ success: true, ticket: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_attendee",
          request_payload: body,
          status: "error",
          error_message: e.message,
        });
        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ========== ACTION: create_ticket ==========
    if (action === "create_ticket") {
      const { event_id, volunteer_id, task_id } = body;

      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", volunteer_id).maybeSingle();

      // For Eventbrite: use auto-sync flow (lookup external_event_id from event, auto-create ticket class, create attendee)
      if (config.provider === "eventbrite") {
        try {
          // 1. Get external_event_id from the event
          let externalEventId: string | null = null;
          if (event_id) {
            const { data: eventData } = await supabase.from("events").select("external_event_id, title, event_date").eq("id", event_id).maybeSingle();
            externalEventId = (eventData as any)?.external_event_id || null;

            // Auto-create event in Eventbrite if not yet synced
            if (!externalEventId && eventData) {
              // Auto-fetch organization ID if missing
              const configData = config.config_data || {};
              if (!configData.organization_id) {
                const orgResult = await eventbriteAdapter.getOrganizations(config);
                if (orgResult.organizations.length > 0) {
                  const orgId = orgResult.organizations[0].id;
                  const newConfigData = { ...configData, organization_id: orgId };
                  config.config_data = newConfigData;
                  // Persist it
                  await supabase.from("ticketing_configs").update({ config_data: newConfigData }).eq("id", config.id);
                  await supabase.from("ticketing_logs").insert({
                    club_id,
                    action: "auto_get_org",
                    request_payload: {},
                    response_payload: { organization_id: orgId },
                    status: "success",
                  });
                } else {
                  throw new Error("Geen Eventbrite organisatie gevonden voor dit account.");
                }
              }

              const eventDate = eventData.event_date ? new Date(eventData.event_date) : new Date();
              const endDate = new Date(eventDate.getTime() + 4 * 60 * 60 * 1000); // +4h
              const formatUtc = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

              const createResult = await eventbriteAdapter.createEvent(config, {
                title: eventData.title || "Event",
                start: formatUtc(eventDate),
                end: formatUtc(endDate),
                timezone: "Europe/Brussels",
              });
              externalEventId = createResult.event_id;

              // Save it
              await supabase.from("events").update({ external_event_id: externalEventId } as any).eq("id", event_id);

              await supabase.from("ticketing_logs").insert({
                club_id,
                action: "auto_create_event",
                request_payload: { event_id, event_title: eventData.title },
                response_payload: createResult,
                status: "success",
              });
            }
          }

          if (!externalEventId) {
            throw new Error("Kon geen Eventbrite event aanmaken of vinden voor dit evenement.");
          }

          // 2. Get or create ticket class for this task
          let ticketClassId: string | null = null;
          if (task_id) {
            const { data: taskData } = await supabase.from("tasks").select("external_ticket_class_id, title").eq("id", task_id).maybeSingle();
            ticketClassId = (taskData as any)?.external_ticket_class_id || null;

            if (!ticketClassId) {
              const tcResult = await eventbriteAdapter.createTicketClass(config, externalEventId, taskData?.title || "Vrijwilliger", 100);
              ticketClassId = tcResult.ticket_class_id;

              await supabase.from("tasks").update({ external_ticket_class_id: ticketClassId } as any).eq("id", task_id);

              await supabase.from("ticketing_logs").insert({
                club_id,
                action: "auto_create_ticket_class",
                request_payload: { task_id, task_name: taskData?.title, external_event_id: externalEventId },
                response_payload: tcResult,
                status: "success",
              });
            }
          }

          if (!ticketClassId) {
            throw new Error("Kon geen ticket-class aanmaken voor deze taak.");
          }

          // 3. Create attendee
          const result = await eventbriteAdapter.createAttendee(config, externalEventId, ticketClassId, {
            name: profile?.full_name,
            email: profile?.email,
          });

          // Upsert ticket record
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

          await supabase.from("ticketing_logs").insert({
            club_id,
            action: "create_ticket",
            request_payload: { volunteer_id, task_id, provider: "eventbrite", auto_sync: true },
            response_payload: result,
            status: "success",
          });

          return new Response(JSON.stringify({ success: true, ticket: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (e: any) {
          await supabase.from("ticketing_logs").insert({
            club_id,
            action: "create_ticket",
            request_payload: { volunteer_id, task_id, provider: "eventbrite" },
            status: "error",
            error_message: e.message,
          });

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

      // Non-Eventbrite: use legacy adapter flow
      try {
        const result = await adapter.createTicket(config, { id: volunteer_id, name: profile?.full_name, email: profile?.email });

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

        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_ticket",
          request_payload: { volunteer_id, task_id, provider: config.provider },
          response_payload: result,
          status: "success",
        });

        return new Response(JSON.stringify({ success: true, ticket: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        await supabase.from("ticketing_logs").insert({
          club_id,
          action: "create_ticket",
          request_payload: { volunteer_id, task_id, provider: config.provider },
          status: "error",
          error_message: e.message,
        });

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
