import { useState, useEffect, useRef } from "react";
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
  const [activeSlide, setActiveSlide] = useState(0);
  const [counts, setCounts] = useState({ shops: 0, jobs: 0, rating: 0.0 });
  const statsRef = useRef(null);
  const countsDone = useRef(false);

  const SLIDES = [
    { label: "Full Color Change Wrap", category: "Vehicle Wraps", accent: "#FF4D00", img: "/images/color-change-wrap.jpg" },
    { label: "Monument Signs", category: "Signage", accent: "#3B82F6", img: "/images/Monument-Sign.png" },
    { label: "Channel Letters", category: "Signage", accent: "#3B82F6", img: "/images/Channel-Letters.png" },
    { label: "PPF Paint Protection Film", category: "Vehicle Wraps", accent: "#FF4D00", img: "/images/PPF.png" },
    { label: "LED Signs", category: "Signage", accent: "#3B82F6", img: "/images/LED.png" },
    { label: "Custom Design Wrap", category: "Vehicle Wraps", accent: "#FF4D00", img: "/images/Custom-Design.png" },
    { label: "Window Graphics", category: "Signage", accent: "#3B82F6", img: "/images/Window-Graphics.png" },
    { label: "Window Tinting", category: "Signage", accent: "#3B82F6", img: "/images/Window-Tint.png" },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveSlide(s => (s + 1) % SLIDES.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Count-up animation for hero stats
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !countsDone.current) {
        countsDone.current = true;
        const start = Date.now();
        const duration = 1600;
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setCounts({
            shops: Math.floor(ease * 500),
            jobs: Math.floor(ease * 12000),
            rating: (ease * 4.8).toFixed(1),
          });
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes float-card { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes mesh-move { 0%,100% { opacity: 0.04; transform: scale(1) rotate(0deg); } 50% { opacity: 0.07; transform: scale(1.05) rotate(1deg); } }
        @keyframes glow-breathe { 0%,100% { opacity: 0.12; transform: scale(1); } 50% { opacity: 0.22; transform: scale(1.08); } }
        @keyframes shimmer-slide { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes spin-ring { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes beam-sweep { 0% { transform: translateX(-100%) skewX(-20deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateX(400%) skewX(-20deg); opacity: 0; } }
        .ticker-wrap { overflow: hidden; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); background: #0D0D0D; padding: 10px 0; }
        .ticker-track { display: flex; width: max-content; animation: ticker 28s linear infinite; }
        .ticker-item { fontFamily: "'DM Sans', sans-serif"; font-size: 12px; letter-spacing: 3px; color: #FF4D00; white-space: nowrap; padding: 0 32px; display: flex; align-items: center; gap: 12px; }
        .ticker-dot { width: 4px; height: 4px; border-radius: 50%; background: #FF4D00; display: inline-block; }
        .notif-float-1 { animation: slideInRight 0.55s cubic-bezier(0.22,1,0.36,1) 0.65s both, float-card 4s ease-in-out 1.2s infinite; }
        .notif-float-2 { animation: slideInRight 0.55s cubic-bezier(0.22,1,0.36,1) 0.82s both, float-card 5s ease-in-out 1.5s infinite; }
        .shimmer-text { background: linear-gradient(90deg, #fff 0%, #fff 40%, #FF6A20 50%, #fff 60%, #fff 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer-slide 3s linear 1.5s infinite; }
        .step-card { position: relative; overflow: hidden; transition: transform 0.3s, border-color 0.3s; }
        .step-card:hover { transform: translateY(-4px); border-color: rgba(255,77,0,0.3) !important; }
        .step-card::after { content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent); animation: beam-sweep 4s ease-in-out infinite; }
        .hero-badge { animation: fadeInDown 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .hero-title { animation: fadeInUp 0.65s cubic-bezier(0.22,1,0.36,1) 0.12s both; }
        .hero-sub { animation: fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
        .hero-cta { animation: fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.42s both; }
        .hero-stats { animation: fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.56s both; }
        .hero-card { animation: slideInRight 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .hero-notif-1 { animation: slideInRight 0.55s cubic-bezier(0.22,1,0.36,1) 0.65s both; }
        .hero-notif-2 { animation: slideInRight 0.55s cubic-bezier(0.22,1,0.36,1) 0.82s both; }
        .live-dot { animation: pulse-dot 1.8s ease-in-out infinite; }
        @keyframes imgFade { 0% { opacity: 0; transform: scale(1.04); } 15% { opacity: 1; transform: scale(1); } 88% { opacity: 1; transform: scale(1.02); } 100% { opacity: 0; transform: scale(1.04); } }
        .slide-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.9s ease; transform: scale(1.03); }
        .slide-img.active { opacity: 1; transform: scale(1); transition: opacity 0.9s ease, transform 6s ease; }
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
          .hero-cta { flex-wrap: wrap !important; gap: 12px !important; }
          .stat-num { font-size: 28px !important; min-width: 52px !important; }
          .svc-pill span:nth-child(2) { display: none !important; }
          .biz-cta { margin-left: 0 !important; margin-right: 0 !important; }
          .hero-badge { font-size: 10px !important; letter-spacing: 1px !important; padding: 5px 12px !important; }
          .steps-grid { gap: 12px !important; }
          .step-card { padding: 28px 20px !important; }
        }
        @media (max-width: 420px) {
          .hero-section { padding: 40px 16px 28px !important; }
          .section-pad { padding: 28px 16px !important; }
          .biz-cta { padding: 28px 20px !important; flex-direction: column !important; gap: 16px !important; }
          .stats-row { flex-wrap: wrap !important; gap: 20px !important; }
          .shops-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 60px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)", zIndex: 100 }}>
        <div style={{ fontSize: 28, letterSpacing: 4, color: "#FF4D00" }}>WRAP<span style={{ color: "#fff" }}>BRIDGE</span></div>
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

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-track">
          {["Vehicle Wraps","Color Change","PPF","Monument Signs","Channel Letters","LED Displays","Window Graphics","Window Tinting","Fleet Wraps","Banners","Boat Wraps","Custom Designs","Vinyl Graphics","Vehicle Wraps","Color Change","PPF","Monument Signs","Channel Letters","LED Displays","Window Graphics","Window Tinting","Fleet Wraps","Banners","Boat Wraps","Custom Designs","Vinyl Graphics"].map((s, i) => (
            <span key={i} className="ticker-item" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 3, color: "#FF4D00", whiteSpace: "nowrap", padding: "0 28px", display: "flex", alignItems: "center", gap: 16, textTransform: "uppercase" }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: i % 4 === 0 ? "#FF4D00" : "rgba(255,255,255,0.15)", display: "inline-block", flexShrink: 0 }} />
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <div className="hero-section" style={{ position: "relative", padding: "100px 60px 80px", overflow: "hidden" }}>
        {/* Animated glow orb */}
        <div style={{ position: "absolute", top: "10%", right: "5%", width: 700, height: 700, background: "radial-gradient(circle, rgba(255,77,0,0.18) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 5s ease-in-out infinite" }} />
        {/* Animated mesh grid */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", animation: "mesh-move 8s ease-in-out infinite", backgroundImage: "linear-gradient(rgba(255,77,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,77,0,0.05) 1px, transparent 1px)", backgroundSize: "60px 60px", maskImage: "radial-gradient(ellipse at 70% 50%, black 30%, transparent 70%)" }} />
        {/* Spinning ring */}
        <div style={{ position: "absolute", top: -250, right: -250, width: 700, height: 700, border: "1px solid rgba(255,77,0,0.07)", borderRadius: "50%", pointerEvents: "none", animation: "spin-ring 40s linear infinite" }} />
        <div style={{ position: "absolute", top: -120, right: -120, width: 440, height: 440, border: "1px solid rgba(255,77,0,0.05)", borderRadius: "50%", pointerEvents: "none", animation: "spin-ring 28s linear infinite reverse" }} />

        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", position: "relative" }}>
          <div>
            <div className="hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "6px 16px", marginBottom: 24, fontFamily: "'DM Sans', sans-serif", fontSize: 12, letterSpacing: 2, color: "#FF4D00" }}>
              🔥 VEHICLE WRAPS · SIGNAGE · AND MORE
            </div>
            <h1 className="hero-title" style={{ fontSize: "clamp(54px, 6vw, 96px)", lineHeight: 0.95, letterSpacing: 3, marginBottom: 24 }}>
              YOUR<br />VISION.<br />
              <span className="shimmer-text" style={{ position: "relative" }}>
                BUILT BOLD.
                <div style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #FF4D00, #FF8C00, #FF4D00)", backgroundSize: "200% auto", animation: "shimmer-slide 2s linear infinite" }} />
              </span>
            </h1>
            <p className="hero-sub" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 480, lineHeight: 1.65, marginTop: 20, marginBottom: 40, fontWeight: 300 }}>
              Find and book top-rated local shops for vehicle wraps, monument signs, LED displays, window graphics, banners, and more — all in one place.
            </p>
            <div className="hero-cta" style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button className="btn-main" style={{ fontSize: 20, padding: "16px 40px" }} onClick={() => nav("search")}>Find Shops Near Me →</button>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No account needed</span>
            </div>
            <div ref={statsRef} className="hero-stats stats-row" style={{ display: "flex", gap: 48, marginTop: 64 }}>
              {[
                [counts.shops > 0 ? counts.shops + "+" : "0", "Shops Listed"],
                [counts.jobs > 0 ? (counts.jobs >= 1000 ? Math.floor(counts.jobs/1000) + "K+" : counts.jobs + "+") : "0", "Jobs Completed"],
                [counts.rating > 0 ? counts.rating + "★" : "0★", "Avg Rating"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="stat-num" style={{ fontSize: 40, color: "#FF4D00", fontVariantNumeric: "tabular-nums", minWidth: 80, display: "inline-block" }}>{n}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-right hero-card" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* ── ROTATING SERVICE GALLERY ── */}
            <div style={{ position: "relative", height: 420, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)", zIndex: 1 }}>
              {/* Images — all stacked, active one fades in */}
              {SLIDES.map((slide, i) => (
                <img
                  key={slide.label}
                  src={slide.img}
                  alt={slide.label}
                  className={`slide-img${i === activeSlide ? " active" : ""}`}
                />
              ))}

              {/* Dark gradient overlay */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.15) 100%)", zIndex: 2 }} />

              {/* Category badge top-left */}
              <div style={{ position: "absolute", top: 16, left: 16, zIndex: 3 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.6)", border: `1px solid ${SLIDES[activeSlide].accent}44`, backdropFilter: "blur(8px)", padding: "5px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2, color: SLIDES[activeSlide].accent, transition: "color 0.6s" }}>
                  {SLIDES[activeSlide].category === "Vehicle Wraps" ? "🚗" : "🪟"} {SLIDES[activeSlide].category.toUpperCase()}
                </div>
              </div>

              {/* Book button top-right */}
              <button onClick={() => nav("search")} style={{ position: "absolute", top: 16, right: 16, zIndex: 3, background: "rgba(255,77,0,0.9)", color: "#fff", border: "none", padding: "7px 16px", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 2, cursor: "pointer" }}>BOOK →</button>

              {/* Service label bottom */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 22px", zIndex: 3 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: 2, marginBottom: 6 }}>NOW BOOKING</div>
                <div style={{ fontSize: 32, letterSpacing: 2, lineHeight: 1, marginBottom: 14, transition: "opacity 0.4s" }}>{SLIDES[activeSlide].label.toUpperCase()}</div>

                {/* Dot indicators */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSlide(i)}
                      style={{ width: i === activeSlide ? 22 : 6, height: 6, borderRadius: 3, border: "none", cursor: "pointer", background: i === activeSlide ? SLIDES[activeSlide].accent : "rgba(255,255,255,0.25)", transition: "all 0.35s", padding: 0 }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="notif-float-1" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 1 }}>
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
            <div className="notif-float-2" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 1 }}>
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
            <div key={s.n} className="step-card" style={{ padding: "40px", border: "1px solid rgba(255,255,255,0.06)", background: "#111", position: "relative", overflow: "hidden" }}>
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

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 60px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 4 }}>
          <span style={{ color: "#FF4D00" }}>KI</span><span style={{ color: "rgba(255,255,255,0.5)" }}>DOR</span>
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <span onClick={() => nav("terms")} style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color="#FF4D00"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.3)"}>Terms of Service</span>
          <span onClick={() => nav("privacy")} style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color="#FF4D00"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.3)"}>Privacy Policy</span>
          <span onClick={() => nav("pricing")} style={{ cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color="#FF4D00"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.3)"}>Pricing</span>
          <a href="mailto:support@wrapbridge.com" style={{ color: "rgba(255,255,255,0.3)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color="#FF4D00"} onMouseLeave={e => e.target.style.color="rgba(255,255,255,0.3)"}>support@wrapbridge.com</a>
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© {new Date().getFullYear()} WrapBridge. All rights reserved.</div>
      </div>
    </div>
  );
}
