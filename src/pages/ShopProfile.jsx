import { useState, useEffect } from "react";
import { ALL_SERVICE_NAMES } from "../lib/services";
import { fetchShopReviews } from "../lib/queries";

const PLACEHOLDER_PORTFOLIO = [
  "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80",
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80",
  "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80",
  "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=600&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
];

export default function ShopProfile({ nav, selectedShop, setBookingShop, currentUser, currentProfile, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [lightboxImg, setLightboxImg] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (selectedShop?.id) fetchShopReviews(selectedShop.id).then(setReviews);
  }, [selectedShop?.id]);

  if (!selectedShop) return null;

  const role = currentUser ? (currentProfile?.role || currentUser?.user_metadata?.role || "customer") : null;

  const shop = selectedShop;
  const accentColor = shop.color || "#FF4D00";
  const bannerSrc = shop.image || shop.banner_url || null;
  const portfolio = shop.portfolio && shop.portfolio.length > 0 ? shop.portfolio : PLACEHOLDER_PORTFOLIO;
  const bio = shop.about || shop.bio || "";
  const rating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length) * 10) / 10
    : 0;
  const reviewCount = reviews.length;
  const location = shop.location || shop.city || "";
  const priceFrom = shop.price ?? shop.price_from ?? null;
  const tags = shop.tags || [];
  const slots = shop.slots || [];
  const phone = shop.phone || "";
  const website = shop.website || "";
  const initials = shop.name
    ? shop.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const handleBook = () => { setBookingShop(shop); nav("booking"); };

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sp-hero-anim { animation: fadeIn 0.5s ease both; }
        .sp-profile-anim { animation: fadeUp 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both; }
        .sp-content-anim { animation: fadeUp 0.5s 0.2s cubic-bezier(0.22,1,0.36,1) both; }
        .sp-btn { background: #FF4D00; color: #fff; border: none; padding: 14px 32px; font-family: 'Bebas Neue', cursive; font-size: 18px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; }
        .sp-btn:hover { background: #FF6A20; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(255,77,0,0.25); }
        .sp-tab { background: none; border: none; border-bottom: 2px solid transparent; color: rgba(255,255,255,0.4); font-family: 'Bebas Neue', cursive; font-size: 17px; letter-spacing: 2px; cursor: pointer; padding: 12px 0; transition: color 0.2s; }
        .sp-tab.active { color: #fff; border-bottom-color: #FF4D00; }
        .sp-tab:hover:not(.active) { color: rgba(255,255,255,0.75); }
        .sp-port-item { position: relative; overflow: hidden; cursor: pointer; aspect-ratio: 4/3; background: #111; border: 1px solid rgba(255,255,255,0.05); transition: border-color 0.2s; }
        .sp-port-item:hover { border-color: rgba(255,77,0,0.3); }
        .sp-port-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; display: block; }
        .sp-port-item:hover img { transform: scale(1.07); }
        .sp-port-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0); transition: background 0.3s; display: flex; align-items: center; justify-content: center; }
        .sp-port-item:hover .sp-port-overlay { background: rgba(0,0,0,0.48); }
        .sp-port-label { opacity: 0; transition: opacity 0.3s; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #fff; letter-spacing: 2px; border: 1px solid rgba(255,255,255,0.5); padding: 6px 14px; }
        .sp-port-item:hover .sp-port-label { opacity: 1; }
        .sp-info-row { display: flex; align-items: center; gap: 12px; padding: 13px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: 'DM Sans', sans-serif; font-size: 14px; transition: background 0.15s; }
        .sp-info-row:last-child { border-bottom: none; }
        .sp-icon { width: 34px; height: 34px; background: rgba(255,77,0,0.1); border: 1px solid rgba(255,77,0,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 15px; }
        .sp-slot { padding: 6px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.15s; }
        .sp-slot:hover { border-color: #FF4D00; color: #FF4D00; background: rgba(255,77,0,0.08); transform: translateY(-1px); }
        .sp-lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.93); z-index: 1000; display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
        .sp-lightbox img { max-width: 90vw; max-height: 88vh; object-fit: contain; box-shadow: 0 40px 100px rgba(0,0,0,0.8); }
        .sp-review-card { background: #111; border: 1px solid rgba(255,255,255,0.07); padding: 20px; transition: border-color 0.2s, transform 0.2s; }
        .sp-review-card:hover { border-color: rgba(255,255,255,0.13); transform: translateY(-2px); }
        @media (max-width: 768px) {
          .sp-hero { height: 220px !important; }
          .sp-profile-row { flex-direction: column !important; gap: 16px !important; align-items: flex-start !important; }
          .sp-title { font-size: 36px !important; }
          .sp-content-grid { grid-template-columns: 1fr !important; }
          .sp-port-grid { grid-template-columns: repeat(2,1fr) !important; }
          .sp-nav { padding: 12px 16px !important; }
          .sp-main { padding: 0 16px 48px !important; }
          .sp-book-btn { width: 100%; }
          .sp-tabs { overflow-x: auto !important; -webkit-overflow-scrolling: touch; gap: 20px !important; scrollbar-width: none; }
          .sp-tabs::-webkit-scrollbar { display: none; }
          .sp-tab { white-space: nowrap !important; letter-spacing: 1px !important; font-size: 14px !important; }
          .sp-content-grid { gap: 20px !important; }
          .sp-profile-row button { width: 100% !important; }
        }
        @media (max-width: 420px) {
          .sp-hero { height: 180px !important; }
          .sp-title { font-size: 28px !important; }
          .sp-port-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="sp-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)" }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>
          WRAP<span style={{ color: "#fff" }}>BRIDGE</span>
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => nav("search")}>
          ← Back to Search
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {role !== "company" && (
            <button className="sp-btn sp-book-btn" style={{ fontSize: 15, padding: "10px 28px" }} onClick={handleBook}>
              Book Now →
            </button>
          )}
          {currentUser && (
            <button onClick={role === "company" ? () => nav("company-dash") : onLogout}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.45)", padding: "10px 18px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 2, cursor: "pointer" }}>
              {role === "company" ? "Dashboard" : "Sign Out"}
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO BANNER ── */}
      <div className="sp-hero sp-hero-anim" style={{ position: "relative", height: 380, overflow: "hidden" }}>
        {bannerSrc ? (
          <img src={bannerSrc} alt={shop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${accentColor}28 0%, #0F0F0F 75%)`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 280, height: 280, borderRadius: "50%", border: `1px solid ${accentColor}22` }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 440, height: 440, borderRadius: "50%", border: `1px solid ${accentColor}12` }} />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.45) 55%, transparent 100%)" }} />
        {shop.availability && (
          <div style={{ position: "absolute", top: 24, right: 24, background: shop.availability.toLowerCase().includes("today") ? "#10B981" : accentColor, padding: "5px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            ● AVAILABLE {shop.availability.toUpperCase()}
          </div>
        )}
      </div>

      {/* ── PROFILE HEADER ── */}
      <div className="sp-main" style={{ padding: "0 60px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginTop: -60, marginBottom: 32, position: "relative", zIndex: 2 }} className="sp-profile-anim">
          <div className="sp-profile-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
              <div style={{ width: 90, height: 90, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, letterSpacing: 2, flexShrink: 0, border: "3px solid #0A0A0A", boxShadow: `0 8px 32px ${accentColor}44` }}>
                {initials}
              </div>
              <div>
                <div className="sp-title" style={{ fontSize: 54, letterSpacing: 2, lineHeight: 1 }}>{shop.name}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 7, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
                  {rating > 0 && <span style={{ color: "#FF4D00", fontWeight: 700 }}>★ {rating.toFixed(1)}</span>}
                  {reviewCount > 0 && <span>{reviewCount} review{reviewCount !== 1 ? "s" : ""}</span>}
                  {location && <span>📍 {location}{shop.distance ? ` · ${shop.distance}` : ""}</span>}
                </div>
                {tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {tags.map(t => (
                      <span key={t} style={{ padding: "3px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button className="sp-btn sp-book-btn" style={{ fontSize: 20, padding: "16px 44px", flexShrink: 0 }} onClick={handleBook}>
              Book Appointment →
            </button>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="sp-tabs sp-content-anim" style={{ display: "flex", gap: 32, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 36 }}>
          {[
            { id: "overview", label: "Overview" },
            { id: "portfolio", label: `Portfolio (${portfolio.length})` },
            { id: "reviews", label: `Reviews${reviews.length > 0 ? ` (${reviews.length})` : ""}` },
            { id: "contact",  label: "Contact" },
          ].map(({ id, label }) => (
            <button key={id} className={`sp-tab${activeTab === id ? " active" : ""}`} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="sp-content-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40 }}>
            {/* LEFT */}
            <div>
              {/* About */}
              <div style={{ marginBottom: 44 }}>
                <div style={{ fontSize: 28, letterSpacing: 2, marginBottom: 14 }}>ABOUT THIS SHOP</div>
                {bio ? (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.85, maxWidth: 620 }}>{bio}</p>
                ) : (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.25)", lineHeight: 1.8, fontStyle: "italic" }}>
                    This shop hasn't added a bio yet.
                  </p>
                )}
              </div>
              {/* Portfolio preview */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 28, letterSpacing: 2 }}>PORTFOLIO</div>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer" }} onClick={() => setActiveTab("portfolio")}>
                    View all {portfolio.length} →
                  </span>
                </div>
                <div className="sp-port-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {portfolio.slice(0, 3).map((img, i) => (
                    <div key={i} className="sp-port-item" onClick={() => setLightboxImg(img)}>
                      <img src={img} alt={`Work ${i + 1}`} />
                      <div className="sp-port-overlay"><span className="sp-port-label">VIEW</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Services */}
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 20, letterSpacing: 2 }}>SERVICES</div>
                </div>
                <div style={{ padding: "0 22px 6px" }}>
                  {(() => {
                    const shopServices = (shop.tags || []).filter(t => ALL_SERVICE_NAMES.includes(t));
                    if (shopServices.length === 0) return (
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)", padding: "12px 0", fontStyle: "italic" }}>
                        No services listed yet.
                      </div>
                    );
                    return shopServices.map(name => (
                      <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                        <span style={{ color: "rgba(255,255,255,0.65)" }}>{name}</span>
                        <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 12 }}>Quote on request</span>
                      </div>
                    ));
                  })()}
                </div>
                <div style={{ padding: "14px 22px 22px" }}>
                  <div style={{ marginBottom: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                    Pricing depends on vehicle size, finish, and design. Request a quote when you book.
                  </div>
                  <button className="sp-btn" style={{ width: "100%", fontSize: 16 }} onClick={handleBook}>Get a Quote →</button>
                </div>
              </div>

              {/* Info */}
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "16px 22px" }}>
                <div style={{ fontSize: 20, letterSpacing: 2, marginBottom: 4 }}>INFO</div>
                {location && (
                  <div className="sp-info-row">
                    <div className="sp-icon">📍</div>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{location}{shop.distance ? `, ${shop.distance} away` : ""}</span>
                  </div>
                )}
                {phone && (
                  <div className="sp-info-row">
                    <div className="sp-icon">📞</div>
                    <a href={`tel:${phone}`} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{phone}</a>
                  </div>
                )}
                {website && (
                  <div className="sp-info-row">
                    <div className="sp-icon">🌐</div>
                    <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#FF4D00", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {!phone && !website && !location && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)", padding: "12px 0" }}>
                    Contact info not listed yet.
                  </div>
                )}
              </div>

              {/* Availability */}
              {slots.length > 0 && (
                <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "16px 22px" }}>
                  <div style={{ fontSize: 20, letterSpacing: 2, marginBottom: 4 }}>AVAILABILITY</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 14 }}>TODAY'S OPEN SLOTS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {slots.map(s => <div key={s} className="sp-slot" onClick={handleBook}>{s}</div>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PORTFOLIO TAB ── */}
        {activeTab === "portfolio" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.32)", letterSpacing: 1 }}>
                {portfolio.length} PHOTO{portfolio.length !== 1 ? "S" : ""}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: 6 }}>
                ⌕ Click any photo to enlarge
              </div>
            </div>
            <div className="sp-port-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {portfolio.map((img, i) => (
                <div key={i} className="sp-port-item" onClick={() => setLightboxImg(img)}>
                  <img src={img} alt={`Portfolio ${i + 1}`} loading="lazy" />
                  <div className="sp-port-overlay"><span className="sp-port-label">VIEW FULL</span></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 44, textAlign: "center" }}>
              <button className="sp-btn" style={{ fontSize: 18, padding: "16px 52px" }} onClick={handleBook}>
                Book an Appointment →
              </button>
            </div>
          </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === "reviews" && (
          <div>
            {reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.15 }}>★</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.28)" }}>No reviews yet</div>
              </div>
            ) : (
              <>
                {rating > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: 64, color: "#FF4D00", lineHeight: 1 }}>{rating.toFixed(1)}</div>
                    <div>
                      <div style={{ color: "#FF4D00", fontSize: 22, marginBottom: 4 }}>
                        {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                        {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {reviews.map((r, i) => (
                    <div key={i} style={{ padding: "24px 0", borderBottom: i < reviews.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 16, letterSpacing: 1 }}>{r.customerName}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.28)" }}>
                          {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div style={{ color: "#FF4D00", fontSize: 15, marginBottom: r.comment ? 10 : 0 }}>
                        {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
                      </div>
                      {r.comment && (
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.58)", lineHeight: 1.7 }}>
                          "{r.comment}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CONTACT TAB ── */}
        {activeTab === "contact" && (
          <div className="sp-content-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40 }}>
            <div>
              <div style={{ fontSize: 28, letterSpacing: 2, marginBottom: 22 }}>GET IN TOUCH</div>
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "28px 32px", marginBottom: 20 }}>
                {location ? (
                  <div className="sp-info-row" style={{ padding: "16px 0" }}>
                    <div className="sp-icon" style={{ fontSize: 17 }}>📍</div>
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: 1, marginBottom: 3 }}>LOCATION</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#fff" }}>{location}{shop.zip ? ` ${shop.zip}` : ""}</div>
                    </div>
                  </div>
                ) : null}
                {phone ? (
                  <div className="sp-info-row" style={{ padding: "16px 0" }}>
                    <div className="sp-icon" style={{ fontSize: 17 }}>📞</div>
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: 1, marginBottom: 3 }}>PHONE</div>
                      <a href={`tel:${phone}`} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#FF4D00", textDecoration: "none" }}>{phone}</a>
                    </div>
                  </div>
                ) : null}
                {website ? (
                  <div className="sp-info-row" style={{ padding: "16px 0" }}>
                    <div className="sp-icon" style={{ fontSize: 17 }}>🌐</div>
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.28)", letterSpacing: 1, marginBottom: 3 }}>WEBSITE</div>
                      <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#FF4D00", textDecoration: "none" }}>
                        {website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  </div>
                ) : null}
                {!phone && !website && !location && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.28)", padding: "16px 0", textAlign: "center" }}>
                    No contact info listed yet.
                  </div>
                )}
              </div>
              {tags.length > 0 && (
                <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "28px 32px" }}>
                  <div style={{ fontSize: 20, letterSpacing: 2, marginBottom: 16 }}>SPECIALTIES</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tags.map(t => (
                      <span key={t} style={{ padding: "6px 16px", background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.25)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "linear-gradient(135deg, #FF4D00, #FF8C00)", padding: "32px 28px" }}>
                <div style={{ fontSize: 30, letterSpacing: 2, marginBottom: 10 }}>READY TO BOOK?</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.65, marginBottom: 22 }}>
                  Choose your service, pick a slot, and we'll handle the rest.
                </p>
                <button onClick={handleBook} style={{ background: "#fff", color: "#FF4D00", border: "none", padding: "14px 28px", fontFamily: "'Bebas Neue', cursive", fontSize: 17, letterSpacing: 2, cursor: "pointer", width: "100%" }}>
                  Book Appointment →
                </button>
              </div>
              {rating > 0 && (
                <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "24px 28px", textAlign: "center" }}>
                  <div style={{ fontSize: 60, color: "#FF4D00", lineHeight: 1 }}>{rating.toFixed(1)}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#FF4D00", marginTop: 6 }}>
                    {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                    {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── LIGHTBOX ── */}
      {lightboxImg && (
        <div className="sp-lightbox" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Portfolio" />
          <div style={{ position: "absolute", top: 20, right: 28, fontFamily: "'DM Sans', sans-serif", fontSize: 28, color: "rgba(255,255,255,0.5)", cursor: "pointer", lineHeight: 1 }}>✕</div>
        </div>
      )}
    </div>
  );
}
