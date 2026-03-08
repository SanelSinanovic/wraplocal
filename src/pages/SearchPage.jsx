import { SHOPS } from "../data/data";

export default function SearchPage({ nav, searchQuery, setSearchQuery, setSelectedShop, setBookingShop }) {
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 12px 24px; font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; } .btn-main:hover { background: #FF6A20; } .card-hover { transition: transform 0.2s; cursor: pointer; } .card-hover:hover { transform: translateY(-3px); } @media (max-width: 768px) { .search-nav { flex-wrap: wrap; padding: 12px 16px !important; gap: 10px; } .search-bar { order: 3; flex: 0 0 100% !important; margin: 0 !important; max-width: 100% !important; } .search-pad { padding: 16px !important; } .shop-card-inner { flex-direction: column !important; } .shop-img { width: 100% !important; height: 180px !important; } .shop-card-right { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; } .shop-book-btn { align-self: stretch; } }`}</style>
      <nav className="search-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>WRAP<span style={{ color: "#fff" }}>LOCAL</span></div>
        <div className="search-bar" style={{ display: "flex", gap: 16, flex: 1, maxWidth: 500, margin: "0 40px" }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="City, zip, or shop name..." style={{ flex: 1, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none" }} />
          <button className="btn-main">Search</button>
        </div>
        <button className="btn-main" onClick={() => nav("customer-login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>My Bookings</button>
      </nav>

      <div className="search-pad" style={{ padding: "30px 40px" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Showing <b style={{ color: "#fff" }}>3 shops</b> near Alpharetta, GA</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SHOPS.map(shop => (
            <div key={shop.id} className="card-hover" onClick={() => { setSelectedShop(shop); nav("shop"); }}
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div className="shop-card-inner" style={{ display: "flex" }}>
                <img className="shop-img" src={shop.image} alt={shop.name} style={{ width: 240, height: 160, objectFit: "cover", flexShrink: 0 }} />
                <div style={{ padding: "20px 24px", flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 26, letterSpacing: 1, marginBottom: 4 }}>{shop.name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                      ★ {shop.rating} ({shop.reviews} reviews) · {shop.location} · {shop.distance}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {shop.tags.map(t => <span key={t} style={{ padding: "2px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{t}</span>)}
                    </div>
                  </div>
                  <div className="shop-card-right" style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>From</div>
                    <div style={{ fontSize: 32, color: "#FF4D00", marginBottom: 8 }}>${shop.price.toLocaleString()}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: shop.availability === "Today" ? "#10B981" : "#F59E0B", marginBottom: 8 }}>● Available {shop.availability}</div>
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
