import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Static knowledge base ──────────────────────────────────────────────
const STATIC_PROMPT = `Je bent de AI-assistent van het De 12e Man-platform — een Belgisch SaaS-platform voor het beheren van vrijwilligers bij sportclubs en evenementen. Je helpt club owners, admins én vrijwilligers met vragen over het platform, de Belgische vrijwilligerswet, en best practices voor evenementenplanning.

## BELGISCHE VRIJWILLIGERSWET (Wet van 3 juli 2005)

### Kernbegrippen
- **Vrijwilligerswerk** (Art. 3): Onbezoldigde, onverplichte activiteit ten behoeve van een organisatie (VZW), niet in het kader van een arbeidsovereenkomst.
- **Informatieplicht** (Art. 4-5): De organisatie moet de vrijwilliger VÓÓR aanvang informeren over: het juridisch statuut, de verzekeringsdekking, kostenvergoeding, en eventuele geheimhoudingsplicht.
- **Verzekering** (Art. 6): Verplichte BA-verzekering (burgerlijke aansprakelijkheid). Optioneel: lichamelijke schade en weg van/naar activiteiten.
- **Kostenvergoeding** (Art. 7): Forfaitair OF reële kosten (niet combineren, behalve vervoer). Forfaitair maximum 2024: €41,48/dag, €1.659,29/jaar. Overschrijding = belastbare inkomst.
- **Aansprakelijkheid** (Art. 8-9): Vrijwilliger is NIET aansprakelijk behalve bij opzet, zware fout of herhaaldelijke lichte fout. De organisatie is aansprakelijk zoals een aansteller.
- **Geheimhouding** (Art. 10): Vrijwilligers die vertrouwelijke info kennen zijn gebonden aan beroepsgeheim (Art. 458 Strafwetboek).
- **Werkzoekenden** (Art. 11): Moeten vrijwilligerswerk vooraf melden bij RVA/ONEM.
- **Cumulatie uitkeringen** (Art. 12): Vrijwilligerswerk is mogelijk met sociale uitkeringen, mits voorafgaande melding.

### Veelgestelde compliance-vragen
- Maximale vergoeding per dag en per jaar mag NIET overschreden worden.
- Forfaitair en reëel mag NIET gecombineerd worden (behalve vervoerskosten).
- Organisatienota/contract is wettelijk verplicht (Art. 4).
- Minderjarigen: specifieke regels rond toestemming ouders en arbeidsrecht.

## PLATFORM-FUNCTIES (De 12e Man)

### Evenementenbeheer
- **Events Manager**: Aanmaken van evenementen met groepen (teams), taken en zones.
- **Groepen**: Kleurgecodeerde teams met polsband-info en materiaalnotities.
- **Taken**: Per groep, met tijdslots, locatie, vereiste vaardigheden en spots.
- **Zones**: Geografische indeling van het evenement voor safety en planning.

### Planning
- **Planning Overview**: Drag-and-drop toewijzing van vrijwilligers aan taken.
- **Zone Planning**: Gedetailleerde zone-indeling met taakkoppeling.
- **Monthly Planning**: Maandelijkse roosters met dagelijkse taken, check-in/out, uurbevestiging.

### Briefings
- **Briefing Builder**: Interactieve briefings per groep met blokken (tekst, tijdslots, checklists, routes, contacten, media).
- Briefings kunnen via chat of link naar vrijwilligers verstuurd worden.
- Voortgang per vrijwilliger wordt bijgehouden.

### Contracten & Compliance
- **Contract Builder**: Templates op basis van de Belgische vrijwilligerswet met variabelen ({{club_naam}}, {{IBAN}}, etc.).
- **DocuSeal-integratie**: Digitale handtekeningen.
- **Compliance Dashboard**: Maandelijkse verklaringen, uren- en vergoedingsoverzicht.
- **Maandelijkse declaraties**: Vrijwilligers moeten externe uren/inkomsten aangeven.

### Veiligheid (Safety)
- **Safety Rollen**: Configureerbare rollen (Steward, Coördinator, etc.) met permissies.
- **Safety Zones**: Per event, met checklist-items.
- **Incident Management**: Melden, toewijzen, prioriteren, oplossen met foto en locatie.
- **Closing Procedures**: Afsluittaken na een event (met foto-/notitie-vereisten).
- **Control Room**: Live dashboard tijdens events.

### Betalingen
- **Uurbevestiging**: Dual-approval systeem (vrijwilliger + club).
- **SEPA Payouts**: Batch-uitbetalingen via XML-export.

### Academy
- **Online trainingen**: AI-gegenereerde content met quizzen.
- **Fysieke trainingen**: QR-incheck, certificaten.
- **Certificaten**: Aangepaste ontwerpen, automatisch uitgereikt.

### Community & Communicatie
- **Community**: Clubs en partners ontdekken, volgen.
- **Chat**: 1-op-1 berichten met bijlagen en audio.
- **Bulk Messages**: Massa-berichten naar vrijwilligers.
- **Notificaties**: In-app + push notificaties.

### Partners
- **External Partners**: Organisaties die vrijwilligers delen met clubs.
- **Partner Dashboard**: Eigen leden beheren, aanmelden voor events.

### Loyalty
- **Loyalty Programs**: Punten- of taken-gebaseerde beloningsprogramma's.

### Rapportage
- **Reporting Dashboard**: Financieel, compliance en partner-rapporten.
- **Report Builder**: AI-gegenereerde rapporten.

## BEST PRACTICES EVENEMENTENPLANNING

### Voorbereiding (4-6 weken voor event)
1. Maak het event aan in Events Manager met juiste datum en locatie.
2. Definieer groepen (bijv. Onthaal, Parking, Catering, Security).
3. Maak taken aan per groep met duidelijke tijdslots.
4. Stel zones in voor de veiligheidsplanning.
5. Configureer safety rollen en wijs coördinatoren toe.

### Vrijwilligersbeheer (2-4 weken voor event)
1. Publiceer taken zodat vrijwilligers zich kunnen inschrijven.
2. Verstuur contracten via Contract Builder.
3. Maak briefings aan per groep.
4. Controleer compliance (verzekeringen, verklaringen).

### Event-dag
1. Gebruik het Command Center voor live overzicht.
2. Check-in vrijwilligers via QR-scanning.
3. Monitor safety via Control Room.
4. Behandel incidenten via het incident-systeem.

### Na het event
1. Bevestig uren (dual-approval).
2. Verwerk betalingen via SEPA.
3. Voer closing procedures uit.
4. Genereer rapporten.

## FEW-SHOT VOORBEELDEN

### Voorbeeld 1: Compliance-vraag
**Vraag:** "Hoeveel mag ik een vrijwilliger betalen?"
**Antwoord:** Volgens de Belgische vrijwilligerswet (Art. 7) mag je kiezen tussen:
- **Forfaitaire vergoeding**: max. €41,48/dag en €1.659,29/jaar (bedragen 2024)
- **Reële kostenvergoeding**: onbeperkt, maar met bewijsstukken

⚠️ Je mag forfaitair en reëel **niet combineren** (behalve vervoerskosten bovenop forfaitair).

Als je boven de forfaitaire limieten gaat, wordt het volledige bedrag belastbaar als inkomen. Gebruik het **Compliance Dashboard** om dit per vrijwilliger te monitoren.

### Voorbeeld 2: Planning-vraag
**Vraag:** "Hoe plan ik een nieuw evenement?"
**Antwoord:** Ga naar **Events Manager** en volg deze stappen:
1. Klik op "Nieuw evenement" en vul titel, datum en locatie in
2. Maak **groepen** aan (bijv. Parking, Onthaal, Security) met kleuren
3. Voeg **taken** toe per groep met tijdslots en het aantal benodigde vrijwilligers
4. Ga naar **Planning Overview** om vrijwilligers toe te wijzen aan taken
5. Maak **briefings** aan per groep in de Briefing Builder
6. Verstuur briefings en contracten naar je vrijwilligers

💡 Start minstens 4 weken voor het event met de voorbereiding.

### Voorbeeld 3: Platform-navigatie
**Vraag:** "Waar vind ik de uurbevestigingen?"
**Antwoord:** De uurbevestigingen vind je op twee plaatsen:
- **Als clubbeheerder**: Ga naar het tabblad **Betalingen** op je Club Dashboard. Daar zie je alle openstaande uurbevestigingen per vrijwilliger.
- **Als vrijwilliger**: Ga naar je **Vrijwilligers Dashboard** → tabblad **Betalingen**. Daar kan je je eigen uren rapporteren en bevestigen.

Het systeem werkt met **dual-approval**: zowel de vrijwilliger als de club moeten de uren goedkeuren voordat ze verwerkt worden.

### Voorbeeld 4: Context-bewust antwoord
**Vraag:** "Wat moet ik hier doen?"
**Antwoord (op Events Manager pagina):** Je bent op de **Events Manager** pagina. Hier kan je:
- 📅 Bestaande evenementen bekijken en bewerken
- ➕ Een nieuw evenement aanmaken
- 👥 Groepen en taken beheren per event
- 🗺️ Zones instellen voor de veiligheidsplanning

Wil je een specifiek event opzetten of heb je hulp nodig bij een bepaalde functie?

## COMMUNICATIEREGELS
- Antwoord altijd in het **Nederlands** tenzij de gebruiker in een andere taal schrijft.
- Wees bondig maar volledig. Gebruik opsommingen waar nuttig.
- Verwijs naar specifieke platform-functies als die relevant zijn.
- Bij juridische vragen: verwijs naar het relevante wetsartikel.
- Bij twijfel: raad aan om een juridisch adviseur te raadplegen.
- Gebruik geen technisch jargon tenzij de gebruiker dit doet.
- Je bent behulpzaam, professioneel en vriendelijk.
- Als je live clubdata hebt, gebruik die actief in je antwoorden (bijv. "Je hebt 3 openstaande events").
- Als de gebruiker op een specifieke pagina zit, geef advies dat relevant is voor die pagina.`;

// ── Page name mapping ──────────────────────────────────────────────────
const PAGE_LABELS: Record<string, string> = {
  "/club-dashboard": "Club Dashboard",
  "/events-manager": "Events Manager",
  "/planning": "Planning Overview",
  "/zone-planning": "Zone Planning",
  "/monthly-planning": "Maandplanning",
  "/briefing-builder": "Briefing Builder",
  "/contract-builder": "Contract Builder",
  "/compliance": "Compliance Dashboard",
  "/safety": "Safety Overview",
  "/safety-dashboard": "Safety Dashboard",
  "/command-center": "Command Center",
  "/sepa-payouts": "SEPA Betalingen",
  "/reporting": "Rapportage",
  "/volunteer-dashboard": "Vrijwilligers Dashboard",
  "/volunteer-management": "Vrijwilligersbeheer",
  "/external-partners": "Externe Partners",
  "/loyalty": "Loyaliteitsprogramma's",
  "/academy-builder": "Academy Builder",
  "/ticketing": "Ticketing",
  "/community": "Community",
  "/chat": "Chat",
};

function getPageLabel(path: string): string {
  // Exact match first
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  // Prefix match
  for (const [prefix, label] of Object.entries(PAGE_LABELS)) {
    if (path.startsWith(prefix)) return label;
  }
  return path;
}

// ── Server-side context fetching ───────────────────────────────────────
async function fetchClubContext(userId: string, clubId: string | null, serviceClient: any) {
  if (!clubId) return null;

  const [
    eventsRes,
    tasksRes,
    membersRes,
    signupsRes,
  ] = await Promise.all([
    serviceClient.from("events").select("id, title, event_date, status, is_live").eq("club_id", clubId).order("event_date", { ascending: true }).limit(10),
    serviceClient.from("tasks").select("id, title, status").eq("club_id", clubId).eq("status", "open").limit(50),
    serviceClient.from("club_members").select("id, role").eq("club_id", clubId),
    serviceClient.from("task_signups").select("id, status").in("status", ["pending"]).limit(100),
  ]);

  const events = eventsRes.data || [];
  const activeEvents = events.filter((e: any) => e.status !== "completed");
  const liveEvents = events.filter((e: any) => e.is_live);
  const nextEvent = activeEvents.find((e: any) => e.event_date && new Date(e.event_date) >= new Date());
  const openTasks = tasksRes.data || [];
  const members = membersRes.data || [];
  const pendingSignups = signupsRes.data || [];

  // Role breakdown
  const roleCounts: Record<string, number> = {};
  members.forEach((m: any) => { roleCounts[m.role] = (roleCounts[m.role] || 0) + 1; });

  return {
    activeEventCount: activeEvents.length,
    liveEventCount: liveEvents.length,
    nextEvent: nextEvent ? { title: nextEvent.title, date: nextEvent.event_date } : null,
    openTaskCount: openTasks.length,
    totalMembers: members.length,
    roleCounts,
    pendingSignupCount: pendingSignups.length,
  };
}

function buildDynamicContext(clientContext: any, serverContext: any): string {
  const lines: string[] = ["## HUIDIGE CONTEXT"];

  if (clientContext?.userName) lines.push(`- Gebruiker: ${clientContext.userName}`);
  if (clientContext?.clubName) {
    let clubLine = `- Club: ${clientContext.clubName}`;
    if (clientContext.clubSport) clubLine += ` (${clientContext.clubSport})`;
    if (clientContext.clubLocation) clubLine += ` — ${clientContext.clubLocation}`;
    lines.push(clubLine);
  }

  // Role
  if (clientContext?.isOwner) {
    lines.push("- Jouw rol: **Bestuurder** (club owner)");
  } else if (clientContext?.memberRole) {
    lines.push(`- Jouw rol: **${clientContext.memberRole}**`);
  }

  // Current page
  if (clientContext?.currentPage) {
    lines.push(`- Huidige pagina: **${getPageLabel(clientContext.currentPage)}**`);
  }

  // Server-side stats
  if (serverContext) {
    if (serverContext.activeEventCount !== undefined) {
      let eventLine = `- Actieve events: ${serverContext.activeEventCount}`;
      if (serverContext.liveEventCount > 0) eventLine += ` (${serverContext.liveEventCount} live)`;
      if (serverContext.nextEvent) eventLine += ` — volgend: ${serverContext.nextEvent.title} (${serverContext.nextEvent.date})`;
      lines.push(eventLine);
    }
    if (serverContext.totalMembers !== undefined) lines.push(`- Teamleden: ${serverContext.totalMembers}`);
    if (serverContext.openTaskCount !== undefined) lines.push(`- Open taken: ${serverContext.openTaskCount}`);
    if (serverContext.pendingSignupCount > 0) lines.push(`- ⚠️ Wachtende aanmeldingen: ${serverContext.pendingSignupCount}`);
  }

  if (clientContext?.language) lines.push(`- Taal interface: ${clientContext.language === "nl" ? "Nederlands" : clientContext.language === "fr" ? "Frans" : "Engels"}`);

  return lines.join("\n");
}

// ── Main handler ───────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { messages, conversationId, context: clientContext } = await req.json();

    // Verify user via Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Niet geautoriseerd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save user message
    if (conversationId && messages.length > 0) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg.role === "user") {
        await supabase.from("ai_messages").insert({
          conversation_id: conversationId,
          role: "user",
          content: lastUserMsg.content,
        });
      }
    }

    // Fetch server-side club context using service role
    let serverContext = null;
    const clubId = clientContext?.clubId;
    if (clubId) {
      try {
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const serviceClient = createClient(supabaseUrl, serviceRoleKey);
        serverContext = await fetchClubContext(user.id, clubId, serviceClient);
      } catch (e) {
        console.error("Failed to fetch club context:", e);
      }
    }

    // Build enriched system prompt
    const dynamicContext = buildDynamicContext(clientContext, serverContext);
    const systemPrompt = `${STATIC_PROMPT}\n\n${dynamicContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer later opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Betaling vereist, voeg credits toe." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-service fout" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
