// @ts-nocheck — Deno edge function
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://wrapbridge.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookingId, serviceAmount, fullAmount, paymentType, isRemainingBalance, serviceName, shopName, successUrl, cancelUrl } = await req.json();

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe secret key not configured." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Verify the calling user is authenticated ──────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    if (supabaseUrl && supabaseService) {
      const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
        headers: { apikey: supabaseService, Authorization: authHeader },
      });
      const userData = await userRes.json().catch(() => ({}));
      if (!userData?.id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Validate redirect URLs (prevent open redirect) ────────────────────
    const allowedOrigin = Deno.env.get("APP_URL") || null;
    function isUrlSafe(url) {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) return false;
        if (allowedOrigin) {
          const allowed = new URL(allowedOrigin);
          return parsed.origin === allowed.origin;
        }
        return true;
      } catch (_) {
        return false;
      }
    }
    if (!isUrlSafe(successUrl) || !isUrlSafe(cancelUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid redirect URL." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // serviceAmount is the charge amount (deposit or full); fullAmount is the total job price.
    // Platform fee is always 7% of the full job price, regardless of deposit amount.
    const serviceCents = Math.round(Number(serviceAmount) * 100);
    const fullCents    = Math.round(Number(fullAmount || serviceAmount) * 100);
    const feeCents     = Math.round(fullCents * 0.07); // 7% of full job price

    const isDeposit = paymentType === "deposit";
    // For remaining balance payments, platform already collected fee at deposit time.
    // Fee is 0 for remaining — 100% goes directly to the shop.
    const effectiveFeeCents = isRemainingBalance ? 0 : feeCents;

    const depositPctLabel = isDeposit && fullCents > 0
      ? `${Math.round((serviceCents / fullCents) * 100)}% deposit of $${(fullCents / 100).toFixed(2)}`
      : null;

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("payment_method_types[]", "card");
    // Single line item — the service price quoted by the shop.
    // The 7% platform fee is deducted server-side via application_fee_amount.
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][unit_amount]", String(serviceCents));
    params.append("line_items[0][price_data][product_data][name]", serviceName || "Service");
    params.append("line_items[0][price_data][product_data][description]",
      isRemainingBalance
        ? `Remaining balance${shopName ? ` at ${shopName}` : ''} · powered by WrapBridge`
        : depositPctLabel
        ? `${depositPctLabel}${shopName ? ` at ${shopName}` : ''} · powered by WrapBridge`
        : shopName ? `at ${shopName} · powered by WrapBridge` : "powered by WrapBridge");
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("metadata[booking_id]", String(bookingId));
    params.append("metadata[full_amount]", String(fullAmount || serviceAmount));
    params.append("metadata[charge_amount]", String(serviceAmount));
    params.append("metadata[is_remaining_balance]", isRemainingBalance ? "1" : "0");

    // ── Route 93% to shop only if their account is fully enabled ──────────
    let useConnect = false;
    if (shopStripeAccountId) {
      try {
        const acctRes = await fetch("https://api.stripe.com/v1/accounts/" + shopStripeAccountId, {
          headers: { Authorization: `Bearer ${stripeKey}` },
        });
        const acct = await acctRes.json();
        // Both charges_enabled AND payouts_enabled must be true for routing to work
        useConnect = !!(acct?.charges_enabled && acct?.payouts_enabled);
      } catch (_) {
        // Non-fatal
      }
    }

    // Block payment entirely if the shop has not completed Stripe Connect onboarding.
    // This keeps WrapBridge out of the money flow and eliminates refund/chargeback liability.
    if (!useConnect) {
      return new Response(
        JSON.stringify({ error: "This shop has not completed payment setup. Please contact the shop directly." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    params.append("payment_intent_data[application_fee_amount]", String(effectiveFeeCents));
    params.append("payment_intent_data[transfer_data][destination]", shopStripeAccountId);

    let res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
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
