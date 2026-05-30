// @ts-nocheck
// WrapBridge — Issue a full refund for all successful payments on a booking.
// The platform's 7% application fee is NOT refunded (refund_application_fee = false).

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

function jsonResp(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || forwardedFor || "unknown";
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function checkRateLimit({ req, supabaseUrl, supabaseService, functionName, limit, windowSeconds, userId, identifier }) {
  const rawIdentifier = identifier || (userId ? `user:${userId}` : `ip:${getClientIp(req)}`);
  const keyHash = await sha256Hex(`${functionName}:${rawIdentifier}`);
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/check_edge_rate_limit`, {
    method: "POST",
    headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_key_hash: keyHash, p_limit: limit, p_window_seconds: windowSeconds }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("Rate limit check failed:", data || res.status);
    const failOpen = Deno.env.get("RATE_LIMIT_FAIL_OPEN") === "true";
    return { allowed: failOpen, currentCount: limit, limit, resetAt: new Date(Date.now() + windowSeconds * 1000).toISOString(), retryAfterSeconds: windowSeconds };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const resetAt = row?.reset_at || new Date(Date.now() + windowSeconds * 1000).toISOString();
  const retryAfterSeconds = Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000));
  return { allowed: row?.allowed !== false, currentCount: Number(row?.current_count || 0), limit: Number(row?.limit_count || limit), resetAt, retryAfterSeconds };
}

function rateLimitedResponse(result, headers = {}) {
  return new Response(JSON.stringify({ error: "Too many requests. Please try again soon.", retryAfterSeconds: result.retryAfterSeconds, resetAt: result.resetAt }), {
    status: 429,
    headers: {
      ...headers,
      "Content-Type": "application/json",
      "Retry-After": String(result.retryAfterSeconds),
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(Math.max(0, result.limit - result.currentCount)),
      "X-RateLimit-Reset": result.resetAt,
    },
  });
}

function safeEq(value) {
  return encodeURIComponent(String(value));
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

async function refundPaymentIntent(stripeKey, paymentIntentId) {
  const params = new URLSearchParams();
  params.append("payment_intent", paymentIntentId);
  params.append("refund_application_fee", "false");
  params.append("reverse_transfer", "true");

  const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const refund = await refundRes.json().catch(() => ({}));
  if (!refundRes.ok) {
    throw new Error(refund.error?.message || "Stripe refund failed.");
  }
  return refund;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResp(req, { error: "Method not allowed" }, 405);

  try {
    const { bookingId } = await req.json();
    if (!bookingId) return jsonResp(req, { error: "bookingId is required." }, 400);

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseService) {
      return jsonResp(req, { error: "Missing server configuration." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseService, Authorization: authHeader },
    });
    const userData = await userRes.json().catch(() => ({}));
    if (!userData?.id) return jsonResp(req, { error: "Unauthorized" }, 401);

    const rateLimit = await checkRateLimit({
      req,
      supabaseUrl,
      supabaseService,
      functionName: "create-refund",
      limit: 3,
      windowSeconds: 3600,
      userId: userData.id,
    });
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit, getCorsHeaders(req));

    const bookings = await restJson(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${safeEq(bookingId)}&select=id,shop_id,stripe_payment_intent_id,payment_verified,refund_status,status`,
      supabaseService
    );
    const booking = bookings?.[0];
    if (!booking) return jsonResp(req, { error: "Booking not found." }, 404);

    const shops = await restJson(
      `${supabaseUrl}/rest/v1/shops?id=eq.${safeEq(booking.shop_id)}&select=owner_id`,
      supabaseService
    );
    const isOwner = shops?.[0]?.owner_id === userData.id;

    const profiles = await restJson(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${safeEq(userData.id)}&select=role`,
      supabaseService
    );
    const isAdmin = profiles?.[0]?.role === "admin";

    if (!isOwner && !isAdmin) {
      return jsonResp(req, { error: "You do not have permission to refund this booking." }, 403);
    }

    if (!booking.payment_verified) {
      return jsonResp(req, { error: "This booking has no verified payment to refund." }, 400);
    }

    if (booking.refund_status === "full") {
      return jsonResp(req, { error: "This booking has already been fully refunded." }, 400);
    }

    let payments = await restJson(
      `${supabaseUrl}/rest/v1/booking_payments?booking_id=eq.${safeEq(bookingId)}&status=in.(succeeded,partially_refunded)&select=id,stripe_payment_intent_id,refund_status`,
      supabaseService
    );

    payments = payments.filter(p => p.stripe_payment_intent_id && p.refund_status !== "full");

    if (!payments.length && booking.stripe_payment_intent_id) {
      payments = [{ id: null, stripe_payment_intent_id: booking.stripe_payment_intent_id, refund_status: null }];
    }

    if (!payments.length) {
      return jsonResp(req, { error: "No refundable payment was found for this booking." }, 400);
    }

    const refunds = [];
    for (const payment of payments) {
      const refund = await refundPaymentIntent(stripeKey, payment.stripe_payment_intent_id);
      refunds.push(refund);
      if (payment.id) {
        await restWrite(
          `${supabaseUrl}/rest/v1/booking_payments?id=eq.${safeEq(payment.id)}`,
          supabaseService,
          "PATCH",
          {
            status: "refunded",
            refund_status: "full",
            raw_event: refund,
            updated_at: new Date().toISOString(),
          }
        );
      }
    }

    await restWrite(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${safeEq(bookingId)}`,
      supabaseService,
      "PATCH",
      {
        refund_status: "full",
        status: "cancelled",
      }
    );

    console.log(`Refunds issued for booking ${bookingId}:`, refunds.map(r => r.id));

    return jsonResp(req, { success: true, refundIds: refunds.map(r => r.id) });
  } catch (err) {
    console.error("Refund error:", err);
    return jsonResp(req, { error: err?.message || String(err) }, 500);
  }
});
