// @ts-nocheck — Deno edge function

function allowedOrigins() {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  const appUrl = Deno.env.get("APP_URL");
  return (env ? env.split(",") : ["https://wrapbridge.com", "https://www.wrapbridge.com", "https://wraplocal.com", "https://www.wraplocal.com", "http://localhost:5173", "http://localhost:4173"])
    .concat(appUrl ? [appUrl] : [])
    .map(s => s.trim())
    .map(s => {
      try { return new URL(s).origin; } catch (_) { return null; }
    })
    .filter(Boolean);
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = origin || allowedOrigins()[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResp(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

function cents(value) {
  return Math.round(Number(value) * 100);
}

function safeEq(value) {
  return encodeURIComponent(String(value));
}

function isRedirectUrlSafe(url, req: Request) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const origins = new Set(allowedOrigins());
    const requestOrigin = req.headers.get("Origin");
    if (requestOrigin) origins.add(new URL(requestOrigin).origin);
    return origins.has(parsed.origin);
  } catch (_) {
    return false;
  }
}

async function getUser(req, supabaseUrl, supabaseService) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseService, Authorization: authHeader },
  });
  if (!userRes.ok) return null;
  const user = await userRes.json().catch(() => null);
  return user?.id ? user : null;
}

async function restJson(url, supabaseService) {
  const res = await fetch(url, {
    headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.error || `Database request failed (${res.status})`);
  return data;
}

async function restWrite(url, supabaseService, method, body, prefer = "return=minimal") {
  const res = await fetch(url, {
    method,
    headers: {
      apikey: supabaseService,
      Authorization: `Bearer ${supabaseService}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: JSON.stringify(body),
  });
  const data = await res.text().then(t => t ? JSON.parse(t) : null).catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.error || `Database write failed (${res.status})`);
  return data;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405, corsHeaders);

  try {
    const { bookingId, quoteId, paymentType, successUrl, cancelUrl } = await req.json();

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseService) {
      return jsonResp({ error: "Missing server configuration." }, 500, corsHeaders);
    }
    if (!bookingId) return jsonResp({ error: "bookingId is required." }, 400, corsHeaders);
    if (!isRedirectUrlSafe(successUrl, req) || !isRedirectUrlSafe(cancelUrl, req)) {
      return jsonResp({ error: "Invalid redirect URL." }, 400, corsHeaders);
    }

    const user = await getUser(req, supabaseUrl, supabaseService);
    if (!user) return jsonResp({ error: "Unauthorized." }, 401, corsHeaders);

    const bookings = await restJson(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${safeEq(bookingId)}&select=id,customer_id,shop_id,service,status,amount,total,payment_verified,shops(id,name,stripe_account_id)`,
      supabaseService
    );
    const booking = bookings?.[0];
    if (!booking) return jsonResp({ error: "Booking not found." }, 404, corsHeaders);
    if (booking.customer_id !== user.id) return jsonResp({ error: "You do not own this booking." }, 403, corsHeaders);

    const isRemaining = paymentType === "remaining";
    let fullAmount;
    let chargeAmount;
    let platformFee;
    let selectedPaymentType;
    let selectedQuoteId = quoteId || null;

    if (isRemaining) {
      fullAmount = money(booking.amount || 0);
      const paidSoFar = money(booking.total || 0);
      chargeAmount = money(fullAmount - paidSoFar);
      platformFee = 0;
      selectedPaymentType = "remaining";

      if (booking.status !== "confirmed" || !booking.payment_verified || fullAmount <= 0 || chargeAmount <= 0.49) {
        return jsonResp({ error: "No remaining balance is due for this booking." }, 400, corsHeaders);
      }
    } else {
      if (!quoteId) return jsonResp({ error: "A current quote is required before payment." }, 400, corsHeaders);
      const quotes = await restJson(
        `${supabaseUrl}/rest/v1/booking_quotes?id=eq.${safeEq(quoteId)}&booking_id=eq.${safeEq(bookingId)}&status=eq.active&select=id,amount,payment_type,deposit_pct,shop_id`,
        supabaseService
      );
      const quote = quotes?.[0];
      if (!quote) return jsonResp({ error: "Quote not found or no longer active. Ask the shop to resend it." }, 404, corsHeaders);
      if (quote.shop_id !== booking.shop_id) return jsonResp({ error: "Quote does not match this shop." }, 400, corsHeaders);

      fullAmount = money(quote.amount);
      selectedPaymentType = quote.payment_type === "deposit" ? "deposit" : "full";
      chargeAmount = selectedPaymentType === "deposit"
        ? money(fullAmount * Number(quote.deposit_pct || 100) / 100)
        : fullAmount;
      platformFee = money(fullAmount * 0.07);
      selectedQuoteId = quote.id;

      if (booking.status !== "pending") {
        return jsonResp({ error: "This booking is not awaiting payment." }, 400, corsHeaders);
      }
    }

    const serviceCents = cents(chargeAmount);
    const fullCents = cents(fullAmount);
    const feeCents = cents(platformFee);

    if (serviceCents < 50 || fullCents < 50 || fullCents > 100000000) {
      return jsonResp({ error: "Invalid payment amount." }, 400, corsHeaders);
    }

    const shopStripeAccountId = booking.shops?.stripe_account_id || null;
    if (!shopStripeAccountId) {
      return jsonResp({ error: "This shop has not completed payment setup. Please contact the shop directly." }, 400, corsHeaders);
    }

    const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${shopStripeAccountId}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const acct = await acctRes.json().catch(() => ({}));
    if (!acctRes.ok || !acct?.charges_enabled || !acct?.payouts_enabled) {
      return jsonResp({ error: "This shop has not completed payment setup. Please contact the shop directly." }, 400, corsHeaders);
    }

    const shopName = booking.shops?.name || "Shop";
    const productName = booking.service || "Service";
    const depositPctLabel = selectedPaymentType === "deposit" && fullCents > 0
      ? `${Math.round((serviceCents / fullCents) * 100)}% deposit of $${(fullCents / 100).toFixed(2)}`
      : null;

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("payment_method_types[]", "card");
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][unit_amount]", String(serviceCents));
    params.append("line_items[0][price_data][product_data][name]", productName);
    params.append("line_items[0][price_data][product_data][description]",
      isRemaining
        ? `Remaining balance at ${shopName} · powered by WrapBridge`
        : depositPctLabel
        ? `${depositPctLabel} at ${shopName} · powered by WrapBridge`
        : `at ${shopName} · powered by WrapBridge`
    );
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("metadata[booking_id]", String(bookingId));
    if (selectedQuoteId) params.append("metadata[quote_id]", String(selectedQuoteId));
    params.append("metadata[full_amount]", String(fullAmount));
    params.append("metadata[charge_amount]", String(chargeAmount));
    params.append("metadata[is_remaining_balance]", isRemaining ? "1" : "0");
    params.append("metadata[payment_type]", selectedPaymentType);
    if (!isRemaining && feeCents > 0) {
      params.append("payment_intent_data[application_fee_amount]", String(feeCents));
    }
    params.append("payment_intent_data[transfer_data][destination]", shopStripeAccountId);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `checkout_${bookingId}_${selectedQuoteId || "remaining"}_${selectedPaymentType}`,
      },
      body: params.toString(),
    });

    const session = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok || !session.url) {
      return jsonResp({ error: session.error?.message || "Could not create checkout session." }, 400, corsHeaders);
    }

    await restWrite(
      `${supabaseUrl}/rest/v1/booking_payments?on_conflict=stripe_session_id`,
      supabaseService,
      "POST",
      {
        booking_id: bookingId,
        quote_id: selectedQuoteId,
        stripe_session_id: session.id,
        payment_type: selectedPaymentType,
        amount: chargeAmount,
        full_amount: fullAmount,
        platform_fee: platformFee,
        status: "pending",
      },
      "resolution=merge-duplicates,return=minimal"
    );

    return jsonResp({ url: session.url }, 200, corsHeaders);
  } catch (err) {
    return jsonResp({ error: err?.message || String(err) }, 500, corsHeaders);
  }
});
