// @ts-nocheck
// WrapBridge - Data deletion request edge function (Resend)
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

function jsonResp(req: Request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getUser(req: Request, supabaseUrl, supabaseService) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: supabaseService, Authorization: authHeader },
  });
  if (!userRes.ok) return null;
  const user = await userRes.json().catch(() => null);
  return user?.id ? user : null;
}

async function getProfile(userId, supabaseUrl, supabaseService) {
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role,name`, {
    headers: { apikey: supabaseService, Authorization: `Bearer ${supabaseService}` },
  });
  const data = await res.json().catch(() => []);
  return data?.[0] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return jsonResp(req, { error: "Method not allowed" }, 405);

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM") || "WrapBridge <onboarding@resend.dev>";
    const supportEmail = Deno.env.get("SUPPORT_EMAIL") || "support@wrapbridge.com";

    if (!resendKey) return jsonResp(req, { error: "RESEND_API_KEY not configured" }, 500);
    if (!supabaseUrl) return jsonResp(req, { error: "SUPABASE_URL not configured" }, 500);
    if (!supabaseService) return jsonResp(req, { error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, 500);

    const user = await getUser(req, supabaseUrl, supabaseService);
    if (!user) return jsonResp(req, { error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const profile = await getProfile(user.id, supabaseUrl, supabaseService);
    const accountType = body.accountType || (profile?.role === "company" ? "Business Account" : "Customer Account");
    const businessName = body.businessName || null;
    const email = user.email || "Unknown";
    const name = profile?.name || user.user_metadata?.name || user.user_metadata?.business_name || "Unknown";

    const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Arial,sans-serif;color:#222;line-height:1.5;">
    <h2>Data Deletion Request</h2>
    <p>A WrapBridge user requested deletion of their account data.</p>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
      <tr><td><strong>Account type</strong></td><td>${esc(accountType)}</td></tr>
      <tr><td><strong>Name</strong></td><td>${esc(name)}</td></tr>
      <tr><td><strong>Email</strong></td><td>${esc(email)}</td></tr>
      <tr><td><strong>User ID</strong></td><td>${esc(user.id)}</td></tr>
      ${businessName ? `<tr><td><strong>Business name</strong></td><td>${esc(businessName)}</td></tr>` : ""}
      <tr><td><strong>Requested at</strong></td><td>${esc(new Date().toISOString())}</td></tr>
    </table>
    <p style="margin-top:18px;color:#666;font-size:13px;">
      Review before deleting. Some booking, payment, dispute, tax, accounting, fraud prevention, security, or legal records may need to be retained.
    </p>
  </body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [supportEmail],
        reply_to: email,
        subject: `Data Deletion Request - ${accountType} - ${email}`,
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return jsonResp(req, { error: data?.message || "Could not send deletion request" }, 502);

    return jsonResp(req, { sent: true, id: data.id });
  } catch (e) {
    return jsonResp(req, { error: e?.message || String(e) }, 500);
  }
});
