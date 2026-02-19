

# Eigen Ticketing & Scan Systeem met QR-codes

## Overzicht

Een volledig intern ticketing-systeem bouwen met QR-codes, zonder afhankelijkheid van externe providers zoals Eventbrite. Club medewerkers scannen QR-codes via hun telefoon-camera om vrijwilligers in te checken.

## Wat er verandert

### 1. Nieuwe Scan-pagina (`/scan`)
Een mobielvriendelijke pagina waar club medewerkers QR-codes scannen:
- Camera opent automatisch via de `html5-qrcode` library (geen native app nodig)
- QR-code wordt herkend en de barcode wordt naar de backend gestuurd
- Resultaat wordt getoond: naam vrijwilliger, taak/event info
- Visuele feedback: groen = succes, rood = ongeldig of al ingecheckt
- Alleen toegankelijk voor club medewerkers (bestuurder/beheerder/medewerker)

### 2. Nieuwe backend functie (`ticketing-scan`)
Verwerkt scan-verzoeken:
- Ontvangt een barcode
- Zoekt het ticket op in de database
- Controleert of het al ingecheckt is (dubbele check-in blokkeren)
- Update status naar `checked_in` met timestamp
- Geeft vrijwilliger-info terug voor weergave op het scherm

### 3. Edge Function vereenvoudigen (`ticketing-generate`)
- Voegt een nieuw pad toe: `action: "create_internal_ticket"`
- Genereert een unieke interne barcode in het formaat `VT-{korteId}-{uniekeCode}` (bijv. `VT-ABC-7X9K2M`)
- Status wordt direct op `sent` gezet
- Geen externe API-calls nodig
- De bestaande provider-adapters blijven bestaan als optionele fallback

### 4. Ticketing Dashboard aanpassen
- Nieuwe "QR Scanner" knop die naar `/scan` navigeert
- "Intern systeem" als optie toevoegen naast externe providers
- Mogelijkheid om tickets te genereren zonder externe provider-configuratie

### 5. Vrijwilliger Dashboard
- Blijft grotendeels hetzelfde (QR-code wordt al correct getoond via `qrcode.react`)
- De barcode wordt altijd als QR-code weergegeven -- dit werkt al

## Technische details

### Nieuwe bestanden:
- `src/pages/TicketScanner.tsx` -- Camera-gebaseerde QR-scanner pagina
- `supabase/functions/ticketing-scan/index.ts` -- Check-in verwerking

### Aangepaste bestanden:
- `supabase/functions/ticketing-generate/index.ts` -- Intern ticket-generatie pad toevoegen
- `src/pages/TicketingDashboard.tsx` -- "Scan" knop en intern systeem optie
- `src/App.tsx` -- Route `/scan` toevoegen

### Nieuwe dependency:
- `html5-qrcode` -- Lichtgewicht QR-scanner library die de camera gebruikt

### Scan-flow:

```text
Club medewerker opent /scan op telefoon
        |
Camera activeert, richt op QR-code
        |
Barcode herkend (bijv. VT-ABC-7X9K2M)
        |
POST naar ticketing-scan met barcode + club_id
        |
    +--------+--------+
    |        |        |
 Geldig   Al in    Onbekend
    |     gecheckt     |
 Toon naam  Toon    Toon fout
 + event    waarsch.  "Ongeldig
 info       "Al       ticket"
    |     ingecheckt"
 Status ->
 checked_in
 Groen vinkje
```

### Database:
- Geen schema-wijzigingen nodig -- `volunteer_tickets` heeft al alle kolommen: `barcode`, `status`, `checked_in_at`, `volunteer_id`, `club_id`
- Bestaande RLS-policies blijven werken

### Beveiliging:
- Scan-pagina: authenticatie vereist, club-lidmaatschap gecontroleerd
- `ticketing-scan` functie: valideert dat de scanner lid is van de club waartoe het ticket behoort
- Dubbele check-in wordt geblokkeerd

