// @ts-nocheck
// WrapBridge — Issue refund for a booking
// Refunds the customer's charge on the connected account.
// The platform's 7% application fee is NOT refunded (refund_application_fee = false).

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://wrapbridge.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();

    const stripeKey       = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseService) {
      return new Response(
        JSON.stringify({ error: "Missing server configuration." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Verify the calling user is authenticated ──────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: supabaseService, Authorization: authHeader },
    });
    const userData = await userRes.json().catch(() => ({}));
    if (!userData?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch the booking ─────────────────────────────────────────────────
    const bookingRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&select=id,shop_id,stripe_payment_intent_id,payment_verified,refund_status,status`,
      { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
    );
    const bookings = await bookingRes.json();
    const booking = bookings?.[0];

    if (!booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Verify the caller owns the shop for this booking ──────────────────
    const shopRes = await fetch(
      `${supabaseUrl}/rest/v1/shops?id=eq.${booking.shop_id}&select=owner_id`,
      { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
    );
    const shops = await shopRes.json();
    const isOwner = shops?.[0]?.owner_id === userData.id;

    // Also allow admins
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userData.id}&select=role`,
      { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
    );
    const profiles = await profileRes.json();
    const isAdmin = profiles?.[0]?.role === "admin";

    if (!isOwner && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to refund this booking." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Validate refund eligibility ───────────────────────────────────────
    if (!booking.payment_verified || !booking.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: "This booking has no verified payment to refund." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.refund_status === "full") {
      return new Response(
        JSON.stringify({ error: "This booking has already been fully refunded." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Issue refund via Stripe API ───────────────────────────────────────
    // Full refund of the charge, but keep the application fee (your 7%).
    const params = new URLSearchParams();
    params.append("payment_intent", booking.stripe_payment_intent_id);
    params.append("refund_application_fee", "false"); // KEEP the 7% platform fee
    params.append("reverse_transfer", "true"); // Pull money back from connected account

    const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const refund = await refundRes.json();

    if (!refundRes.ok) {
      console.error("Stripe refund error:", refund);
      return new Response(
        JSON.stringify({ error: refund.error?.message || "Stripe refund failed." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Update booking status ─────────────────────────────────────────────
    const updateHeaders = {
      apikey: supabaseService,
      Authorization: `Bearer ${supabaseService}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };

    await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: "PATCH",
      headers: updateHeaders,
      body: JSON.stringify({
        refund_status: "full",
        status: "cancelled",
      }),
    });

    console.log(`Refund issued for booking ${bookingId}, refund id: ${refund.id}`);

    return new Response(
      JSON.stringify({ success: true, refundId: refund.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Refund error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
