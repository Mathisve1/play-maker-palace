

# Navigatie via linker sidebar voor Partner Dashboard

## Wat verandert
De tabbladen ("Taken" / "Medewerkers") bovenaan de Partner Dashboard pagina worden verwijderd. In plaats daarvan wordt de navigatie volledig gestuurd via de twee bestaande sidebar-items "Taken" en "Leden".

## Technische aanpak

### 1. PartnerDashboard.tsx -- Tabs verwijderen
- De `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` wrapper (regels 377-451) wordt vervangen door een simpele `if/else` op `activeTab`:
  - `activeTab === 'tasks'` toont de taken-inhoud (pending/accepted/rejected taken)
  - `activeTab === 'members'` toont de leden-inhoud (add/import/lijst)
- De Tabs-imports worden verwijderd uit het bestand

### 2. PartnerSidebar.tsx -- Label aanpassen
- Het sidebar-item "Leden" blijft, maar het label voor "members" tab wordt aangepast naar "Medewerkers" (consistent met wat eerder in de tab stond)
- Beide items zijn al correct gekoppeld aan `activeTab` via `handleNav('tasks')` en `handleNav('members')`

### Resultaat
- Geen tabbladen meer bovenaan de pagina
- Sidebar-items "Taken" en "Leden" sturen welke sectie zichtbaar is
- Alle dialogen (add member, edit, CSV import, assign) blijven ongewijzigd

