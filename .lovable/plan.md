

# Safety Checklist: Club Configuratie & Vrijwilliger Tab

## Huidige situatie

- **Clubs** kunnen checklist-items aanmaken via de `SafetyConfigDialog` (geopend vanuit de Events Manager per evenement). Daar voegen ze zones toe, incidenttypes, en checklistitems gekoppeld aan zones.
- **Vrijwilligers** zien en vinken de checklist af op de `SafetyDashboard` pagina (`/safety/:eventId`), maar dit is alleen bereikbaar via de club-sidebar onder "Safety & Security". Er is geen directe toegang vanuit het vrijwilligersdashboard.

## Wat we gaan bouwen

### 1. Nieuwe "Safety" tab in de Volunteer Sidebar

Een nieuw tabblad "Safety" toevoegen aan de `VolunteerSidebar` navigatie, zodat vrijwilligers direct vanuit hun dashboard toegang hebben tot hun safety-taken.

- Nieuwe waarde `'safety'` toevoegen aan het `VolunteerTab` type
- Nieuw menu-item met `Shield` icoon in de "Beheer" groep
- Badge met aantal openstaande (niet-afgevinkte) checklist-items

### 2. Safety Tab content in VolunteerDashboard

Een nieuw tabblad-content renderen wanneer `activeTab === 'safety'`:

- Lijst van evenementen waarvoor de vrijwilliger is aangemeld (via `task_signups` -> `tasks` -> `events`)
- Per evenement: de checklist-items gegroepeerd per zone met afvink-mogelijkheid
- Duidelijke voortgangsbalk per zone en totaal
- Directe link naar het live safety dashboard (`/safety/:eventId`) wanneer het event live is
- Statusbadge: "Checklist" (pre-live) of "LIVE" (na go-live)

### 3. Data loading in VolunteerDashboard

Nieuwe Supabase queries toevoegen aan de `init()` functie:

- Ophalen van events waarvoor de vrijwilliger taken heeft via aanmeldingen
- Ophalen van `safety_checklist_items` voor die events
- Ophalen van `safety_checklist_progress` voor de ingelogde vrijwilliger
- Afvink-handler: `upsert` naar `safety_checklist_progress`

### 4. Club-side: Bestaande configuratie verduidelijken

De `SafetyConfigDialog` is al beschikbaar in de Events Manager. We voegen een extra hint/tooltip toe zodat clubs weten dat hun checklistitems zichtbaar worden voor vrijwilligers in hun Safety tab.

## Technisch overzicht

### Bestanden die worden aangepast

| Bestand | Wijziging |
|---------|-----------|
| `src/components/VolunteerSidebar.tsx` | Nieuw `safety` tab type + menu-item |
| `src/pages/VolunteerDashboard.tsx` | Safety tab content + data loading + checklist toggle handler |
| `src/i18n/translations.ts` | Labels voor safety tab (NL/FR/EN) |

### Geen database-wijzigingen nodig

Alle benodigde tabellen bestaan al:
- `safety_checklist_items` (items per event/zone)
- `safety_checklist_progress` (afvinken per vrijwilliger)
- `safety_zones` (zone-info)
- `events` (event-info + `is_live` flag)

RLS policies zijn al correct ingesteld: vrijwilligers kunnen hun eigen progress lezen en beheren, en authenticated users kunnen checklist items en zones lezen.

### Flow samenvatting

```text
Club (Events Manager)
  |-> SafetyConfigDialog
       |-> Zones aanmaken
       |-> Checklistitems per zone toevoegen
       
Vrijwilliger (Dashboard -> Safety tab)
  |-> Ziet events waarvoor aangemeld
       |-> Per event: checklist per zone
            |-> Items afvinken (upsert safety_checklist_progress)
       |-> "Ga naar Live Dashboard" knop als event live is
```

