// @ts-nocheck
// Deno edge function - verify a shop's Stripe Connect account and update stripe_onboarded
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResp(req, body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { shopId } = body;

    if (!shopId) return jsonResp(req, { error: "shopId is required" });

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey)       return jsonResp(req, { error: "STRIPE_SECRET_KEY not configured" });
    if (!supabaseUrl)     return jsonResp(req, { error: "SUPABASE_URL not configured" });
    if (!supabaseService) return jsonResp(req, { error: "SUPABASE_SERVICE_ROLE_KEY not configured" });

    // Verify the requesting user via their JWT
    const userToken = req.headers.get("x-user-token") || req.headers.get("Authorization") || "";
    const authHeader = userToken.startsWith("Bearer ") ? userToken : "Bearer " + userToken;
    const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: supabaseService, Authorization: authHeader },
    });
    const userData = await userRes.json().catch(() => ({}));
    const userId = userData && userData.id;
    if (!userId) return jsonResp(req, { error: "Unauthorized" });

    // Fetch shop row (must be owned by this user)
    const shopRes = await fetch(
      supabaseUrl + "/rest/v1/shops?id=eq." + shopId + "&select=id,owner_id,stripe_account_id,stripe_onboarded,is_listed,insurance_verified,insurance_status",
      { headers: { apikey: supabaseService, Authorization: "Bearer " + supabaseService } }
    );
    const shops = await shopRes.json().catch(() => []);
    const shop = shops && shops[0];

    if (!shop)                    return jsonResp(req, { error: "Shop not found" });
    if (shop.owner_id !== userId) return jsonResp(req, { error: "Not authorized for this shop" });

    if (!shop.stripe_account_id) {
      // No account yet — ensure onboarded is false
      await fetch(supabaseUrl + "/rest/v1/shops?id=eq." + shopId, {
        method: "PATCH",
        headers: {
          apikey: supabaseService,
          Authorization: "Bearer " + supabaseService,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ stripe_onboarded: false, is_listed: false }),
      });
      return jsonResp(req, { onboarded: false, charges_enabled: false, payouts_enabled: false });
    }

    // Check the Stripe account status
    const acctRes = await fetch("https://api.stripe.com/v1/accounts/" + shop.stripe_account_id, {
      headers: { Authorization: "Bearer " + stripeKey },
    });
    const acct = await acctRes.json().catch(() => ({}));

    const charges_enabled  = !!(acct?.charges_enabled);
    const payouts_enabled  = !!(acct?.payouts_enabled);
    const onboarded        = charges_enabled && payouts_enabled;

    const insuranceApproved = shop.insurance_verified === true && shop.insurance_status === "verified";
    const listingAllowed = onboarded && insuranceApproved;
    const nextIsListed = listingAllowed ? !!shop.is_listed : false;

    // Update DB if Stripe status or listing eligibility changed.
    if (onboarded !== shop.stripe_onboarded || shop.is_listed !== nextIsListed) {
      const patch: Record<string, unknown> = { stripe_onboarded: onboarded, is_listed: nextIsListed };
      await fetch(supabaseUrl + "/rest/v1/shops?id=eq." + shopId, {
        method: "PATCH",
        headers: {
          apikey: supabaseService,
          Authorization: "Bearer " + supabaseService,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(patch),
      });
    }

    return jsonResp(req, { onboarded, charges_enabled, payouts_enabled });
  } catch (err) {
    return jsonResp(req, { error: err?.message || String(err) }, 500);
  }
});
