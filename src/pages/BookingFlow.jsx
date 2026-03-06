export default function BookingFlow({
  nav, bookingShop, bookingStep, setBookingStep,
  selectedSlot, setSelectedSlot, selectedDate, setSelectedDate,
  bookingConfirmed, setBookingConfirmed,
}) {
  if (!bookingShop) return null;
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input, select { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; width: 100%; } input:focus { border-color: #FF4D00; } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 14px 32px; font-family: 'Bebas Neue', cursive; font-size: 18px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; } .slot { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 10px 18px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; transition: all 0.2s; } .slot:hover, .slot.active { background: rgba(255,77,0,0.15); border-color: #FF4D00; color: #FF4D00; }`}</style>

      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>WRAP<span style={{ color: "#fff" }}>LOCAL</span></div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", cursor: "pointer" }} onClick={() => nav("search")}>← Back</span>
      </nav>

      {bookingConfirmed ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 56, letterSpacing: 2, marginBottom: 12, color: "#FF4D00" }}>BOOKING CONFIRMED!</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
            Your appointment at <b style={{ color: "#fff" }}>{bookingShop.name}</b> is confirmed for <b style={{ color: "#fff" }}>{selectedDate || "Mar 5, 2026"}</b> at <b style={{ color: "#fff" }}>{selectedSlot}</b>
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)", marginBottom: 40 }}>Confirmation #WL-{Math.floor(2000 + Math.random() * 1000)} · A confirmation email has been sent</div>
          <div style={{ display: "flex", gap: 16 }}>
            <button className="btn-main" onClick={() => nav("customer-dash")}>View My Bookings</button>
            <button className="btn-main" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" }} onClick={() => nav("landing")}>Back to Home</button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 40px" }}>
          {/* Progress */}
          <div style={{ display: "flex", gap: 0, marginBottom: 48 }}>
            {["Choose Service", "Pick Date & Time", "Your Info & Pay"].map((s, i) => (
              <div key={s} style={{ flex: 1, display: "flex", alignItems: "center", gap: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: bookingStep >= i + 1 ? "#FF4D00" : "#222", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: bookingStep >= i + 1 ? "#fff" : "rgba(255,255,255,0.3)", flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: bookingStep === i + 1 ? "#fff" : "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{s}</span>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: bookingStep > i + 1 ? "#FF4D00" : "rgba(255,255,255,0.1)", margin: "0 12px" }} />}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32, alignItems: "start" }}>
            <div>
              {bookingStep === 1 && (
                <div>
                  <div style={{ fontSize: 36, letterSpacing: 1, marginBottom: 24 }}>CHOOSE A SERVICE</div>
                  {[["Full Color Change Wrap", 1200, "Complete vehicle color transformation"], ["Partial Wrap", 650, "Hood, roof, trunk, or doors"], ["Racing Stripes", 350, "Single or dual stripe packages"], ["PPF Paint Protection Film", 800, "Clear bra to protect your paint"]].map(([s, p, d]) => (
                    <div key={s} onClick={() => setBookingStep(2)} style={{ padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)", background: "#111", marginBottom: 10, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#FF4D00"} onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}>
                      <div>
                        <div style={{ fontSize: 20, letterSpacing: 1 }}>{s}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{d}</div>
                      </div>
                      <div style={{ fontSize: 24, color: "#FF4D00" }}>${p.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}

              {bookingStep === 2 && (
                <div>
                  <div style={{ fontSize: 36, letterSpacing: 1, marginBottom: 24 }}>PICK DATE & TIME</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Select a date</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 28 }}>
                    {["Mar 3", "Mar 4", "Mar 5", "Mar 6", "Mar 7"].map(d => (
                      <div key={d} onClick={() => setSelectedDate(d)} style={{ padding: "12px", textAlign: "center", border: "1px solid", borderColor: selectedDate === d ? "#FF4D00" : "rgba(255,255,255,0.1)", background: selectedDate === d ? "rgba(255,77,0,0.1)" : "#111", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: selectedDate === d ? "#FF4D00" : "rgba(255,255,255,0.6)" }}>
                        {d}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>Available time slots</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
                    {bookingShop.slots.map(slot => (
                      <div key={slot} className={`slot${selectedSlot === slot ? " active" : ""}`} onClick={() => setSelectedSlot(slot)}>{slot}</div>
                    ))}
                  </div>
                  <button className="btn-main" disabled={!selectedSlot || !selectedDate} style={{ opacity: selectedSlot && selectedDate ? 1 : 0.4 }} onClick={() => setBookingStep(3)}>Continue →</button>
                </div>
              )}

              {bookingStep === 3 && (
                <div>
                  <div style={{ fontSize: 36, letterSpacing: 1, marginBottom: 24 }}>YOUR INFO & PAYMENT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>FIRST NAME</div><input placeholder="Marcus" /></div>
                    <div><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>LAST NAME</div><input placeholder="Thompson" /></div>
                  </div>
                  <div style={{ marginBottom: 14 }}><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>EMAIL</div><input placeholder="marcus@email.com" /></div>
                  <div style={{ marginBottom: 14 }}><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>PHONE</div><input placeholder="(404) 555-0100" /></div>
                  <div style={{ marginBottom: 14 }}><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>VEHICLE</div><input placeholder="2023 BMW M4 Competition" /></div>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "24px 0" }} />
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>PAYMENT</div>
                  <div style={{ marginBottom: 14 }}><input placeholder="Card number" /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
                    <input placeholder="MM / YY" />
                    <input placeholder="CVC" />
                  </div>
                  <div style={{ background: "rgba(255,77,0,0.05)", border: "1px solid rgba(255,77,0,0.2)", padding: "12px 16px", marginBottom: 20, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    🔒 Payment processed securely via Stripe. A 7% WrapLocal service fee is included.
                  </div>
                  <button className="btn-main" style={{ width: "100%", fontSize: 20 }} onClick={() => setBookingConfirmed(true)}>Confirm & Pay $1,284.00 →</button>
                </div>
              )}
            </div>

            {/* Summary sidebar */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", padding: 24, position: "sticky", top: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: bookingShop.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{bookingShop.avatar}</div>
                <div>
                  <div style={{ fontSize: 18, letterSpacing: 1 }}>{bookingShop.name}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>★ {bookingShop.rating} · {bookingShop.location}</div>
                </div>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />
              {[["Service", "Full Color Change Wrap"], ["Date", selectedDate || "—"], ["Time", selectedSlot || "—"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 10 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>{k}</span>
                  <span style={{ color: "#fff" }}>{v}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Service</span><span>$1,200.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>WrapLocal fee (7%)</span><span>$84.00</span>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, letterSpacing: 1 }}>
                <span>TOTAL</span><span style={{ color: "#FF4D00" }}>$1,284.00</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
