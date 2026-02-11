import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Check if contract is signed
    const { data: signatureReq } = await supabaseClient
      .from("signature_requests")
      .select("status")
      .eq("task_id", task_id)
      .eq("volunteer_id", volunteer_id)
      .maybeSingle();

    if (!signatureReq || signatureReq.status !== "completed") {
      throw new Error("Contract must be signed before payment can be made");
    }

    // Use the expense_amount from the task if available, otherwise use the provided amount
    const volunteerAmount = task.expense_amount
      ? Math.round(task.expense_amount * 100)
      : paymentAmount;

    // Create a PaymentIntent charging the club, transferring to volunteer
    // The club pays the full amount + Stripe fees
    // Using destination charge: money goes to volunteer, club is charged
    const paymentIntent = await stripe.paymentIntents.create({
      amount: volunteerAmount,
      currency: "eur",
      // Charge the club's connected account
      payment_method_types: ["card", "bancontact", "ideal"],
      transfer_data: {
        destination: volunteer.stripe_account_id,
      },
      // The application_fee_amount is 0 - platform takes no cut
      application_fee_amount: 0,
      metadata: {
        task_id,
        volunteer_id,
        club_id: club.id,
        type: "volunteer_expense_reimbursement",
      },
      description: `Onkostenvergoeding - ${task.title} - ${volunteer.full_name || volunteer.email}`,
      // Charge on behalf of the club
      on_behalf_of: club.stripe_account_id,
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
