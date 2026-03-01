

# Safety Rollen & Rechten Systeem

## Wat gaan we bouwen?

Een systeem waarbij clubs hun eigen safety-rollen kunnen aanmaken (bv. Hoofdsteward, Korpssteward, Steward) met specifieke rechten per rol. Bij het toewijzen van vrijwilligers aan zones in de Kanban-planning kan de club ook een safety-rol kiezen. Tijdens een live evenement bepaalt de rol wat een vrijwilliger mag doen, en hogere rollen krijgen een mini-overzicht van hun teamleden en hun meldingen.

---

## Overzicht van de veranderingen

### 1. Nieuwe database tabellen

**`safety_roles`** - De rollen die een club definieert
- `id`, `club_id`, `name` (bv. "Korpssteward"), `color`, `sort_order`
- `can_complete_checklist` (boolean) - Mag checklist afstrepen
- `can_report_incidents` (boolean) - Mag incidenten melden  
- `can_resolve_incidents` (boolean) - Mag incidenten afhandelen
- `can_complete_closing` (boolean) - Mag sluitingstaken uitvoeren
- `can_view_team` (boolean) - Mag teamoverzicht zien
- `level` (integer) - Hierarchieniveau (1 = hoogste, 3 = laagste)

**`volunteer_safety_roles`** - Koppeling: welke vrijwilliger heeft welke rol voor welk evenement
- `id`, `event_id`, `volunteer_id`, `safety_role_id`, `assigned_by`, `created_at`

### 2. Safety Configuratie uitbreiden

In het bestaande `SafetyConfigDialog` komt een nieuw tabblad **"Rollen"** waar de club:
- Rollen aanmaakt met naam, kleur en hierarchieniveau
- Per rol de rechten aan/uit zet met toggles
- Rollen kan verwijderen

### 3. Zone Planning (Kanban) aanpassen

Bij het toewijzen van een vrijwilliger aan een zone verschijnt een dropdown om de safety-rol te kiezen. De rol wordt opgeslagen in `volunteer_safety_roles` voor dat evenement.

### 4. Vrijwilliger Safety Dashboard aanpassen

Tijdens een live evenement:
- **Checklist**: Alleen zichtbaar/bewerkbaar als `can_complete_checklist = true`
- **Incidenten melden**: Alleen als `can_report_incidents = true`
- **Sluitingstaken**: Alleen als `can_complete_closing = true`
- **Teamoverzicht**: Als `can_view_team = true`, ziet de vrijwilliger onder de meld-knop een sectie "Mijn Team" met:
  - Lijst van teamleden (vrijwilligers met een lagere `level` in dezelfde zone/event)
  - Hun recente meldingen (naam, foto, type incident, locatie)
  - Checklist-voortgang per teamlid

### 5. Control Room aanpassen

- Incidenten die afgehandeld worden door vrijwilligers met `can_resolve_incidents` worden gemarkeerd in de control room
- De control room toont de safety-rol naast de naam van de melder

---

## Technische details

### Database migratie

```text
safety_roles
  id (uuid PK)
  club_id (uuid FK -> clubs.id)
  name (text)
  color (text, default '#3b82f6')
  sort_order (int, default 0)
  level (int, default 1)           -- 1=highest rank
  can_complete_checklist (bool, default true)
  can_report_incidents (bool, default true)
  can_resolve_incidents (bool, default false)
  can_complete_closing (bool, default true)
  can_view_team (bool, default false)
  created_at (timestamptz)

volunteer_safety_roles
  id (uuid PK)
  event_id (uuid FK -> events.id)
  volunteer_id (uuid)
  safety_role_id (uuid FK -> safety_roles.id)
  assigned_by (uuid)
  created_at (timestamptz)
  UNIQUE(event_id, volunteer_id)
```

RLS policies: club staff (bestuurder/beheerder) kan CRUD, vrijwilligers kunnen eigen rol lezen, en geauthenticeerde gebruikers kunnen rollen lezen.

### Bestanden die worden aangepast

1. **`src/components/SafetyConfigDialog.tsx`** - Nieuw "Rollen" tabblad met CRUD voor safety_roles
2. **`src/pages/ZonePlanning.tsx`** - Rol-dropdown bij toewijzing, event_id doorgeven via taak-lookup
3. **`src/pages/SafetyDashboard.tsx`** - Rechten-check voor vrijwilligers, teamoverzicht sectie
4. **`src/components/safety/VolunteerClosingView.tsx`** - Rechten-check voor sluitingstaken
5. **`src/components/VolunteerSafetyTab.tsx`** - Rol-informatie tonen

### Flow

```text
Club maakt rollen aan in Safety Config
         |
         v
Club wijst vrijwilliger + rol toe in Zone Planning
         |
         v
Evenement gaat LIVE
         |
         v
Vrijwilliger opent Safety Dashboard
         |
         v
Systeem checkt volunteer_safety_roles voor dit event
         |
         v
UI toont/verbergt features op basis van rol-rechten
         |
         v
Hogere rollen zien teamoverzicht met meldingen
```

