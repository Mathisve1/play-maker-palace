# Claude Code Prompt: Sponsor Hub Personalization & True 1:1 Live Preview

**Doel:** De huidige `PublicSponsorPage` en het `SponsorHub` dashboard (waarmee campagnes of 'Kantine Coupons' worden aangemaakt) uitbreiden tot een volwaardige, gepersonaliseerde *self-serve* advertising tool. Momenteel gebruikt de "Live Preview" nagemaakte UI-elementen. Jouw taak is om de échte Volunteer PWA componenten te (her)gebruiken, zodat sponsoren een 100% accurate, pixel-perfect preview zien. Bovendien moet de sponsor meer media kunnen toevoegen (zoals een cover foto, logo upload, en gepersonaliseerde CTA tekst).

---

## 🚀 Hoofdtaken voor deze feature iteratie

### 1. Database & Storage Upgrades (Supabase)
We moeten sponsoren toelaten om échte bestanden (logo's, afbeeldingen) te uploaden in plaats van URL's te plakken.
*   **Storage Bucket:** Maak een Supabase Storage bucket genaamd `sponsor_media` aan.
*   **Policies:** Schrijf SQL RLS policies zodat:
    *   Authentieke gebruikers (Club Admins in de `SponsorHub`) afbeeldingen kunnen uploaden.
    *   Niet-geauthenticeerde gebruikers (tijdens de public wizard in `PublicSponsorPage`) afbeeldingen kunnen uploaden (naar een tijdelijke/publieke map) of via een edge function beveiligd kunnen uploaden.
*   **Tabel Upgrades (`sponsors` & `sponsor_campaigns`):** Voeg een `cover_image_url` (text), `custom_cta` (text), en `rich_description` (text) toe via een migratie script in `supabase/migrations`.

### 2. Formulier & Uploads in de UI
Pas `PublicSponsorPage.tsx` en `SponsorHub.tsx` (edit forms) aan.
*   **Media Upload Component:** Vervang de domme "logo_url" string inputs door een robuuste Drag & Drop image uploader (gebruikmakend van Supabase Storage client SDK uploader logic en React Dropzone of soortgelijk).
*   **Nieuwe Velden:** Voeg inputvelden toe voor de `cover_image_url` en een aanpasbare `custom_cta` tekstknop (bv. "Bekijk Website", "Scan Nu").

### 3. De "True 1:1" Live Preview
Dit is de kern van de opdracht. De nep-previews (zoals `<PhonePreview>` of `<LivePreview>`) vallen weg of worden sterk ge-reworked.
*   **Herbruik Echte Componenten:** Importeer in het preview gedeelte de echte PWA componenten zoals:
    *   `src/components/volunteer/VolunteerTasksList.tsx` (voor de Task-Tag preview)
    *   `src/components/volunteer/WalletHeroCard.tsx` (voor de Wallet/Coupon banner preview)
    *   `src/components/volunteer/VolunteerDashboardHome.tsx` of de resulterende `VolunteerPaymentsTab.tsx` coupon lijst.
*   **Dependency Injection:** Refactor deze PWA componenten zodat ze makkelijk met "mock data" overweg kunnen, ZONDER Supabase calls uit te voeren als we ze in 'preview mode' draaien. Pass de huidige live-toestand van het `PublicSponsorPage` formulier in de `activeCampaigns` en `campaignTaskLinks` props.
*   **Frame Container:** Render deze componenten in een gestileerde smartphone-frame container (`DeviceFrameset` of bouw een mooi CSS mobile chassis).
*   **Dynamic Binding:** Wanneer de sponsor de "Brand Color" slider verplaatst, of zijn "Korting op hespenworst" text typt, moet het "Kantine Wallet" bedrag of de taak-tag live updaten met zijn/haar exact gekozen kleuren en styling in het smartphone frame.

### 4. Code & UX Polish
*   Pas op met `VolunteerTasksList` & `VolunteerDashboardHome`: Ik heb recentelijk code toegevoegd om gesponsorde badges (met het Gift/Tag icon) in de taakkaartjes te tonen. Zorg dat de preview deze kaartjes rendert met de sponsor's huidige form values, zodat de sponsor letterlijk de tag ziet verschijnen!
*   De ervaring in de "wizard" moet extreem "premium" aanvoelen (smooth transitions, live rendering).

---

## 🛠️ Instructies voor Claude Code
Neem de rol aan van Senior Staff Software Engineer gefocust op UX en Web Architecture.

1.  **Scope Eerst:** Bekijk `PublicSponsorPage.tsx`, `SponsorHub.tsx` en de zojuist gewijzigde `VolunteerDashboardHome.tsx` / `VolunteerTasksList.tsx` om te zien hoe de badges nu in het echt gerenderd worden.
2.  **Storage:** Maak de edge cases voor de public uploads helder: als RLS openstaan voor de public role niet mag, bouw dan een Edge Function of genereer Signed Upload URLs vanuit de applicatie logic (RPC).
3.  **Refactoring:** Pas op dat je de applicatie logica in de echte PWA componenten niet breekt terwijl je ze "previewable" (mock-friendly) maakt. Vaak is de beste oplossing om de "View" logic en "Data Fetching" logic in de huidige componenten lichtjes te scheiden, of de PWA fetch queries in `useEffect`s te overkoepelen met een simpele `if (isPreview) return;` check en de mock data props simpelweg te prefereren bóven state vars.
4.  **UI:** Behou de glassmorphism style en de "Blue Ocean" premium feeling die we hebben vastgelegd in eerdere componenten.
5.  **Output:** Voer de migratie uit voor Supabase, voer de storage uploads door in de wizard, en injecteer de PWA componenten als de nieuwe `LivePreview`. Test het grondig!
