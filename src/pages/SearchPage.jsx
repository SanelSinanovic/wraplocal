import { useState, useEffect, useRef } from "react";
import { SERVICE_CATEGORIES } from "../lib/services";
import { haversineDistance, geocodeSearch } from "../lib/queries";

export default function SearchPage({ nav, shops: liveShops, shopsLoading, searchQuery, setSearchQuery, serviceFilter, setServiceFilter, setSelectedShop, setBookingShop, currentUser, currentProfile, onLogout }) {
  const role = currentUser ? (currentProfile?.role || currentUser?.user_metadata?.role || "customer") : null;
  const allShops = liveShops || [];
  const [activeService, setActiveService] = useState(null);
  const [userCoords, setUserCoords] = useState(null);      // { lat, lon } from GPS
  const [searchCoords, setSearchCoords] = useState(null);   // { lat, lon } geocoded from query
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | loading | ok | denied
  const [isGeocodingSearch, setIsGeocodingSearch] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(true);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(0);
  const geocodeTimer = useRef(null);

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

  // Geocode the search query whenever it changes (debounced 600ms)
  useEffect(() => {
    clearTimeout(geocodeTimer.current);
    const q = searchQuery.trim();
    if (!q) { setSearchCoords(null); setIsGeocodingSearch(false); return; }
    setIsGeocodingSearch(true);
    geocodeTimer.current = setTimeout(async () => {
      const coords = await geocodeSearch(q);
      setSearchCoords(coords);
      setIsGeocodingSearch(false);
    }, 600);
    return () => clearTimeout(geocodeTimer.current);
  }, [searchQuery]);

  // Consume a service filter set from LandingPage
  useEffect(() => {
    if (serviceFilter) {
      setActiveService(serviceFilter);
      setServiceFilter(null);
    }
  }, [serviceFilter, setServiceFilter]);

  // Reset to first page whenever filter/query/sort changes
  useEffect(() => { setPage(0); }, [searchQuery, activeService, sortByDistance, searchCoords]);

  const q = searchQuery.trim().toLowerCase();
  // Detect if the query looks like a US zip code
  const isZipQuery = /^\d{5}$/.test(searchQuery.trim());

  const filteredShops = allShops.filter(shop => {
    // If the search resolved to a location (geocoded), show ALL shops and sort by distance
    // Only apply text filter when geocoding didn't find a location (e.g. shop name search)
    const matchesText = !q || searchCoords || isGeocodingSearch ||
      (shop.name || "").toLowerCase().includes(q) ||
      (shop.city || shop.location || "").toLowerCase().includes(q) ||
      (shop.state || "").toLowerCase().includes(q) ||
      (shop.zip || "").includes(q);
    const matchesService = !activeService || (shop.tags || []).includes(activeService);
    return matchesText && matchesService;
  });

  // Reference coords: prefer geocoded search location, then GPS
  const refCoords = searchCoords || userCoords;

  // Attach computed distance from reference point
  const shopsWithDistance = filteredShops.map(shop => {
    if (refCoords && shop.latitude && shop.longitude) {
      const dist = haversineDistance(refCoords.lat, refCoords.lon, shop.latitude, shop.longitude);
      return { ...shop, _distanceMi: dist };
    }
    return { ...shop, _distanceMi: null };
  });

  const shops = sortByDistance && refCoords
    ? [...shopsWithDistance].sort((a, b) => {
        // Exact zip match always floats to top
        const aExact = isZipQuery && (a.zip || "") === searchQuery.trim() ? 0 : 1;
        const bExact = isZipQuery && (b.zip || "") === searchQuery.trim() ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        // Then sort by distance
        if (a._distanceMi == null && b._distanceMi == null) return 0;
        if (a._distanceMi == null) return 1;
        if (b._distanceMi == null) return -1;
        return a._distanceMi - b._distanceMi;
      })
    : shopsWithDistance;

  const totalPages = Math.ceil(shops.length / PAGE_SIZE);
  const pagedShops = shops.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } @keyframes skelPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 12px 24px; font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; } .btn-main:hover { background: #FF6A20; transform: translateY(-1px); } .svc-chip { font-family: 'DM Sans', sans-serif; font-size: 12px; padding: 5px 14px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.45); cursor: pointer; white-space: nowrap; transition: all 0.15s; } .svc-chip:hover { border-color: rgba(255,77,0,0.45); color: rgba(255,255,255,0.8); } .svc-chip.active { background: rgba(255,77,0,0.12); border-color: #FF4D00; color: #FF4D00; } @keyframes fadeInUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } } .shop-card-anim { animation: fadeInUp 0.45s cubic-bezier(0.22,1,0.36,1) both; } .shop-card { background: #111; border: 1px solid rgba(255,255,255,0.07); overflow: hidden; transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; cursor: pointer; } .shop-card:hover { border-color: rgba(255,77,0,0.35); transform: translateY(-2px); box-shadow: 0 8px 40px rgba(255,77,0,0.1); } .shop-tag { padding: 3px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-family: 'DM Sans', sans-serif; font-size: 11px; color: rgba(255,255,255,0.4); transition: all 0.15s; } .shop-tag:hover { border-color: rgba(255,77,0,0.3); color: rgba(255,255,255,0.7); } .search-input { flex: 1; background: #151515; border: 1px solid rgba(255,255,255,0.1); padding: 10px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; } .search-input:focus { border-color: rgba(255,77,0,0.5); } @media (max-width: 768px) { .search-nav { flex-wrap: wrap; padding: 12px 16px !important; gap: 10px; } .search-bar { order: 3; flex: 0 0 100% !important; margin: 0 !important; max-width: 100% !important; } .search-pad { padding: 16px !important; } .shop-card-inner { flex-direction: column !important; } .shop-img { width: 100% !important; height: 180px !important; } .shop-card-right { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; } .shop-book-btn { align-self: stretch; } }`}</style>
      <nav className="search-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 68, display: "block", cursor: "pointer" }} onClick={() => nav("landing")} />
        <div className="search-bar" style={{ display: "flex", gap: 16, flex: 1, maxWidth: 500, margin: "0 40px" }}>
          <input className="search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="City, zip, or shop name..." />
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
            {totalPages > 1 && <span style={{ marginLeft: 8 }}>· Page {page + 1} of {totalPages}</span>}
          </span>
          {isGeocodingSearch && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>📍 Finding location…</span>}
          {!isGeocodingSearch && searchCoords && q && (
            <span style={{ fontSize: 12, color: "rgba(255,77,0,0.7)" }}>📍 Showing nearest to "{searchQuery.trim()}"</span>
          )}
          {!searchCoords && locationStatus === "ok" && (
            <button
              onClick={() => setSortByDistance(v => !v)}
              style={{ background: sortByDistance ? "rgba(255,77,0,0.12)" : "transparent", border: `1px solid ${sortByDistance ? "#FF4D00" : "rgba(255,255,255,0.15)"}`, color: sortByDistance ? "#FF4D00" : "rgba(255,255,255,0.4)", padding: "4px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              📍 {sortByDistance ? "Nearest first" : "Sort by distance"}
            </button>
          )}
          {!searchCoords && locationStatus === "loading" && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>📍 Detecting location…</span>}
          {!searchCoords && locationStatus === "denied" && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>📍 Location unavailable — enable in browser to sort by distance</span>}
        </div>
        {/* ── LOADING SKELETON ── */}
        {shopsLoading && allShops.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", display: "flex", animation: "skelPulse 1.4s ease-in-out infinite" }}>
                <div style={{ width: 240, height: 160, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
                <div style={{ padding: "20px 24px", flex: 1 }}>
                  <div style={{ width: "55%", height: 22, background: "rgba(255,255,255,0.06)", marginBottom: 10 }} />
                  <div style={{ width: "35%", height: 14, background: "rgba(255,255,255,0.04)", marginBottom: 14 }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    {[80, 100, 70].map((w, j) => <div key={j} style={{ width: w, height: 22, background: "rgba(255,255,255,0.04)" }} />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {shops.length === 0 && !shopsLoading && (
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", padding: "64px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>🔍</div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 36, letterSpacing: 2 }}>NO SHOPS FOUND</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", maxWidth: 340 }}>
              {activeService ? `No shops offer "${activeService}" in this area yet.` : "No shops match your search."} Try a different filter or clear your search.
            </div>
            {(activeService || searchQuery) && (
              <button style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "10px 24px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2, cursor: "pointer", marginTop: 4 }} onClick={() => { setActiveService(null); setSearchQuery(""); }}>
                Clear Filters
              </button>
            )}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pagedShops.map((shop, i) => (
            <div key={shop.id} className="shop-card shop-card-anim" onClick={() => nav("shop", { selectedShop: shop })}
              style={{ animationDelay: `${Math.min(i * 0.07, 0.42)}s` }}>
              <div className="shop-card-inner" style={{ display: "flex" }}>
                <img className="shop-img" src={shop.image || shop.banner_url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80'} alt={shop.name} style={{ width: 240, height: 160, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ padding: "20px 24px", flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", overflow: "hidden" }}>
                  {/* Diagonal stripe watermark */}
                  <div aria-hidden="true" style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    backgroundImage: "repeating-linear-gradient(118deg, transparent, transparent 18px, rgba(255,77,0,0.035) 18px, rgba(255,77,0,0.035) 20px)",
                  }} />
                  {/* WB monogram */}
                  <div aria-hidden="true" style={{
                    position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                    fontFamily: "'Bebas Neue', cursive", fontSize: 80, letterSpacing: 4,
                    color: "rgba(255,77,0,0.045)", userSelect: "none", whiteSpace: "nowrap", pointerEvents: "none",
                  }}>WRAPBRIDGE</div>
                  <div style={{ position: "relative" }}>
                    <div style={{ fontSize: 26, letterSpacing: 1, marginBottom: 4 }}>{shop.name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                      {(() => {
                        const rc = shop.reviews ?? shop.review_count ?? 0;
                        const rt = shop.rating ?? 0;
                        return rc > 0 && rt > 0 ? `★ ${rt} (${rc} review${rc !== 1 ? "s" : ""}) · ` : "";
                      })()}
                      {shop.location || [shop.city, shop.state].filter(Boolean).join(", ") || ""}
                      {shop._distanceMi != null && <span style={{ color: "#FF4D00", marginLeft: 6 }}>· {shop._distanceMi < 10 ? shop._distanceMi.toFixed(1) : Math.round(shop._distanceMi)} mi away</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(shop.tags || []).map(t => <span key={t} className="shop-tag">{t}</span>)}
                    </div>
                  </div>
                  {/* Vertical divider */}
                  <div aria-hidden="true" style={{
                    position: "relative", alignSelf: "stretch", width: 1, flexShrink: 0, margin: "0 20px",
                    background: "linear-gradient(to bottom, transparent, rgba(255,77,0,0.35) 30%, rgba(255,77,0,0.35) 70%, transparent)",
                  }} />
                  <div className="shop-card-right" style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, position: "relative" }}>
                    {(shop.price ?? shop.price_from) ? (
                      <>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>From</div>
                        <div style={{ fontSize: 32, color: "#FF4D00", marginBottom: 8 }}>${(shop.price ?? shop.price_from).toLocaleString()}</div>
                      </>
                    ) : (
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>Get a Quote</div>
                    )}
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: shop.availability === "Today" ? "#10B981" : "#F59E0B", marginBottom: 8 }}>{shop.availability ? `● Available ${shop.availability}` : '● Contact for availability'}</div>
                    <button className="btn-main shop-book-btn" onClick={(e) => { e.stopPropagation(); nav("booking", { bookingShop: shop }); }}>Book Now</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 32, fontFamily: "'DM Sans', sans-serif" }}>
            <button
              onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
              disabled={page === 0}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: page === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", padding: "8px 18px", cursor: page === 0 ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => { setPage(i); window.scrollTo(0, 0); }}
                style={{ background: i === page ? "#FF4D00" : "transparent", border: `1px solid ${i === page ? "#FF4D00" : "rgba(255,255,255,0.15)"}`, color: i === page ? "#fff" : "rgba(255,255,255,0.4)", padding: "8px 14px", cursor: "pointer", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 1, minWidth: 36 }}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
              disabled={page === totalPages - 1}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: page === totalPages - 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", padding: "8px 18px", cursor: page === totalPages - 1 ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
