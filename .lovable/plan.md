

# Plan: Evenementen-structuur met groepen en taken

## Overzicht

De huidige structuur is plat: clubs maken losse taken aan. De nieuwe structuur voegt een hiërarchisch niveau toe:

```text
Club
 ├── Evenement (bv. "Voetbalmatch KV Mechelen - Club Brugge")
 │    ├── Groep: Stewards
 │    │    ├── Taak: 10 stewards tribune 1
 │    │    └── Taak: 20 stewards tribune 2
 │    ├── Groep: Parking
 │    │    └── Taak: 5 parkeerwachters
 │    └── Groep: Catering
 │         └── Taak: 8 medewerkers bar
 └── Losse taak (zonder evenement, blijft mogelijk)
```

## Wat verandert er voor de club?

- **Nieuw "+" menu** met twee opties: "Nieuw evenement" of "Nieuwe losse taak"
- **Evenement aanmaken**: titel, datum, locatie, beschrijving
- **Binnen een evenement**: groepen toevoegen (bv. "Stewards", "Parking") met een kleur
- **Binnen een groep**: taken aanmaken zoals nu (titel, aantal plaatsen, tijdslot, vergoeding, etc.)
- Het dashboard toont evenementen als uitklapbare kaarten, met daarbinnen de groepen en taken
- Losse taken worden apart getoond zoals nu

## Wat verandert er voor de vrijwilliger?

- Het dashboard toont evenementen als grote kaarten met datum/locatie
- Doorklikken op een evenement toont de groepen en beschikbare taken
- Per taak kan de vrijwilliger zich inschrijven zoals nu
- Losse taken (zonder evenement) blijven ook zichtbaar in de lijst

---

## Technische details

### 1. Database migratie

Twee nieuwe tabellen:

**`events`** tabel:
- `id` (uuid, PK)
- `club_id` (uuid, FK naar clubs)
- `title` (text, NOT NULL)
- `description` (text, nullable)
- `event_date` (timestamptz, nullable)
- `location` (text, nullable)
- `status` (text, default 'open')
- `created_at`, `updated_at` (timestamptz)

**`event_groups`** tabel:
- `id` (uuid, PK)
- `event_id` (uuid, FK naar events)
- `name` (text, NOT NULL)
- `color` (text, default '#3b82f6')
- `sort_order` (integer, default 0)
- `created_at` (timestamptz)

**Wijziging aan `tasks` tabel:**
- Toevoegen: `event_id` (uuid, nullable, FK naar events)
- Toevoegen: `event_group_id` (uuid, nullable, FK naar event_groups)
- Beide nullable zodat losse taken zonder evenement mogelijk blijven

**RLS policies:**
- `events`: leesbaar voor iedereen (zoals tasks), CRUD voor club owners/bestuurders/beheerders
- `event_groups`: leesbaar voor iedereen, CRUD voor club rollen via event -> club_id
- `tasks`: bestaande policies blijven intact

### 2. ClubOwnerDashboard aanpassingen

- **Nieuw "+" dropdown**: keuze "Evenement aanmaken" of "Losse taak aanmaken"
- **Evenement-aanmaakformulier**: titel, datum, locatie, beschrijving
- **Evenement-detailweergave**: accordion met groepen, per groep de taken
- **Groep toevoegen**: naam + kleur kiezen binnen een evenement
- **Taak aanmaken binnen groep**: hetzelfde formulier als nu, maar gekoppeld aan event_id + event_group_id
- **Losse taken**: worden apart getoond in een sectie "Losse taken"

### 3. VolunteerDashboard aanpassingen

- **Evenementen sectie**: kaarten met evenement-info (titel, datum, locatie, club)
- **Evenement-detailview**: klikken opent een dialog/pagina met groepen en taken
- **Per groep**: lijst van taken met spots/signup-status
- **Losse taken**: apart getoond onder "Overige taken"
- **Zoekfunctie**: zoekt in zowel evenement-titels als taak-titels

### 4. Bestanden die gewijzigd/aangemaakt worden

| Bestand | Actie |
|---------|-------|
| Database migratie | Nieuw: `events`, `event_groups` tabellen + `tasks` kolommen |
| `src/pages/ClubOwnerDashboard.tsx` | Uitbreiden met evenement-CRUD, groepen, en hiërarchische weergave |
| `src/pages/VolunteerDashboard.tsx` | Evenementen-weergave met doorklik-flow |
| `src/components/EventDetailDialog.tsx` | **Nieuw**: dialog voor vrijwilligers om groepen/taken in een evenement te bekijken |
| `src/components/EventGroupCard.tsx` | **Nieuw**: herbruikbare component voor een groep met taken |

### 5. Migratie van bestaande data

- Bestaande taken krijgen `event_id = NULL` en `event_group_id = NULL`, waardoor ze als losse taken blijven functioneren
- Geen data gaat verloren, alle bestaande functionaliteit blijft werken

