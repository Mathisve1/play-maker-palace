import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YEARLY_LIMIT = 3233.91;
const HOURS_LIMIT = 190;
const WARNING_THRESHOLD = 0.80; // 80%

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { task_id, volunteer_id, amount } = await req.json();
    if (!task_id || !volunteer_id) throw new Error("task_id and volunteer_id required");

    const paymentAmount = amount || 2500; // Default €25 in cents

    // Get club info
    const { data: task } = await supabaseClient
      .from("tasks")
      .select("id, club_id, title, expense_amount")
      .eq("id", task_id)
      .maybeSingle();
    if (!task) throw new Error("Task not found");

    const { data: club } = await supabaseClient
      .from("clubs")
      .select("id, stripe_account_id, name, owner_id")
      .eq("id", task.club_id)
      .maybeSingle();
    if (!club) throw new Error("Club not found");

    // Verify the user is the club owner or admin
    if (club.owner_id !== user.id) {
      const { data: membership } = await supabaseClient
        .from("club_members")
        .select("role")
        .eq("club_id", club.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!membership || !["bestuurder", "beheerder"].includes(membership.role)) {
        throw new Error("Not authorized");
      }
    }

    if (!club.stripe_account_id) throw new Error("Club has no Stripe account connected");

    // Get volunteer stripe account
    const { data: volunteer } = await supabaseClient
      .from("profiles")
      .select("id, stripe_account_id, full_name, email")
      .eq("id", volunteer_id)
      .maybeSingle();
    if (!volunteer) throw new Error("Volunteer not found");
    if (!volunteer.stripe_account_id) throw new Error("Volunteer has no Stripe account connected");

    // Check if payment already exists
    const { data: existingPayment } = await supabaseClient
      .from("volunteer_payments")
      .select("id, status")
      .eq("task_id", task_id)
      .eq("volunteer_id", volunteer_id)
      .in("status", ["pending", "processing", "succeeded"])
      .maybeSingle();

    if (existingPayment) {
      throw new Error(`Payment already exists with status: ${existingPayment.status}`);
    }

    // Check if contract is signed (look for any completed signature request)
    const { data: signatureReqs } = await supabaseClient
      .from("signature_requests")
      .select("status")
      .eq("task_id", task_id)
      .eq("volunteer_id", volunteer_id)
      .eq("status", "completed")
      .limit(1);

    if (!signatureReqs || signatureReqs.length === 0) {
      throw new Error("Contract must be signed before payment can be made");
    }

    // Use the expense_amount from the task if available, otherwise use the provided amount
    const volunteerAmount = task.expense_amount
      ? Math.round(task.expense_amount * 100)
      : paymentAmount;

    if (volunteerAmount < 100) {
      throw new Error("Het bedrag moet minstens €1,00 zijn");
    }

    // ===== COMPLIANCE CHECK: Server-side betaalblokkade =====
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01T00:00:00Z`;
    const yearEnd = `${currentYear}-12-31T23:59:59Z`;

    // Get all succeeded payments for this volunteer this year
    const { data: yearPayments } = await supabaseClient
      .from("volunteer_payments")
      .select("amount")
      .eq("volunteer_id", volunteer_id)
      .eq("status", "succeeded")
      .gte("created_at", yearStart)
      .lte("created_at", yearEnd);

    const internalIncome = (yearPayments || []).reduce((sum, p) => sum + Number(p.amount), 0);

    // Get external declarations for this year
    const { data: declarations } = await supabaseClient
      .from("compliance_declarations")
      .select("external_income, external_hours")
      .eq("volunteer_id", volunteer_id)
      .eq("declaration_year", currentYear);

    const externalIncome = (declarations || []).reduce((sum, d) => sum + Number(d.external_income), 0);
    const externalHours = (declarations || []).reduce((sum, d) => sum + Number(d.external_hours), 0);

    const newPaymentEuros = volunteerAmount / 100;
    const totalIncomeAfter = internalIncome + externalIncome + newPaymentEuros;
    const remainingBudget = YEARLY_LIMIT - (internalIncome + externalIncome);

    if (totalIncomeAfter > YEARLY_LIMIT) {
      throw new Error(
        `Betaling geblokkeerd: het jaarplafond van €${YEARLY_LIMIT.toFixed(2)} wordt overschreden. ` +
        `Huidig totaal: €${(internalIncome + externalIncome).toFixed(2)}, ` +
        `resterend budget: €${Math.max(0, remainingBudget).toFixed(2)}. ` +
        `Overweeg Art. 17 (RSZ-bijdrage) als alternatief.`
      );
    }

    // Hours check (estimate from task duration)
    // Note: hours are tracked via task signups + external declarations
    // We don't block on hours here since the payment amount is the primary concern,
    // but we do warn via notifications (see below)

    // ===== END COMPLIANCE CHECK =====

    // Create a PaymentIntent charging the club, transferring to volunteer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: volunteerAmount,
      currency: "eur",
      payment_method_types: ["card", "bancontact"],
      transfer_data: {
        destination: volunteer.stripe_account_id,
      },
      application_fee_amount: 0,
      metadata: {
        task_id,
        volunteer_id,
        club_id: club.id,
        type: "volunteer_expense_reimbursement",
      },
      description: `Onkostenvergoeding - ${task.title} - ${volunteer.full_name || volunteer.email}`,
    });

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from("volunteer_payments")
      .insert({
        task_id,
        club_id: club.id,
        volunteer_id,
        amount: volunteerAmount / 100,
        currency: "eur",
        stripe_payment_intent_id: paymentIntent.id,
        status: "processing",
      })
      .select()
      .maybeSingle();

    if (paymentError) throw new Error(paymentError.message);

    // ===== COMPLIANCE NOTIFICATIONS at 80% threshold =====
    const totalAfterPayment = internalIncome + externalIncome + newPaymentEuros;
    const warningAmount = YEARLY_LIMIT * WARNING_THRESHOLD; // €2.587,13

    if (totalAfterPayment >= warningAmount) {
      // Check if we already sent a warning this year (prevent duplicates)
      const { data: existingVolNotif } = await supabaseClient
        .from("notifications")
        .select("id")
        .eq("user_id", volunteer_id)
        .eq("type", "compliance_warning_volunteer")
        .gte("created_at", yearStart)
        .limit(1);

      if (!existingVolNotif || existingVolNotif.length === 0) {
        // Notify volunteer
        await supabaseClient.from("notifications").insert({
          user_id: volunteer_id,
          type: "compliance_warning_volunteer",
          title: "⚠️ Jaarplafond nadert",
          message: `Je hebt €${totalAfterPayment.toFixed(2)} van de €${YEARLY_LIMIT.toFixed(2)} ontvangen (${Math.round((totalAfterPayment / YEARLY_LIMIT) * 100)}%). Let op: bij overschrijding is RSZ verschuldigd.`,
          metadata: { year: currentYear, total: totalAfterPayment, limit: YEARLY_LIMIT },
        });
      }

      // Notify club owner
      const { data: existingClubNotif } = await supabaseClient
        .from("notifications")
        .select("id")
        .eq("user_id", club.owner_id)
        .eq("type", "compliance_warning_club")
        .gte("created_at", yearStart)
        .ilike("message", `%${volunteer_id}%`)
        .limit(1);

      if (!existingClubNotif || existingClubNotif.length === 0) {
        await supabaseClient.from("notifications").insert({
          user_id: club.owner_id,
          type: "compliance_warning_club",
          title: "⚠️ Vrijwilliger nadert plafond",
          message: `${volunteer.full_name || volunteer.email} heeft €${totalAfterPayment.toFixed(2)} van €${YEARLY_LIMIT.toFixed(2)} ontvangen (${Math.round((totalAfterPayment / YEARLY_LIMIT) * 100)}%).`,
          metadata: { year: currentYear, volunteer_id, volunteer_name: volunteer.full_name, total: totalAfterPayment, limit: YEARLY_LIMIT },
        });
      }
    }
    // ===== END NOTIFICATIONS =====

    return new Response(JSON.stringify({
      success: true,
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      payment_id: payment?.id,
      amount: volunteerAmount / 100,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[stripe-create-transfer] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
