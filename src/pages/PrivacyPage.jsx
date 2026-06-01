import { openCookiePreferences } from "../lib/consent";

export default function PrivacyPage({ nav }) {
  return (
    <div style={{ background: "linear-gradient(180deg, #090909 0%, #110705 25%, #090909 60%, #05050C 100%)", minHeight: "100vh", color: "#fff", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes glow-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 0.8; } } @keyframes orb-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }`}</style>
      <div aria-hidden="true" style={{ position: "fixed", top: "-5%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,77,0,0.16) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 7s ease-in-out infinite", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "orb-drift 16s ease-in-out infinite", zIndex: 0 }} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } h2 { font-family: 'Bebas Neue', cursive; font-size: 22px; letter-spacing: 2px; color: #FF4D00; margin: 40px 0 10px; } h3 { font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 1.5px; color: rgba(255,255,255,0.7); margin: 24px 0 8px; } p, li { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.8; } ul { padding-left: 20px; margin: 8px 0; } a { color: #FF4D00; text-decoration: none; } a:hover { text-decoration: underline; } @media (max-width: 768px) { .legal-header { padding: 14px 20px !important; } .legal-body { padding: 32px 20px 64px !important; } .legal-title { font-size: 34px !important; letter-spacing: 2px !important; } } @media (max-width: 420px) { .legal-header { padding: 12px 16px !important; } .legal-body { padding: 24px 14px 48px !important; } .legal-title { font-size: 28px !important; letter-spacing: 1px !important; } }`}</style>

      {/* Header */}
      <div className="legal-header" style={{ background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 40px", display: "flex", alignItems: "center", gap: 32 }}>
        <button className="image-button" type="button" onClick={() => nav("landing")} aria-label="Go to WrapBridge home">
          <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 64, display: "block" }} />
        </button>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>PRIVACY POLICY</span>
      </div>

      <div className="legal-body" style={{ maxWidth: 780, margin: "0 auto", padding: "60px 32px 100px" }}>
        <div className="legal-title" style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, letterSpacing: 3, marginBottom: 8 }}>PRIVACY POLICY</div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginBottom: 40 }}>Last Updated: April 10, 2026</p>

        <p>This Privacy Policy explains how WrapBridge ("we", "us", or "our") collects, uses, and shares information about you when you use wrapbridge.com and related services. By using our Platform, you agree to the collection and use of information as described in this Policy.</p>

        <h2>1. Information We Collect</h2>
        <h3>1.1 Information You Provide</h3>
        <ul>
          <li><strong>Account information:</strong> name, email address, and password when you register</li>
          <li><strong>Profile information:</strong> business name, location, phone number, and bio (Service Providers)</li>
          <li><strong>Booking information:</strong> vehicle details, service requests, preferred dates, and messages</li>
          <li><strong>Communications:</strong> messages sent through the Platform between Customers and Service Providers</li>
        </ul>
        <h3>1.2 Information Collected Automatically</h3>
        <ul>
          <li><strong>Usage data:</strong> pages visited, features used, and actions taken on the Platform</li>
          <li><strong>Device data:</strong> browser type, operating system, IP address, and general location</li>
          <li><strong>Cookies and local storage:</strong> used to maintain sessions and remember preferences</li>
        </ul>
        <h3>1.3 Information from Third Parties</h3>
        <ul>
          <li><strong>Stripe:</strong> We receive payment confirmation data (not full card numbers) to verify transactions</li>
          <li><strong>Geolocation:</strong> With your permission, we use your browser's geolocation to show nearby shops</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Create and manage your account</li>
          <li>Connect Customers with Service Providers and facilitate bookings</li>
          <li>Process payments and send transaction-related emails</li>
          <li>Send booking confirmations, quote notifications, and service updates</li>
          <li>Display shop profiles, portfolios, and reviews publicly on the Platform</li>
          <li>Improve the Platform and troubleshoot technical issues</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>We do <strong>not</strong> sell your personal information to third parties.</p>

        <h2>3. How We Share Your Information</h2>
        <h3>3.1 With Service Providers</h3>
        <p>When you submit a booking request, your name, vehicle information, and message are shared with the Service Provider you are booking with. This is necessary to fulfill the service.</p>
        <h3>3.2 With Stripe</h3>
        <p>Payment information is handled directly by Stripe. We share your booking details (amount, service name) with Stripe to create checkout sessions. We do not store full card numbers. Stripe's Privacy Policy applies to all payment data.</p>
        <h3>3.3 With Infrastructure Providers</h3>
        <p>We use Supabase (database and authentication) and Resend (transactional email). These providers process data on our behalf under confidentiality agreements.</p>
        <h3>3.4 Legal Requirements</h3>
        <p>We may disclose your information if required by law, court order, or government request, or to protect the rights, property, or safety of WrapBridge, our users, or the public.</p>

        <h2>4. Public Information</h2>
        <p>Service Provider shop profiles — including name, location, photos, services, bio, and reviews — are publicly visible to all visitors of the Platform. Do not include private information in public-facing profile fields.</p>

        <h2>5. Data Retention</h2>
        <p>We retain your account data for as long as your account is active. Booking records and messages are retained for a minimum of 2 years for legal and dispute purposes. You may request deletion of your account by contacting us at <a href="mailto:support@wrapbridge.com">support@wrapbridge.com</a>; however, we may retain certain records as required by law or legitimate business interests.</p>

        <h2>6. Cookies</h2>
        <p>We use essential browser storage to keep you logged in, protect your account, remember app state, and process bookings. Essential storage is required for the Platform to work. Optional analytics or tracking tools are only loaded if you choose Allow in the cookie banner. We do not currently use third-party advertising cookies.</p>
        <button type="button" onClick={openCookiePreferences} style={{ marginTop: 8, background: "transparent", border: "1px solid rgba(255,77,0,0.55)", color: "#FF4D00", padding: "10px 16px", borderRadius: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Cookie Preferences
        </button>

        <h2>7. Security</h2>
        <p>We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords via Supabase Auth, and row-level security on our database. However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.</p>

        <h2>8. Children's Privacy</h2>
        <p>WrapBridge is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, contact us at <a href="mailto:support@wrapbridge.com">support@wrapbridge.com</a> and we will delete it.</p>

        <h2>9. Your Rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your account and associated data</li>
          <li>Opt out of non-essential communications</li>
        </ul>
        <p>To exercise these rights, contact us at <a href="mailto:support@wrapbridge.com">support@wrapbridge.com</a>.</p>

        <h2>10. Third-Party Links</h2>
        <p>The Platform may contain links to third-party websites (e.g., Service Provider websites). We are not responsible for the privacy practices of those sites. Review their privacy policies before sharing any personal information.</p>

        <h2>11. Data Location</h2>
        <p>Your data is stored and processed in the <strong>United States</strong> through our infrastructure providers (Supabase and Stripe). By using the Platform, you consent to the transfer and processing of your data in the United States.</p>

        <h2>12. Data Breach Notification</h2>
        <p>In the event of a data breach that compromises your personal information, WrapBridge will notify affected users within 72 hours of becoming aware of the breach, or as otherwise required by applicable law. Notification will be sent to the email address associated with your account.</p>

        <h2>13. California Residents (CCPA / CPRA)</h2>
        <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):</p>
        <ul>
          <li><strong>Right to Know:</strong> You may request the categories and specific pieces of personal information we have collected about you.</li>
          <li><strong>Right to Delete:</strong> You may request deletion of your personal information, subject to certain legal exceptions.</li>
          <li><strong>Right to Opt Out of Sale:</strong> <strong>We do not sell your personal information</strong> to third parties and have not done so in the preceding 12 months.</li>
          <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your privacy rights.</li>
        </ul>
        <p>To exercise these rights, contact us at <a href="mailto:support@wrapbridge.com">support@wrapbridge.com</a>. We will verify your identity before processing any request and respond within 45 days as required by law.</p>
        <p><strong>Categories of personal information collected:</strong> Identifiers (name, email), commercial information (booking and payment history), internet activity (usage data), and geolocation data. See Section 1 for full details.</p>

        <h2>14. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated Policy with a new "Last Updated" date. Continued use of the Platform after changes constitutes acceptance.</p>

        <h2>15. Contact</h2>
        <p>For privacy questions or data requests, contact us at: <a href="mailto:support@wrapbridge.com">support@wrapbridge.com</a></p>

        <p style={{ marginTop: 60, color: "rgba(255,255,255,0.2)", fontSize: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
          © {new Date().getFullYear()} WrapBridge. All rights reserved. &nbsp;
          <button className="link-button" type="button" onClick={() => nav("terms")} style={{ color: "#FF4D00", cursor: "pointer" }}>Terms of Service</button>
        </p>
      </div>
    </div>
  );
}
