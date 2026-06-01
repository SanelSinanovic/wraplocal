export default function AccessibilityPage({ nav }) {
  return (
    <div style={{ background: "linear-gradient(180deg, #090909 0%, #110705 25%, #090909 60%, #05050C 100%)", minHeight: "100vh", color: "#fff", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes glow-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 0.8; } } @keyframes orb-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }`}</style>
      <div aria-hidden="true" style={{ position: "fixed", top: "-5%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,77,0,0.16) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 7s ease-in-out infinite", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "orb-drift 16s ease-in-out infinite", zIndex: 0 }} />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } h2 { font-family: 'Bebas Neue', cursive; font-size: 22px; letter-spacing: 2px; color: #FF4D00; margin: 40px 0 10px; } p, li { font-size: 15px; color: rgba(255,255,255,0.6); line-height: 1.8; } ul { padding-left: 20px; margin: 8px 0; } a { color: #FF8C33; text-decoration: none; } a:hover { text-decoration: underline; } @media (max-width: 768px) { .legal-header { padding: 14px 20px !important; } .legal-body { padding: 32px 20px 64px !important; } .legal-title { font-size: 34px !important; letter-spacing: 2px !important; } } @media (max-width: 420px) { .legal-header { padding: 12px 16px !important; } .legal-body { padding: 24px 14px 48px !important; } .legal-title { font-size: 28px !important; letter-spacing: 1px !important; } }`}</style>

      <div className="legal-header" style={{ background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 40px", display: "flex", alignItems: "center", gap: 32 }}>
        <button className="image-button" type="button" onClick={() => nav("landing")} aria-label="Go to WrapBridge home">
          <img src="/images/Logo.png" alt="" style={{ height: 64, display: "block" }} />
        </button>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>ACCESSIBILITY STATEMENT</span>
      </div>

      <div className="legal-body" style={{ maxWidth: 780, margin: "0 auto", padding: "60px 32px 100px", position: "relative", zIndex: 1 }}>
        <div className="legal-title" style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, letterSpacing: 3, marginBottom: 8 }}>ACCESSIBILITY STATEMENT</div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginBottom: 40 }}>Last Updated: June 1, 2026</p>

        <p>WrapBridge is committed to making its website and services accessible to as many people as possible. We design and maintain the Platform to support accessibility expectations under the Americans with Disabilities Act (ADA) and the Web Content Accessibility Guidelines (WCAG), with a goal of conforming to WCAG 2.1 Level AA.</p>

        <h2>Our Accessibility Commitment</h2>
        <p>We want customers, shop owners, and visitors to be able to discover shops, manage bookings, read policies, and contact us regardless of disability, assistive technology, device, or input method.</p>
        <p>Because WrapBridge is a growing platform with changing content and third-party integrations, accessibility is an ongoing effort. We review the site regularly and address issues when we find them or when users report them.</p>

        <h2>Standards We Aim To Support</h2>
        <ul>
          <li>WCAG 2.1 Level AA guidance for perceivable, operable, understandable, and robust web content</li>
          <li>Keyboard navigation for interactive controls and workflows</li>
          <li>Readable text contrast, visible focus states, and responsive layouts</li>
          <li>Labels, alt text, status messages, and semantic structure for assistive technologies</li>
          <li>Reduced-motion support where animation could affect comfort or usability</li>
        </ul>

        <h2>Known Limitations</h2>
        <p>Some pages may include third-party services, embedded tools, payment flows, maps, or user-uploaded content. We work to make these experiences accessible, but some behavior may depend on providers outside of WrapBridge's direct control.</p>

        <h2>Feedback And Assistance</h2>
        <p>If you have difficulty using any part of WrapBridge, or if you notice an accessibility issue, contact us and we will work with you to provide the information or service you need.</p>
        <p>Email: <a href="mailto:support@wrapbridge.com">support@wrapbridge.com</a></p>
        <p>Please include the page URL, a description of the issue, the device/browser you used, and any assistive technology involved if you are comfortable sharing it.</p>

        <h2>Response Time</h2>
        <p>We aim to review accessibility requests within 5 business days and prioritize fixes based on severity, user impact, and technical scope.</p>

        <p style={{ marginTop: 60, color: "rgba(255,255,255,0.2)", fontSize: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
          © {new Date().getFullYear()} WrapBridge. All rights reserved. &nbsp;
          <button className="link-button" type="button" onClick={() => nav("terms")} style={{ color: "#FF8C33", cursor: "pointer" }}>Terms of Service</button>
          <span aria-hidden="true"> &nbsp;|&nbsp; </span>
          <button className="link-button" type="button" onClick={() => nav("privacy")} style={{ color: "#FF8C33", cursor: "pointer" }}>Privacy Policy</button>
        </p>
      </div>
    </div>
  );
}