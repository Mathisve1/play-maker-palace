

# Fase 5 – Performance, PWA, Skeletons & Seizoensrapportage

## Overzicht

Zes deeltaken die samen de app sneller, stabieler en informatiever maken:

1. **Safe Area Fix** – Aparte bar boven de header
2. **CommandCenter debounce** – 1 seconde debounce op realtime
3. **Hybride polling** – Realtime primair, 30s fallback met visibility check
4. **Loading skeletons** – Alle dashboards
5. **Seizoenstab in ReportingDashboard** – Nieuwe tab met volledige seizoensdata
6. **VolunteerDashboard parallel queries** – Promise.all voor init()

---

## 1. Safe Area Fix (DashboardLayout.tsx)

Voeg een aparte `div` toe boven de header die alleen de safe-area opvult:

```tsx
{/* Safe area spacer - alleen zichtbaar op PWA met notch */}
<div className="bg-card/90 backdrop-blur-xl md:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }} />
<header className="min-h-14 flex items-center gap-3 border-b ...">
```

Verwijder `pt-safe-top` van de header zelf. Doe hetzelfde voor Chat.tsx en TicketScanner.tsx als die eigen headers hebben.

## 2. CommandCenter Debounce (al 1500ms)

CommandCenter heeft al een 1500ms debounce (lijn 298). Dit verhogen naar exact 1000ms conform keuze, of laten op 1500ms (strenger). **Actie**: Verlaag naar 1000ms voor snellere feedback.

## 3. Hybride Polling

**TicketingDashboard.tsx** (lijn 316-329):
- Verhoog `setInterval` van 5000 → 30000ms
- Visibility check zit er al (lijn 317) ✓
- Realtime subscription blijft primair

**VolunteerDashboard.tsx** (lijn 469-473):
- Interval staat al op 15000ms met visibility check ✓
- Verhoog naar 30000ms voor consistentie

## 4. Loading Skeletons – Alle Dashboards

Bestaande `DashboardSkeleton` component hergebruiken. Vervang de `Loader2` spinner in:

| Pagina | Lijn | Huidige code | Vervangen door |
|--------|------|-------------|----------------|
| ClubOwnerDashboard | loading return | `<Loader2>` spinner | `<DashboardSkeleton />` |
| VolunteerDashboard | loading return | `<Loader2>` spinner | `<VolunteerCardsSkeleton />` |
| CommandCenter | loading return | `<Loader2>` spinner | `<ActionListSkeleton />` |
| ReportingDashboard | lijn 775-776 | `<Loader2>` spinner | `<DashboardSkeleton />` |
| MonthlyPlanning | loading return | `<Loader2>` spinner | `<DashboardSkeleton />` |
| TicketingDashboard | loading return | `<Loader2>` spinner | `<DashboardSkeleton />` |

Elk skeleton wordt gewrapped in de juiste layout (ClubPageLayout of DashboardLayout) zodat de sidebar al zichtbaar is tijdens laden.

## 5. Seizoenstab in ReportingDashboard

Nieuw component: `src/components/reporting/ReportingSeasonTab.tsx`

**Data ophalen** in ReportingDashboard (bij bestaande data load):
- `season_contracts` – status, checkin_count, volunteer_status, signed_at
- `season_checkins` – hours_worked, checked_in_at, checked_out_at
- `seasons` – naam, start/eind

**KPI's in de tab:**
- Totaal seizoenscontracten / % ondertekend
- Actieve vs proef vrijwilligers (4-keer-regel)
- Totaal seizoensuren gewerkt
- Gem. check-ins per vrijwilliger

**Visualisaties:**
- Pie chart: contract status (ondertekend/verzonden/pending)
- Bar chart: check-ins per maand
- Tabel: vrijwilligers met status (proef 1/4, 2/4, 3/4, actief), uren, laatste check-in

**Tab toevoegen** in de TabsList na "compliance":
```tsx
<TabsTrigger value="season">Seizoen</TabsTrigger>
```

## 6. VolunteerDashboard Parallel Queries

De init() functie (ca. lijn 200-400) doet queries sequentieel. Groepeer in 3 fasen:

```
Fase 1 (kritisch, parallel):
  - tasks + signups + events + eventGroups

Fase 2 (secundair, parallel):
  - payments + SEPA + contracts + tickets

Fase 3 (tertiair, parallel):
  - loyalty + certificates + follows + compliance check
```

Elk blok in een `Promise.all()`. Loading state pas `false` na fase 1 (zodat de UI snel toont).

---

## Technische details

- **Geen database migraties nodig** – alle tabellen bestaan al
- **Geen nieuwe edge functions** – puur frontend optimalisaties + nieuw reporting component
- Seizoensdata wordt opgehaald via bestaande Supabase client queries
- Skeleton imports worden lazy-compatible gehouden

