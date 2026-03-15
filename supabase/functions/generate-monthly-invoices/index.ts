import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const invoiceMonth = now.getMonth() + 1; // 1-12
    const invoiceYear = now.getFullYear();

    console.log(`Generating monthly invoices for ${invoiceMonth}/${invoiceYear}`);

    // Get all clubs with billing
    const { data: billingRecords } = await supabase
      .from("club_billing")
      .select("*");

    if (!billingRecords || billingRecords.length === 0) {
      return new Response(JSON.stringify({ message: "No billing records" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const billing of billingRecords) {
      // Check if invoice already exists for this month
      const { data: existing } = await supabase
        .from("monthly_invoices")
        .select("id")
        .eq("club_id", billing.club_id)
        .eq("invoice_month", invoiceMonth)
        .eq("invoice_year", invoiceYear)
        .limit(1);

      if (existing && existing.length > 0) {
        results.push({ club_id: billing.club_id, status: "already_exists" });
        continue;
      }

      // Calculate costs
      const volunteerCount = billing.current_season_volunteers_billed || 0;
      const volunteerAmountCents = volunteerCount * (billing.volunteer_price_cents || 1500);

      const partnerSeats = billing.partner_seats_purchased || 0;
      const partnerAmountCents = partnerSeats * (billing.partner_seat_price_cents || 1500);

      const totalAmountCents = volunteerAmountCents + partnerAmountCents;

      // Skip if nothing to bill
      if (totalAmountCents === 0) {
        results.push({ club_id: billing.club_id, status: "nothing_to_bill" });
        continue;
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("monthly_invoices")
        .insert({
          club_id: billing.club_id,
          invoice_month: invoiceMonth,
          invoice_year: invoiceYear,
          volunteer_count: volunteerCount,
          volunteer_amount_cents: volunteerAmountCents,
          partner_seats_count: partnerSeats,
          partner_seats_amount_cents: partnerAmountCents,
          total_amount_cents: totalAmountCents,
          status: "pending",
        })
        .select()
        .single();

      if (invoiceError) {
        console.error(`Error creating invoice for ${billing.club_id}:`, invoiceError);
        results.push({ club_id: billing.club_id, status: "error", error: invoiceError.message });
        continue;
      }

      // Log billing event
      await supabase.from("billing_events").insert({
        club_id: billing.club_id,
        event_type: "invoice_created",
        amount_cents: totalAmountCents,
        metadata: {
          invoice_id: invoice.id,
          month: invoiceMonth,
          year: invoiceYear,
          volunteer_count: volunteerCount,
          partner_seats: partnerSeats,
        },
      });

      results.push({
        club_id: billing.club_id,
        status: "created",
        invoice_id: invoice.id,
        total: totalAmountCents,
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-monthly-invoices:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
