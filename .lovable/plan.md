

# Eventbrite Auto-Sync: Automatisch evenementen aanmaken

## Wat gaat er veranderen?

Wanneer een club Eventbrite als ticketing-provider heeft geconfigureerd, zal het systeem **automatisch** een evenement aanmaken in Eventbrite wanneer de club een nieuw evenement aanmaakt in het platform. De Organization ID en Event ID worden dan automatisch ingevuld -- geen handmatige configuratie meer nodig.

Daarnaast wordt het ook mogelijk om **per taak** (bijv. "Stewards Tribune 1") automatisch een gratis ticket-class aan te maken in Eventbrite en vrijwilligers direct als attendee te registreren.

## Functionele flow

1. **Club configureert Eventbrite** in Ticketing Setup: enkel Private Token nodig (Organization ID wordt automatisch opgehaald via `/v3/users/me/organizations/`)
2. **Club maakt een evenement aan** in het dashboard -> systeem maakt automatisch een Eventbrite-event aan via de API en slaat het `event_id_external` op
3. **Club voegt taken toe** (bijv. "Stewards Tribune 1") -> systeem maakt automatisch een gratis ticket-class aan per taak
4. **Ticket genereren** voor een vrijwilliger -> systeem registreert de vrijwilliger als attendee via de Eventbrite API (i.p.v. zoeken naar bestaande attendees)

## Technische wijzigingen

### 1. Edge Function uitbreiden (`supabase/functions/ticketing-generate/index.ts`)

Nieuwe actions toevoegen aan de edge function:

- **`action: "auto_get_org"`**: Haalt automatisch de Organization ID op via `GET /v3/users/me/organizations/` en slaat deze op in `config_data.organization_id`
- **`action: "create_event"`**: Maakt een nieuw Eventbrite-event aan via `POST /v3/organizations/{org_id}/events/` met titel, datum, locatie en tijdzone. Retourneert de `event_id` die opgeslagen wordt.
- **`action: "create_ticket_class"`**: Maakt een gratis ticket-class aan per taak via `POST /v3/events/{event_id}/ticket_classes/`
- **`action: "create_attendee"`** (update van `create_ticket`): In plaats van bestaande attendees te zoeken, maakt de adapter nu **direct een attendee aan** via `POST /v3/events/{event_id}/attendees/` met de naam en email van de vrijwilliger. Dit vervangt de huidige "zoek en match"-logica.

De `eventbriteAdapter` krijgt deze nieuwe methodes:
- `getOrganizations(config)` - haal org-lijst op
- `createEvent(config, eventData)` - maak event aan
- `createTicketClass(config, eventId, taskName)` - maak ticket-class aan
- `createAttendee(config, eventId, ticketClassId, volunteer)` - registreer vrijwilliger

### 2. Database uitbreiding (migratie)

Nieuwe kolom toevoegen aan de `events` tabel:
- `external_event_id TEXT` - slaat het Eventbrite event ID op per intern evenement

Nieuwe kolom toevoegen aan de `tasks` tabel:
- `external_ticket_class_id TEXT` - slaat het Eventbrite ticket-class ID op per taak

### 3. Ticketing Setup UI aanpassen (`src/pages/TicketingDashboard.tsx`)

- Organization ID wordt automatisch opgehaald bij het opslaan van de configuratie (niet meer handmatig invullen)
- Event ID veld wordt vervangen door een info-tekst: "Evenementen worden automatisch gesynchroniseerd"
- Toon een "Sync Organization" knop die de org-ID ophaalt en invult

### 4. ClubOwnerDashboard aanpassen (`src/pages/ClubOwnerDashboard.tsx`)

Na het aanmaken van een evenement in de database:
- Check of de club een actieve Eventbrite-configuratie heeft
- Zo ja, roep de edge function aan met `action: "create_event"` om het automatisch aan te maken in Eventbrite
- Sla het `external_event_id` op bij het interne event
- Toon een toast-melding bij succes/fout

### 5. Planning tab uitbreiden (`src/pages/TicketingDashboard.tsx`)

- "Genereer Ticket" maakt nu direct een attendee aan in Eventbrite (i.p.v. zoeken)
- Automatisch een ticket-class aanmaken als die nog niet bestaat voor de taak
- Toon de Eventbrite event-link bij elk evenement

### 6. Vertalingen

Nieuwe labels in NL/FR/EN:
- "Organisatie wordt automatisch opgehaald"
- "Evenement wordt automatisch aangemaakt in Eventbrite"
- "Ticket-class aangemaakt voor taak X"
- "Vrijwilliger geregistreerd als attendee"

## Samenvatting van bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/ticketing-generate/index.ts` | Nieuwe actions + adapter-methodes voor auto-create |
| `src/pages/TicketingDashboard.tsx` | Setup UI vereenvoudigen, planning tab uitbreiden |
| `src/pages/ClubOwnerDashboard.tsx` | Auto-sync bij event-aanmaak |
| Migratie SQL | `external_event_id` op events, `external_ticket_class_id` op tasks |

