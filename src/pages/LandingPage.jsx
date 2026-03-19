import { useState, useEffect } from "react";
import { SHOPS as STATIC_SHOPS } from "../data/data";
import { SERVICE_CATEGORIES } from "../lib/services";

const CATEGORY_META = {
  "Vehicle Wraps": {
    icon: "🚗",
    accent: "#FF4D00",
    bg: "rgba(255,77,0,0.06)",
    border: "rgba(255,77,0,0.2)",
    desc: "Full wraps, color changes, PPF, and custom vinyl graphics for any vehicle.",
  },
  "Signage": {
    icon: "🪟",
    accent: "#3B82F6",
    bg: "rgba(59,130,246,0.06)",
    border: "rgba(59,130,246,0.2)",
    desc: "Monument signs, LED displays, banners, and window graphics for your business.",
  },
};

export default function LandingPage({ nav, shops: liveShops, setBookingShop, setSelectedShop, setServiceFilter, currentUser, currentProfile, onLogout }) {
  const role = currentUser ? (currentProfile?.role || currentUser?.user_metadata?.role || "customer") : null;
  const firstName = currentUser ? ((currentProfile?.name || currentUser?.user_metadata?.name || currentUser?.email || "").split(" ")[0].split("@")[0]) : null;
  const shops = liveShops && liveShops.length > 0 ? liveShops : STATIC_SHOPS;
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredService, setHoveredService] = useState(null);

  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const goToService = (serviceName) => {
    setServiceFilter(serviceName);
    nav("search");
  };

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive, sans-serif", background: "#0A0A0A", minHeight: "100vh", color: "#fff", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        .btn-main { background: #FF4D00; color: #fff; border: none; padding: 14px 32px; font-family: 'Bebas Neue', cursive; font-size: 18px; letter-spacing: 2px; cursor: pointer; clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%); transition: all 0.2s; }
        .btn-main:hover { background: #FF6A20; transform: translateY(-1px); }
        .btn-ghost { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 12px 28px; font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #FF4D00; color: #FF4D00; }
        .nav-link { color: rgba(255,255,255,0.6); text-decoration: none; font-family: 'DM Sans', sans-serif; font-size: 14px; cursor: pointer; transition: color 0.2s; }
        .nav-link:hover { color: #fff; }
        .card-hover { transition: transform 0.3s, box-shadow 0.3s; cursor: pointer; }
        .card-hover:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(255,77,0,0.2); }
        .svc-pill { font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 8px 16px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.18s; display: flex; align-items: center; gap: 6px; }
        .svc-pill:hover { color: #fff; border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.07); transform: translateX(3px); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(44px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse-dot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.6; } }
        .hero-badge { animation: fadeInDown 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .hero-title { animation: fadeInUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
        .hero-sub { animation: fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
        .hero-cta { animation: fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.42s both; }
        .hero-stats { animation: fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.56s both; }
        .hero-card { animation: slideInRight 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .hero-notif-1 { animation: slideInRight 0.55s cubic-bezier(0.22,1,0.36,1) 0.65s both; }
        .hero-notif-2 { animation: slideInRight 0.55s cubic-bezier(0.22,1,0.36,1) 0.82s both; }
        .live-dot { animation: pulse-dot 1.8s ease-in-out infinite; }
        .reveal { opacity: 0; transform: translateY(38px); transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1); }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-stagger > * { opacity: 0; transform: translateY(36px); transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1); }
        .reveal-stagger.visible > *:nth-child(1) { opacity: 1; transform: translateY(0); transition-delay: 0s; }
        .reveal-stagger.visible > *:nth-child(2) { opacity: 1; transform: translateY(0); transition-delay: 0.12s; }
        .reveal-stagger.visible > *:nth-child(3) { opacity: 1; transform: translateY(0); transition-delay: 0.24s; }
        .reveal-stagger.visible > *:nth-child(4) { opacity: 1; transform: translateY(0); transition-delay: 0.36s; }
        .stat-num { display: inline-block; transition: color 0.3s; }
        .stat-num:hover { color: #FF6A20; }
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 4px; }
        .mobile-menu { display: none; }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-btns { display: none !important; }
          .hamburger { display: flex; flex-direction: column; gap: 5px; }
          .mobile-menu { display: flex; flex-direction: column; background: rgba(10,10,10,0.98); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 12px 20px 20px; gap: 4px; }
          .mobile-menu span { font-family: 'DM Sans', sans-serif; font-size: 15px; color: rgba(255,255,255,0.7); cursor: pointer; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: block; }
          .mobile-menu .mob-btn { margin-top: 12px; background: #FF4D00; color: #fff; border: none; padding: 14px; font-family: 'Bebas Neue', cursive; font-size: 17px; letter-spacing: 2px; cursor: pointer; width: 100%; }
          .mobile-menu .mob-btn-ghost { margin-top: 8px; background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.2); padding: 12px; font-family: 'Bebas Neue', cursive; font-size: 15px; letter-spacing: 2px; cursor: pointer; width: 100%; }
          .hero-section { padding: 60px 20px 40px !important; }
          .hero-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .hero-right { display: none !important; }
          .stats-row { gap: 28px !important; }
          .section-pad { padding: 40px 20px !important; }
          .services-grid { grid-template-columns: 1fr !important; }
          .shops-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .biz-cta { flex-direction: column !important; gap: 20px !important; margin: 0 20px 60px !important; padding: 36px 24px !important; }
          .nav-pad { padding: 16px 20px !important; }
          .shops-header { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 60px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)", zIndex: 100 }}>
        <div style={{ fontSize: 28, letterSpacing: 4, color: "#FF4D00" }}>WRAP<span style={{ color: "#fff" }}>LOCAL</span></div>
        <div className="nav-links" style={{ display: "flex", gap: 32 }}>
          <span className="nav-link" onClick={() => nav("search")}>Find Shops</span>
          <span className="nav-link" onClick={() => nav("pricing")}>For Businesses</span>
          {role !== "company" && (
            <span className="nav-link" onClick={() => nav(currentUser ? "customer-dash" : "customer-login")}>My Bookings</span>
          )}
        </div>
        <div className="nav-btns" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {currentUser ? (
            <>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>👤 {firstName}</span>
              <button className="btn-ghost" onClick={() => nav(role === "company" ? "company-dash" : "customer-dash")}>{role === "company" ? "Dashboard" : "My Bookings"}</button>
              <button className="btn-ghost" style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)" }} onClick={onLogout}>Sign Out</button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => nav("customer-login")}>Customer Login</button>
              <button className="btn-ghost" onClick={() => nav("company-login")}>Business Login</button>
              <button className="btn-main" onClick={() => nav("search")}>Find a Shop</button>
            </>
          )}
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="2" y1="2" x2="20" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="20" y1="2" x2="2" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          ) : (
            <><span style={{ display: "block", width: 22, height: 2, background: "#fff", borderRadius: 2 }} /><span style={{ display: "block", width: 16, height: 2, background: "rgba(255,255,255,0.5)", borderRadius: 2 }} /><span style={{ display: "block", width: 22, height: 2, background: "#fff", borderRadius: 2 }} /></>
          )}
        </button>
      </nav>
      {menuOpen && (
        <div className="mobile-menu">
          <span onClick={() => { nav("search"); setMenuOpen(false); }}>Find Shops</span>
          <span onClick={() => { nav("pricing"); setMenuOpen(false); }}>For Businesses</span>
          {role !== "company" && (
            <span onClick={() => { nav(currentUser ? "customer-dash" : "customer-login"); setMenuOpen(false); }}>My Bookings</span>
          )}
          {currentUser ? (
            <>
              <button className="mob-btn" onClick={() => { nav(role === "company" ? "company-dash" : "customer-dash"); setMenuOpen(false); }}>{role === "company" ? "My Dashboard →" : "My Bookings →"}</button>
              <button className="mob-btn-ghost" onClick={() => { onLogout(); setMenuOpen(false); }}>Sign Out</button>
            </>
          ) : (
            <>
              <button className="mob-btn" onClick={() => { nav("search"); setMenuOpen(false); }}>Find a Shop →</button>
              <button className="mob-btn-ghost" onClick={() => { nav("customer-login"); setMenuOpen(false); }}>Customer Login</button>
              <button className="mob-btn-ghost" onClick={() => { nav("company-login"); setMenuOpen(false); }}>Business Login</button>
            </>
          )}
        </div>
      )}

      {/* HERO */}
      <div className="hero-section" style={{ position: "relative", padding: "100px 60px 80px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 60% 50%, rgba(255,77,0,0.13) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, border: "1px solid rgba(255,77,0,0.08)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, border: "1px solid rgba(255,77,0,0.06)", borderRadius: "50%", pointerEvents: "none" }} />

        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", position: "relative" }}>
          <div>
            <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "6px 16px", marginBottom: 24, fontFamily: "'DM Sans', sans-serif", fontSize: 12, letterSpacing: 2, color: "#FF4D00" }}>
              🔥 VEHICLE WRAPS · SIGNAGE · AND MORE
            </div>
            <h1 className="hero-title" style={{ fontSize: "clamp(54px, 6vw, 96px)", lineHeight: 0.95, letterSpacing: 3, marginBottom: 24 }}>
              YOUR<br />VISION.<br />
              <span style={{ color: "#FF4D00", position: "relative" }}>
                BUILT BOLD.
                <div style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 3, background: "#FF4D00" }} />
              </span>
            </h1>
            <p className="hero-sub" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 480, lineHeight: 1.65, marginTop: 20, marginBottom: 40, fontWeight: 300 }}>
              Find and book top-rated local shops for vehicle wraps, monument signs, LED displays, window graphics, banners, and more — all in one place.
            </p>
            <div className="hero-cta" style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button className="btn-main" style={{ fontSize: 20, padding: "16px 40px" }} onClick={() => nav("search")}>Find Shops Near Me →</button>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No account needed</span>
            </div>
            <div className="hero-stats stats-row" style={{ display: "flex", gap: 48, marginTop: 64 }}>
              {[["500+", "Shops Listed"], ["12K+", "Jobs Completed"], ["4.8★", "Avg Rating"]].map(([n, l]) => (
                <div key={l}>
                  <div className="stat-num" style={{ fontSize: 40, color: "#FF4D00" }}>{n}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-right hero-card" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 340, height: 340, background: "radial-gradient(circle, rgba(255,77,0,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", position: "relative", zIndex: 1 }}>
              <div style={{ position: "relative", height: 180, overflow: "hidden" }}>
                <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80" alt="shop" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }} />
                <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(10,10,10,0.7)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", padding: "4px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />Available Today
                </div>
                <div style={{ position: "absolute", top: 12, right: 12, background: "#FF4D00", padding: "3px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700 }}>FEATURED</div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ fontSize: 22, letterSpacing: 1 }}>Chrome Kings Wraps</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF4D00", fontWeight: 700 }}>★ 4.9</div>
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>Atlanta, GA · 2.1 mi · 214 reviews</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
                  {["Full Color Change Wrap", "PPF Paint Protection Film", "Monument Signs"].map(t => (
                    <span key={t} style={{ padding: "3px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>Starting from</div>
                    <div style={{ fontSize: 28, color: "#fff", letterSpacing: 1 }}>$1,200</div>
                  </div>
                  <button onClick={() => { setBookingShop(shops[0]); nav("booking"); }} style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "10px 22px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2, cursor: "pointer" }}>Book Now</button>
                </div>
              </div>
            </div>
            <div className="hero-notif-1" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>J</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#fff" }}><b>Jordan M.</b> just booked <span style={{ color: "#FF4D00" }}>Phantom Wraps Studio</span></div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Full Color Change · Alpharetta, GA · 2 min ago</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div className="live-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#10B981" }}>LIVE</div>
              </div>
            </div>
            <div className="hero-notif-2" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>A</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#fff" }}><b>Aisha R.</b> left a <span style={{ color: "#FF4D00" }}>5-star review</span> for Chrome Kings</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>★★★★★ · "Absolutely perfect wrap!" · 8 min ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BROWSE BY SERVICE */}
      <div className="section-pad" style={{ padding: "70px 60px", background: "#0D0D0D", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="reveal" style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", letterSpacing: 3, marginBottom: 10 }}>WHAT ARE YOU LOOKING FOR?</div>
          <div style={{ fontSize: 48, letterSpacing: 2 }}>BROWSE BY SERVICE</div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)", marginTop: 12, lineHeight: 1.6 }}>
            Click any service to instantly find shops near you that offer it.
          </p>
        </div>
        <div className="services-grid reveal reveal-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          {SERVICE_CATEGORIES.map(({ category, services }) => {
            const meta = CATEGORY_META[category] || { icon: "⚙️", accent: "#FF4D00", bg: "rgba(255,77,0,0.06)", border: "rgba(255,77,0,0.2)", desc: "" };
            return (
              <div key={category} style={{ background: "#111", border: `1px solid ${meta.border}`, overflow: "hidden" }}>
                {/* Category header */}
                <div style={{ background: meta.bg, borderBottom: `1px solid ${meta.border}`, padding: "22px 28px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 32 }}>{meta.icon}</div>
                  <div>
                    <div style={{ fontSize: 28, letterSpacing: 2, color: meta.accent }}>{category.toUpperCase()}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{meta.desc}</div>
                  </div>
                </div>
                {/* Service pills */}
                <div style={{ padding: "20px 28px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {services.map(({ name, description }) => (
                    <button
                      key={name}
                      className="svc-pill"
                      onMouseEnter={() => setHoveredService(name)}
                      onMouseLeave={() => setHoveredService(null)}
                      onClick={() => goToService(name)}
                      style={{ textAlign: "left", background: hoveredService === name ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)", borderColor: hoveredService === name ? meta.accent : "rgba(255,255,255,0.08)", color: hoveredService === name ? "#fff" : "rgba(255,255,255,0.6)" }}
                    >
                      <span style={{ flex: 1, fontSize: 14 }}>{name}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.28)", marginLeft: "auto", paddingLeft: 12 }}>{description}</span>
                      <span style={{ color: meta.accent, fontSize: 14, marginLeft: 8, flexShrink: 0 }}>→</span>
                    </button>
                  ))}
                  <button
                    onClick={() => nav("search")}
                    style={{ marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: meta.accent, background: "none", border: `1px solid ${meta.border}`, padding: "8px 16px", cursor: "pointer", letterSpacing: 1, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = meta.bg; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                  >
                    BROWSE ALL {category.toUpperCase()} SHOPS →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FEATURED SHOPS */}
      <div className="section-pad" style={{ padding: "70px 60px 80px" }}>
        <div className="reveal shops-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", letterSpacing: 3, marginBottom: 8 }}>FEATURED NEAR YOU</div>
            <div style={{ fontSize: 42, letterSpacing: 2 }}>TOP RATED SHOPS</div>
          </div>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", cursor: "pointer" }} onClick={() => nav("search")}>View all →</span>
        </div>
        <div className="shops-grid reveal reveal-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {shops.slice(0, 3).map(shop => (
            <div key={shop.id} className="card-hover" onClick={() => { setSelectedShop(shop); nav("shop"); }}
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
                <img src={shop.image || shop.banner_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80'} alt={shop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }} />
                {shop.availability && <div style={{ position: "absolute", top: 12, right: 12, background: shop.color || '#FF4D00', padding: "3px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600 }}>{shop.availability}</div>}
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 22, letterSpacing: 1 }}>{shop.name}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF4D00", fontWeight: 600 }}>★ {shop.rating}</div>
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                  {shop.location || shop.city}{shop.distance ? ` · ${shop.distance}` : ''} · {shop.reviews ?? shop.review_count ?? 0} reviews
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {(shop.tags || []).slice(0, 3).map(t => <span key={t} style={{ padding: "3px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{t}</span>)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>From <b style={{ color: "#fff" }}>${(shop.price ?? shop.price_from ?? 0).toLocaleString()}</b></span>
                  <button className="btn-main" style={{ fontSize: 13, padding: "8px 18px" }} onClick={(e) => { e.stopPropagation(); setBookingShop(shop); nav("booking"); }}>Book Now</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="section-pad" style={{ padding: "70px 60px 100px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0D0D0D" }}>
        <div className="reveal" style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", letterSpacing: 3, marginBottom: 8 }}>SIMPLE PROCESS</div>
          <div style={{ fontSize: 48, letterSpacing: 2 }}>HOW IT WORKS</div>
        </div>
        <div className="steps-grid reveal reveal-stagger" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            { n: "01", t: "Pick Your Service", d: "Browse Vehicle Wraps, Signage, and more. Choose exactly what you need and filter shops that offer it." },
            { n: "02", t: "Book Instantly", d: "Select your shop, choose a time slot, describe your project, and submit your request in under 2 minutes." },
            { n: "03", t: "Get a Quote & Confirm", d: "The shop reviews your request and sends a quote. Accept it to lock in your booking and get the job done." },
          ].map(s => (
            <div key={s.n} style={{ padding: "40px", border: "1px solid rgba(255,255,255,0.06)", background: "#111", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -10, fontSize: 120, color: "rgba(255,77,0,0.04)", fontFamily: "'Bebas Neue', cursive" }}>{s.n}</div>
              <div style={{ fontSize: 56, color: "#FF4D00", marginBottom: 16 }}>{s.n}</div>
              <div style={{ fontSize: 26, letterSpacing: 1, marginBottom: 12 }}>{s.t}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FOR BUSINESSES CTA */}
      <div className="biz-cta reveal" style={{ margin: "0 60px 80px", background: "linear-gradient(135deg, #FF4D00 0%, #FF8C00 100%)", padding: "60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 48, letterSpacing: 2, marginBottom: 12 }}>OWN A WRAP OR SIGN SHOP?</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, maxWidth: 520 }}>
            List your business for $49.99/month. Set your services, get discovered by local customers, and manage all your bookings and quotes in one place.
          </div>
        </div>
        <button onClick={() => nav("pricing")} style={{ background: "#fff", color: "#FF4D00", border: "none", padding: "16px 40px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 2, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          Get Listed →
        </button>
      </div>
    </div>
  );
}
