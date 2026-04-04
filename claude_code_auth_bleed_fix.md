# Claude Code Prompt: Fix Cross-Account Session Bleed

**Background:** The user reported a critical security/UX issue: when logging out and logging in with a different account on the same browser, the new session sees the previous user's profile data, settings, and account details. They "can get on another account's profile". 

## 🚨 The Root Cause
This is a classic Single Page Application (SPA) state bleed issue.
Currently, when a user logs out (`await supabase.auth.signOut()`), the app uses `navigate('/login')` (React Router client-side routing).
Because the page doesn't physically reload:
1. The **React Query Cache** (which has a 30m gcTime in `App.tsx`) is NEVER cleared. It retains the old profile data.
2. The **JavaScript memory heap** (React Contexts like `ClubContext`, global variables, `useState` closures) stays alive.
When the second user logs in, React re-mounts the dashboard but React Query instantly returns the cached "profile" of the *first* user.

## 🛠️ Instructions for Claude Code
Act as a Senior React Security Expert. You must harden the authentication flow so that local state is mathematically guaranteed to wipe on logout.

### Step 1: Force Hard Reloads on Logout
Search the *entire* codebase (specifically all files in `src/pages/` and `src/components/`) for any instance of:
```typescript
await supabase.auth.signOut();
navigate('/...loginRoute...');
```
**REPLACE** the `navigate(...)` with a hard browser redirect to completely wipe the JS heap and React Query cache:
```typescript
await supabase.auth.signOut();
window.location.href = '/...loginRoute...'; // e.g. '/login', '/club-login', '/partner-login'
```
*Make sure you find and replace every single one! Look at `VolunteerDashboard.tsx`, `AdminDashboard.tsx`, `ClubOwnerDashboard.tsx`, `PartnerDashboard.tsx`, `Navbar.tsx`, `RequireAuth.tsx`, etc.*

### Step 2: Global Auth State Cleanup
In `src/components/RequireAuth.tsx`, locate the `supabase.auth.onAuthStateChange` listener. When `event === 'SIGNED_OUT'`, we must violently clear the tracking and cache before the hard redirect:
```typescript
      if (event === 'SIGNED_OUT') {
        if (cancelled) return;
        Sentry.setUser(null);
        resetUser(); // posthog
        localStorage.removeItem('supabase.auth.token'); // Fallback wipe 
        initialAuthResolved.current = true;
        setAuthenticatedUserId(null);
        setChecked(true);
        // Force hard reload to wipe JS heap, React Query cache, and Zustand stores
        window.location.href = redirectTo; 
      }
```

### Step 3: React Query Cache Key Audit
Ensure that if functions use `useQuery` from `@tanstack/react-query` to fetch profile data, their `queryKey` includes the `user.id`. 
For example, change `queryKey: ['profile']` to `queryKey: ['profile', user.id]`. 

**Goal Validation:** After applying your fixes, if a user logs out and logs in as someone else, it should be 100% impossible for them to see the previous user's data because the page will have fully reloaded and the query cache will be physically destroyed by the browser context refresh.
