export default function ShopProfile({ nav, selectedShop, setBookingShop }) {
  if (!selectedShop) return null;
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 14px 32px; font-family: 'Bebas Neue', cursive; font-size: 18px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; } .btn-main:hover { background: #FF6A20; }`}</style>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>WRAP<span style={{ color: "#fff" }}>LOCAL</span></div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", cursor: "pointer" }} onClick={() => nav("search")}>← Back to Search</span>
      </nav>

      <div style={{ position: "relative", height: 320, overflow: "hidden" }}>
        <img src={selectedShop.image} alt={selectedShop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0A0A0A 20%, transparent)" }} />
      </div>

      <div style={{ padding: "0 60px 60px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 56, letterSpacing: 2 }}>{selectedShop.name}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.5)" }}>
              ★ {selectedShop.rating} · {selectedShop.reviews} reviews · {selectedShop.location} · {selectedShop.distance}
            </div>
          </div>
          <button className="btn-main" style={{ fontSize: 20, padding: "16px 40px" }} onClick={() => { setBookingShop(selectedShop); nav("booking"); }}>Book Appointment →</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40 }}>
          <div>
            <div style={{ fontSize: 28, letterSpacing: 1, marginBottom: 12 }}>ABOUT</div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 32 }}>{selectedShop.about}</p>
            <div style={{ fontSize: 28, letterSpacing: 1, marginBottom: 16 }}>PORTFOLIO</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {selectedShop.portfolio.map((img, i) => (
                <img key={i} src={img} alt="" style={{ width: "100%", height: 160, objectFit: "cover", border: "1px solid rgba(255,255,255,0.06)" }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", padding: 28 }}>
              <div style={{ fontSize: 24, letterSpacing: 1, marginBottom: 20 }}>SERVICES & PRICING</div>
              {[["Full Color Change Wrap", 1200], ["Partial Wrap", 650], ["Racing Stripes", 350], ["PPF Protection", 800]].map(([s, p]) => (
                <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>{s}</span>
                  <span style={{ color: "#FF4D00", fontWeight: 600 }}>${p}</span>
                </div>
              ))}
              <button className="btn-main" style={{ width: "100%", marginTop: 20, fontSize: 16 }} onClick={() => { setBookingShop(selectedShop); nav("booking"); }}>
                Book This Shop →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
