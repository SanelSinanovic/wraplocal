export default function PricingPage({ nav, currentUser, currentProfile }) {
  const role = currentUser ? (currentProfile?.role || currentUser?.user_metadata?.role) : null;
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } @keyframes glowPulse { 0%,100% { opacity: 0.05; } 50% { opacity: 0.12; } } .pricing-hero { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; } .pricing-card-1 { animation: fadeUp 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both; } .pricing-card-2 { animation: fadeUp 0.5s 0.2s cubic-bezier(0.22,1,0.36,1) both; } .pricing-footer { animation: fadeUp 0.5s 0.3s cubic-bezier(0.22,1,0.36,1) both; } .price-card { transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; } .price-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.4); } .price-card.featured:hover { box-shadow: 0 16px 48px rgba(255,77,0,0.18); } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 14px 32px; font-family: 'Bebas Neue', cursive; font-size: 18px; letter-spacing: 2px; cursor: pointer; width: 100%; transition: background 0.2s, transform 0.15s; } .btn-main:hover { background: #FF6A20; transform: translateY(-1px); } .feat-item { font-family: 'DM Sans', sans-serif; font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 10px; display: flex; gap: 10px; align-items: flex-start; transition: color 0.15s; } .feat-item:hover { color: rgba(255,255,255,0.85); } @media (max-width: 768px) { .pricing-nav { padding: 12px 16px !important; } .pricing-pad { padding: 40px 20px !important; } .pricing-grid { grid-template-columns: 1fr !important; } }`}</style>
      <nav className="pricing-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 68, display: "block", cursor: "pointer" }} onClick={() => nav("landing")} />
        {currentUser ? (
          <button style={{ background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)", padding: "10px 20px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 2, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#FF4D00"; e.currentTarget.style.color = "#FF4D00"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }} onClick={() => nav(role === "company" ? "company-dash" : "customer-dash")}>{role === "company" ? "My Dashboard" : "My Bookings"}</button>
        ) : (
          <button style={{ background: "transparent", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)", padding: "10px 20px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 2, cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#FF4D00"; e.currentTarget.style.color = "#FF4D00"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }} onClick={() => nav("company-login")}>Business Login</button>
        )}
      </nav>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "0", left: "50%", transform: "translateX(-50%)", width: 800, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,77,0,0.07) 0%, transparent 70%)", pointerEvents: "none", animation: "glowPulse 4s ease-in-out infinite" }} />
        <div className="pricing-pad" style={{ maxWidth: 900, margin: "0 auto", padding: "80px 40px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div className="pricing-hero">
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#FF4D00", letterSpacing: 3, marginBottom: 16, textTransform: "uppercase" }}>For Wrap Shop Owners</div>
            <div style={{ fontSize: 64, letterSpacing: 2, marginBottom: 20 }}>GROW YOUR BUSINESS</div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 500, margin: "0 auto 60px", lineHeight: 1.7 }}>Get listed on WrapBridge and reach thousands of local customers actively looking for wrap services.</p>
          </div>

          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, textAlign: "left", maxWidth: 700, margin: "0 auto 60px" }}>
            <div className="price-card pricing-card-1" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", padding: "36px 32px" }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>Launch Plan</div>
              <div style={{ fontSize: 56, color: "#fff", marginBottom: 4 }}>FREE</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 28 }}>during launch + 7% per booking</div>
              {["Listed in search results", "Business profile page", "Online appointment booking", "Customer reviews & ratings", "Analytics dashboard", "Payout within 48 hours"].map(f => (
                <div key={f} className="feat-item">
                  <span style={{ color: "#FF4D00", flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                </div>
              ))}
              <button className="btn-main" style={{ marginTop: 28, background: "transparent", border: "1px solid rgba(255,77,0,0.4)", color: "#FF4D00" }} onMouseEnter={e => { e.currentTarget.style.background = "#FF4D00"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#FF4D00"; }} onClick={() => nav("company-dash")}>Get Listed Free →</button>
            </div>

            <div className="price-card featured pricing-card-2" style={{ background: "linear-gradient(135deg, rgba(255,77,0,0.1) 0%, rgba(255,140,0,0.04) 60%, #111 100%)", border: "1px solid rgba(255,77,0,0.3)", padding: "36px 32px", position: "relative" }}>
              <div style={{ position: "absolute", top: -12, right: 20, background: "#FF4D00", padding: "4px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>Limited Time</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,160,80,0.6)", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>Early Access</div>
              <div style={{ fontSize: 56, color: "#fff", marginBottom: 4 }}>FREE</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,200,100,0.45)", marginBottom: 28 }}>no monthly fee · just 7% per booking</div>
              {["Everything in Launch Plan", "Priority placement in search", "Featured shop badge", "Promotional highlights", "Dedicated account support", "Advanced analytics"].map(f => (
                <div key={f} className="feat-item" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <span style={{ color: "#FF4D00", flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                </div>
              ))}
              <button className="btn-main" style={{ marginTop: 28 }} onClick={() => nav("company-dash")}>Claim Early Access →</button>
            </div>
          </div>

          <div className="pricing-footer" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)" }}>
            Questions? Email <span style={{ color: "#FF4D00", cursor: "pointer" }}>partners@wrapbridge.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
