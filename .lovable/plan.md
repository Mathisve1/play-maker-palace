

## From-adres configureerbaar maken voor e-mailuitnodigingen

### Wat gaan we doen
Het `from`-adres in de `club-invite` Edge Function wordt configureerbaar gemaakt via een secret, zodat je je eigen geverifieerde domein kunt gebruiken voor het versturen van uitnodigingsemails.

### Stappen

1. **Nieuw secret toevoegen**: `RESEND_FROM_EMAIL` — het volledige from-adres inclusief naam, bijvoorbeeld `PlayMaker <noreply@jouwdomein.nl>`.

2. **Edge Function aanpassen** (`supabase/functions/club-invite/index.ts`):
   - Het hardcoded `from: "PlayMaker <onboarding@resend.dev>"` vervangen door een dynamische waarde uit `Deno.env.get("RESEND_FROM_EMAIL")`.
   - Fallback naar `"PlayMaker <onboarding@resend.dev>"` als het secret niet is ingesteld.

### Technische details

Wijziging in `supabase/functions/club-invite/index.ts` (regel ~56):

```typescript
// Huidige code:
from: "PlayMaker <onboarding@resend.dev>",

// Nieuwe code:
from: Deno.env.get("RESEND_FROM_EMAIL") || "PlayMaker <onboarding@resend.dev>",
```

Dit is de enige codewijziging die nodig is. Na goedkeuring wordt je gevraagd om het `RESEND_FROM_EMAIL` secret in te voeren met je geverifieerde domeinadres.

