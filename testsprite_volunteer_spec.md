# Product Specification Document (PRD)
## De12eMan: Volunteer PWA (TestSprite Blueprint)

**Product Name:** De12eMan Volunteer Application (Smartphone PWA)
**Target Platform:** Mobile Web (PWA optimized for 390x844 resolution)
**Target Engine for QA/Testing:** TestSprite

---

## 1. Executive Summary (The "Why")
**The Problem:** Large professional and amateur sports clubs struggle to manage, engage, and retain their volunteer workforce. Existing tools are fragmented, leaving clubs exposed to legal liabilities (unsigned contracts), chaotic safety protocols (walkie-talkies instead of digital incident reports), and frustrating reward distributions (paper vouchers). 
**The Solution:** The De12eMan Volunteer PWA is a high-end, consumer-grade Progressive Web App designed specifically for the volunteers. It provides a frictionless "Blue Ocean" experience: onboarding seamlessly, signing dynamic legal contracts digitally, finding relevant shifts, executing stadium safety checklists, reporting live incidents, and managing their digital "Kantine Wallet" (Club Card) for POS integration and loyalty rewards.
**The Goal of this Document:** Provide a detailed functional and technical blueprint for TestSprite (our AI E2E testing framework) to comprehend the core features, customer journeys, and edge cases to autonomously generate and run high-load test suites.

---

## 2. Target Audience (User Personas)
1. **The Direct Volunteer (Persona A):** Demographics vary heavily (aged 16 to 70+). They need an extremely simple, accessible interface. They must sign a mandatory legal document (Informatienota) before doing any work.
2. **The Partner/B2B Volunteer (Persona B):** Employees or members of an external partner (e.g., a local scouting group or corporate sponsor). They join via a unique invite link, skip standard vetting, and are grouped using "Buddy Logic" to work the same shifts as their peers.
3. **The Active Veteran (Persona C):** A highly engaged volunteer who manages their shift calendar dynamically, accrues a monetary balance or loyalty points on their digital Club Card (QR/RFID code), and requires access to the Live Command Center features (SOS button, Checklists).

---

## 3. Core Features & Functionalities (The "What")

### 3.1 Authentication & Legal Onboarding
*   **Feature:** Magic Link & Password / Unique Partner Routing.
*   **Dependency:** Supabase Auth.
*   **Requirements:**
    *   Volunteers must be able to log in securely.
    *   **CRITICAL PATH:** Upon first login, the system must detect if a valid `signature_request` exists and is pending. The user is force-redirected to the dynamic `Informatienota` (Code of Conduct/Insurance Note).
    *   The user must physically digitally sign (via a signature pad component) before they can access the core Dashboard.

### 3.2 Task Marketplace ("De Takenlijst")
*   **Feature:** A dynamic marketplace of available shifts, filtered by the volunteer's specific club.
*   **Requirements:**
    *   Must display tasks sorted by date (`task_date`), showing the task title, location, and compensation type (Fixed Euro amount, Hourly Rate, or Volunteer Points).
    *   A progress bar must indicate how many `spots_available` remain.
    *   **"Partner Only" Logic:** If a task is flagged as `partner_only`, it must ONLY be visible to volunteers linked to that specific partner organization.
    *   When a volunteer clicks "Sign Up", it immediately inserts a `task_signups` record with status `assigned` or `pending` (depending on club settings) and updates the UI optimistically.

### 3.3 Stadium Safety & Live Event Execution
*   **Feature:** The Event Hub & Safety Dashboard.
*   **Requirements:**
    *   **Checklists:** Volunteers assigned to specific zones must check off mandatory opening/closing procedures. Progress is saved to the database in real-time.
    *   **The Panic/SOS Button:** In case of emergency (Paramedic needed, fight, lost child), the volunteer clicks a massive Red Button.
    *   The app must request HTML5 Geolocation. An `incident` record is created containing the LAT/LNG coordinates and incident severity, which broadcasts via Supabase Realtime to the Club's Command Center.

### 3.4 The Digital Club Card & Wallet (Rewards)
*   **Feature:** A dynamic QR/Barcode representing the user's UID.
*   **Requirements:**
    *   The app displays a fast, highly scannable QR Code.
    *   **Auto-Check-In Logic:** When a POS scanner reads this QR code at the stadium gate, it hits the `auto_checkin_on_card_scan` Edge Function. The PWA must show a "Checked In" status via real-time subscription.
    *   The Wallet displays the current accrued monetary balance (`Verdiend`) and the status of any active Loyalty Program goals (e.g., "7/10 tasks completed for a Free Ticket").

### 3.5 Post-Shift Analytics
*   **Feature:** Volunteer Feedback Loop.
*   **Requirements:**
    *   When a shift concludes, the database transitions the task to `completed`.
    *   On the volunteer's next session load, an intercept modal appears asking them to rate their shift (😡 😐 😍).
    *   This feedback is stored alongside the `task_signup` for the club manager to review.

---

## 4. Technical Requirements & Architecture (The "How")

*   **Frontend Stack:** React (Vite), TypeScript, Tailwind CSS, Shadcn UI.
*   **Animations:** Extensive use of `framer-motion` for premium, native-feeling transitions. (Test suites must account for animation delays using `waitFor`).
*   **Backend & Database:** Supabase (PostgreSQL).
    *   Heavy reliance on **Row Level Security (RLS)**. Volunteers can only read `tasks` matching their `club_id`. They can only read their own `task_signups` and their own `competence_tags`.
    *   **Realtime Subscriptions:** The PWA uses Supabase Realtime channels for instant notification of shift approvals, incident escalations, and check-in verifications.
*   **Viewport Requirements:** The application is mobile-first. Test environments should explicitly enforce dimensions of `390px x 844px` (iPhone 12/13/14 Pro).

---

## 5. Technical Testing Directives for TestSprite
As an AI-driven testing engine, TestSprite must handle the following complexities when generating E2E tests for this application:
1.  **Concurrent Simulatability:** Because this is an enterprise ecosystem, a valid test suite must simulate multiple volunteer accounts (e.g., `user1@test.com`, `user2@test.com`) interacting with the same `club_id` simultaneously to test `spots_available` race conditions on tasks.
2.  **Mocking Geolocation:** For the SOS/Incident test flows, the browser context must have mocked geolocation permissions and predefined coordinates (e.g., `latitude: 51.2194, longitude: 4.4025`).
3.  **Mocking the POS Scanner:** To test the Kantine Wallet / Check-in flow without a physical scanner, the test runner should invoke a raw API HTTP POST against the `auto_checkin_on_card_scan` Supabase endpoint, passing the volunteer's mocked UUID.
4.  **Database Teardown:** Tests must be idempotent. TestSprite must establish a `test_club_id` and cleanly delete all `task_signups`, `incidents`, and `loyalty_enrollments` generated during the run.
