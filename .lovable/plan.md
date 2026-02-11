

## Handtekeningveld correct positioneren vanuit de Edge Function

### Probleem
Het handtekeningveld wordt aan DocuSeal toegevoegd zonder positie-coordinaten (`areas`), waardoor er geen interactief handtekeningvak verschijnt en de vrijwilliger het contract alleen kan downloaden of weigeren.

### Oplossing
Op drie plaatsen in de Edge Function (`supabase/functions/docuseal/index.ts`) wordt het handtekeningveld aangemaakt. Overal moeten `areas` met coordinaten worden toegevoegd, zodat DocuSeal weet waar het ondertekenvak moet verschijnen.

Het veld wordt geplaatst op de laatste pagina, rechtsonder (positie: x=55%, y=85%, breedte=35%, hoogte=6%).

### Wijzigingen

**Bestand: `supabase/functions/docuseal/index.ts`**

1. **`send-personalized-contract` actie (rond regel 720-732):**
   - Na het aanmaken van het template, de template-data ophalen om het aantal pagina's te bepalen
   - Het `PUT`-verzoek aanpassen zodat het handtekeningveld `areas` bevat met de laatste pagina en coordinaten

2. **`create-submission` fallback (waar standaardvelden worden toegevoegd):**
   - Hetzelfde: het handtekeningveld voorzien van `areas`

3. **`create-template-from-pdf` fallback:**
   - Idem

### Technisch detail

Van:
```javascript
{ name: "Handtekening", type: "signature", role: "First Party" }
```

Naar:
```javascript
{
  name: "Handtekening",
  type: "signature",
  role: "First Party",
  areas: [{
    page: lastPage,  // 0-indexed, bepaald uit templateData
    x: 0.55,
    y: 0.85,
    w: 0.35,
    h: 0.06
  }]
}
```

Het aantal pagina's wordt bepaald via `templateData.documents?.[0]?.pages?.length` (uit de DocuSeal template response). Fallback is pagina 0.

