// @ts-nocheck
// Deno edge function - no special unicode in comments to avoid dashboard editor encoding bugs
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { shopId, returnUrl, refreshUrl } = body;

    if (!shopId) return jsonResp({ error: "shopId is required" });

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey)       return jsonResp({ error: "STRIPE_SECRET_KEY not configured" });
    if (!supabaseUrl)     return jsonResp({ error: "SUPABASE_URL not configured" });
    if (!supabaseService) return jsonResp({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });

    // Verify the requesting user via their JWT
    const authHeader = req.headers.get("Authorization") || "";
    const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: supabaseService, Authorization: authHeader },
    });
    const userData = await userRes.json().catch(() => ({}));
    const userId = userData && userData.id;
    if (!userId) return jsonResp({ error: "Unauthorized - invalid or missing JWT" });

    // Fetch the shop row
    const shopRes = await fetch(
      supabaseUrl + "/rest/v1/shops?id=eq." + shopId + "&select=id,owner_id,stripe_account_id",
      { headers: { apikey: supabaseService, Authorization: "Bearer " + supabaseService } }
    );
    const shops = await shopRes.json().catch(() => []);
    const shop = shops && shops[0];

    if (!shop)                    return jsonResp({ error: "Shop not found" });
    if (shop.owner_id !== userId) return jsonResp({ error: "Not authorized for this shop" });

    // Create or reuse Stripe Express account
    let accountId = shop.stripe_account_id;
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
        return jsonResp({ error: (account.error && account.error.message) || "Failed to create Stripe account" });
      }
      accountId = account.id;

      // Save account ID to the shops row
      await fetch(supabaseUrl + "/rest/v1/shops?id=eq." + shopId, {
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
      return jsonResp({ error: (link.error && link.error.message) || "Failed to create onboarding link" });
    }

    return jsonResp({ url: link.url, accountId: accountId });
  } catch (err) {
    return jsonResp({ error: err && err.message ? err.message : String(err) });
  }
});
