# Claude Code Prompt: Sponsor Flow Overhaul & Volunteer Dashboard Redesign

**Goal:** We need to fundamentally improve the UX and logic of the Sponsor system and the Volunteer Dashboard based on real-world feedback. The current sponsor wizard has bad colors (ugly dark blue), gives too much control to the sponsor instead of the club, and the volunteers cannot easily find their earned QR-code coupons on their home dashboard.

---

## 🚀 Core Issues Addressable in this Sprint

### 1. Sponsor Wizard Styling & Flow Change
*   **Colors & Styling (`PublicSponsorPage.tsx`):** The current dark blue styling is ugly. Completely refactor the styling of this wizard. Use the app's beautiful light theme, integrating **orange accents** (e.g., `bg-orange-500`, `text-orange-900`, `ring-orange-200`) to match the premium, friendly feel of the rest of the application.
*   **Remove Task Selection:** Currently, the sponsor chooses *which* tasks they want to sponsor during the wizard. We want to **remove this**. The sponsor should only create the campaign (e.g., "€5 Discount on Meat").
*   **Club Control (`SponsorHub.tsx`):** The responsibility of linking tasks shifts to the Club Admin. In the `SponsorHub.tsx` dashboard, when an admin views or approves an 'active' campaign, add a UI component (like a multi-select or a list of open tasks) allowing the *Club* to link the campaign to specific tasks. This will insert rows into `sponsor_campaign_tasks`.

### 2. Volunteer Dashboard Enhancement (`VolunteerDashboardHome.tsx`)
*   **The Problem:** Volunteers currently see 3 stat boxes at the top: Completed Tasks, Total Earned, and Loyalty Points. The earned coupons (e.g., for "Slagerij Dirk") are hidden away and they can't easily access their QR codes.
*   **The Fix:** Replace the 3rd stat box ("Points") with a **"My Coupons / Rewards"** box.
    *   Show the number of `available` and `claimed` coupons.
    *   Use a Gift icon (`<Gift className="text-orange-500" />`).
    *   When the user clicks this new box, it should open a Modal or smooth Drawer showcasing their active coupons with the **QR Code directly visible**, so they can just hold up their phone in the shop.
*   *(Note: You'll need to pass `myCoupons` down to `VolunteerDashboardHome` from `VolunteerDashboard.tsx` if it isn't already).*

### 3. The Sponsor Scan Portal (`SponsorPortal.tsx`)
*   We still need the dedicated external link for the sponsors to validate these QR codes!
*   **URL:** `/sponsor/portal/:campaignId/:token` (requires a `portal_access_token` on the campaign table).
*   **Feature:** Implement a live HTML5 camera QR scanner.
*   **Action:** When scanned, call a Supabase RPC to mark the `volunteer_coupons` row as `redeemed` securely. Show a massive Green confirmation screen to the shop owner.
*   **Link Generation:** Show this unique portal URL inside the `SponsorHub.tsx` so the club admin can copy it and WhatsApp it to the sponsor.

---

## 🛠️ Instructions for Claude Code
Act as a Senior UX Engineer and Full-Stack Architect.

1.  **Refactor PublicSponsorPage.tsx First:** Rip out the dark blue backgrounds. Make it light, airy, and orange-accented. Remove the "Task linking" step entirely from this public wizard.
2.  **Update SponsorHub.tsx:** Add the "Link to Tasks" management UI for the club admins. They should be able to fetch `tasks` where `status = 'open'` and assign them to a campaign.
3.  **Enhance the Volunteer Dashboard:** Edit `VolunteerDashboardHome.tsx` to replace the strict `loyaltyPoints` box with a `Coupons` box. Build a quick `QR Wallet Modal` that opens when this box is clicked, rendering the `QRCode.react` value of their `qr_code_token`. This makes the reward system instantly accessible.
4.  **Build SponsorPortal.tsx:** Create the standalone camera validation app.
5.  **Quality Assurance:** Ensure that colors, spacing, and the glassmorphism aesthetic match the premium standard set by the rest of the app. Ensure RLS policies in Supabase allow the `SponsorPortal` to redeem coupons using the magic token.
