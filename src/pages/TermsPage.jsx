export default function TermsPage({ nav }) {
  return (
    <div style={{ background: "linear-gradient(180deg, #090909 0%, #110705 25%, #090909 60%, #05050C 100%)", minHeight: "100vh", color: "#fff", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes glow-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 0.8; } } @keyframes orb-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }`}</style>
      <div aria-hidden="true" style={{ position: "fixed", top: "-5%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,77,0,0.16) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 7s ease-in-out infinite", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "orb-drift 16s ease-in-out infinite", zIndex: 0 }} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } h2 { font-family: 'Bebas Neue', cursive; font-size: 22px; letter-spacing: 2px; color: #FF4D00; margin: 40px 0 10px; } h3 { font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 1.5px; color: rgba(255,255,255,0.7); margin: 24px 0 8px; } p, li { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.8; } ul { padding-left: 20px; margin: 8px 0; } a { color: #FF4D00; text-decoration: none; } a:hover { text-decoration: underline; } @media (max-width: 768px) { .legal-header { padding: 14px 20px !important; } .legal-body { padding: 32px 20px 64px !important; } .legal-title { font-size: 34px !important; letter-spacing: 2px !important; } } @media (max-width: 420px) { .legal-header { padding: 12px 16px !important; } .legal-body { padding: 24px 14px 48px !important; } .legal-title { font-size: 28px !important; letter-spacing: 1px !important; } }`}</style>

      {/* Header */}
      <div className="legal-header" style={{ background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 40px", display: "flex", alignItems: "center", gap: 32 }}>
        <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 64, display: "block", cursor: "pointer" }} onClick={() => nav("landing")} />
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>TERMS OF SERVICE</span>
      </div>

      <div className="legal-body" style={{ maxWidth: 780, margin: "0 auto", padding: "60px 32px 100px" }}>
        <div className="legal-title" style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, letterSpacing: 3, marginBottom: 8 }}>TERMS OF SERVICE</div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginBottom: 40 }}>Last Updated: April 10, 2026</p>

        <p>Please read these Terms of Service ("Terms") carefully before using WrapBridge ("Platform", "we", "us", or "our") at wrapbridge.com or any related services. By accessing or using WrapBridge, you agree to be bound by these Terms. If you do not agree, do not use the Platform.</p>

        <h2>1. What WrapBridge Is</h2>
        <p>WrapBridge is a <strong>booking marketplace platform</strong> that connects customers ("Customers") with independent vehicle service providers ("Service Providers" or "Shops"). WrapBridge does <strong>not</strong> perform any vehicle services. We provide software tools for discovery, booking, and payment processing only.</p>
        <p><strong>WrapBridge is not a party to any service agreement between a Customer and a Service Provider.</strong> Any contract for services is solely between the Customer and the Service Provider.</p>

        <h2>2. Eligibility</h2>
        <p>You must be at least 18 years old and capable of entering into a binding contract to use WrapBridge. By using the Platform, you represent that you meet these requirements.</p>

        <h2>3. Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at <a href="mailto:support@wrapbridge.com">support@wrapbridge.com</a> if you suspect unauthorized access. We reserve the right to suspend or terminate accounts that violate these Terms.</p>

        <h2>4. Service Providers</h2>
        <h3>4.1 Independent Contractors</h3>
        <p>Service Providers are <strong>independent contractors</strong>, not employees, agents, or representatives of WrapBridge. WrapBridge does not supervise, direct, or control the work performed by Service Providers.</p>
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
        <p>When you pay for a service on WrapBridge, your payment flows <strong>directly to the Service Provider's Stripe account</strong>. WrapBridge collects a platform fee (currently 7%) deducted at the time of payment. WrapBridge never holds, controls, or is responsible for the Service Provider's funds.</p>
        <h3>5.3 No Refund Liability</h3>
        <p><strong>WrapBridge does not issue refunds.</strong> All refund, cancellation, and dispute requests must be directed to the Service Provider. Because funds are routed directly to the Service Provider and WrapBridge does not retain them, WrapBridge has no ability to process refunds on behalf of Service Providers.</p>
        <h3>5.4 Refund Requests</h3>
        <p>Customers are encouraged to submit any refund requests to the Service Provider within 24 hours of payment. After 24 hours, WrapBridge cannot facilitate refund requests through the Platform. <strong>Nothing in these Terms limits your rights under applicable consumer protection laws or your right to dispute a charge directly with your payment card issuer.</strong></p>
        <h3>5.5 Chargebacks and Disputes</h3>
        <p>Any payment disputes, chargebacks, or fraud claims are the responsibility of the Service Provider whose Stripe account received the funds. WrapBridge will cooperate with Stripe's dispute resolution process but is not financially liable for the outcome.</p>
        <h3>5.6 Platform Fee</h3>
        <p>The 7% WrapBridge platform fee is non-refundable once a payment session has been completed.</p>

        <h2>6. Cancellations</h2>
        <p>Cancellation policies are set by each Service Provider. WrapBridge is not responsible for enforcing or honoring any Service Provider's cancellation policy. Customers should review a Service Provider's cancellation terms before booking. Cancellations do not automatically entitle a Customer to a refund — all refund eligibility is subject to the Service Provider's policy and the 24-hour window stated in Section 5.4.</p>

        <h2>7. Disclaimer of Warranties</h2>
        <p><strong>THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</strong> WrapBridge does not warrant that:</p>
        <ul>
          <li>The Platform will be uninterrupted, error-free, or secure</li>
          <li>Any Service Provider is licensed, qualified, insured, or will perform services to any standard</li>
          <li>Any information on the Platform is accurate, complete, or current</li>
        </ul>
        <p><strong>USE OF THE PLATFORM AND ANY SERVICES BOOKED THROUGH IT IS AT YOUR SOLE RISK.</strong></p>

        <h2>8. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
        <ul>
          <li><strong>WrapBridge's total liability</strong> to you for any claim arising from use of the Platform shall not exceed <strong>$50 USD</strong> or the amount of platform fees you paid to WrapBridge in the 30 days preceding the claim, whichever is greater.</li>
          <li><strong>WrapBridge is not liable</strong> for any indirect, incidental, special, consequential, punitive, or exemplary damages, including but not limited to: loss of profits, data, goodwill, or vehicle damage.</li>
          <li><strong>WrapBridge is not liable</strong> for the acts, omissions, negligence, or misconduct of any Service Provider.</li>
          <li><strong>WrapBridge is not liable</strong> for any damage to your vehicle, property, or person resulting from services performed by a Service Provider.</li>
          <li><strong>WrapBridge is not liable</strong> for any refund, reimbursement, or financial loss arising from a Service Provider's failure to perform services.</li>
        </ul>

        <h2>9. Indemnification</h2>
        <p>You agree to indemnify, defend, and hold harmless WrapBridge and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with:</p>
        <ul>
          <li>Your use of the Platform</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights</li>
          <li>Any dispute between you and a Service Provider</li>
          <li>Any services performed or not performed by a Service Provider</li>
        </ul>

        <h2>10. Vehicle Damage</h2>
        <p>WrapBridge is <strong>not responsible for any damage</strong> to your vehicle, property, or any other item that occurs during or as a result of services booked through the Platform. All claims for vehicle damage must be directed to the Service Provider. We strongly recommend confirming a Service Provider's insurance coverage before authorizing any work on your vehicle.</p>

        <h2>11. Third-Party Services</h2>
        <p>The Platform integrates with third-party services including Stripe (payments), Resend (email), and Supabase (infrastructure). WrapBridge is not responsible for the availability, accuracy, or terms of any third-party service.</p>

        <h2>12. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Platform for any unlawful purpose</li>
          <li>Attempt to circumvent payments outside the Platform to avoid WrapBridge's fee</li>
          <li>Post false, misleading, or defamatory reviews or content</li>
          <li>Impersonate any person or entity</li>
          <li>Attempt to gain unauthorized access to any part of the Platform</li>
          <li>Use automated tools to scrape, overload, or interfere with the Platform</li>
        </ul>

        <h2>13. Reviews and Content</h2>
        <p>By submitting reviews or other content, you grant WrapBridge a non-exclusive, royalty-free, worldwide license to display and use that content on the Platform. You represent that you have the right to submit the content and that it is truthful and not defamatory.</p>

        <h2>14. Termination</h2>
        <p>WrapBridge reserves the right to suspend or terminate your access to the Platform at any time, with or without notice, for any reason including violation of these Terms.</p>

        <h2>15. Intellectual Property</h2>
        <p>All content, trademarks, logos, and software on the Platform — including the WrapBridge name, logo, and code — are the property of WrapBridge or its licensors and are protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works from any Platform content without our prior written permission.</p>

        <h2>16. Dispute Resolution</h2>
        <h3>16.1 Informal Resolution</h3>
        <p>Before filing any formal claim, you agree to contact us at <a href="mailto:support@wrapbridge.com">support@wrapbridge.com</a> and attempt to resolve the dispute informally for at least 30 days.</p>
        <h3>16.2 Binding Arbitration</h3>
        <p>If the dispute is not resolved informally, <strong>you and WrapBridge agree to resolve any dispute, claim, or controversy arising out of or relating to these Terms or the Platform through binding individual arbitration</strong> administered by the American Arbitration Association ("AAA") under its Consumer Arbitration Rules. Arbitration will take place in the State of Georgia or, at your election, by phone or video conference. The arbitrator's decision will be final and binding.</p>
        <h3>16.3 Class Action Waiver</h3>
        <p><strong>YOU AND WRAPBRIDGE AGREE THAT EACH PARTY MAY ONLY BRING CLAIMS AGAINST THE OTHER IN AN INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.</strong> The arbitrator may not consolidate more than one person's claims and may not preside over any form of class or representative proceeding.</p>
        <h3>16.4 Exceptions</h3>
        <p>Either party may bring claims in small claims court if the claim qualifies. Either party may seek injunctive relief in any court of competent jurisdiction for intellectual property infringement or unauthorized access to the Platform.</p>

        <h2>17. Governing Law</h2>
        <p>These Terms are governed by the laws of the <strong>State of Georgia</strong>, without regard to conflict of law provisions.</p>

        <h2>18. Force Majeure</h2>
        <p>WrapBridge is not liable for any delay or failure to perform resulting from causes beyond our reasonable control, including but not limited to: natural disasters, war, terrorism, pandemics, power outages, internet or hosting provider failures, acts of government, or third-party service outages (including Stripe, Supabase, or Resend).</p>

        <h2>19. Severability</h2>
        <p>If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable.</p>

        <h2>20. Entire Agreement</h2>
        <p>These Terms, together with our <span onClick={() => nav("privacy")} style={{ color: "#FF4D00", cursor: "pointer" }}>Privacy Policy</span>, constitute the entire agreement between you and WrapBridge regarding your use of the Platform and supersede all prior agreements, representations, and understandings.</p>

        <h2>21. Changes to These Terms</h2>
        <p>WrapBridge may update these Terms at any time. We will notify you of material changes by posting the updated Terms on the Platform with a new "Last Updated" date. Continued use of the Platform after changes constitutes acceptance of the updated Terms.</p>

        <h2>22. Contact</h2>
        <p>For questions about these Terms, contact us at: <a href="mailto:support@wrapbridge.com">support@wrapbridge.com</a></p>

        <p style={{ marginTop: 60, color: "rgba(255,255,255,0.2)", fontSize: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
          © {new Date().getFullYear()} WrapBridge. All rights reserved. &nbsp;
          <span onClick={() => nav("privacy")} style={{ color: "#FF4D00", cursor: "pointer" }}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
