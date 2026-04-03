# Claude Code Prompt: Database Security & Concurrency Audit

**Goal:** Based on a deep architectural review of the Supabase migrations and application code, we found critical logic holes in how `task_signups` are handled. We rely too heavily on the frontend UI to block invalid actions. Since Supabase provides a public API, users (or race conditions) can easily bypass UI limits. We need robust Database-level protections (Postgres Triggers) to enforce these rules.

## 🛠️ Instructions for Claude Code
Act as a Senior Database Engineer. Write and apply a new Supabase Migration (e.g. `20260404000000_secure_task_signups.sql`) that creates a comprehensive `BEFORE INSERT OR UPDATE` trigger on the `task_signups` table to fix the following 3 critical flaws:

### Flaw 1: The "Unlimited Signups" Race Condition
*   **The Issue:** Currently, `spots_available` is a column on `tasks`. The frontend disables the "Sign Up" button if `signupCount >= spots_available`. However, there is NO database trigger enforcing this. In high-traffic scenarios (or if someone hits the API directly), an unlimited number of volunteers can insert rows into `task_signups`, completely overbooking a task.
*   **The Fix:** Create a trigger function that:
    1. Locks the task row for update (`SELECT spots_available FROM tasks WHERE id = NEW.task_id FOR UPDATE`).
    2. Counts the existing assigned signups (`SELECT COUNT(*) FROM task_signups WHERE task_id = NEW.task_id AND status IN ('assigned', 'pending')`).
    3. If the count + 1 > `spots_available`, raise an EXCEPTION: `'Task is full. No spots available.'`.

### Flaw 2: Bypassing "Required Training"
*   **The Issue:** The `tasks` table has a `required_training_id` column. The frontend checks this, but the database allows any authenticated user to insert a row into `task_signups`. A volunteer could theoretically sign up for a critical task (e.g., EHBO, Security) without actually having the required certificate.
*   **The Fix:** Inside the same trigger function:
    1. Check if the task has a `required_training_id`.
    2. If it does, query `volunteer_certificates` to see if `NEW.volunteer_id` has a valid certificate for that `training_id`.
    3. If not, raise an EXCEPTION: `'Missing required training for this task.'`.

### Flaw 3: Double Booking (Overlapping Shifts)
*   **The Issue:** A volunteer can sign up for two tasks that happen at the exact same time.
*   **The Fix:** In the trigger function:
    1. Fetch the `task_date`, `start_time`, and `end_time` of the `NEW.task_id`.
    2. Query existing `task_signups` for this `NEW.volunteer_id` to see if they belong to any other task on the SAME `task_date` where the time periods overlap. (Assume times are standard time strings like '14:00').
    3. If an overlap is found (for tasks they are `assigned` to), raise an EXCEPTION: `'Volunteer is already assigned to an overlapping task on this date.'`.
    *(Note: Be careful with edge cases around null start/end times. If times are null, maybe just prevent two tasks on the exact same `task_date` unless explicitly permitted, or just skip the overlap check if times aren't defined).*

### Action Plan
1. Generate the migration file using `npx supabase migration new secure_task_signups`.
2. Write the single comprehensive trigger `trg_secure_task_signups` (combining all 3 logic checks) to ensure high performance.
3. Apply the migration and inform the user.
