# Claude Code Prompt: Shift Templates UX Overhaul

**Goal:** The current "Shift Templates" (`ShiftTemplates.tsx`) tab on the club side is confusing. Club admins don't understand *why* they need it or *what* it does, and the UI feels like a dry database editor. We need to transform this into a premium, intuitive "Roster Automation" tool that clearly explains its immense value (saving hours by auto-generating tasks for events) and visualizes the shifts on a timeline.

---

## 🚀 Core Issues Addressable in this Sprint

### 1. Education & Value Proposition (The "Aha!" Moment)
*   **The Problem:** There is no explanation of what a Shift Template is.
*   **The Fix:** Add a beautiful, dismissible "Hero Banner" or "Empty State Onboarding" at the top of the page.
*   **Copy (NL/FR/EN):** Explain that Shift Templates are "Blueprints". *Example: "Stop creating tasks manually every weekend. Build a template (e.g., 'Standard Home Game') once. Next time you create an Event, select the template, and all Bar, Steward, and Ticketing tasks are generated automatically, timed perfectly around kickoff!"*
*   **Visuals:** Use an illustration, a subtle background gradient, and some Sparkles (`<Sparkles>`) to make it feel like a pro/premium feature.

### 2. The Timeline Visualization (The Magic)
*   **The Problem:** Shifts are currently shown as a simple list. A shift that starts at `-60` minutes and lasts `120` minutes is hard to mentally picture relative to the `0` (Kickoff) time.
*   **The Fix:** Redesign the right-hand Builder panel into a **Vertical Timeline** or a mini **Gantt Chart**.
    *   Create a clear "0:00 - Kickoff / Event Start" anchor line in the UI.
    *   Plot the shifts relative to this anchor. Shifts starting at `-60` appear above the line, shifts starting at `+45` appear below it.
    *   Use colored blocks to represent the duration of the shift.

### 3. Builder UI Polish
*   The form to add a slot is currently a standard Dialog. Make the interaction smoother—perhaps an inline "Add Shift" row directly on the timeline, or a slide-out drawer (Sheet) instead of an overlapping modal, so the user can still see the timeline while adding a new shift.
*   Clearly show the "Total Volunteers Required" for the entire template at the top (summing up all shift slots) to give the admin an idea of the manpower needed.

### 4. Direct Action (The "Use It Now" bridge)
*   Once a template is ready, it feels like a dead end. Add a prominent button or helper text next to the template title that says "Use this template →" to take the admin directly to the `EventsManager` (or event creation dialog) so they can immediately see the fruits of their labor.

---

## 🛠️ Instructions for Claude Code
Act as a Senior Frontend UX Architect.

1.  **Refactor `ShiftTemplates.tsx`:** Keep the existing data fetching and Zod validation logic, but completely gut the rendering logic.
2.  **Add Onboarding Banner:** Build the educational banner explaining the concept of "Roster Automation".
3.  **Implement the Timeline:** The right panel should no longer be a boring list. Map the `slots` array over a vertical axis based on `start_offset_minutes`. This will require some creative Flexbox/CSS Grid or absolute positioning within a relative container representing hours.
4.  **Aesthetics:** Ensure the design matches our existing premium, glassmorphism UI. Use soft colors to represent different roles (e.g., Blue for Bar, Red for Stewards) if possible, or stick to the brand colors.
5.  **Language Support:** Ensure all new text (the onboarding copy, the timeline labels) is added to the `L` dictionary for `nl`, `fr`, and `en`.
