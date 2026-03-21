import { useState, useEffect } from "react";
import { createBooking, sendMessage } from "../lib/queries";
import { supabase } from "../lib/supabase";
import { SERVICE_CATEGORIES } from "../lib/services";

export default function BookingFlow({
  nav, bookingShop, bookingStep, setBookingStep,
  selectedSlot, setSelectedSlot, selectedDate, setSelectedDate,
  bookingConfirmed, setBookingConfirmed, currentUser,
}) {
  const [designOption, setDesignOption] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [vehicleType, setVehicleType] = useState("");
  const [shopMessage, setShopMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [preferredDates, setPreferredDates] = useState([]);

  // Derived: does the selected service require vehicle info?
  const vehicleCategory = SERVICE_CATEGORIES.find(c => c.category === "Vehicle Wraps");
  const isVehicleService = !!vehicleCategory?.services.find(s => s.name === selectedService);

  // Only show services that this specific shop offers
  const shopTags = bookingShop?.tags || [];
  const shopServiceCategories = SERVICE_CATEGORIES
    .map(cat => ({ ...cat, services: cat.services.filter(s => shopTags.includes(s.name)) }))
    .filter(cat => cat.services.length > 0);

  // Upcoming 10 dates (excluding Sundays)
  const upcomingDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    if (d.getDay() === 0) return null;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }).filter(Boolean).slice(0, 10);

  useEffect(() => {
    if (!currentUser) return;
    const fullName = currentUser.user_metadata?.name || currentUser.user_metadata?.business_name || "";
    const parts = fullName.trim().split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
    setCustomerEmail(currentUser.email || "");
  }, [currentUser]);

  const handleSubmit = async () => {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      if (currentUser && bookingShop?.id) {
        // Ensure a profiles row exists for this customer (satisfies FK constraint)
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          role: 'customer',
          name: `${firstName} ${lastName}`.trim() || currentUser.user_metadata?.name || 'Customer',
        }, { onConflict: 'id' });

        const { data: booking, error: bookingError } = await createBooking({
          shopId: bookingShop.id,
          customerId: currentUser.id,
          service: selectedService,
          date: selectedDate,
          timeSlot: selectedSlot,
          preferredDates: preferredDates.length > 0 ? JSON.stringify(preferredDates) : null,
          vehicle: vehicleType,
          designOption,
          designFileUrl: null,
          amount: 0,
        });
        if (bookingError || !booking) {
          setSubmitError(bookingError?.message || bookingError?.details || JSON.stringify(bookingError) || "Could not save your request.");
          setIsSubmitting(false);
          return;
        }
        // Send initial message if customer left one
        if (shopMessage.trim()) {
          await sendMessage({ bookingId: booking.id, senderId: currentUser.id, senderRole: "customer", text: shopMessage.trim() });
        }
      }
      setBookingConfirmed(true);
    } catch (e) {
      setSubmitError("Something went wrong. Please try again.");
    }
    setIsSubmitting(false);
  };

  if (!bookingShop) return null;
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input, select, textarea { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; width: 100%; } input:focus, textarea:focus { border-color: #FF4D00; } textarea { resize: vertical; min-height: 90px; line-height: 1.5; } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 14px 32px; font-family: 'Bebas Neue', cursive; font-size: 18px; letter-spacing: 2px; cursor: pointer; transition: all 0.2s; } .slot { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 10px 18px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; transition: all 0.2s; } .slot:hover, .slot.active { background: rgba(255,77,0,0.15); border-color: #FF4D00; color: #FF4D00; } @media (max-width: 768px) { .booking-nav { padding: 12px 16px !important; } .booking-pad { padding: 20px !important; } .booking-layout { grid-template-columns: 1fr !important; } .booking-sidebar { position: static !important; } .step-label { display: none !important; } .date-grid { grid-template-columns: repeat(3, 1fr) !important; } .name-grid { grid-template-columns: 1fr !important; } .confirm-btns { flex-direction: column !important; } .confirm-btns button { width: 100%; } }`}</style>

      <nav className="booking-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>KI<span style={{ color: "#fff" }}>DOR</span></div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", cursor: "pointer" }} onClick={() => { if (bookingStep === 2) { setBookingStep(1); } else { nav("shop"); } }}>← Back</span>
      </nav>

      {bookingConfirmed ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 56, letterSpacing: 2, marginBottom: 12, color: "#FF4D00" }}>REQUEST SENT!</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
            Your request at <b style={{ color: "#fff" }}>{bookingShop.name}</b> has been received.
            {preferredDates.length > 0 && <span> Your preferred dates have been noted.</span>}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>Ref #WL-{Math.floor(2000 + Math.random() * 1000)}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)", marginBottom: 40, maxWidth: 440, lineHeight: 1.6 }}>The shop will review your request and send a personalised quote. Once you agree and pay, they will schedule your appointment.</div>
          <div className="confirm-btns" style={{ display: "flex", gap: 16 }}>
            <button className="btn-main" onClick={() => nav("customer-dash")}>View My Bookings</button>
            <button className="btn-main" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)" }} onClick={() => nav("landing")}>Back to Home</button>
          </div>
        </div>
      ) : (
        <div className="booking-pad" style={{ maxWidth: 800, margin: "0 auto", padding: "40px 40px" }}>
          {/* Progress */}
          <div style={{ display: "flex", marginBottom: 48 }}>
            {["Choose Service", "Your Info"].map((s, i) => (
              <div key={s} style={{ flex: 1, display: "flex", alignItems: "center", gap: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: bookingStep >= i + 1 ? "#FF4D00" : "#222", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: bookingStep >= i + 1 ? "#fff" : "rgba(255,255,255,0.3)", flexShrink: 0 }}>{i + 1}</div>
                  <span className="step-label" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: bookingStep === i + 1 ? "#fff" : "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{s}</span>
                </div>
                {i < 1 && <div style={{ flex: 1, height: 1, background: bookingStep > i + 1 ? "#FF4D00" : "rgba(255,255,255,0.1)", margin: "0 12px" }} />}
              </div>
            ))}
          </div>

          <div className="booking-layout" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32, alignItems: "start" }}>
            <div>
              {bookingStep === 1 && (
                <div>
                  <div style={{ fontSize: 36, letterSpacing: 1, marginBottom: 6 }}>CHOOSE A SERVICE</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 22 }}>
                    The shop will send you a quote after reviewing your request.
                  </div>
                  {(shopServiceCategories.length > 0 ? shopServiceCategories : SERVICE_CATEGORIES).map(({ category, services }) => (
                    <div key={category} style={{ marginBottom: 24 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 10 }}>{category.toUpperCase()}</div>
                      {services.map(({ name: s, description: d }) => (
                    <div key={s} onClick={() => setSelectedService(s)}
                      style={{ padding: "16px 20px", border: "1px solid", borderColor: selectedService === s ? "#FF4D00" : "rgba(255,255,255,0.08)", background: selectedService === s ? "rgba(255,77,0,0.07)" : "#111", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}
                      onMouseEnter={e => { if (selectedService !== s) e.currentTarget.style.borderColor = "rgba(255,77,0,0.4)"; }}
                      onMouseLeave={e => { if (selectedService !== s) e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
                      <div>
                        <div style={{ fontSize: 20, letterSpacing: 1 }}>{s}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{d}</div>
                      </div>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selectedService === s ? "#FF4D00" : "rgba(255,255,255,0.2)"}`, background: selectedService === s ? "#FF4D00" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                        {selectedService === s && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                      </div>
                    </div>
                      ))}
                    </div>
                  ))}
                  {isVehicleService && (
                  <div style={{ marginTop: 24, marginBottom: 6 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, letterSpacing: 1 }}>YOUR VEHICLE</div>
                    <input
                      placeholder="e.g. 2023 BMW M4 Competition, 2021 Ford F-150..."
                      value={vehicleType}
                      onChange={e => setVehicleType(e.target.value)}
                    />
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
                      Helps the shop give you an accurate quote
                    </div>
                  </div>
                  )}
                  <div style={{ marginTop: 20 }}>
                    <button className="btn-main" disabled={!selectedService} style={{ opacity: selectedService ? 1 : 0.4 }} onClick={() => setBookingStep(2)}>
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {bookingStep === 2 && (
                <div>
                  <div style={{ fontSize: 36, letterSpacing: 1, marginBottom: 6 }}>YOUR INFO</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
                    No payment needed now — the shop will confirm your appointment and send you a quote.
                  </div>
                  <div className="name-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>FIRST NAME</div><input placeholder="Marcus" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                    <div><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>LAST NAME</div><input placeholder="Thompson" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
                  </div>
                  <div style={{ marginBottom: 14 }}><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>EMAIL</div><input placeholder="marcus@email.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} /></div>
                  <div style={{ marginBottom: 14 }}><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>PHONE</div><input placeholder="(404) 555-0100" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
                  {isVehicleService && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>VEHICLE</div>
                    <input placeholder="2023 BMW M4 Competition" value={vehicleType} onChange={e => setVehicleType(e.target.value)} />
                  </div>
                  )}                  {/* Preferred dates */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 4 }}>PREFERRED DATES <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(pick up to 3 — optional)</span></div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Tell the shop when works best for you — they'll confirm a date that fits.</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      {upcomingDates.map(label => {
                        const sel = preferredDates.find(p => p.date === label);
                        const maxed = preferredDates.length >= 3;
                        return (
                          <div key={label}
                            onClick={() => {
                              if (sel) setPreferredDates(p => p.filter(x => x.date !== label));
                              else if (!maxed) setPreferredDates(p => [...p, { date: label, time: "Flexible" }]);
                            }}
                            style={{ padding: "7px 12px", border: "1px solid", borderColor: sel ? "#FF4D00" : "rgba(255,255,255,0.1)", background: sel ? "rgba(255,77,0,0.1)" : "#1A1A1A", cursor: maxed && !sel ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: sel ? "#FF4D00" : "rgba(255,255,255,0.55)", transition: "all 0.15s", opacity: maxed && !sel ? 0.4 : 1 }}>
                            {label}{sel ? " ✓" : ""}
                          </div>
                        );
                      })}
                    </div>
                    {preferredDates.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {preferredDates.map((p, i) => (
                          <div key={p.date} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", background: "rgba(255,77,0,0.05)", border: "1px solid rgba(255,77,0,0.15)" }}>
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", flexShrink: 0, minWidth: 120 }}>{i + 1}. {p.date}</span>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {["Morning", "Afternoon", "Evening", "Flexible"].map(t => (
                                <div key={t}
                                  onClick={() => setPreferredDates(prev => prev.map(x => x.date === p.date ? { ...x, time: t } : x))}
                                  style={{ padding: "3px 10px", border: "1px solid", borderColor: p.time === t ? "#FF4D00" : "rgba(255,255,255,0.1)", background: p.time === t ? "rgba(255,77,0,0.12)" : "transparent", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: p.time === t ? "#FF4D00" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.15s" }}>
                                  {t}
                                </div>
                              ))}
                            </div>
                            <span onClick={() => setPreferredDates(pd => pd.filter(x => x.date !== p.date))} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,77,0,0.6)", cursor: "pointer", marginLeft: "auto" }}>✕</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>DESIGN</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[["own", "🎨", "I have my own design"], ["shop", "✏️", "Need the shop to design"]].map(([val, icon, label]) => (
                        <div key={val} onClick={() => setDesignOption(val)}
                          style={{ flex: 1, padding: "14px 12px", border: "1px solid", borderColor: designOption === val ? "#FF4D00" : "rgba(255,255,255,0.1)", background: designOption === val ? "rgba(255,77,0,0.08)" : "#111", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                          <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: designOption === val ? "#FF4D00" : "rgba(255,255,255,0.6)", lineHeight: 1.3 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {designOption === "own" && (
                      <div style={{ marginTop: 10 }}>
                        <input placeholder="Link to your design file (Google Drive, Dropbox, etc.)" />
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>MESSAGE TO SHOP <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>(optional)</span></div>
                    <textarea
                      placeholder="Any specific details about your vehicle, color preferences, finish type, or questions for the shop..."
                      value={shopMessage}
                      onChange={e => setShopMessage(e.target.value)}
                    />
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "14px 18px", marginBottom: 22, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    💬 After submitting, the shop will review your request and send you a personalised quote. Once you agree and pay, the shop will schedule your appointment date and time.
                  </div>
                  {submitError && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF6A20", marginBottom: 12, padding: "10px 14px", background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.2)" }}>{submitError}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => setBookingStep(1)}>← Change service</span>
                    <button className="btn-main" style={{ flex: 1, fontSize: 20, opacity: isSubmitting ? 0.6 : 1 }} disabled={isSubmitting} onClick={handleSubmit}>{isSubmitting ? "Submitting..." : "Request Appointment →"}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Summary sidebar */}
            <div className="booking-sidebar" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", padding: 24, position: "sticky", top: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: bookingShop.color || "#FF4D00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
                  {bookingShop.avatar || (bookingShop.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, letterSpacing: 1 }}>{bookingShop.name}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    {bookingShop.rating > 0 ? `★ ${bookingShop.rating} · ` : ""}{bookingShop.location || bookingShop.city || ""}
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />
              {[
                ["Service", selectedService || "—"],
                ...(isVehicleService ? [["Vehicle", vehicleType || "—"]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 10, gap: 8 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>{k}</span>
                  <span style={{ color: "#fff", textAlign: "right", fontSize: v === "—" ? 13 : 12.5 }}>{v}</span>
                </div>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 0" }} />
              <div style={{ background: "rgba(255,77,0,0.07)", border: "1px solid rgba(255,77,0,0.2)", padding: "12px 14px" }}>
                <div style={{ fontSize: 16, letterSpacing: 1, marginBottom: 4 }}>SCHEDULING</div>
                {preferredDates.length > 0 ? (
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 8, lineHeight: 1.5 }}>Your preferred dates:</div>
                    {preferredDates.map((p, i) => (
                      <div key={p.date} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>{i + 1}. {p.date} — {p.time}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                    Date &amp; time will be agreed upon with the shop after your quote is accepted.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
