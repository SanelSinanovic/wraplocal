// @ts-nocheck
// Deno edge function - verify a shop's Stripe Connect account and update stripe_onboarded
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://wrapbridge.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-token",
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
    const { shopId } = body;

    if (!shopId) return jsonResp({ error: "shopId is required" });

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey)       return jsonResp({ error: "STRIPE_SECRET_KEY not configured" });
    if (!supabaseUrl)     return jsonResp({ error: "SUPABASE_URL not configured" });
    if (!supabaseService) return jsonResp({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" });

    // Verify the requesting user via their JWT
    const userToken = req.headers.get("x-user-token") || req.headers.get("Authorization") || "";
    const authHeader = userToken.startsWith("Bearer ") ? userToken : "Bearer " + userToken;
    const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: supabaseService, Authorization: authHeader },
    });
    const userData = await userRes.json().catch(() => ({}));
    const userId = userData && userData.id;
    if (!userId) return jsonResp({ error: "Unauthorized" });

    // Fetch shop row (must be owned by this user)
    const shopRes = await fetch(
      supabaseUrl + "/rest/v1/shops?id=eq." + shopId + "&select=id,owner_id,stripe_account_id,stripe_onboarded",
      { headers: { apikey: supabaseService, Authorization: "Bearer " + supabaseService } }
    );
    const shops = await shopRes.json().catch(() => []);
    const shop = shops && shops[0];

    if (!shop)                    return jsonResp({ error: "Shop not found" });
    if (shop.owner_id !== userId) return jsonResp({ error: "Not authorized for this shop" });

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
        body: JSON.stringify({ stripe_onboarded: false }),
      });
      return jsonResp({ onboarded: false, charges_enabled: false, payouts_enabled: false });
    }

    // Check the Stripe account status
    const acctRes = await fetch("https://api.stripe.com/v1/accounts/" + shop.stripe_account_id, {
      headers: { Authorization: "Bearer " + stripeKey },
    });
    const acct = await acctRes.json().catch(() => ({}));

    const charges_enabled  = !!(acct?.charges_enabled);
    const payouts_enabled  = !!(acct?.payouts_enabled);
    const onboarded        = charges_enabled && payouts_enabled;

    // Update DB if status changed
    if (onboarded !== shop.stripe_onboarded) {
      // When first becoming onboarded, also auto-list the shop so it appears in search
      const patch: Record<string, unknown> = { stripe_onboarded: onboarded };
      if (onboarded) patch.is_listed = true;
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

    return jsonResp({ onboarded, charges_enabled, payouts_enabled });
  } catch (err) {
    return jsonResp({ error: err?.message || String(err) }, 500);
  }
});
