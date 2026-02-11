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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { payment_intent_id, payment_id } = await req.json();
    if (!payment_intent_id) throw new Error("payment_intent_id required");

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Get receipt URL from the latest charge
    let receiptUrl = null;
    if (paymentIntent.latest_charge) {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
      receiptUrl = charge.receipt_url;
    }

    // Map Stripe status to our status
    let status = "processing";
    if (paymentIntent.status === "succeeded") status = "succeeded";
    else if (paymentIntent.status === "canceled") status = "failed";
    else if (paymentIntent.status === "requires_payment_method") status = "failed";

    // Update payment record if payment_id provided
    if (payment_id) {
      const updateData: Record<string, unknown> = {
        status,
        stripe_receipt_url: receiptUrl,
      };
      if (status === "succeeded") {
        updateData.paid_at = new Date().toISOString();
        // Get the transfer ID
        const transfers = await stripe.transfers.list({
          limit: 1,
        });
        const transfer = transfers.data.find(
          (t) => t.metadata?.payment_intent_id === payment_intent_id ||
                 t.source_transaction === paymentIntent.latest_charge
        );
        if (transfer) {
          updateData.stripe_transfer_id = transfer.id;
        }
        // Calculate fee
        if (paymentIntent.latest_charge) {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          if (charge.balance_transaction) {
            const bt = await stripe.balanceTransactions.retrieve(charge.balance_transaction as string);
            updateData.stripe_fee = bt.fee / 100;
            updateData.total_charged = bt.amount / 100;
          }
        }
      }
      await supabaseClient
        .from("volunteer_payments")
        .update(updateData)
        .eq("id", payment_id);
    }

    return new Response(JSON.stringify({
      status,
      receipt_url: receiptUrl,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
