import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Je bent de AI-assistent van het De 12e Man-platform — een Belgisch SaaS-platform voor het beheren van vrijwilligers bij sportclubs en evenementen. Je helpt club owners, admins én vrijwilligers met vragen over het platform, de Belgische vrijwilligerswet, en best practices voor evenementenplanning.

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

## COMMUNICATIEREGELS
- Antwoord altijd in het **Nederlands** tenzij de gebruiker in een andere taal schrijft.
- Wees bondig maar volledig. Gebruik opsommingen waar nuttig.
- Verwijs naar specifieke platform-functies als die relevant zijn.
- Bij juridische vragen: verwijs naar het relevante wetsartikel.
- Bij twijfel: raad aan om een juridisch adviseur te raadplegen.
- Gebruik geen technisch jargon tenzij de gebruiker dit doet.
- Je bent behulpzaam, professioneel en vriendelijk.`;

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

    const { messages, conversationId } = await req.json();

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
