

# Test Scenario: Safety & Security Simulatie

## Overzicht
Een backend functie (`safety-demo`) die een compleet test-scenario opzet en vervolgens over ~5 minuten realistische incidenten simuleert. Je opent de Control Room en ziet live incidenten binnenkomen met flash-red animaties en alarmen.

## Wat wordt aangemaakt

### Stap 1: Seed Data (direct bij start)
- **Test Event**: "Demo Veiligheidsdag 2026" gekoppeld aan je club
- **6 Zones**: Hoofdtribune, Bezoekerstribune, Parking, VIP-lounge, Speelveldomgeving, Ingang & Fouillering
- **6 Incident Types**: Medisch, Brand, Agressie, Diefstal, Evacuatie, Verdacht pakket
- **8 Checklist Items**: zoals "Nooduitgangen gecontroleerd", "AED-locaties gemarkeerd", "Communicatiekanalen getest"

### Stap 2: Incident Simulatie (~5 minuten, 10-12 incidenten)
De functie plant incidenten in met oplopende timestamps die via `pg_sleep` of scheduling in volgorde worden ge-insert:

| Minuut | Incident | Zone | Prioriteit |
|--------|----------|------|------------|
| 0:00 | Start - seed data klaar | - | - |
| 0:30 | Medisch: "Bezoeker flauwgevallen" | Hoofdtribune | medium |
| 1:00 | Diefstal: "Gestolen rugzak gemeld" | Parking | low |
| 1:30 | Agressie: "Vechtpartij bij ingang" | Ingang & Fouillering | high |
| 2:00 | Medisch: "Snijwond bij steward" | Speelveldomgeving | medium |
| 2:30 | Verdacht pakket: "Onbeheerde tas" | VIP-lounge | high |
| 3:00 | Brand: "Rookontwikkeling foodtruck" | Parking | high |
| 3:30 | Agressie: "Verbale escalatie" | Bezoekerstribune | medium |
| 4:00 | Medisch: "Allergische reactie" | VIP-lounge | high |
| 4:30 | Evacuatie: "Gedeeltelijke evacuatie zone" | Bezoekerstribune | high |
| 5:00 | Diefstal: "Poging tot zakkenrollerij" | Hoofdtribune | low |

## Technische aanpak

### Edge Function: `safety-demo`
- **POST** `/safety-demo` met `club_id` in de body
- Maakt event + zones + incident types + checklist items aan
- Start een loop die elke ~30 seconden een incident insert
- Gebruikt `Deno.sleep()` (niet `pg_sleep`) voor de timing tussen inserts
- Retourneert direct de `event_id` zodat de frontend kan navigeren naar `/safety/{eventId}`

### Frontend: "Start Demo" knop
- Toevoegen aan de Safety Overview pagina
- Knop roept de edge function aan
- Na response: automatisch navigeren naar de Control Room van het demo-event
- Realtime subscriptions pikken de incidenten automatisch op

### Opruiming
- Een "Verwijder Demo" knop die het demo-event en alle gekoppelde data opruimt via cascade of manuele deletes

## Flow voor de gebruiker
1. Ga naar `/safety`
2. Klik "Start Demo Scenario"
3. Je wordt doorgestuurd naar de Control Room
4. Gedurende 5 minuten verschijnen er live incidenten met visuele en audio-alerts
5. Je kunt incidenten in behandeling nemen en oplossen
6. Na afloop kun je het demo-event verwijderen

