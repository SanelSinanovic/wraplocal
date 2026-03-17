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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe secret key not configured." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // serviceAmount is dollars; Stripe needs integer cents
    const serviceCents = Math.round(Number(serviceAmount) * 100);
    const feeCents     = Math.round(serviceCents * 0.07);

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("payment_method_types[]", "card");
    // Line item 0 — service
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][unit_amount]", String(serviceCents));
    params.append("line_items[0][price_data][product_data][name]", serviceName || "Service");
    params.append("line_items[0][price_data][product_data][description]", shopName || "via WrapLocal");
    params.append("line_items[0][quantity]", "1");
    // Line item 1 — platform fee
    params.append("line_items[1][price_data][currency]", "usd");
    params.append("line_items[1][price_data][unit_amount]", String(feeCents));
    params.append("line_items[1][price_data][product_data][name]", "WrapLocal Platform Fee (7%)");
    params.append("line_items[1][quantity]", "1");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("metadata[booking_id]", String(bookingId));

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
      // Always return 200 so supabase.functions.invoke can read the body
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
