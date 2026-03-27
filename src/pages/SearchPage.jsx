import { useState, useEffect } from "react";
import { SHOPS as STATIC_SHOPS } from "../data/data";
import { SERVICE_CATEGORIES } from "../lib/services";
import { haversineDistance } from "../lib/queries";

export default function SearchPage({ nav, shops: liveShops, searchQuery, setSearchQuery, serviceFilter, setServiceFilter, setSelectedShop, setBookingShop, currentUser, currentProfile, onLogout }) {
  const role = currentUser ? (currentProfile?.role || currentUser?.user_metadata?.role || "customer") : null;
  const allShops = liveShops && liveShops.length > 0 ? liveShops : STATIC_SHOPS;
  const [activeService, setActiveService] = useState(null);
  const [userCoords, setUserCoords] = useState(null);      // { lat, lon }
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | loading | ok | denied
  const [sortByDistance, setSortByDistance] = useState(true);

  // Request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) { setLocationStatus("unsupported"); return; }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      pos => { setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocationStatus("ok"); },
      () => setLocationStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  // Consume a service filter set from LandingPage
  useEffect(() => {
    if (serviceFilter) {
      setActiveService(serviceFilter);
      setServiceFilter(null);
    }
  }, [serviceFilter, setServiceFilter]);

  const q = searchQuery.trim().toLowerCase();
  const filteredShops = allShops.filter(shop => {
    const matchesText = !q ||
      (shop.name || "").toLowerCase().includes(q) ||
      (shop.city || shop.location || "").toLowerCase().includes(q) ||
      (shop.state || "").toLowerCase().includes(q) ||
      (shop.zip || "").includes(q);
    const matchesService = !activeService || (shop.tags || []).includes(activeService);
    return matchesText && matchesService;
  });

  // Attach computed distance and sort
  const shopsWithDistance = filteredShops.map(shop => {
    if (userCoords && shop.latitude && shop.longitude) {
      const dist = haversineDistance(userCoords.lat, userCoords.lon, shop.latitude, shop.longitude);
      return { ...shop, _distanceMi: dist };
    }
    return { ...shop, _distanceMi: null };
  });

  const shops = sortByDistance && userCoords
    ? [...shopsWithDistance].sort((a, b) => {
        if (a._distanceMi == null && b._distanceMi == null) return 0;
        if (a._distanceMi == null) return 1;
        if (b._distanceMi == null) return -1;
        return a._distanceMi - b._distanceMi;
      })
    : shopsWithDistance;

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 12px 24px; font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; } .btn-main:hover { background: #FF6A20; } .card-hover { transition: transform 0.2s; cursor: pointer; } .card-hover:hover { transform: translateY(-3px); } .svc-chip { font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 5px 14px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.5); cursor: pointer; white-space: nowrap; transition: all 0.15s; letter-spacing: 0; } .svc-chip:hover { border-color: rgba(255,77,0,0.5); color: rgba(255,255,255,0.85); } .svc-chip.active { background: rgba(255,77,0,0.12); border-color: #FF4D00; color: #FF4D00; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } } .shop-card-anim { animation: fadeInUp 0.45s cubic-bezier(0.22,1,0.36,1) both; } @media (max-width: 768px) { .search-nav { flex-wrap: wrap; padding: 12px 16px !important; gap: 10px; } .search-bar { order: 3; flex: 0 0 100% !important; margin: 0 !important; max-width: 100% !important; } .search-pad { padding: 16px !important; } .shop-card-inner { flex-direction: column !important; } .shop-img { width: 100% !important; height: 180px !important; } .shop-card-right { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; } .shop-book-btn { align-self: stretch; } }`}</style>
      <nav className="search-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>KI<span style={{ color: "#fff" }}>DOR</span></div>
        <div className="search-bar" style={{ display: "flex", gap: 16, flex: 1, maxWidth: 500, margin: "0 40px" }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="City, zip, or shop name..." style={{ flex: 1, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none" }} />
          <button className="btn-main">Search</button>
        </div>
        {currentUser ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button className="btn-main" onClick={() => nav(role === "company" ? "company-dash" : "customer-dash")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
              {role === "company" ? "Dashboard" : "My Bookings"}
            </button>
            <button className="btn-main" onClick={onLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Sign Out</button>
          </div>
        ) : (
          <button className="btn-main" onClick={() => nav("customer-login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>My Bookings</button>
        )}
      </nav>

      {/* ── FILTER BAR ── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#0D0D0D", padding: "14px 40px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", minWidth: "max-content" }}>
          {SERVICE_CATEGORIES.map(({ category, services }) => (
            <div key={category} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: 2, whiteSpace: "nowrap", paddingRight: 4 }}>{category.toUpperCase()}</span>
              {services.map(({ name }) => (
                <button
                  key={name}
                  className={`svc-chip${activeService === name ? " active" : ""}`}
                  onClick={() => setActiveService(prev => prev === name ? null : name)}
                >
                  {name}
                </button>
              ))}
            </div>
          ))}
          {activeService && (
            <button
              onClick={() => setActiveService(null)}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", padding: "5px 4px", textDecoration: "underline" }}
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      <div className="search-pad" style={{ padding: "30px 40px" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span>
            {activeService
              ? <><b style={{ color: "#fff" }}>{shops.length} shop{shops.length !== 1 ? "s" : ""}</b> offering <b style={{ color: "#FF4D00" }}>{activeService}</b></>
              : <><b style={{ color: "#fff" }}>{shops.length} shop{shops.length !== 1 ? "s" : ""}</b></>
            }
          </span>
          {locationStatus === "ok" && (
            <button
              onClick={() => setSortByDistance(v => !v)}
              style={{ background: sortByDistance ? "rgba(255,77,0,0.12)" : "transparent", border: `1px solid ${sortByDistance ? "#FF4D00" : "rgba(255,255,255,0.15)"}`, color: sortByDistance ? "#FF4D00" : "rgba(255,255,255,0.4)", padding: "4px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              📍 {sortByDistance ? "Nearest first" : "Sort by distance"}
            </button>
          )}
          {locationStatus === "loading" && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>📍 Detecting location…</span>}
          {locationStatus === "denied" && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>📍 Location unavailable — enable in browser to sort by distance</span>}
        </div>
        {shops.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 0", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.3)", fontSize: 15 }}>
            No shops found{activeService ? ` offering "${activeService}"` : ""}.<br />
            <span style={{ fontSize: 13, marginTop: 8, display: "block" }}>Try a different service or <span style={{ color: "#FF4D00", cursor: "pointer" }} onClick={() => { setActiveService(null); setSearchQuery(""); }}>clear all filters</span>.</span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {shops.map((shop, i) => (
            <div key={shop.id} className="card-hover shop-card-anim" onClick={() => { setSelectedShop(shop); nav("shop"); }}
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", animationDelay: `${Math.min(i * 0.07, 0.42)}s` }}>
              <div className="shop-card-inner" style={{ display: "flex" }}>
                <img className="shop-img" src={shop.image || shop.banner_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80'} alt={shop.name} style={{ width: 240, height: 160, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ padding: "20px 24px", flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 26, letterSpacing: 1, marginBottom: 4 }}>{shop.name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                      ★ {shop.rating} ({shop.reviews ?? shop.review_count ?? 0} reviews) · {shop.location || [shop.city, shop.state].filter(Boolean).join(", ") || ""}
                      {shop._distanceMi != null && <span style={{ color: "#FF4D00", marginLeft: 6 }}>· {shop._distanceMi < 10 ? shop._distanceMi.toFixed(1) : Math.round(shop._distanceMi)} mi away</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(shop.tags || []).map(t => <span key={t} style={{ padding: "2px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{t}</span>)}
                    </div>
                  </div>
                  <div className="shop-card-right" style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>From</div>
                    <div style={{ fontSize: 32, color: "#FF4D00", marginBottom: 8 }}>${(shop.price ?? shop.price_from ?? 0).toLocaleString()}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: shop.availability === "Today" ? "#10B981" : "#F59E0B", marginBottom: 8 }}>{shop.availability ? `● Available ${shop.availability}` : '● Contact for availability'}</div>
                    <button className="btn-main shop-book-btn" onClick={(e) => { e.stopPropagation(); setBookingShop(shop); nav("booking"); }}>Book Now</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
