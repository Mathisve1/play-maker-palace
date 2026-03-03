

## Plan: Volledige Maandplanning Toekenning & Ticket Integratie

### Huidige situatie

De flow is nu: vrijwilliger schrijft zich in → club stuurt contract → vrijwilliger tekent → vrijwilliger meldt zich vrij aan voor dagen → krijgt automatisch een MP-barcode. Er is geen goedkeurings-stap en geen integratie met het ticketing-systeem.

### Gewenste flow

```text
ENROLLMENT:
Vrijwilliger schrijft in ──► Club keurt goed ──► Club stuurt contract ──► Vrijwilliger tekent
                              (approval_status)    (contract_status)       (contract_status)

DAG-AANMELDING (pas na getekend contract):
Vrijwilliger meldt aan ──► Club bevestigt/kent toe ──► Club genereert ticket ──► Ticket via e-mail
  (status: pending)         (status: assigned)          (volunteer_tickets)      (ticketing-generate)

CHECK-IN:
Ticketing Dashboard ──► Scan QR/barcode ──► Check-in bevestigd
```

### 1. Database migratie

**`monthly_enrollments`** — nieuw veld:
- `approval_status TEXT DEFAULT 'pending'` (waarden: `pending`, `approved`, `rejected`)

Geen nieuwe tabellen nodig. Tickets gaan via de bestaande `volunteer_tickets` tabel.

### 2. MonthlyPlanning pagina — Club-side wijzigingen

**Enrollment lijst uitbreiden:**
- Kolom `approval_status` tonen met badges (Wacht/Goedgekeurd/Afgewezen)
- Knoppen "Goedkeuren" / "Afwijzen" wanneer `approval_status = 'pending'`
- "Contract versturen" knop alleen zichtbaar als `approval_status = 'approved'`
- Flow: Goedkeuren → Contract versturen → Getekend

**Dag-aanmeldingen beheren (nieuwe sectie):**
- Lijst van `monthly_day_signups` met `status = 'pending'` → club kan "Toekennen" of "Afwijzen"
- Na toekenning (`status = 'assigned'`): knop "Ticket genereren" verschijnt
- Ticket genereren maakt een `volunteer_tickets` rij aan (hergebruik `ticketing-generate` edge function met `action: create_internal_ticket`)
- Optie om ticket per e-mail te versturen (hergebruik `send_ticket_email_invite`)

### 3. Club Owner Dashboard — KPI's & actielijst

Vier nieuwe KPI-kaarten specifiek voor actieve maandplannen:
- **Wachtende inschrijvingen** — `monthly_enrollments` met `approval_status = 'pending'`
- **Contracten te versturen** — `approval_status = 'approved'` AND `contract_status = 'pending'`  
- **Dag-aanmeldingen te bevestigen** — `monthly_day_signups` met `status = 'pending'`
- **Tickets te genereren** — `monthly_day_signups` met `status = 'assigned'` zonder gekoppeld `volunteer_ticket`

Elk KPI-kaartje linkt door naar `/monthly-planning` met de juiste maand.

### 4. Volunteer-side wijzigingen (VolunteerMonthlyTab)

- Na enrollment: toon "Wacht op goedkeuring" status als `approval_status = 'pending'`
- Dag-aanmelding geblokkeerd tot `approval_status = 'approved'` EN `contract_status = 'signed'`
- Na dag-aanmelding: toon "Wacht op bevestiging" als `status = 'pending'`
- Na toekenning: toon ticket barcode/QR wanneer `volunteer_ticket` bestaat

### 5. Ticketing Dashboard integratie

- Event-selector uitbreiden: naast events ook gepubliceerde `monthly_plans` tonen (met label "Maandplan: Maart 2026")
- Wanneer een maandplan geselecteerd is:
  - Planning-tab: toont dag-taken met toegekende vrijwilligers + ticket status
  - Live-tab: toont real-time check-in status van vandaag
  - Scan-tab: bestaande QR-scanner werkt al met barcodes uit `volunteer_tickets`

### Technische details

**Bestanden die wijzigen:**
- `src/pages/MonthlyPlanning.tsx` — goedkeuringsflow enrollments + dag-toekenning + ticket generatie
- `src/components/VolunteerMonthlyTab.tsx` — blokkering + statusweergave
- `src/pages/ClubOwnerDashboard.tsx` — 4 maandplanning KPI-kaarten
- `src/pages/TicketingDashboard.tsx` — maandplannen in event-selector + data loading

**Edge functions hergebruikt (geen nieuwe nodig):**
- `ticketing-generate` met `action: create_internal_ticket` voor ticket-generatie
- `ticketing-generate` met `action: send_ticket_email_invite` voor e-mail

**Database migratie:**
- `ALTER TABLE monthly_enrollments ADD COLUMN approval_status TEXT DEFAULT 'pending'`

