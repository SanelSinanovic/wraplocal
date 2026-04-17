// @ts-nocheck
// WrapBridge — Stripe webhook handler (checkout.session.completed)
// Verifies payment server-side and updates booking status.
// Stripe sends events here; no browser CORS needed.

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl         = Deno.env.get("SUPABASE_URL");
  const supabaseService     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeWebhookSecret || !supabaseUrl || !supabaseService) {
    return new Response(JSON.stringify({ error: "Missing environment config" }), { status: 500 });
  }

  // ── Verify Stripe signature ──────────────────────────────────────────────
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event;
  try {
    event = await verifyStripeSignature(body, sig, stripeWebhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  // ── Handle checkout.session.completed ────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId        = session.metadata?.booking_id;
    const fullAmount       = parseFloat(session.metadata?.full_amount || "0");
    const chargeAmount     = parseFloat(session.metadata?.charge_amount || "0");
    const isRemaining      = session.metadata?.is_remaining_balance === "1";

    if (!bookingId) {
      console.warn("Webhook: no booking_id in metadata");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Verify payment was actually paid
    if (session.payment_status !== "paid") {
      console.warn("Webhook: payment_status is", session.payment_status);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const headers = {
      apikey: supabaseService,
      Authorization: `Bearer ${supabaseService}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };

    if (isRemaining) {
      // Remaining balance — just update total
      await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ total: fullAmount, payment_verified: true }),
      });
    } else {
      // Initial payment — check not already confirmed (idempotency)
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=status`,
        { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
      );
      const rows = await checkRes.json().catch(() => []);
      if (rows?.[0]?.status === "confirmed") {
        // Already processed (client-side or duplicate webhook)
        return new Response(JSON.stringify({ received: true, already_confirmed: true }), { status: 200 });
      }

      const fee = Math.round(fullAmount * 0.07 * 100) / 100;
      await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "confirmed",
          amount: fullAmount,
          fee,
          total: chargeAmount,
          payment_verified: true,
        }),
      });
    }

    console.log(`Webhook: booking ${bookingId} confirmed (remaining=${isRemaining})`);
  }

  // Always return 200 to acknowledge receipt (Stripe retries on non-2xx)
  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

// ── Stripe signature verification (no SDK needed) ──────────────────────────
async function verifyStripeSignature(payload, sigHeader, secret) {
  const parts = {};
  for (const item of sigHeader.split(",")) {
    const [key, val] = item.split("=");
    parts[key.trim()] = val?.trim();
  }

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) throw new Error("Missing t or v1 in stripe-signature");

  // Reject if timestamp is older than 5 minutes (replay protection)
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) throw new Error("Timestamp too old");

  // Compute expected signature using Web Crypto API
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const expected = await hmacHex(encoder.encode(secret), encoder.encode(signedPayload));

  if (expected !== signature) throw new Error("Signature mismatch");

  return JSON.parse(payload);
}

// HMAC-SHA256 using Web Crypto API (available in Deno)
async function hmacHex(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}
