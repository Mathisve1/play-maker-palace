

# Ticketing Integratie Dashboard

## Overzicht
Een volledig ticketing-beheermodule voor clubs, waarmee ze een externe ticketingprovider koppelen, tickets genereren voor vrijwilligers, en live de incheck-status opvolgen via webhooks.

## Nieuwe pagina's en componenten

### 1. Ticketing Dashboard (`/ticketing`) - Nieuwe pagina
Een pagina met 3 tabs (of zijmenu-navigatie):
- **Planning** - Overzicht van evenementen en gekoppelde vrijwilligers
- **Ticketing Setup** - API-configuratie voor de gekozen provider
- **Live Opvolging** - Real-time incheck-status met progress bar

### 2. Database-uitbreidingen

**Tabel `ticketing_configs`** - Slaat de API-configuratie per club op:
- `id`, `club_id`, `provider` (enum van 10 providers), `api_key` (encrypted), `client_secret`, `event_id_external`, `webhook_url`, `is_active`, `created_at`, `updated_at`

**Tabel `volunteer_tickets`** - Koppelt tickets aan vrijwilligers:
- `id`, `club_id`, `event_id` (onze interne event), `volunteer_id`, `task_id`, `external_ticket_id`, `ticket_url`, `barcode`, `status` ('none' | 'sent' | 'checked_in'), `checked_in_at`, `error_message`, `created_at`, `updated_at`

**Tabel `ticketing_logs`** - Logging van API-calls:
- `id`, `club_id`, `volunteer_ticket_id`, `action` (create_ticket, webhook_scan, etc.), `request_payload`, `response_payload`, `status` (success/error), `error_message`, `created_at`

### 3. Edge Functions

**`ticketing-generate` edge function:**
- Ontvangt: provider, API credentials, vrijwilliger-gegevens
- Stuurt een POST naar de API van de geselecteerde provider
- Maakt het ticket aan en slaat het `external_ticket_id` op
- Logt resultaat in `ticketing_logs`

**`ticketing-webhook` edge function:**
- Publiek endpoint (verify_jwt = false)
- Ontvangt scan-events van de provider
- Matcht het gescande ticket met `volunteer_tickets` via `external_ticket_id`
- Updatet status naar 'checked_in' met tijdstempel
- Logt het event

### 4. UI-componenten

**Ticketing Setup tab:**
- Dropdown met 10 providers: EventSquare, Weezevent, Eventbrite, Ticketmaster Sport, Roboticket, Tymes, Eventix, YourTicketProvider, Paylogic/See Tickets, Ticketmatic
- Invoervelden voor API Key, Client Secret, Event ID, Webhook URL (auto-gegenereerd)
- Test-knop om de verbinding te valideren
- Opslaan-knop

**Planning tab:**
- Evenement-selectie dropdown
- Tabel met vrijwilligers (naam, taak, ticketstatus)
- "Genereer & Verstuur Ticket" knop per vrijwilliger of bulk
- Status-badges: Geen ticket (grijs), Ticket Verzonden (blauw), Ingecheckt (groen)

**Live Opvolging tab:**
- Progress bar: X% van Y stewards ingecheckt
- Real-time tabel met vrijwilligers, status en incheck-tijdstempel
- Realtime updates via Supabase Realtime op `volunteer_tickets`

**Log-sectie:**
- Uitklapbare sectie met recente API-calls
- Succes/fout-indicatie per log-entry

### 5. Navigatie
- Nieuwe "Ticketing" knop in het ClubOwnerDashboard actie-grid (naast Loyaliteit)
- Route `/ticketing` toevoegen aan App.tsx

### 6. RLS Policies
- `ticketing_configs`: Alleen club owner/bestuurder/beheerder kan CRUD
- `volunteer_tickets`: Club staff kan lezen/schrijven, vrijwilligers kunnen eigen tickets lezen
- `ticketing_logs`: Alleen club staff kan lezen

### 7. Vertalingen
- NL/FR/EN vertalingen voor alle labels

## Technische details

### Provider API Abstractie
Elke provider heeft een eigen API-formaat. De edge function bevat een `providerAdapter` pattern:

```text
providerAdapters = {
  eventsquare: { createTicket(config, volunteer) },
  weezevent:   { createTicket(config, volunteer) },
  eventbrite:  { createTicket(config, volunteer) },
  ...
}
```

De adapters vertalen de generieke aanvraag naar het juiste API-formaat per provider. Initieel worden de adapters als stubs opgezet - de daadwerkelijke API-integratie per provider vereist documentatie-onderzoek.

### Webhook URL
De webhook URL wordt automatisch gegenereerd op basis van het project:
`https://{project_id}.supabase.co/functions/v1/ticketing-webhook?club_id={club_id}`

De club kopieert deze URL naar de webhook-configuratie van hun ticketingprovider.

### Realtime
`volunteer_tickets` wordt toegevoegd aan de Supabase realtime publication zodat de Live Opvolging tab instant updates krijgt bij incheck-events.

### Bestandswijzigingen
- **Nieuw**: `src/pages/TicketingDashboard.tsx`
- **Nieuw**: `supabase/functions/ticketing-generate/index.ts`
- **Nieuw**: `supabase/functions/ticketing-webhook/index.ts`
- **Wijziging**: `src/App.tsx` (route toevoegen)
- **Wijziging**: `src/pages/ClubOwnerDashboard.tsx` (navigatieknop toevoegen)
- **Migratie**: Nieuwe tabellen + RLS policies + realtime

