

# Analyse: Losse eindjes en upgrade-mogelijkheden

Na een grondige review van de codebase zijn dit de gebieden die het meest baat hebben bij een upgrade:

---

## 1. Dashboard KPIs tonen hardcoded "0" waarden

**Probleem:** De KPIs `kpi_pending_enrollments` en `kpi_day_signups_pending` tonen altijd `value={0}` (hardcoded op regel 1481-1483). Ze fetchen geen echte data uit de maandplanning-tabellen.

**Oplossing:** Echte counts ophalen uit `monthly_enrollments` (pending) en `monthly_day_signups` (pending) bij het laden van het dashboard, net zoals de andere KPIs dat doen.

---

## 2. Pending Tickets widget toont ook altijd "0"

**Probleem:** De `pending_tickets` widget (regel 1538) toont hardcoded `0`. Er wordt geen telling gemaakt van vrijwilligers die wel assigned zijn maar nog geen barcode/ticket hebben.

**Oplossing:** Bij data-loading de assigned signups zonder `volunteer_tickets` barcode tellen en die waarde tonen.

---

## 3. ClubOwnerDashboard.tsx is 1770 regels -- te groot

**Probleem:** Het bestand bevat data-loading, business logic, dialogs, form handling, en rendering allemaal in één component. Dit maakt onderhoud lastig en verhoogt de kans op bugs.

**Oplossing:** Extractie van widget rendering naar een apart `WidgetRenderer` component, en de edit/delete task dialogs naar eigen bestanden. Dit is een refactor die stabiliteit verhoogt.

---

## 4. Reporting: geen "Vrijwilligers" overzichtstab

**Probleem:** Reporting heeft tabs voor Financieel, Partners, en Compliance, maar geen dedicated tab waar je per vrijwilliger kunt zien: hoeveel taken, uren, betrouwbaarheid, verdiensten. De data (`volunteerReports`) wordt wel berekend maar zit verstopt in het overview-tab.

**Oplossing:** Een eigen `ReportingVolunteersTab` component maken met een doorzoekbare tabel van alle vrijwilligers, hun statistieken, en doorklik naar hun profiel.

---

## 5. Payments widget linkt naar `/payments` maar die pagina is verborgen

**Probleem:** De `payments_summary` widget navigeert naar `/payments` (regel 1560), maar in de sidebar is "Betalingen" uitgecommentarieerd. Dit is een dood einde.

**Oplossing:** Link aanpassen naar `/reporting?tab=financial` of `/sepa-payouts`, afhankelijk van de context.

---

## 6. Actielijst (CommandCenter) mist realtime updates

**Probleem:** De Actielijst laadt data eenmalig. Als een andere clubbeheerder een actie afhandelt, zie je dat pas na een refresh.

**Oplossing:** Supabase Realtime subscription toevoegen op `task_signups`, `monthly_enrollments`, en `monthly_day_signups` zodat de lijst live bijwerkt.

---

## 7. Geen notificatie/badge op sidebar voor openstaande acties

**Probleem:** De sidebar toont geen visuele indicator (badge/dot) bij "Actielijst" als er openstaande acties zijn. De gebruiker moet de pagina openen om te zien of er werk is.

**Oplossing:** Een count-badge toevoegen aan het "Actielijst" item in `ClubOwnerSidebar`, vergelijkbaar met hoe de `VolunteerSidebar` al counts toont.

---

## Aanbevolen prioriteit

| # | Upgrade | Impact | Moeite |
|---|---------|--------|--------|
| 1 | KPIs met echte data (enrollments/day signups/tickets) | Hoog | Klein |
| 5 | Payments link fixen | Hoog | Minimaal |
| 7 | Badge op sidebar Actielijst | Hoog | Klein |
| 4 | Vrijwilligers-tab in Reporting | Hoog | Medium |
| 6 | Realtime updates Actielijst | Medium | Medium |
| 3 | Dashboard refactor (1770 regels) | Medium | Medium |
| 2 | Pending tickets echte data | Medium | Klein |

Geef aan welke upgrades je wilt doorvoeren -- ik kan ze allemaal tegelijk aanpakken of stap voor stap.

