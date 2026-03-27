// @ts-nocheck — Deno edge function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { shopId, returnUrl, refreshUrl } = await req.json();

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseService) {
      return new Response(
        JSON.stringify({ error: "Server configuration error." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Verify the requesting user owns this shop ─────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseService, Authorization: authHeader },
    });
    const userData = await userRes.json();
    const userId = userData?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch shop row ────────────────────────────────────────────────────
    const shopRes = await fetch(
      `${supabaseUrl}/rest/v1/shops?id=eq.${shopId}&select=id,owner_id,stripe_account_id`,
      { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
    );
    const shops = await shopRes.json();
    const shop  = shops?.[0];

    if (!shop || shop.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Shop not found or unauthorized." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Create a Stripe Express account if one doesn't already exist ──────
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
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: accParams.toString(),
      });
      const account = await accRes.json();
      if (!accRes.ok || !account.id) {
        return new Response(
          JSON.stringify({ error: account.error?.message || "Failed to create Stripe account." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      accountId = account.id;

      // Persist the new account ID to the shops row
      await fetch(`${supabaseUrl}/rest/v1/shops?id=eq.${shopId}`, {
        method: "PATCH",
        headers: {
          apikey: supabaseService,
          Authorization: `Bearer ${supabaseService}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ stripe_account_id: accountId }),
      });
    }

    // ── Create a fresh account-onboarding link ────────────────────────────
    const linkParams = new URLSearchParams();
    linkParams.append("account", accountId);
    linkParams.append("refresh_url", refreshUrl);
    linkParams.append("return_url", returnUrl);
    linkParams.append("type", "account_onboarding");

    const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: linkParams.toString(),
    });
    const link = await linkRes.json();

    if (!linkRes.ok || !link.url) {
      return new Response(
        JSON.stringify({ error: link.error?.message || "Failed to create onboarding link." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: link.url, accountId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
