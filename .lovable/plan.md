

## Contractsjablonen beheren en verplicht koppelen aan taken

### Wat gaan we bouwen
Een compleet sjablonenbeheer-systeem waarbij clubeigenaren PDF-contracten uploaden als sjablonen, en bij het aanmaken van een taak verplicht een sjabloon moeten selecteren.

### Overzicht

Het systeem bestaat uit drie onderdelen:
1. **Sjablonenbeheer-pagina** -- PDF's uploaden en bestaande sjablonen bekijken/verwijderen
2. **Taak aanmaken met verplicht sjabloon** -- dropdown in het formulier om een sjabloon te selecteren
3. **Database en backend** -- opslag van sjablonen en koppeling aan taken

---

### Stap 1: Database uitbreiden

**Nieuwe tabel `contract_templates`:**
- `id` (uuid, PK)
- `club_id` (uuid, verwijst naar clubs)
- `name` (text, naam van het sjabloon)
- `docuseal_template_id` (integer, ID van het aangemaakte DocuSeal template)
- `created_by` (uuid, gebruiker die het heeft geupload)
- `created_at` (timestamptz)

**Kolom toevoegen aan `tasks`:**
- `contract_template_id` (uuid, verwijst naar contract_templates, NOT NULL voor nieuwe taken)

**Storage bucket:**
- Nieuwe bucket `contract-templates` voor de PDF-uploads

**RLS-policies:**
- Clubleden (bestuurder/beheerder) kunnen sjablonen lezen, aanmaken en verwijderen voor hun eigen club
- Admins hebben volledige toegang

---

### Stap 2: Edge Function uitbreiden (`docuseal`)

Nieuwe action `create-template-from-pdf`:
- Ontvangt de PDF (als base64 of download-URL uit storage) + naam
- Roept de DocuSeal API `POST /templates/pdf` aan
- Slaat het resulterende `template_id` op in de `contract_templates` tabel
- Retourneert het aangemaakte sjabloon

Nieuwe action `delete-template`:
- Verwijdert het template uit DocuSeal via `DELETE /templates/{id}`
- Verwijdert het record uit de database

---

### Stap 3: Sjablonenbeheer in de UI

**Nieuw component `ContractTemplatesDialog`:**
- Modal toegankelijk vanuit het club-dashboard (nieuw icoon in de header)
- Toont lijst van bestaande sjablonen voor de club
- Upload-functionaliteit: bestand kiezen (PDF) + naam invoeren
- Verwijder-optie per sjabloon
- Meertalig (NL/FR/EN)

---

### Stap 4: Taak-aanmaakformulier aanpassen

In `ClubOwnerDashboard.tsx`:
- Nieuwe verplichte dropdown "Contractsjabloon" boven aan het formulier
- Haalt sjablonen op uit `contract_templates` voor de huidige club
- De taak kan niet worden aangemaakt zonder selectie
- Het geselecteerde `contract_template_id` wordt mee opgeslagen bij de taak
- Link naar sjablonenbeheer als er nog geen sjablonen bestaan

---

### Technische details

**DocuSeal API -- Template aanmaken vanuit PDF:**
```
POST https://api.docuseal.com/templates/pdf
Headers: X-Auth-Token: API_KEY, Content-Type: application/json
Body: {
  "name": "Vrijwilligerscontract Event X",
  "documents": [{
    "name": "contract.pdf",
    "file": "<base64-encoded PDF of download URL>"
  }]
}
```

**Bestanden die worden aangemaakt/gewijzigd:**
- `supabase/migrations/...` -- nieuwe tabel + kolom + RLS
- `supabase/functions/docuseal/index.ts` -- nieuwe actions
- `src/components/ContractTemplatesDialog.tsx` -- nieuw component
- `src/pages/ClubOwnerDashboard.tsx` -- sjabloon-dropdown in formulier + knop naar beheer

