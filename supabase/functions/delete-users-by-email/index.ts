import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find all profiles with mathis in email
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", "%mathis%");

  // Find all auth users with mathis in email
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const matchedAuth = users.filter(u => u.email?.toLowerCase().includes("mathis"));

  const results = [];

  // Delete auth users (cascades to profiles via FK)
  for (const u of matchedAuth) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    results.push({ source: "auth", id: u.id, email: u.email, deleted: !error, error: error?.message });
  }

  // Delete orphan profiles not in auth
  const deletedAuthIds = matchedAuth.map(u => u.id);
  for (const p of (profiles || [])) {
    if (!deletedAuthIds.includes(p.id)) {
      // Delete user_roles first
      await supabase.from("user_roles").delete().eq("user_id", p.id);
      // Delete profile
      const { error } = await supabase.from("profiles").delete().eq("id", p.id);
      results.push({ source: "orphan_profile", id: p.id, email: p.email, deleted: !error, error: error?.message });
    }
  }

  return Response.json({ results });
});
