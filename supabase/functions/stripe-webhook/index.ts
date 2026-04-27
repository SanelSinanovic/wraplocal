// @ts-nocheck
// WrapBridge — Stripe webhook handler.
// Verifies Stripe signatures, records every payment, and only acknowledges
// events after required database writes succeed.

function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

function safeEq(value) {
  return encodeURIComponent(String(value));
}

function headers(supabaseService, prefer = "return=minimal") {
  return {
    apikey: supabaseService,
    Authorization: `Bearer ${supabaseService}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

async function restJson(url, supabaseService) {
  const res = await fetch(url, { headers: headers(supabaseService) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.error || `Database request failed (${res.status})`);
  return data;
}

async function restWrite(url, supabaseService, method, body, prefer = "return=minimal") {
  const res = await fetch(url, {
    method,
    headers: headers(supabaseService, prefer),
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

async function processCheckoutCompleted(session, event, supabaseUrl, supabaseService) {
  const bookingId       = session.metadata?.booking_id;
  const quoteId         = session.metadata?.quote_id || null;
  const fullAmount      = money(session.metadata?.full_amount || 0);
  const chargeAmount    = money(session.metadata?.charge_amount || 0);
  const isRemaining     = session.metadata?.is_remaining_balance === "1";
  const paymentType     = session.metadata?.payment_type || (isRemaining ? "remaining" : "full");
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;

  if (!bookingId) throw new Error("checkout.session.completed missing booking_id metadata");
  if (session.payment_status !== "paid") return { ignored: true, reason: "not_paid" };
  if (!paymentIntentId || fullAmount <= 0 || chargeAmount <= 0) {
    throw new Error("checkout.session.completed missing required payment metadata");
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
    rawEvent: event,
  });

  return { bookingId, isRemaining };
}

async function updateBookingRefundAggregate(supabaseUrl, supabaseService, bookingId) {
  const payments = await restJson(
    `${supabaseUrl}/rest/v1/booking_payments?booking_id=eq.${safeEq(bookingId)}&status=in.(succeeded,refunded,partially_refunded)&select=refund_status`,
    supabaseService
  );
  const hasPayments = payments.length > 0;
  const allFull = hasPayments && payments.every(p => p.refund_status === "full");
  const anyRefund = payments.some(p => p.refund_status === "full" || p.refund_status === "partial");

  if (anyRefund) {
    await restWrite(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${safeEq(bookingId)}`,
      supabaseService,
      "PATCH",
      {
        refund_status: allFull ? "full" : "partial",
        ...(allFull ? { status: "cancelled" } : {}),
      }
    );
  }
}

async function handlePaymentIntentStatus({ supabaseUrl, supabaseService, paymentIntentId, paymentPatch, bookingPatch }) {
  if (!paymentIntentId) return { ignored: true, reason: "missing_payment_intent" };

  const rows = await restJson(
    `${supabaseUrl}/rest/v1/booking_payments?stripe_payment_intent_id=eq.${safeEq(paymentIntentId)}&select=booking_id`,
    supabaseService
  );

  if (rows.length) {
    await restWrite(
      `${supabaseUrl}/rest/v1/booking_payments?stripe_payment_intent_id=eq.${safeEq(paymentIntentId)}`,
      supabaseService,
      "PATCH",
      { ...paymentPatch, updated_at: new Date().toISOString() }
    );

    for (const row of rows) {
      if (bookingPatch) {
        await restWrite(
          `${supabaseUrl}/rest/v1/bookings?id=eq.${safeEq(row.booking_id)}`,
          supabaseService,
          "PATCH",
          bookingPatch
        );
      }
      if (paymentPatch.refund_status) {
        await updateBookingRefundAggregate(supabaseUrl, supabaseService, row.booking_id);
      }
    }
    return { updated: rows.length };
  }

  // Legacy fallback for bookings paid before booking_payments existed.
  if (bookingPatch) {
    await restWrite(
      `${supabaseUrl}/rest/v1/bookings?stripe_payment_intent_id=eq.${safeEq(paymentIntentId)}`,
      supabaseService,
      "PATCH",
      bookingPatch
    );
    return { legacy: true };
  }

  return { ignored: true, reason: "payment_not_found" };
}

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

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event;
  try {
    event = await verifyStripeSignature(body, sig, stripeWebhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const result = await processCheckoutCompleted(event.data.object, event, supabaseUrl, supabaseService);
      console.log("Webhook checkout processed:", result);
    }

    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object;
      const paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
      const result = await handlePaymentIntentStatus({
        supabaseUrl,
        supabaseService,
        paymentIntentId,
        paymentPatch: { status: "disputed", dispute_status: "open", raw_event: event },
        bookingPatch: { dispute_status: "open" },
      });
      console.log("Webhook dispute opened:", result);
    }

    if (event.type === "charge.dispute.closed") {
      const dispute = event.data.object;
      const paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
      const mappedStatus = dispute.status === "lost" ? "lost" : "won";
      const result = await handlePaymentIntentStatus({
        supabaseUrl,
        supabaseService,
        paymentIntentId,
        paymentPatch: { dispute_status: mappedStatus, raw_event: event },
        bookingPatch: { dispute_status: mappedStatus },
      });
      console.log("Webhook dispute closed:", result);
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      const refundStatus = charge.refunded ? "full" : "partial";
      const result = await handlePaymentIntentStatus({
        supabaseUrl,
        supabaseService,
        paymentIntentId,
        paymentPatch: {
          status: charge.refunded ? "refunded" : "partially_refunded",
          refund_status: refundStatus,
          raw_event: event,
        },
        bookingPatch: { refund_status: refundStatus, ...(charge.refunded ? { status: "cancelled" } : {}) },
      });
      console.log("Webhook refund processed:", result);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
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

  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) throw new Error("Timestamp too old");

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const expected = await hmacHex(encoder.encode(secret), encoder.encode(signedPayload));

  if (expected !== signature) throw new Error("Signature mismatch");

  return JSON.parse(payload);
}

async function hmacHex(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}
