

# AI Assistent Verbeteren — Plan

## Huidige Problemen

De assistent is nu "dom" omdat:
1. **Geen club-context**: De AI weet niet welke club de gebruiker heeft, welke events, taken, vrijwilligers etc.
2. **Geen rolbewustzijn**: Weet niet of je club owner, admin of vrijwilliger bent
3. **Geen pagina-context**: Weet niet op welke pagina je zit (events manager, planning, etc.)
4. **Alleen statische kennis**: Het system prompt bevat alleen algemene platformdocumentatie, geen live data
5. **Snel maar zwak model**: Gebruikt `gemini-3-flash` dat snel is maar minder goed redeneert

## Verbeterplan

### 1. Dynamische clubdata meesturen (grootste impact)
De frontend laadt bij elke vraag een samenvatting van de club-data en stuurt die mee:
- Clubnaam, sport, locatie
- Aantal vrijwilligers, actieve events, open taken
- Recente activiteiten (laatste 5 signups, incidenten)
- Huidige pagina waar de gebruiker op zit

Dit wordt als extra context in het bericht naar de edge function gestuurd.

### 2. Server-side context verrijking
De edge function haalt met de service role key aanvullende data op:
- Club-profiel van de ingelogde gebruiker
- Rol (owner/beheerder/medewerker/vrijwilliger)
- Lopende compliance-issues
- Injecteert dit in het system prompt als "HUIDIGE CONTEXT" sectie

### 3. Sterker model voor complexe vragen
Upgrade van `gemini-3-flash-preview` naar `google/gemini-2.5-flash` (betere reasoning, nog steeds snel) met optie om voor compliance/juridische vragen `gemini-2.5-pro` te gebruiken.

### 4. Few-shot voorbeelden toevoegen
Concrete vraag-antwoord voorbeelden in het system prompt voor veelgestelde vragen, zodat de AI het verwachte formaat en diepte kent.

### 5. Pagina-aware suggesties
De huidige route (`/events-manager`, `/planning`, etc.) meesturen zodat de AI relevante tips kan geven over wat de gebruiker op dat moment doet.

## Technische Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/AiAssistantChat.tsx` | Club-context + huidige route meesturen in request body |
| `supabase/functions/ai-assistant/index.ts` | Club-data ophalen, system prompt verrijken met live context, model upgraden, few-shot examples toevoegen |

## Voorbeeld Verrijkt System Prompt

```text
## HUIDIGE CONTEXT
- Club: KV Mechelen Stewards
- Jouw rol: Bestuurder (club owner)
- Huidige pagina: Events Manager
- Actieve events: 3 (volgende: KVM vs Club Brugge, 22 maart)
- Vrijwilligers: 47 actief, 5 pending goedkeuring
- Open taken: 12 (4 zonder toewijzing)
- Compliance: 2 vrijwilligers met verlopen verklaring
```

Hierdoor kan de AI antwoorden als: *"Je hebt 5 vrijwilligers die wachten op goedkeuring. Wil je dat ik uitleg hoe je ze kan toewijzen aan de taken voor het KVM vs Club Brugge event?"*

