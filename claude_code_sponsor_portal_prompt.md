# Claude Code Prompt: Advanced Sponsor Portal & QR Redemption System

**Goal:** Create a dedicated, standalone "Sponsor Portal" for local businesses and partners. This portal is the final piece of the "Blue Ocean" sponsor pipeline. It must be accessible via a secure, passwordless magic link, feature a live QR scanner for continuous in-shop coupon redemption, and provide a comprehensive analytics dashboard to prove ROI (Return on Investment) to the sponsor.

---

## 🚀 Core Requirements & Features

### 1. Secure Magic Link Access (Frictionless Onboarding)
Sponsors are busy business owners (e.g. the local butcher or baker); they shouldn't need to create full accounts or remember passwords just to scan a coupon.
*   **Database Update:** Add a `portal_access_token` (UUID, default `gen_random_uuid()`) to the `sponsors` or `sponsor_campaigns` table.
*   **Routing:** Create a new route `/sponsor/portal/:campaignId/:token`.
*   **Security:** RLS policies should allow `SELECT` and `UPDATE` on specific metrics/coupons if the token matches. Alternatively, use a secure Supabase Edge Function to handle the token validation and redemption logic.

### 2. Built-in Web QR Scanner (The Point of Sale)
The portal must be heavily optimized for mobile devices (phones/tablets) so the shop owner can keep it open at the cash register.
*   **Scanner Integration:** Implement a robust web-based QR scanner (e.g., using `html5-qrcode` or `@zxing/browser`).
*   **Atomic Redemption Logic:**
    When a QR code is scanned, the app calls a secure Supabase RPC function (e.g., `redeem_volunteer_coupon(qr_token, campaign_access_token)`).
    *   **Checks:** Is the coupon valid? Does it belong to this campaign? Has it already been redeemed?
    *   **Action:** Update the coupon status to `redeemed`. 
    *   **Feedback:** Show massive, unmistakable visual feedback. 🟩 **SUCCESS - €5 Discount Valid!** or 🟥 **ERROR - Coupon already used today at 14:02**.

### 3. Extensive Analytics Dashboard (Proving ROI)
The sponsor must clearly see the value the sports club is bringing to their business.
*   **Key Metrics:** 
    *   👁️ **Impressions:** How many times did volunteers see the sponsored task?
    *   📥 **Claims:** How many volunteers earned the coupon by completing the task?
    *   🛍️ **Redemptions:** How many actual footfalls (scans) happened in the physical shop?
*   **Conversion Funnels:** Calculate and display the funnel drop-off (Impressions ➡️ Claims ➡️ Redemptions).
*   **Financial Impact:** Show "Total Value Distributed" (e.g., 20 redemptions × €5 = €100 given back to the local community).
*   **Charts:** Use `recharts` to show a timeline (AreaChart) of redemptions over the last 30 days. Let the sponsor visually see spikes on weekends or right after major club events.
*   **Task Attribution:** If possible, show a breakdown of *which* specific club tasks drove the most traffic to the shop (e.g., "Saturday Bar Shift" generated 15 customers).

### 4. UI/UX & Aesthetics
*   **Mobile-First Design:** The layout should function as an app. The camera scanner should be easily accessible (e.g., a massive floating action button or a dedicated tab).
*   **Premium B2B Feel:** Use glassmorphism, subtle gradients matching the sponsor's `brand_color`, and crisp typography. 
*   **Dark/Light Mode:** Full support for both, ensuring the camera view doesn't blind the user in dark environments.

---

## 🛠️ Instructions for Claude Code
Act as a Senior UX Engineer and Full-Stack Architect.

1.  **Backend First:** Start by writing the necessary Supabase migrations. You will need:
    *   An `access_token` column on the campaign or sponsor table.
    *   A secure Supabase RPC function `redeem_coupon(qr_code_token text, portal_token uuid)` that handles the validation and state change atomically to prevent double-spending race conditions.
2.  **QR Integration:** Choose a reliable QR scanning library. Handle camera permissions gracefully. If a device has no camera, provide a fallback text input for the volunteer to read a 6-digit alphanumerical backup code code beneath their QR.
3.  **Analytics View:** Build a beautiful, data-rich overview using Tremor.so or standard Radix UI + Recharts. Make the UI feel like a high-end SaaS product.
4.  **Integration:** The generated standard magic link should be visible to Club Admins in the `SponsorHub.tsx` so they can copy and email/WhatsApp it to the sponsor right after approving the campaign.
5.  **Testing Strategy:** Ensure you write code that handles the "Already Redeemed" state elegantly, as volunteers might accidentally present the same QR multiple times.
