

## Plan: DocuSeal handtekeningveld definitief laten werken

### Kernprobleem

Na 12+ pogingen werkt ondertekening niet omdat:

1. **PUT template velden mislukken stilletjes**: De DocuSeal API vereist `uuid` en `submitter_uuid` in elk veld-object. Die ontbreken, waardoor de PUT 200 retourneert maar geen velden toevoegt (`fields: undefined` in de logs).
2. **Embedded text tags werken niet**: `html2canvas` maakt een rasterafbeelding (PNG) van de HTML. DocuSeal kan tekst-tags (`{{...}}`) in een afbeelding niet detecteren.

### Oplossing: correcte PUT-payload met alle verplichte velden

We passen de edge function aan zodat de PUT-aanroep naar `/templates/{id}` de juiste schema-structuur volgt:

```text
Stap 1: POST /templates/pdf        -> maakt template, geeft submitters[].uuid terug
Stap 2: PUT /templates/{id}        -> voegt veld toe MET uuid + submitter_uuid + areas
Stap 3: POST /submissions          -> verstuurt naar vrijwilliger
```

### Wijzigingen

**Bestand: `supabase/functions/docuseal/index.ts`** (actie `send-personalized-contract`)

Na Stap 1 (template aanmaken) halen we de `submitter_uuid` op uit de response:
```javascript
const submitterUuid = templateData.submitters?.[0]?.uuid;
```

Vervolgens sturen we in Stap 2 het veld met alle verplichte attributen:
```javascript
const fields = [{
  uuid: crypto.randomUUID(),          // nieuw uniek ID voor het veld
  submitter_uuid: submitterUuid,      // koppeling aan de ondertekenaar
  name: "Handtekening",
  type: "signature",
  required: true,
  areas: [{
    attachment_uuid: documentUuid,
    page: lastPage,
    x: 0.55,
    y: 0.85,
    w: 0.35,
    h: 0.06,
  }],
}];
```

We voegen ook extra logging toe zodat duidelijk zichtbaar is of de velden correct worden opgeslagen.

**Bestand: `src/components/ContractPreview.tsx`**

De embedded text tag (`{{Handtekening;type=signature;...}}`) kan worden verwijderd of behouden. Deze heeft geen effect omdat html2canvas de tekst rasteriseert, maar doet ook geen kwaad.

### Waarom dit werkt

De DocuSeal OpenAPI-spec toont dat velden in een template de volgende verplichte properties hebben:
- `uuid` (string) - uniek veld-ID
- `submitter_uuid` (string) - koppeling aan welke ondertekenaar dit veld invult
- `name`, `type`, `required`, `areas`

Door deze allemaal mee te sturen, wordt het handtekeningveld daadwerkelijk aan de template gekoppeld, waardoor de vrijwilliger het interactieve handtekeningvak ziet bij het openen.

