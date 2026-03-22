# Claude Code Prompt: Sponsor Portal Scanner & Analytics Overhaul

**Goal:** The Sponsor Hub is currently missing the proper shareable "Portal" link for sponsors, and the existing Analytics link/page is using a dark blue theme that doesn't fit our premium Club brand. We need you to build (or refactor) a single, unified "Sponsor Portal" that is shared via a secure Magic Link.

This portal is for the **Sponsor (e.g., the local butcher or baker)** and must be **Mobile-First** since they will use it in their shop to scan phones.

## 🛠️ Instructions for Claude Code
Act as a Senior Full-Stack Engineer. Before writing code, use your reading tools to check `src/pages/SponsorPortalPage.tsx`, `src/pages/SponsorHub.tsx` and the `sponsor_campaigns` table schema in `src/integrations/supabase/types.ts`.

### 1. Database Prerequisite Check
- We recently ran a migration to add `portal_access_token` (UUID) to `sponsor_campaigns`. Verify that your local types or queries account for this.

### 2. Update `SponsorHub.tsx` (Club Admin side)
- In the "Campagnes" table (CRM view), locate the "Shareable links" column.
- **Remove** the old "Analytics" link button.
- **Replace** it with a prominent "Open Scanner / Portal" button.
- This button should generate and copy the link: `/sponsor/portal/:campaignId/:portal_access_token`.
- Make sure this button is ALWAYS visible for active campaigns, even if it was previously hidden behind a strict null check (add a fallback or handle the token generation if missing, though it shouldn't be missing now).

### 3. Build / Refactor the Sponsor Portal (`src/pages/SponsorPortalPage.tsx`)
Create or completely overwrite the Sponsor Portal page. It must be accessible via the route `/sponsor/portal/:id/:token`.

**Features of the Portal:**
*   **Authentication:** Verify the `:id` matches the campaign and the `:token` matches the `portal_access_token`. If not, show a clean "Not Found / Unauthorized" state.
*   **Header:** Show the Sponsor's name and the Campaign Title.
*   **Scanner Mode (The Core Feature):**
    *   Integrate a QR code scanner (using a library like `react-qr-reader`, `html5-qrcode`, or `@zxing/browser`—whatever is most robust for React mobile).
    *   The scanner should read the payload from the volunteer's app (which is usually a JSON string like `{"c":"campaign_id","v":"volunteer_id","code":"backup_code"}` or whatever format is currently generated in `VolunteerDashboard`).
    *   Upon successful scan, call a Supabase RPC to validate and claim the coupon (make sure the RPC `claim_sponsor_reward` exists, or build it). Show a massive green success checkmark with the volunteer's name.
*   **Analytics Mode (Unified):**
    *   Below the scanner (or accessible via a simple bottom tab/toggle), show the LIVE analytics for this campaign.
    *   Show "Total Claims", "Impressions", and "Estimated Value Generated".
    *   This replaces the need for a separate Analytics page.

### 4. Styling (CRITICAL)
*   **No "Dirty Dark Blue"**.
*   The UI must be **Premium, Light, and Clean.**
*   Use white/off-white backgrounds (`bg-background`, `bg-card`), soft borders, and pronounced box-shadows (glassmorphism).
*   Use **Orange** (`text-orange-500`, `bg-orange-500`) for primary accents and buttons, NOT blue or indigo.
*   The QR scanner container should look like a modern, rounded camera viewfinder.
*   Everything must be optimized for a small smartphone screen.
