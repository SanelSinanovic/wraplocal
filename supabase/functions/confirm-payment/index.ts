// @ts-nocheck
// Deno edge function — verify a Stripe Checkout session and mark booking as paid.
// This is an authenticated fallback when Stripe webhooks are delayed.

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
  const origins = allowedOrigins();
  const allowed = origins.includes(origin) ? origin : origins[0] || "";
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

function safeEq(value) {
  return encodeURIComponent(String(value));
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

async function persistSuccessfulPayment({ supabaseUrl, supabaseService, bookingId, quoteId, sessionId, paymentIntentId, fullAmount, chargeAmount, isRemaining, paymentType, rawEvent }) {
  const fee = isRemaining ? 0 : money(fullAmount * 0.07);
  const now = new Date().toISOString();

  await restWrite(
    `${supabaseUrl}/rest/v1/booking_payments?on_conflict=stripe_session_id`,
    supabaseService,
    "POST",
    {
      booking_id: bookingId,
      quote_id: quoteId || null,
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId || null,
      payment_type: paymentType || (isRemaining ? "remaining" : "full"),
      amount: chargeAmount,
      full_amount: fullAmount,
      platform_fee: fee,
      status: "succeeded",
      raw_event: rawEvent || null,
      paid_at: now,
      updated_at: now,
    },
    "resolution=merge-duplicates,return=minimal"
  );

  const bookingUpdate = isRemaining
    ? {
        total: fullAmount,
        payment_verified: true,
        stripe_payment_intent_id: paymentIntentId,
        payment_confirmed_at: now,
      }
    : {
        status: "confirmed",
        amount: fullAmount,
        fee,
        total: chargeAmount,
        payment_verified: true,
        stripe_payment_intent_id: paymentIntentId,
        payment_confirmed_at: now,
      };

  await restWrite(
    `${supabaseUrl}/rest/v1/bookings?id=eq.${safeEq(bookingId)}`,
    supabaseService,
    "PATCH",
    bookingUpdate
  );

  if (quoteId && !isRemaining) {
    await restWrite(
      `${supabaseUrl}/rest/v1/booking_quotes?id=eq.${safeEq(quoteId)}&booking_id=eq.${safeEq(bookingId)}`,
      supabaseService,
      "PATCH",
      { status: "accepted", accepted_at: now }
    );
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405, corsHeaders);

  try {
    const { bookingId, sessionId } = await req.json();
    if (!bookingId || !sessionId) {
      return jsonResp({ error: "bookingId and sessionId are required" }, 400, corsHeaders);
    }

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseService) {
      return jsonResp({ error: "Missing server configuration" }, 500, corsHeaders);
    }

    const user = await getUser(req, supabaseUrl, supabaseService);
    if (!user) return jsonResp({ error: "Unauthorized" }, 401, corsHeaders);

    const bookings = await restJson(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${safeEq(bookingId)}&select=id,customer_id,status,payment_verified,total`,
      supabaseService
    );
    const booking = bookings?.[0];
    if (!booking) return jsonResp({ error: "Booking not found" }, 404, corsHeaders);
    if (booking.customer_id !== user.id) return jsonResp({ error: "You do not own this booking" }, 403, corsHeaders);

    const sessionRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const session = await sessionRes.json().catch(() => ({}));

    if (!sessionRes.ok) {
      return jsonResp({ error: session.error?.message || "Could not retrieve payment session" }, 400, corsHeaders);
    }

    if (session.metadata?.booking_id !== String(bookingId)) {
      return jsonResp({ error: "Session does not match booking" }, 400, corsHeaders);
    }

    if (session.payment_status !== "paid") {
      return jsonResp({ confirmed: false, reason: "not_paid" }, 200, corsHeaders);
    }

    const isRemaining     = session.metadata?.is_remaining_balance === "1";
    const quoteId         = session.metadata?.quote_id || null;
    const fullAmount      = money(session.metadata?.full_amount || 0);
    const chargeAmount    = money(session.metadata?.charge_amount || 0);
    const paymentType     = session.metadata?.payment_type || (isRemaining ? "remaining" : "full");
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;

    if (!paymentIntentId || fullAmount <= 0 || chargeAmount <= 0) {
      return jsonResp({ error: "Payment session is missing required metadata" }, 400, corsHeaders);
    }

    await persistSuccessfulPayment({
      supabaseUrl,
      supabaseService,
      bookingId,
      quoteId,
      sessionId: session.id,
      paymentIntentId,
      fullAmount,
      chargeAmount,
      isRemaining,
      paymentType,
      rawEvent: session,
    });

    return jsonResp({ confirmed: true, isRemaining }, 200, corsHeaders);
  } catch (err) {
    return jsonResp({ error: err?.message || String(err) }, 500, getCorsHeaders(req));
  }
});
