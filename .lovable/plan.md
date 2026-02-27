# Rapportering Dashboard - Uitbreiding Plan

## Huidige staat

Het dashboard heeft al: KPI-kaarten, filters (datum/evenement/vrijwilliger/locatie/vergoedingstype/status), tabs (Overzicht/Vrijwilligers/Taken/Evenementen/AI), CSV-export, en een AI assistent.

## Nieuwe features toe te voegen

### 1. Financieel tab (nieuw)

- **Openstaande vs betaalde betalingen**: tijdlijn
- **Kostenverdeling per evenement**: hoeveel kost elk evenement in totaal
- **Budget prognose**: op basis van gemiddelde maandelijkse uitgaven, projectie voor komende maanden
- **Compliance overzicht**: hoeveel vrijwilligers zitten dicht bij het wettelijk jaarmaximum (3233.91 EUR)

### 2. Partners tab (nieuw)

- **Partner medewerkers ingezet**: hoeveel externe partners leveren medewerkers, hoeveel per partner
- **Partner vs eigen vrijwilligers**: vergelijking inzet eigen vrijwilligers vs partner medewerkers
- **Account registratie rate**: hoeveel partner medewerkers hebben al een account aangemaakt
- **Partner bezettingsgraad**: hoe goed vullen partners hun toegewezen spots

### 3. Contracten en Compliance tab (nieuw)

- **Ondertekende vs openstaande contracten**: pie chart
- **Gemiddelde doorlooptijd ondertekening**: hoe snel tekenen vrijwilligers hun contract
- **Compliance declaraties**: maandelijkse declaratiestatus per vrijwilliger
- **Vrijwilligers nabij jaargrens**: lijst van vrijwilligers die >80% van het wettelijk maximum bereikt hebben

### 4. Uitbreiding bestaande tabs

- **Overzicht**: heatmap van drukste dagen/maanden, dag-van-de-week analyse (wanneer worden de meeste taken ingepland)
- **Vrijwilligers**: betrouwbaarheidsscore (check-ins / toewijzingen), gemiddeld verdiend per taak, loyaliteitspunten stand
- **Taken**: uur-bevestigingen status (pending/approved), gemiddelde werkuren per taak
- **Evenementen**: vergelijking tussen evenementen (year-over-year als data beschikbaar)

### 5. Extra KPI-kaarten

- Openstaande betalingen
- Gemiddelde opkomst per vrijwilliger
- Contracten ondertekend %
- Partner medewerkers actief

### 6. Extra filters

- Filter op partner (eigen vs extern of specifieke partner)
- Filter op betalingsstatus (betaald/pending/failed)
- Filter op contractstatus

### 7. Verbeterde AI context

- Partner data, contract data, compliance data, en uur-bevestigingen toevoegen aan de data summary die naar de AI wordt gestuurd
- Extra preset-vragen toevoegen over financien, partners en compliance

### 8. PDF export

- Naast CSV ook een samenvattend PDF-rapport kunnen genereren met de huidige KPI's en grafieken (via jsPDF dat al in het project zit)

---

## Technische aanpak

### Data loading uitbreiden

Nieuwe queries toevoegen in de `load` functie:

- `signature_requests` - voor contractstatus
- `compliance_declarations` - voor compliance overzicht
- `partner_task_assignments` + `partner_members` + `external_partners` - voor partner rapportage
- `sepa_batches` - voor SEPA batch overzicht (al deels geladen via items)

### Nieuwe computed data (useMemo)

- `financialReport`: Stripe fees, netto/bruto, maandelijkse prognose
- `partnerReport`: per-partner inzet, account status
- `complianceReport`: per-vrijwilliger compliance status, nabij-grens lijst
- `contractReport`: ondertekend/pending/niet-verzonden verdeling
- `dayOfWeekChart`: taken per dag van de week
- `hourConfirmationStats`: goedgekeurd/pending uren

### Nieuwe tabs structuur

Tabs worden: Overzicht | Vrijwilligers | Taken | Evenementen | **Financieel** | **Partners** | **Compliance** | AI Assistent

De TabsList wordt scrollbaar gemaakt voor mobiel.

### Bestanden die gewijzigd worden

- `src/pages/ReportingDashboard.tsx` - hoofdbestand, alle uitbreidingen
- `supabase/functions/reporting-ai/index.ts` - uitgebreidere data summary

### Geen database wijzigingen nodig

Alle data is al beschikbaar in bestaande tabellen.