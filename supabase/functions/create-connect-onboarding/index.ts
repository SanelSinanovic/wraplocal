// @ts-nocheck
// Deno edge function - no special unicode in comments to avoid dashboard editor encoding bugs
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

function isRedirectUrlSafe(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    return new Set(allowedOrigins()).has(parsed.origin);
  } catch (_) {
    return false;
  }
}

function safeEq(value) {
  return encodeURIComponent(String(value));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { shopId, returnUrl, refreshUrl } = body;

    if (!shopId) return jsonResp(req, { error: "shopId is required" });
    if (!isRedirectUrlSafe(returnUrl) || !isRedirectUrlSafe(refreshUrl || returnUrl)) {
      return jsonResp(req, { error: "Invalid redirect URL" }, 400);
    }

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey)       return jsonResp(req, { error: "STRIPE_SECRET_KEY not configured" });
    if (!supabaseUrl)     return jsonResp(req, { error: "SUPABASE_URL not configured" });
    if (!supabaseService) return jsonResp(req, { error: "SUPABASE_SERVICE_ROLE_KEY not configured" });

    // Verify the requesting user via their JWT
    // Accept token from x-user-token header (preferred) or Authorization header
    const userToken = req.headers.get("x-user-token") || req.headers.get("Authorization") || "";
    const authHeader = userToken.startsWith("Bearer ") ? userToken : "Bearer " + userToken;
    const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: supabaseService, Authorization: authHeader },
    });
    const userData = await userRes.json().catch(() => ({}));
    const userId = userData && userData.id;
    if (!userId) return jsonResp(req, { error: "Unauthorized - invalid or missing JWT" });

    // Fetch the shop row
    const encodedShopId = safeEq(shopId);
    const shopRes = await fetch(
      supabaseUrl + "/rest/v1/shops?id=eq." + encodedShopId + "&select=id,owner_id,stripe_account_id",
      { headers: { apikey: supabaseService, Authorization: "Bearer " + supabaseService } }
    );
    const shops = await shopRes.json().catch(() => []);
    const shop = shops && shops[0];

    if (!shop)                    return jsonResp(req, { error: "Shop not found" });
    if (shop.owner_id !== userId) return jsonResp(req, { error: "Not authorized for this shop" });

    // Create or reuse Stripe Express account
    let accountId = shop.stripe_account_id;
    // If an account ID already exists, verify it is still valid in Stripe.
    // If it has been deleted (e.g. test data wipe), clear it so we create a fresh one.
    if (accountId) {
      const checkRes = await fetch("https://api.stripe.com/v1/accounts/" + accountId, {
        headers: { Authorization: "Bearer " + stripeKey },
      });
      const checkData = await checkRes.json().catch(() => ({}));
      const isDeleted = !checkRes.ok || checkData?.deleted === true ||
        (checkData?.error?.code === "resource_missing") ||
        (typeof checkData?.error?.message === "string" && (
          checkData.error.message.toLowerCase().includes("no such account") ||
          checkData.error.message.toLowerCase().includes("does not exist")
        ));
      if (isDeleted) {
        // Wipe stale account from DB so a fresh one is created below
        await fetch(supabaseUrl + "/rest/v1/shops?id=eq." + encodedShopId, {
          method: "PATCH",
          headers: {
            apikey: supabaseService,
            Authorization: "Bearer " + supabaseService,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ stripe_account_id: null, stripe_onboarded: false, is_listed: false }),
        });
        accountId = null;
      }
    }

    if (!accountId) {
      const accParams = new URLSearchParams();
      accParams.append("type", "express");
      accParams.append("country", "US");
      accParams.append("capabilities[card_payments][requested]", "true");
      accParams.append("capabilities[transfers][requested]", "true");

      const accRes = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + stripeKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: accParams.toString(),
      });
      const account = await accRes.json().catch(() => ({}));
      if (!accRes.ok || !account.id) {
        return jsonResp(req, { error: (account.error && account.error.message) || "Failed to create Stripe account" });
      }
      accountId = account.id;

      // Save account ID to the shops row
  await fetch(supabaseUrl + "/rest/v1/shops?id=eq." + encodedShopId, {
        method: "PATCH",
        headers: {
          apikey: supabaseService,
          Authorization: "Bearer " + supabaseService,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ stripe_account_id: accountId }),
      });
    }

    // Create account onboarding link
    const linkParams = new URLSearchParams();
    linkParams.append("account", accountId);
    linkParams.append("refresh_url", refreshUrl || returnUrl);
    linkParams.append("return_url", returnUrl);
    linkParams.append("type", "account_onboarding");

    const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + stripeKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: linkParams.toString(),
    });
    const link = await linkRes.json().catch(() => ({}));
    if (!linkRes.ok || !link.url) {
      return jsonResp(req, { error: (link.error && link.error.message) || "Failed to create onboarding link" });
    }

    return jsonResp(req, { url: link.url, accountId: accountId });
  } catch (err) {
    return jsonResp(req, { error: err && err.message ? err.message : String(err) });
  }
});
