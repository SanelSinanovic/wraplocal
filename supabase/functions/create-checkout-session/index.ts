// @ts-nocheck — Deno edge function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookingId, serviceAmount, serviceName, shopName, successUrl, cancelUrl } = await req.json();

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe secret key not configured." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Look up the shop's Stripe Connect account via the booking ─────────
    let shopStripeAccountId = null;
    try {
      if (supabaseUrl && supabaseService && bookingId) {
        const bookingRes = await fetch(
          `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=shop_id`,
          { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
        );
        const bookings = await bookingRes.json();
        if (bookings?.[0]?.shop_id) {
          const shopRes = await fetch(
            `${supabaseUrl}/rest/v1/shops?id=eq.${bookings[0].shop_id}&select=stripe_account_id`,
            { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
          );
          const shops = await shopRes.json();
          shopStripeAccountId = shops?.[0]?.stripe_account_id || null;
        }
      }
    } catch (_) {
      // Non-fatal — session will still be created, money stays with platform
    }

    // serviceAmount is dollars; Stripe needs integer cents
    const serviceCents = Math.round(Number(serviceAmount) * 100);
    const feeCents     = Math.round(serviceCents * 0.07); // 7% platform fee

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("payment_method_types[]", "card");
    // Single line item — the service price quoted by the shop.
    // The 7% platform fee is deducted server-side via application_fee_amount.
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][unit_amount]", String(serviceCents));
    params.append("line_items[0][price_data][product_data][name]", serviceName || "Service");
    params.append("line_items[0][price_data][product_data][description]",
      shopName ? `at ${shopName} · powered by Kidor` : "powered by Kidor");
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("metadata[booking_id]", String(bookingId));

    // ── Route 93% to shop, keep 7% as platform application fee ───────────
    if (shopStripeAccountId) {
      params.append("payment_intent_data[application_fee_amount]", String(feeCents));
      params.append("payment_intent_data[transfer_data][destination]", shopStripeAccountId);
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await res.json();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message || JSON.stringify(session) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
