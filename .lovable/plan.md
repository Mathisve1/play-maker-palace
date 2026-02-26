

# Extern Partner Portaal -- Implementatieplan

## Overzicht

Een nieuw module waarmee clubs (Bestuurders) externe partijen (stewards-vzw's, horeca-uitzendkantoren, supportersfederaties) kunnen uitnodigen om hun eigen medewerkers te beheren en toe te wijzen aan evenementen. Dit vervangt handmatige Excel-lijsten.

---

## Fase 1: Database Schema (Migraties)

### Nieuwe tabellen

**`external_partners`** -- De partnerorganisatie zelf
- `id` (uuid, PK)
- `club_id` (uuid, FK naar clubs)
- `name` (text) -- bijv. "Stewards VZW Antwerp"
- `category` (text) -- 'horeca' | 'stewards' | 'supporters'
- `contact_name` (text, nullable)
- `contact_email` (text, nullable)
- `external_payroll` (boolean, default false) -- vinkje: medewerkers hebben al extern contract
- `created_at`, `updated_at`

**`partner_members`** -- Pool van medewerkers per partner
- `id` (uuid, PK)
- `partner_id` (uuid, FK naar external_partners)
- `user_id` (uuid, nullable) -- gekoppeld account (optioneel)
- `full_name` (text)
- `email` (text, nullable)
- `phone` (text, nullable)
- `date_of_birth` (date, nullable) -- nodig voor voetbalwetgeving
- `created_at`

**`partner_admins`** -- Wie beheert een partner (link naar user account)
- `id` (uuid, PK)
- `partner_id` (uuid, FK naar external_partners)
- `user_id` (uuid, FK naar profiles)
- `invited_by` (uuid)
- `created_at`

**`partner_event_access`** -- Welke evenementen zijn opengesteld voor welke partner
- `id` (uuid, PK)
- `partner_id` (uuid, FK)
- `event_id` (uuid, FK naar events)
- `max_spots` (integer, nullable) -- limiet per partner
- `created_at`

**`partner_event_signups`** -- Inschrijving van partner-medewerkers op evenementen
- `id` (uuid, PK)
- `partner_event_access_id` (uuid, FK)
- `partner_member_id` (uuid, FK)
- `status` (text, default 'pending') -- pending / approved / rejected
- `approved_by` (uuid, nullable) -- partner admin die goedkeurt
- `created_at`

### Nieuwe enum waarde

Uitbreiding van `club_role` is niet nodig. Partner admins krijgen een apart mechanisme via `partner_admins` tabel, niet via `club_members`.

### RLS Policies

- **Bestuurder/Beheerder** van de club: volledige lees- en schrijftoegang op alle partner-tabellen via `has_club_role()`
- **Partner Admin**: CRUD op eigen `partner_members`, lees op `partner_event_access` waar hun partner_id matcht, CRUD op `partner_event_signups` voor eigen partner
- Security definer functie `is_partner_admin(user_id, partner_id)` om recursie te voorkomen

---

## Fase 2: Invite-flow voor Partner Beheerders

Hergebruik van bestaande `club-invite` edge function met een nieuwe `role` parameter (bijv. `partner_admin`) en extra metadata (`partner_id`).

- Nieuwe actie in de edge function: `action=partner-invite`
- Bij acceptatie: account aanmaken (of bestaand account koppelen), record in `partner_admins` invoegen
- E-mail template volgt bestaand patroon met Resend

---

## Fase 3: Club Owner Dashboard -- Tab "Externe Partners"

### Nieuw component: `ExternalPartnersTab.tsx`

Toevoegen als tab in `ClubOwnerDashboard.tsx`:

- **Partnerlijst**: Overzicht van alle aangemaakte partners met categorie-badge, contactpersoon, en aantal medewerkers
- **Partner aanmaken**: Dialog met velden: Naam, Categorie (dropdown: Horeca/Stewards/Supporters), Contactpersoon, E-mail, Externe Payroll (checkbox)
- **Partner Beheerder uitnodigen**: Knop per partner om een beheerder uit te nodigen via e-mail (hergebruik invite-flow)
- **Evenementen openstellen**: Per partner kunnen evenementen worden geselecteerd + max spots
- **Oversight**: Bestuurder kan de medewerkerslijst en inschrijvingen per partner bekijken (read-only)

### Export functie

- Knop "Exporteer aanwezigenlijst" per evenement
- Genereert CSV/PDF met alle externe medewerkers (naam, geboortedatum, partner-organisatie, check-in status) -- vereist voor voetbalwetgeving

---

## Fase 4: Partner Portaal (Nieuwe pagina)

### Nieuwe route: `/partner-dashboard`

### Nieuw component: `PartnerDashboard.tsx`

Mobile-first ontwerp, bevat:

1. **Header**: Partnernaam + clubnaam, uitlogknop
2. **Mijn medewerkers**: Lijst van `partner_members`, met CRUD (toevoegen, bewerken, verwijderen)
3. **Beschikbare evenementen**: Alleen events uit `partner_event_access` voor hun partner
4. **Inschrijven**: Per evenement medewerkers selecteren en toewijzen (first-come-first-served op spots). Partner admin moet handmatig goedkeuren (status pending -> approved)
5. **Status overzicht**: Per evenement zien wie is ingeschreven/goedgekeurd

---

## Fase 5: QR-code Tickets voor Partner Medewerkers

- Bij goedkeuring (`status = 'approved'`) wordt automatisch een `volunteer_tickets` record aangemaakt met een unieke barcode
- Hergebruik bestaande ticket/scanner logica (`/scan` route, `ticketing-scan` edge function)
- Partner medewerkers zonder user account: ticket wordt gekoppeld via `partner_member_id` in metadata
- Partner medewerkers met account: standaard `volunteer_id` koppeling

---

## Fase 6: Contract-uitzondering

- Als `external_partners.external_payroll = true`, dan wordt het contractondertekeningproces overgeslagen voor medewerkers van die partner
- Visuele indicator in het dashboard: "Externe Payroll" badge bij de partner

---

## Technische Details

### Nieuwe bestanden

| Bestand | Beschrijving |
|---|---|
| `supabase/migrations/[ts]_create_partner_tables.sql` | Alle nieuwe tabellen + RLS + functie |
| `src/pages/PartnerDashboard.tsx` | Hoofdpagina partner portaal |
| `src/components/ExternalPartnersTab.tsx` | Tab in ClubOwnerDashboard |
| `src/components/PartnerMembersDialog.tsx` | CRUD voor partner medewerkers |
| `src/components/PartnerEventSignups.tsx` | Inschrijvingen beheer |
| `src/components/PartnerInviteDialog.tsx` | Uitnodiging partner admin |
| `src/components/ExportAttendeesButton.tsx` | CSV/PDF export component |

### Bestaande bestanden die worden aangepast

| Bestand | Wijziging |
|---|---|
| `src/App.tsx` | Route `/partner-dashboard` toevoegen |
| `src/pages/ClubOwnerDashboard.tsx` | Tab "Externe Partners" toevoegen |
| `supabase/functions/club-invite/index.ts` | Actie `partner-invite` toevoegen |
| `src/components/BottomTabBar.tsx` | Conditionele navigatie voor partner admins |

### Volgorde van implementatie

1. Database migratie (tabellen + RLS + security definer functie)
2. ExternalPartnersTab in ClubOwnerDashboard
3. Partner invite flow (edge function uitbreiding)
4. PartnerDashboard pagina met medewerkerbeheer
5. Event-toewijzing en inschrijvingsflow
6. QR-ticket generatie bij goedkeuring
7. Export functionaliteit
8. Verfijning en i18n (NL/FR/EN labels)

