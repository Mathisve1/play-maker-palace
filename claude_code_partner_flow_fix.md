# Claude Code Prompt: Partner Invitation & Exclusive Tasks Flow Fix

**Goal:** The flow for External Partners (e.g. Student groups, secondary schools) inviting volunteers and managing exclusive tasks is currently broken. Volunteers can see tasks that are `partner_only`, and the email invite flow for partner members doesn't properly link them back to the partner.

## 🛠️ Instructions for Claude Code
Act as a Senior Full-Stack Engineer and fix the following three critical bugs in the "Partner -> Volunteer" flow.

### Bug 1: Partner-Only Tasks are visible to all volunteers
In `src/components/volunteer/VolunteerDashboardHome.tsx` (around lines 262-300), the app fetches tasks from followed clubs using `supabase.from('tasks')`.
*   **The Issue:** The query only filters by `status = open` and `task_date >= now`. It DOES NOT filter out tasks that are `partner_only = true`. This means a regular club volunteer currently sees tasks that were created exclusively for an external partner!
*   **The Fix:** Update the `tasks` query in `VolunteerDashboardHome.tsx`. The query should ONLY return tasks where:
    *   `partner_only` is falsy (or `false`)
    *   **OR** (if possible via RPC or multiple queries) the `assigned_partner_id` matches a partner that the current user is a member of (check `partner_members.user_id = currentUserId`).
    *   *Tip:* If doing this via pure Supabase JS is too complex for an OR statement across joins, consider fetching the user's `partner_id`s first from `partner_members`, and then filtering tasks where `partner_only.is.false,assigned_partner_id.in.(...partnerIds)`.
    *   Check `VolunteerTasksList.tsx` as well to ensure the same filtering is applied there!

### Bug 2: Partner Members are invited as regular club volunteers
In `src/pages/ExternalPartners.tsx` (around line 383 in `handleInviteMemberAsVolunteer`), the code sends an invite to a partner member to create a volunteer account.
*   **The Issue:** It calls `supabase.functions.invoke('club-invite?action=send-email')` with `role: 'medewerker'` but doesn't pass the `partner_id` or `partner_member_id`. The email says "You are invited to join the club" instead of "You are invited to join Partner X". Even worse, when the user accepts, the `index.ts` Edge Function just makes them a regular club member, and NEVER links their new `user_id` back to the existing `partner_members` row. Without their `user_id` in `partner_members`, they cannot be tracked properly.
*   **The Fix:**
    1.  Update `ExternalPartners.tsx` (and `PartnerDashboard.tsx` if it has similar invite logic for members) to pass `partner_id` AND `partner_member_id` to the `club-invite` function. Also pass a specific role like `"partner_member"`.
    2.  Update `supabase/functions/club-invite/index.ts`.
        *   Modify the email HTML so that if `role === 'partner_member'`, the text says: "Je bent uitgenodigd om een vrijwilligersaccount aan te maken voor **[partner_name]** bij **[club_name]**."
        *   Modify the `signup-and-accept` and `accept` logic. If it's a `partner_member` invite, it should STILL add them to `club_members`, BUT it must ALSO update the `partner_members` table and set `user_id = authData.user.id` where `id = payload.partner_member_id`!

### Bug 3: Ensure Partner Exclusivity in Task Signups
If a volunteer clicks "Sign up" on a task that is `partner_only`, we need to be absolutely sure they are actually a member of `assigned_partner_id`.
*   **The Fix:** Double-check the `handleSignup` logic in `src/pages/VolunteerDashboard.tsx` (or the underlying RPC). If the task is `partner_only`, verify that `partner_members` contains a row for this `user_id` and `assigned_partner_id`. If not, throw an error or show a Toast message: *"Je kunt je niet inschrijven voor deze taak omdat deze gereserveerd is voor een externe partner."*

Go ahead and implement these fixes. Start by analyzing `VolunteerDashboardHome.tsx`, `ExternalPartners.tsx`, and `supabase/functions/club-invite/index.ts`.
