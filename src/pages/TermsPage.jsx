export default function TermsPage({ nav }) {
  return (
    <div style={{ background: "#090909", minHeight: "100vh", color: "#fff", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } h2 { font-family: 'Bebas Neue', cursive; font-size: 22px; letter-spacing: 2px; color: #FF4D00; margin: 40px 0 10px; } h3 { font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 1.5px; color: rgba(255,255,255,0.7); margin: 24px 0 8px; } p, li { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.8; } ul { padding-left: 20px; margin: 8px 0; } a { color: #FF4D00; text-decoration: none; } a:hover { text-decoration: underline; }`}</style>

      {/* Header */}
      <div style={{ background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 40px", display: "flex", alignItems: "center", gap: 32 }}>
        <div onClick={() => nav("landing")} style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: 4, cursor: "pointer" }}>
          <span style={{ color: "#FF4D00" }}>KI</span><span style={{ color: "#fff" }}>DOR</span>
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>TERMS OF SERVICE</span>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 32px 100px" }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, letterSpacing: 3, marginBottom: 8 }}>TERMS OF SERVICE</div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginBottom: 40 }}>Last Updated: April 10, 2026</p>

        <p>Please read these Terms of Service ("Terms") carefully before using Kidor ("Platform", "we", "us", or "our") at kidor.app or any related services. By accessing or using Kidor, you agree to be bound by these Terms. If you do not agree, do not use the Platform.</p>

        <h2>1. What Kidor Is</h2>
        <p>Kidor is a <strong>booking marketplace platform</strong> that connects customers ("Customers") with independent vehicle service providers ("Service Providers" or "Shops"). Kidor does <strong>not</strong> perform any vehicle services. We provide software tools for discovery, booking, and payment processing only.</p>
        <p><strong>Kidor is not a party to any service agreement between a Customer and a Service Provider.</strong> Any contract for services is solely between the Customer and the Service Provider.</p>

        <h2>2. Eligibility</h2>
        <p>You must be at least 18 years old and capable of entering into a binding contract to use Kidor. By using the Platform, you represent that you meet these requirements.</p>

        <h2>3. Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at <a href="mailto:support@kidor.app">support@kidor.app</a> if you suspect unauthorized access. We reserve the right to suspend or terminate accounts that violate these Terms.</p>

        <h2>4. Service Providers</h2>
        <h3>4.1 Independent Contractors</h3>
        <p>Service Providers are <strong>independent contractors</strong>, not employees, agents, or representatives of Kidor. Kidor does not supervise, direct, or control the work performed by Service Providers.</p>
        <h3>4.2 Stripe Connect Requirement</h3>
        <p>Service Providers must complete Stripe Connect onboarding and maintain an active, fully enabled Stripe account to be listed on the Platform and receive payments.</p>
        <h3>4.3 Service Provider Responsibilities</h3>
        <p>Service Providers are solely responsible for:</p>
        <ul>
          <li>The quality, safety, and legality of all services they offer</li>
          <li>Accurate representation of their services, pricing, and availability</li>
          <li>Compliance with all applicable laws, licenses, and regulations</li>
          <li>Resolving disputes directly with Customers regarding service quality or outcomes</li>
          <li>Any refunds, corrections, or remedies owed to Customers</li>
        </ul>

        <h2>5. Payments</h2>
        <h3>5.1 Payment Processing</h3>
        <p>Payments are processed via <strong>Stripe</strong>. By making a payment, you agree to Stripe's <a href="https://stripe.com/legal" target="_blank" rel="noopener">Terms of Service</a> and <a href="https://stripe.com/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</p>
        <h3>5.2 Direct Payments to Service Providers</h3>
        <p>When you pay for a service on Kidor, your payment flows <strong>directly to the Service Provider's Stripe account</strong>. Kidor collects a platform fee (currently 7%) deducted at the time of payment. Kidor never holds, controls, or is responsible for the Service Provider's funds.</p>
        <h3>5.3 No Refund Liability</h3>
        <p><strong>Kidor does not issue refunds.</strong> All refund, cancellation, and dispute requests must be directed to the Service Provider. Because funds are routed directly to the Service Provider and Kidor does not retain them, Kidor has no ability to process refunds on behalf of Service Providers.</p>
        <h3>5.4 24-Hour Refund Window</h3>
        <p><strong>Refund requests will not be accepted after 24 hours from the time of payment.</strong> Any request for a refund submitted more than 24 hours after a completed payment transaction is ineligible for consideration by either Kidor or the Service Provider through the Platform. Customers who believe they have a valid dispute after this window must resolve the matter directly with their card issuer or bank outside of Kidor.</p>
        <h3>5.5 Chargebacks and Disputes</h3>
        <p>Any payment disputes, chargebacks, or fraud claims are the responsibility of the Service Provider whose Stripe account received the funds. Kidor will cooperate with Stripe's dispute resolution process but is not financially liable for the outcome.</p>
        <h3>5.6 Platform Fee</h3>
        <p>The 7% Kidor platform fee is non-refundable once a payment session has been completed.</p>

        <h2>6. Cancellations</h2>
        <p>Cancellation policies are set by each Service Provider. Kidor is not responsible for enforcing or honoring any Service Provider's cancellation policy. Customers should review a Service Provider's cancellation terms before booking. Cancellations do not automatically entitle a Customer to a refund — all refund eligibility is subject to the Service Provider's policy and the 24-hour window stated in Section 5.4.</p>

        <h2>7. Disclaimer of Warranties</h2>
        <p><strong>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</strong> Kidor does not warrant that:</p>
        <ul>
          <li>The Platform will be uninterrupted, error-free, or secure</li>
          <li>Any Service Provider is licensed, qualified, insured, or will perform services to any standard</li>
          <li>Any information on the Platform is accurate, complete, or current</li>
        </ul>
        <p><strong>USE OF THE PLATFORM AND ANY SERVICES BOOKED THROUGH IT IS AT YOUR SOLE RISK.</strong></p>

        <h2>8. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
        <ul>
          <li><strong>Kidor's total liability</strong> to you for any claim arising from use of the Platform shall not exceed <strong>$50 USD</strong> or the amount of platform fees you paid to Kidor in the 30 days preceding the claim, whichever is greater.</li>
          <li><strong>Kidor is not liable</strong> for any indirect, incidental, special, consequential, punitive, or exemplary damages, including but not limited to: loss of profits, data, goodwill, or vehicle damage.</li>
          <li><strong>Kidor is not liable</strong> for the acts, omissions, negligence, or misconduct of any Service Provider.</li>
          <li><strong>Kidor is not liable</strong> for any damage to your vehicle, property, or person resulting from services performed by a Service Provider.</li>
          <li><strong>Kidor is not liable</strong> for any refund, reimbursement, or financial loss arising from a Service Provider's failure to perform services.</li>
        </ul>

        <h2>9. Indemnification</h2>
        <p>You agree to indemnify, defend, and hold harmless Kidor and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with:</p>
        <ul>
          <li>Your use of the Platform</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights</li>
          <li>Any dispute between you and a Service Provider</li>
          <li>Any services performed or not performed by a Service Provider</li>
        </ul>

        <h2>10. Vehicle Damage</h2>
        <p>Kidor is <strong>not responsible for any damage</strong> to your vehicle, property, or any other item that occurs during or as a result of services booked through the Platform. All claims for vehicle damage must be directed to the Service Provider. We strongly recommend confirming a Service Provider's insurance coverage before authorizing any work on your vehicle.</p>

        <h2>11. Third-Party Services</h2>
        <p>The Platform integrates with third-party services including Stripe (payments), Resend (email), and Supabase (infrastructure). Kidor is not responsible for the availability, accuracy, or terms of any third-party service.</p>

        <h2>12. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Platform for any unlawful purpose</li>
          <li>Attempt to circumvent payments outside the Platform to avoid Kidor's fee</li>
          <li>Post false, misleading, or defamatory reviews or content</li>
          <li>Impersonate any person or entity</li>
          <li>Attempt to gain unauthorized access to any part of the Platform</li>
          <li>Use automated tools to scrape, overload, or interfere with the Platform</li>
        </ul>

        <h2>13. Reviews and Content</h2>
        <p>By submitting reviews or other content, you grant Kidor a non-exclusive, royalty-free, worldwide license to display and use that content on the Platform. You represent that you have the right to submit the content and that it is truthful and not defamatory.</p>

        <h2>14. Termination</h2>
        <p>Kidor reserves the right to suspend or terminate your access to the Platform at any time, with or without notice, for any reason including violation of these Terms.</p>

        <h2>15. Governing Law</h2>
        <p>These Terms are governed by the laws of the <strong>State of Georgia</strong>, without regard to conflict of law provisions. Any dispute arising from these Terms or your use of the Platform shall be resolved exclusively in the courts located in Georgia, and you consent to personal jurisdiction in those courts.</p>

        <h2>16. Changes to These Terms</h2>
        <p>Kidor may update these Terms at any time. We will notify you of material changes by posting the updated Terms on the Platform with a new "Last Updated" date. Continued use of the Platform after changes constitutes acceptance of the updated Terms.</p>

        <h2>17. Contact</h2>
        <p>For questions about these Terms, contact us at: <a href="mailto:support@kidor.app">support@kidor.app</a></p>

        <p style={{ marginTop: 60, color: "rgba(255,255,255,0.2)", fontSize: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
          © {new Date().getFullYear()} Kidor. All rights reserved. &nbsp;
          <span onClick={() => nav("privacy")} style={{ color: "#FF4D00", cursor: "pointer" }}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
