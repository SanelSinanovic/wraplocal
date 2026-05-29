// @ts-nocheck
// WrapBridge - Email notification edge function (Resend)
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

function jsonResp(req, body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

// HTML-escape user content to prevent XSS in email clients
function esc(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeEq(value) {
  return encodeURIComponent(String(value));
}

// Branded email wrapper
function emailWrapper(content) {
  const appUrl = Deno.env.get("APP_URL") || "https://wrapbridge.com";
  const appHost = new URL(appUrl).host;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WrapBridge</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0A0A0A;padding:24px 32px;">
            <span style="font-size:24px;letter-spacing:4px;font-weight:900;font-family:Georgia,serif;">
              <span style="color:#FF4D00;">WRAP</span><span style="color:#fff;">BRIDGE</span>
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              You received this email because you have an active booking on WrapBridge.<br>
              Questions? Reply to this email or visit <a href="${appUrl}" style="color:#FF4D00;">${appHost}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function orangeBtn(text, url) {
  return `<table cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td style="background:#FF4D00;border-radius:2px;padding:12px 28px;">
      <a href="${url}" style="color:#fff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:1px;white-space:nowrap;">${text}</a>
    </td></tr>
  </table>`;
}

function divider() {
  return `<div style="height:1px;background:#f0f0f0;margin:24px 0;"></div>`;
}

function detail(label, value) {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#999;width:140px;vertical-align:top;">${esc(label)}</td>
    <td style="padding:6px 0;font-size:13px;color:#222;font-weight:600;">${esc(value) || "—"}</td>
  </tr>`;
}

function buildEmail(type, b, customerName, shopName, customerEmail, shopEmail, appUrl) {
  const service = esc(b.service || "your service");
  const amount = b.amount ? `$${Number(b.amount).toFixed(2)}` : null;
  const dateStr = b.date ? esc(b.date) : null;
  const timeStr = esc(b.time_slot || b.time || null);
  customerName = esc(customerName);
  shopName = esc(shopName);

  switch (type) {
    case "booking_created": {
      const shopHtml = emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:800;">New Booking Request</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          You have a new booking request waiting for your response.
        </p>
        ${divider()}
        <table cellpadding="0" cellspacing="0" width="100%">
          ${detail("Customer", customerName)}
          ${detail("Service", service)}
          ${detail("Vehicle", b.vehicle || null)}
          ${detail("Preferred dates", b.preferred_dates ? "See dashboard" : null)}
        </table>
        ${divider()}
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
          Log in to your dashboard to review the request and send a quote.
        </p>
        ${orangeBtn("View Request →", `${appUrl}/company`)}
      `);
      const customerHtml = emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:800;">Booking Request Sent!</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          Your request has been sent to <strong>${shopName}</strong>. They'll review it and send you a quote shortly.
        </p>
        ${divider()}
        <table cellpadding="0" cellspacing="0" width="100%">
          ${detail("Shop", shopName)}
          ${detail("Service", service)}
          ${detail("Vehicle", b.vehicle || null)}
        </table>
        ${divider()}
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
          We'll email you again once the shop sends your quote. You can also track your booking in your WrapBridge dashboard.
        </p>
        ${orangeBtn("Track My Booking →", `${appUrl}/dashboard?booking=${b.id}`)}
      `);
      return {
        to: shopEmail, subject: `New booking request from ${customerName}`, html: shopHtml,
        customerEmail, customerHtml, customerSubject: `Booking request sent to ${shopName}`,
      };
    }

    case "quote_sent": {
      const html = emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:800;">You've Got a Quote!</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          <strong>${shopName}</strong> has sent you a quote for your booking.
        </p>
        ${divider()}
        <table cellpadding="0" cellspacing="0" width="100%">
          ${detail("Shop", shopName)}
          ${detail("Service", service)}
          ${amount ? detail("Quote amount", `<span style="color:#FF4D00;font-size:20px;">${amount}</span>`) : ""}
        </table>
        ${divider()}
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
          Log in to review the quote and accept or decline it. Once accepted, you'll complete payment and the shop will confirm your appointment.
        </p>
        ${orangeBtn("Review Quote →", `${appUrl}/dashboard?booking=${b.id}`)}
      `);
      return { to: customerEmail, subject: `${shopName} sent you a quote for ${service}`, html };
    }

    case "quote_accepted": {
      const html = emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:800;">Quote Accepted!</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          Great news — <strong>${customerName}</strong> accepted your quote and payment has been initiated.
        </p>
        ${divider()}
        <table cellpadding="0" cellspacing="0" width="100%">
          ${detail("Customer", customerName)}
          ${detail("Service", service)}
          ${amount ? detail("Amount", `<span style="color:#FF4D00;font-size:18px;">${amount}</span>`) : ""}
        </table>
        ${divider()}
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
          Head to your dashboard to confirm the appointment date and time with the customer.
        </p>
        ${orangeBtn("Go to Dashboard →", `${appUrl}/company`)}
      `);
      return { to: shopEmail, subject: `${customerName} accepted your quote — ${service}`, html };
    }

    case "booking_confirmed": {
      const html = emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:800;">Booking Confirmed!</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          Your booking at <strong>${shopName}</strong> is confirmed. Here are your details:
        </p>
        ${divider()}
        <table cellpadding="0" cellspacing="0" width="100%">
          ${detail("Shop", shopName)}
          ${detail("Service", service)}
          ${dateStr ? detail("Date", dateStr) : ""}
          ${timeStr ? detail("Time", timeStr) : ""}
          ${b.vehicle ? detail("Vehicle", b.vehicle) : ""}
          ${amount ? detail("Amount", amount) : ""}
        </table>
        ${divider()}
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
          You can message the shop any time through your WrapBridge dashboard.
        </p>
        ${orangeBtn("View My Booking →", `${appUrl}/dashboard?booking=${b.id}`)}
      `);
      return { to: customerEmail, subject: `Your booking at ${shopName} is confirmed`, html };
    }

    case "booking_cancelled": {
      // Email both parties — caller handles sending two copies by overriding `to`
      const html = emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:800;">Booking Cancelled</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          The following booking has been cancelled.
        </p>
        ${divider()}
        <table cellpadding="0" cellspacing="0" width="100%">
          ${detail("Shop", shopName)}
          ${detail("Customer", customerName)}
          ${detail("Service", service)}
          ${dateStr ? detail("Date", dateStr) : ""}
        </table>
        ${divider()}
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
          If you have questions, please reach out through the WrapBridge dashboard.
        </p>
        ${orangeBtn("Go to WrapBridge →", appUrl)}
      `);
      return { to: customerEmail, subject: `Booking cancelled — ${service} at ${shopName}`, html, shopHtml: html, shopSubject: `Booking cancelled — ${customerName} (${service})`, shopEmail };
    }

    case "payment_received": {
      const customerHtml = emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:800;">Payment Received ✓</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          Your payment for your booking at <strong>${shopName}</strong> has been processed successfully.
        </p>
        ${divider()}
        <table cellpadding="0" cellspacing="0" width="100%">
          ${detail("Shop", shopName)}
          ${detail("Service", service)}
          ${b.vehicle ? detail("Vehicle", b.vehicle) : ""}
          ${dateStr ? detail("Date", dateStr) : ""}
          ${timeStr ? detail("Time", timeStr) : ""}
          ${amount ? detail("Amount paid", `<span style="color:#10B981;font-size:18px;font-weight:700;">${amount}</span>`) : ""}
        </table>
        ${divider()}
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
          Your booking is confirmed. You can message the shop any time through your WrapBridge dashboard.
        </p>
        ${orangeBtn("View My Booking \u2192", `${appUrl}/dashboard?booking=${b.id}`)}
      `);
      const shopHtml = emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:800;">Payment Received ✓</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          <strong>${customerName}</strong> has completed payment for their booking.
        </p>
        ${divider()}
        <table cellpadding="0" cellspacing="0" width="100%">
          ${detail("Customer", customerName)}
          ${detail("Service", service)}
          ${amount ? detail("Amount", `<span style="color:#10B981;font-size:18px;font-weight:700;">${amount}</span>`) : ""}
        </table>
        ${divider()}
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
          Head to your dashboard to confirm the appointment date and time with the customer.
        </p>
        ${orangeBtn("Go to Dashboard \u2192", `${appUrl}/company`)}
      `);
      return { to: customerEmail, subject: `Payment confirmed — ${service} at ${shopName}`, html: customerHtml, shopHtml, shopSubject: `Payment received from ${customerName} — ${service}`, shopEmail };
    }

    case "reschedule_request": {
      const html = emailWrapper(`
        <h2 style="margin:0 0 8px;font-size:22px;color:#0A0A0A;font-weight:800;">Reschedule Request</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
          <strong>${customerName}</strong> has requested to reschedule their appointment.
        </p>
        ${divider()}
        <table cellpadding="0" cellspacing="0" width="100%">
          ${detail("Customer", customerName)}
          ${detail("Service", service)}
          ${dateStr ? detail("Current date", dateStr) : ""}
        </table>
        ${divider()}
        <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
          Please log in to your dashboard to message the customer and arrange a new time.
        </p>
        ${orangeBtn("Go to Dashboard →", `${appUrl}/company`)}
      `);
      return { to: shopEmail, subject: `${customerName} requested a reschedule — ${service}`, html };
    }

    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResp(req, { error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const { type, bookingId } = body;

    if (!type || !bookingId) return jsonResp(req, { error: "type and bookingId are required" }, 400);

    const resendKey     = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl   = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const fromEmail     = Deno.env.get("RESEND_FROM") || "WrapBridge <onboarding@resend.dev>";
    const appUrl        = Deno.env.get("APP_URL") || "https://www.wrapbridge.com";

    if (!resendKey)       return jsonResp(req, { error: "RESEND_API_KEY not configured" }, 500);
    if (!supabaseUrl)     return jsonResp(req, { error: "SUPABASE_URL not configured" }, 500);
    if (!supabaseService) return jsonResp(req, { error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, 500);

    // ── Verify the calling user is authenticated ──────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
      headers: { apikey: supabaseService, Authorization: authHeader },
    });
    const userData = await userRes.json().catch(() => ({}));
    if (!userData?.id) return jsonResp(req, { error: "Unauthorized" }, 401);

    // Fetch booking + shop info
    const bookingRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${safeEq(bookingId)}&select=*,shops(id,name,owner_id)`,
      { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
    );
    const bookings = await bookingRes.json().catch(() => []);
    const b = bookings?.[0];
    if (!b) return jsonResp(req, { error: "Booking not found" }, 404);

    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${safeEq(userData.id)}&select=role`,
      { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
    );
    const profiles = await profileRes.json().catch(() => []);
    const isAdmin = profiles?.[0]?.role === "admin";
    const isParticipant = userData.id === b.customer_id || userData.id === b.shops?.owner_id || isAdmin;
    if (!isParticipant) return jsonResp(req, { error: "Forbidden" }, 403);

    if (type === "quote_sent") {
      const quoteRes = await fetch(
        `${supabaseUrl}/rest/v1/booking_quotes?booking_id=eq.${safeEq(bookingId)}&status=eq.active&select=amount&order=created_at.desc&limit=1`,
        { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
      );
      const quotes = await quoteRes.json().catch(() => []);
      if (quotes?.[0]?.amount) b.amount = quotes[0].amount;
    }

    // Fetch customer details from auth
    const custRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${b.customer_id}`,
      { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
    );
    const custData = await custRes.json().catch(() => ({}));
    const customerEmail = custData?.email;
    const customerName = custData?.user_metadata?.name || custData?.email?.split("@")[0] || "Customer";

    // Fetch shop owner details
    let shopEmail = null;
    let shopOwnerName = "Shop";
    if (b.shops?.owner_id) {
      const ownerRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${b.shops.owner_id}`,
        { headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` } }
      );
      const ownerData = await ownerRes.json().catch(() => ({}));
      shopEmail = ownerData?.email;
      shopOwnerName = ownerData?.user_metadata?.name || ownerData?.user_metadata?.business_name || ownerData?.email?.split("@")[0] || "Shop";
    }

    const shopName = b.shops?.name || shopOwnerName;

    const emailData = buildEmail(type, b, customerName, shopName, customerEmail, shopEmail, appUrl);
    if (!emailData) return jsonResp(req, { error: `Unknown notification type: ${type}` }, 400);

    const results = [];

    // Send primary email
    if (emailData.to) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromEmail, to: [emailData.to], subject: emailData.subject, html: emailData.html }),
      });
      const data = await res.json().catch(() => ({}));
      results.push({ to: emailData.to, ok: res.ok, status: res.status, id: data.id, resend: data });
    }

    // For cancellations, also email the shop
    if (type === "booking_cancelled" && emailData.shopEmail && emailData.shopEmail !== emailData.to) {
      const res2 = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromEmail, to: [emailData.shopEmail], subject: emailData.shopSubject, html: emailData.shopHtml }),
      });
      const data2 = await res2.json().catch(() => ({}));
      results.push({ to: emailData.shopEmail, ok: res2.ok, status: res2.status, id: data2.id, resend: data2 });
    }

    // For payment_received, also email the shop
    if (type === "payment_received" && emailData.shopEmail && emailData.shopEmail !== emailData.to) {
      const res4 = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromEmail, to: [emailData.shopEmail], subject: emailData.shopSubject, html: emailData.shopHtml }),
      });
      const data4 = await res4.json().catch(() => ({}));
      results.push({ to: emailData.shopEmail, ok: res4.ok, status: res4.status, id: data4.id, resend: data4 });
    }

    // For new bookings, also email the customer
    if (type === "booking_created" && emailData.customerEmail) {
      const res3 = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromEmail, to: [emailData.customerEmail], subject: emailData.customerSubject, html: emailData.customerHtml }),
      });
      const data3 = await res3.json().catch(() => ({}));
      results.push({ to: emailData.customerEmail, ok: res3.ok, status: res3.status, id: data3.id, resend: data3 });
    }

    return jsonResp(req, { sent: true, results });
  } catch (e) {
    return jsonResp(req, { error: e?.message || String(e) }, 500);
  }
});
