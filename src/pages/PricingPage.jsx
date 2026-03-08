export default function PricingPage({ nav }) {
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 14px 32px; font-family: 'Bebas Neue', cursive; font-size: 18px; letter-spacing: 2px; cursor: pointer; width: 100%; } .btn-main:hover { background: #FF6A20; } @media (max-width: 768px) { .pricing-nav { padding: 12px 16px !important; } .pricing-pad { padding: 40px 20px !important; } .pricing-grid { grid-template-columns: 1fr !important; } }`}</style>
      <nav className="pricing-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>WRAP<span style={{ color: "#fff" }}>LOCAL</span></div>
        <button style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "10px 20px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 2, cursor: "pointer" }} onClick={() => nav("company-login")}>Business Login</button>
      </nav>
      <div className="pricing-pad" style={{ maxWidth: 900, margin: "0 auto", padding: "80px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", letterSpacing: 3, marginBottom: 12 }}>FOR WRAP SHOP OWNERS</div>
        <div style={{ fontSize: 64, letterSpacing: 2, marginBottom: 20 }}>GROW YOUR BUSINESS</div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 500, margin: "0 auto 60px", lineHeight: 1.6 }}>Get listed on WrapLocal and reach thousands of local customers actively looking for wrap services.</p>

        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, textAlign: "left", maxWidth: 700, margin: "0 auto 60px" }}>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", padding: "36px 32px" }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 12 }}>MONTHLY LISTING</div>
            <div style={{ fontSize: 56, color: "#FF4D00", marginBottom: 4 }}>$49<span style={{ fontSize: 24 }}>.99</span></div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>per month + 7% per booking</div>
            {["Listed in search results", "Business profile page", "Online appointment booking", "Customer reviews & ratings", "Analytics dashboard", "Payout within 48 hours"].map(f => (
              <div key={f} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 10, display: "flex", gap: 8 }}>
                <span style={{ color: "#FF4D00" }}>✓</span>{f}
              </div>
            ))}
            <button className="btn-main" style={{ marginTop: 28 }} onClick={() => nav("company-dash")}>Start 14-Day Free Trial</button>
          </div>

          <div style={{ background: "linear-gradient(135deg, rgba(255,77,0,0.1), rgba(255,140,0,0.05))", border: "1px solid rgba(255,77,0,0.3)", padding: "36px 32px", position: "relative" }}>
            <div style={{ position: "absolute", top: -12, right: 20, background: "#FF4D00", padding: "4px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2 }}>POPULAR</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 12 }}>ANNUAL LISTING</div>
            <div style={{ fontSize: 56, color: "#FF4D00", marginBottom: 4 }}>$39<span style={{ fontSize: 24 }}>.99</span></div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>per month (billed $479.88/yr) + 7% per booking</div>
            {["Everything in Monthly", "Priority placement in search", "Featured shop badge", "Promotional highlights", "Dedicated account support", "Advanced analytics"].map(f => (
              <div key={f} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 10, display: "flex", gap: 8 }}>
                <span style={{ color: "#FF4D00" }}>✓</span>{f}
              </div>
            ))}
            <button className="btn-main" style={{ marginTop: 28 }} onClick={() => nav("company-dash")}>Get Annual Plan</button>
          </div>
        </div>

        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
          Questions? Email <span style={{ color: "#FF4D00" }}>partners@wraplocal.com</span>
        </div>
      </div>
    </div>
  );
}
