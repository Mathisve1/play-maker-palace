

# Fase 6 -- Code Quality & Architectuur

## Overzicht

Vijf deeltaken die de codebase onderhoudbaar en type-safe maken:

1. **Refactor VolunteerDashboard** (1060 regels) -- opsplitsen in sub-componenten
2. **Refactor MonthlyPlanning** (739 regels) -- opsplitsen in sub-componenten
3. **Verwijder alle `(supabase as any)` casts** -- 27 bestanden, 712 matches
4. **Chat integreren in DashboardLayout** -- met rol-afhankelijke sidebar
5. **Opschonen useClub hook** -- verwijderen (ClubContext dekt alles)

---

## 1. Refactor VolunteerDashboard (1060 regels)

Opsplitsen in logische delen:

| Nieuw component | Verantwoordelijkheid | Regels ca. |
|---|---|---|
| `hooks/useVolunteerData.ts` | Alle data-fetching (init, enrichment, compliance check) | ~250 |
| `hooks/useVolunteerHandlers.ts` | Signup, cancel, like, enroll, contract handlers | ~80 |
| `VolunteerDashboardHome.tsx` | Dashboard tab: stats, upcoming tasks, activity, compliance | ~150 |
| `VolunteerTaskFeed.tsx` | "All tasks" + "Mine" tabs: search, events, loose tasks | ~200 |

De hoofdpagina `VolunteerDashboard.tsx` wordt een dunne schil (~200 regels) die hooks aanroept en tabs rendert.

## 2. Refactor MonthlyPlanning (739 regels)

| Nieuw component | Verantwoordelijkheid |
|---|---|
| `hooks/useMonthlyPlanningData.ts` | Data loading, plan/tasks/enrollments/signups |
| `hooks/useMonthlyPlanningActions.ts` | CRUD actions (approve, reject, publish, copy, payout) |
| `monthly-planning/MonthlyTaskDialog.tsx` | Add/edit task dialog (formulier + validatie) |
| `monthly-planning/MonthlyPlanHeader.tsx` | Maandnavigatie, plan create/publish, demo knoppen |

Hoofdpagina wordt ~200 regels.

## 3. Verwijder `(supabase as any)` casts

Alle tabellen die nu gecast worden bestaan in `types.ts`:
- `events`, `event_groups`, `sepa_batch_items`, `sepa_batches`
- `volunteer_tickets`, `loyalty_programs`, `loyalty_enrollments`, `loyalty_program_excluded_tasks`
- `task_zones`, `hour_confirmations`, `certificate_designs`
- `monthly_enrollments` (update cast), `monthly_day_signups`

**Aanpak**: In alle 27 bestanden `(supabase as any).from('table')` vervangen door `supabase.from('table')`. Waar `.update()` of `.insert()` met `as any` gecast wordt op het object, dat object correct typen of een expliciete generic meegeven.

Betrokken bestanden (top-level):
- `VolunteerDashboard.tsx`, `MonthlyPlanning.tsx`, `LoyaltyPrograms.tsx`
- `AcademyBuilder.tsx`, `CommandCenter.tsx`, `TicketingDashboard.tsx`
- `ZoneTreeEditor.tsx`, `HourConfirmationDialog.tsx`, `EventsManager.tsx`
- `SafetyDashboard.tsx`, `SafetyEventHub.tsx`, `ReportingDashboard.tsx`
- En ~15 andere componenten

## 4. Chat integreren in DashboardLayout

Chat.tsx gebruikt nu een eigen standalone layout (geen sidebar). Plan:
- Detecteer gebruikersrol (club_owner vs volunteer) via `useClubContext()`
- Render `DashboardLayout` met de juiste sidebar (ClubOwnerSidebar of VolunteerSidebar)
- Behoud de interne conversation-list + message-view structuur
- Verwijder de standalone header en gebruik de DashboardLayout header

## 5. Opschonen useClub hook

`src/hooks/useClub.ts` dupliceert exact wat `ClubContext` doet. Wordt nergens meer direct gebruikt (alle pagina's gebruiken ClubContext via RequireAuth). Verwijder het bestand.

---

## Technische details

- Geen database migraties nodig
- Geen nieuwe edge functions
- Puur refactoring: geen functionele wijzigingen
- Alle bestaande functionaliteit blijft identiek
- Implementatie in volgorde: eerst `as any` casts verwijderen (basis), dan refactors, dan Chat layout

