import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return Response.json({ error: listErr.message }, { status: 500 });

  const matched = users.filter(u => u.email?.toLowerCase().includes("mathis"));
  const results = [];

  for (const u of matched) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    results.push({ id: u.id, email: u.email, deleted: !error, error: error?.message });
  }

  return Response.json({ matched: matched.length, results });
});
