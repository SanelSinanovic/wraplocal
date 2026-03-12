import { useState } from "react";
import { SHOPS as STATIC_SHOPS } from "../data/data";

export default function LandingPage({ nav, shops: liveShops, setBookingShop, setSelectedShop, currentUser, currentProfile, onLogout }) {
  const role = currentUser ? (currentProfile?.role || currentUser?.user_metadata?.role || "customer") : null;
  const firstName = currentUser ? ((currentProfile?.name || currentUser?.user_metadata?.name || currentUser?.email || "").split(" ")[0].split("@")[0]) : null;
  // Fall back to bundled static data until Supabase responds
  const shops = liveShops && liveShops.length > 0 ? liveShops : STATIC_SHOPS;
  const [menuOpen, setMenuOpen] = useState(false);
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
        .hamburger { display: none; background: none; border: none; cursor: pointer; padding: 4px; }
        .mobile-menu { display: none; }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-btns { display: none !important; }
          .hamburger { display: flex; flex-direction: column; gap: 5px; }
          .mobile-menu { display: flex; flex-direction: column; background: rgba(10,10,10,0.98); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 12px 20px 20px; gap: 4px; }
          .mobile-menu a, .mobile-menu span { font-family: 'DM Sans', sans-serif; font-size: 15px; color: rgba(255,255,255,0.7); cursor: pointer; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: block; }
          .mobile-menu .mob-btn { margin-top: 12px; background: #FF4D00; color: #fff; border: none; padding: 14px; font-family: 'Bebas Neue', cursive; font-size: 17px; letter-spacing: 2px; cursor: pointer; width: 100%; }
          .mobile-menu .mob-btn-ghost { margin-top: 8px; background: transparent; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.2); padding: 12px; font-family: 'Bebas Neue', cursive; font-size: 15px; letter-spacing: 2px; cursor: pointer; width: 100%; }
          .hero-section { padding: 60px 20px 40px !important; }
          .hero-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .hero-right { display: none !important; }
          .stats-row { gap: 28px !important; }
          .section-pad { padding: 40px 20px !important; }
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
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 60% 50%, rgba(255,77,0,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, border: "1px solid rgba(255,77,0,0.1)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, border: "1px solid rgba(255,77,0,0.08)", borderRadius: "50%", pointerEvents: "none" }} />

        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", position: "relative" }}>
          <div>
            <div style={{ display: "inline-block", background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "6px 16px", marginBottom: 24, fontFamily: "'DM Sans', sans-serif", fontSize: 13, letterSpacing: 2, color: "#FF4D00" }}>
              🔥 BOOK IN UNDER 2 MINUTES
            </div>
            <h1 style={{ fontSize: "clamp(56px, 6vw, 100px)", lineHeight: 0.95, letterSpacing: 3, marginBottom: 24 }}>
              YOUR CAR.<br />
              <span style={{ color: "#FF4D00", position: "relative" }}>
                TRANSFORMED.
                <div style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 3, background: "#FF4D00" }} />
              </span>
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 480, lineHeight: 1.6, marginTop: 16, marginBottom: 40, fontWeight: 300 }}>
              Find and book top-rated local car wrapping studios. Compare portfolios, read reviews, and schedule your transformation — all in one place.
            </p>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <button className="btn-main" style={{ fontSize: 20, padding: "16px 40px" }} onClick={() => nav("search")}>Find Shops Near Me →</button>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>No account needed</span>
            </div>
            <div className="stats-row" style={{ display: "flex", gap: 48, marginTop: 64 }}>
              {[["500+", "Shops Listed"], ["12K+", "Bookings Made"], ["4.8★", "Avg Rating"]].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontSize: 40, color: "#FF4D00" }}>{n}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-right" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 340, height: 340, background: "radial-gradient(circle, rgba(255,77,0,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
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
                <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                  {["Full Wraps", "PPF", "Color Change"].map(t => (
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
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "14px 20px", display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginRight: 4 }}>TODAY</span>
                {["9:00 AM", "11:00 AM", "2:00 PM"].map((s, i) => (
                  <span key={s} style={{ padding: "4px 12px", background: i === 1 ? "rgba(255,77,0,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 1 ? "#FF4D00" : "rgba(255,255,255,0.08)"}`, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: i === 1 ? "#FF4D00" : "rgba(255,255,255,0.5)" }}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>J</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#fff" }}><b>Jordan M.</b> just booked <span style={{ color: "#FF4D00" }}>Phantom Wraps Studio</span></div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Full Color Change · Alpharetta, GA · 2 min ago</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#10B981" }}>LIVE</div>
              </div>
            </div>
            <div style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>A</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#fff" }}><b>Aisha R.</b> left a <span style={{ color: "#FF4D00" }}>5-star review</span> for Chrome Kings</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>★★★★★ · "Absolutely perfect wrap!" · 8 min ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURED SHOPS */}
      <div className="section-pad" style={{ padding: "60px 60px 80px" }}>
          <div className="shops-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", letterSpacing: 3, marginBottom: 8 }}>FEATURED NEAR YOU</div>
            <div style={{ fontSize: 42, letterSpacing: 2 }}>TOP RATED SHOPS</div>
          </div>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", cursor: "pointer" }} onClick={() => nav("search")}>View all →</span>
        </div>
        <div className="shops-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {shops.map(shop => (
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
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>{shop.location || shop.city}{shop.distance ? ` · ${shop.distance}` : ''} · {shop.reviews ?? shop.review_count ?? 0} reviews</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {(shop.tags || []).map(t => <span key={t} style={{ padding: "3px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{t}</span>)}
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
      <div className="section-pad" style={{ padding: "60px 60px 100px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", letterSpacing: 3, marginBottom: 8 }}>SIMPLE PROCESS</div>
          <div style={{ fontSize: 48, letterSpacing: 2 }}>HOW IT WORKS</div>
        </div>
        <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            { n: "01", t: "Search & Compare", d: "Find local wrap shops, browse portfolios, compare prices and read real customer reviews." },
            { n: "02", t: "Book Instantly", d: "Choose your service, pick a time slot, and confirm your appointment in under 2 minutes." },
            { n: "03", t: "Get Wrapped", d: "Show up, get your car transformed, and pay securely through WrapLocal." },
          ].map(s => (
            <div key={s.n} style={{ padding: "40px", border: "1px solid rgba(255,255,255,0.06)", background: "#0D0D0D", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -10, fontSize: 120, color: "rgba(255,77,0,0.04)", fontFamily: "'Bebas Neue', cursive" }}>{s.n}</div>
              <div style={{ fontSize: 56, color: "#FF4D00", marginBottom: 16 }}>{s.n}</div>
              <div style={{ fontSize: 26, letterSpacing: 1, marginBottom: 12 }}>{s.t}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FOR BUSINESSES CTA */}
      <div className="biz-cta" style={{ margin: "0 60px 80px", background: "linear-gradient(135deg, #FF4D00 0%, #FF8C00 100%)", padding: "60px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 48, letterSpacing: 2, marginBottom: 12 }}>OWN A WRAP SHOP?</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.8)" }}>List your business for $49.99/month and get discovered by thousands of local customers.</div>
        </div>
        <button onClick={() => nav("pricing")} style={{ background: "#fff", color: "#FF4D00", border: "none", padding: "16px 40px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 2, cursor: "pointer", whiteSpace: "nowrap" }}>
          Get Listed →
        </button>
      </div>
    </div>
  );
}
