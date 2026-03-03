

# Resterende losse eindjes en upgrade-mogelijkheden

Na de eerdere 7 fixes heb ik de codebase opnieuw doorgelicht. Dit zijn de resterende punten:

---

## 1. ClubOwnerDashboard.tsx is nog steeds 1804 regels -- niet gerefactord

**Probleem:** Het bestand bevat data-loading, 60+ state variabelen, event CRUD, task CRUD, 5 inline modal dialogs (edit task, delete task, edit event, delete event, create event), en de volledige widget rendering -- allemaal in 1 component.

**Oplossing:** 
- Widget rendering extraheren naar `src/components/dashboard/WidgetRenderer.tsx`
- Edit/delete task dialogs naar `src/components/dashboard/EditTaskDialog.tsx` en `DeleteTaskDialog.tsx`
- Edit/delete event dialogs naar `src/components/dashboard/EditEventDialog.tsx` en `DeleteEventDialog.tsx`
- Het dashboard wordt dan ~800 regels.

---

## 2. Reporting "Vrijwilligers" tab mist doorklik-functionaliteit

**Probleem:** De Vrijwilligers-tab in Reporting (lijn 819-860) toont een tabel, maar rijen zijn niet klikbaar. Je kunt niet doorklikken naar het profiel van een vrijwilliger om meer details te zien (taken, contracten, betalingen).

**Oplossing:** Elke rij klikbaar maken met `onClick` die een `VolunteerProfileDialog` opent, of navigeert naar een detail-view met die vrijwilliger's volledige historie.

---

## 3. CommandCenter "contract" acties checken geen bestaande signatures

**Probleem:** De Actielijst toont "Contract versturen" voor elke assigned signup met een `contract_template_id`, maar controleert niet of er al een `signature_request` bestaat. Als het contract al verstuurd is, verschijnt het onterecht als openstaande actie.

**Oplossing:** Bij data-loading in `CommandCenter.tsx` ook `signature_requests` ophalen en assigned signups die al een signature hebben uitfilteren.

---

## 4. Dashboard data herlaadt niet na acties

**Probleem:** Na het toekennen van een vrijwilliger, het bewerken van een taak, of het verwijderen van een evenement, worden de KPI-waarden (pending enrollments, day signups, tickets) niet opnieuw berekend. Ze worden alleen bij initial load gezet.

**Oplossing:** Een `refreshKPIs()` functie extraheren uit de `init()` en aanroepen na elke mutatie.

---

## 5. Volunteer Reporting tab mist zoek/filter functionaliteit

**Probleem:** De overview-tab filtert op `searchQuery` maar de Vrijwilligers-tab (lijn 819-860) toont altijd alle vrijwilligers ongeacht de search-query of geselecteerde filters.

**Oplossing:** De `volunteerReports` in de volunteers tab filteren op `searchQuery` (naam/email) zodat de zoekbalk consistent werkt over alle tabs.

---

## 6. Compliance widget toont "vrijwilligers met verklaring" maar dat is misleidend

**Probleem:** De `compliance_overview` widget (lijn 1579-1591) toont `complianceMap.size` met als label "Vrijwilligers met verklaring". Maar `complianceMap` wordt gevuld via `fetchBatchComplianceData` die ALLE vrijwilligers bevat die een signup hebben -- niet alleen degenen met een actuele verklaring.

**Oplossing:** Tellen hoeveel entries in `complianceMap` daadwerkelijk `hasCurrentMonthDeclaration === true` hebben, of het aantal met status 'green' tonen.

---

## Aanbevolen prioriteit

| # | Upgrade | Impact | Moeite |
|---|---------|--------|--------|
| 3 | Contract-acties filteren op bestaande signatures | Hoog | Klein |
| 4 | Dashboard KPIs refreshen na acties | Hoog | Klein |
| 6 | Compliance widget juiste telling | Hoog | Klein |
| 5 | Zoek/filter in Vrijwilligers reporting tab | Medium | Klein |
| 2 | Doorklik op vrijwilliger in Reporting | Medium | Medium |
| 1 | Dashboard refactor (1804 regels opsplitsen) | Medium | Groot |

Geef aan welke je wilt aanpakken.

