// @ts-nocheck
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

    // Verify user owns this shop
    const userToken = req.headers.get("x-user-token") || req.headers.get("Authorization") || "";
    const authHeader = userToken.startsWith("Bearer ") ? userToken : "Bearer " + userToken;
    const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: supabaseService, Authorization: authHeader },
    });
    const userData = await userRes.json().catch(() => ({}));
    const userId = userData && userData.id;
    if (!userId) return jsonResp({ error: "Unauthorized" });

    // Get shop's stripe_account_id
    const shopRes = await fetch(
      supabaseUrl + "/rest/v1/shops?id=eq." + shopId + "&select=id,owner_id,stripe_account_id",
      { headers: { apikey: supabaseService, Authorization: "Bearer " + supabaseService } }
    );
    const shops = await shopRes.json().catch(() => []);
    const shop = shops && shops[0];

    if (!shop)                    return jsonResp({ error: "Shop not found" });
    if (shop.owner_id !== userId) return jsonResp({ error: "Not authorized" });
    if (!shop.stripe_account_id)  return jsonResp({ error: "No Stripe account connected" });

    // Generate a one-time Express dashboard login link
    const linkRes = await fetch(
      "https://api.stripe.com/v1/accounts/" + shop.stripe_account_id + "/login_links",
      {
        method: "POST",
        headers: { Authorization: "Bearer " + stripeKey },
      }
    );
    const link = await linkRes.json().catch(() => ({}));
    if (!linkRes.ok || !link.url) {
      return jsonResp({ error: (link.error && link.error.message) || "Failed to create login link" });
    }

    return jsonResp({ url: link.url });
  } catch (err) {
    return jsonResp({ error: err && err.message ? err.message : String(err) });
  }
});
