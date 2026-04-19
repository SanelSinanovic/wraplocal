// @ts-nocheck
// Deno edge function — verify a Stripe Checkout session and mark booking as paid.
// Called client-side after Stripe redirects back; acts as a reliable fallback
// even when the stripe-webhook function hasn't fired yet.

const ALLOWED_ORIGINS = [
  "https://wrapbridge.com",
  "https://www.wrapbridge.com",
  "http://localhost:5173",
  "http://localhost:4173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResp(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    // ── Fetch the Stripe Checkout session ─────────────────────────────────
    const sessionRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const session = await sessionRes.json();

    if (!sessionRes.ok) {
      return jsonResp({ error: "Could not retrieve payment session" }, 400, corsHeaders);
    }

    // ── Verify session belongs to this booking ────────────────────────────
    if (session.metadata?.booking_id !== String(bookingId)) {
      return jsonResp({ error: "Session does not match booking" }, 400, corsHeaders);
    }

    // ── Verify payment was successful ─────────────────────────────────────
    if (session.payment_status !== "paid") {
      return jsonResp({ confirmed: false, reason: "not_paid" }, 200, corsHeaders);
    }

    const isRemaining      = session.metadata?.is_remaining_balance === "1";
    const fullAmount       = parseFloat(session.metadata?.full_amount || "0");
    const chargeAmount     = parseFloat(session.metadata?.charge_amount || "0");
    const paymentIntentId  = session.payment_intent || null;

    const dbHeaders = {
      apikey: supabaseService,
      Authorization: `Bearer ${supabaseService}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };

    if (isRemaining) {
      // Remaining balance — update total, mark payment_verified
      await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: "PATCH",
        headers: dbHeaders,
        body: JSON.stringify({
          total: fullAmount,
          payment_verified: true,
          stripe_payment_intent_id: paymentIntentId,
        }),
      });
    } else {
      const fee = Math.round(fullAmount * 0.07 * 100) / 100;
      await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: "PATCH",
        headers: dbHeaders,
        body: JSON.stringify({
          status: "confirmed",
          amount: fullAmount,
          fee,
          total: chargeAmount,
          payment_verified: true,
          stripe_payment_intent_id: paymentIntentId,
        }),
      });
    }

    return jsonResp({ confirmed: true, isRemaining }, 200, corsHeaders);
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
