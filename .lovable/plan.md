

## Probleem

Wanneer een vrijwilliger op "Registreer op Eventbrite" klikt, wordt hij doorgestuurd naar een **publieke Eventbrite-pagina** waar alle tickets zichtbaar zijn. Dit is een privacyprobleem. Bovendien moet de vrijwilliger zelf actie ondernemen om zich te registreren, wat niet gebruiksvriendelijk is.

## Oplossing

De Eventbrite checkout-link volledig verwijderen en tickets **intern** beheren binnen het platform. Het Eventbrite-evenement blijft op de achtergrond bestaan voor scanning/check-in doeleinden, maar de vrijwilliger ziet **alleen** zijn eigen ticket in het dashboard - zonder externe links.

### Wat er verandert:

**1. Edge Function (`ticketing-generate`) - `createAttendee` aanpassen**
- De `ticket_url` wordt niet meer gevuld met een Eventbrite-link
- In plaats daarvan wordt `ticket_url` leeg gelaten (of `null`)
- De barcode en het ticket-ID blijven bestaan voor scanning
- Status wordt direct op `sent` gezet (geen handmatige registratie meer nodig)

**2. Volunteer Dashboard - Ticket-weergave vereenvoudigen**
- De "Registreer op Eventbrite" knop en link worden volledig verwijderd
- De barcode wordt altijd getoond (niet alleen als `ticket_url` leeg is)
- De vrijwilliger ziet alleen zijn eigen ticket met barcode, status en event-info
- Bestaande `ticket_url` waarden in de database worden genegeerd/niet getoond

**3. Database - Bestaande tickets opschonen**
- Bestaande tickets met Eventbrite URLs worden bijgewerkt: `ticket_url` op `null` gezet en `status` op `sent`

### Technische details

```text
HUIDIGE FLOW:
Vrijwilliger -> Klik "Registreer op Eventbrite" -> Publieke Eventbrite pagina -> Handmatig registreren

NIEUWE FLOW:
Ticket wordt aangemaakt -> Status = "sent" -> Vrijwilliger ziet barcode direct in dashboard
```

### Bestanden die worden aangepast:
- `supabase/functions/ticketing-generate/index.ts` - `createAttendee` methode: `ticket_url` op `null` zetten
- `src/pages/VolunteerDashboard.tsx` - Eventbrite-link sectie verwijderen, barcode altijd tonen
- SQL update voor bestaande tickets met Eventbrite URLs

### Beveiliging
De bestaande RLS-policies op `volunteer_tickets` zorgen er al voor dat vrijwilligers alleen hun eigen tickets kunnen zien. Door de externe link te verwijderen, is er geen risico meer dat iemand via een publieke pagina tickets van anderen kan bekijken.

