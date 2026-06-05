import { useState, useRef, useEffect } from "react";
import { createBooking, sendMessage, uploadDesignFile, fetchShopAvailability, sendNotification } from "../lib/queries";
import { supabase } from "../lib/supabase";
import { SERVICE_CATEGORIES } from "../lib/services";

export default function BookingFlow({
  nav, bookingShop, bookingStep, setBookingStep,
  selectedSlot, selectedDate,
  bookingConfirmed, setBookingConfirmed, currentUser,
}) {
  const [designOption, setDesignOption] = useState(null);
  const [designFileUrl, setDesignFileUrl] = useState("");
  const [designFileName, setDesignFileName] = useState("");
  const [designFileUploading, setDesignFileUploading] = useState(false);
  const [designLinkInput, setDesignLinkInput] = useState("");
  const designFileRef = useRef(null);
  const [selectedService, setSelectedService] = useState(null);
  const [vehicleType, setVehicleType] = useState("");
  const [isFleet, setIsFleet] = useState(false);
  const [fleetQuantity, setFleetQuantity] = useState(2);
  const [vehicleOwnership, setVehicleOwnership] = useState("personal");
  const [shopMessage, setShopMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [preferredDates, setPreferredDates] = useState([]);
  const [requestRef] = useState(() => Math.floor(2000 + Math.random() * 1000));

  // ── Availability calendar ────────────────────────────────────────────────
  const initDate = new Date();
  const [bookingCalYear, setBookingCalYear] = useState(initDate.getFullYear());
  const [bookingCalMonth, setBookingCalMonth] = useState(initDate.getMonth());
  const [shopAvail, setShopAvail] = useState({ workingDays: [1, 2, 3, 4, 5, 6], blockedDates: [] });

  // Format ISO date "YYYY-MM-DD" → "Mon, Apr 7"
  const fmtDate = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Fetch shop's availability when booking flow opens
  useEffect(() => {
    if (!bookingShop?.id || typeof bookingShop.id !== "string") return;
    fetchShopAvailability(bookingShop.id).then(avail => setShopAvail(avail));
  }, [bookingShop?.id]);

  useEffect(() => {
    if (!currentUser) return;
    const fullName = currentUser.user_metadata?.name || currentUser.user_metadata?.business_name || "";
    const parts = fullName.trim().split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
    setCustomerEmail(currentUser.email || "");
  }, [currentUser]);

  // Derived: does the selected service require a vehicle?
  const vehicleCategory = SERVICE_CATEGORIES.find(c => c.category === "Vehicle Wraps");
  const isVehicleService = !!vehicleCategory?.services.find(s => s.name === selectedService);

  // Only show services that this shop offers (filter by shop tags)
  const shopTags = bookingShop?.tags || [];
  const shopServiceCategories = SERVICE_CATEGORIES
    .map(cat => ({ ...cat, services: cat.services.filter(s => shopTags.includes(s.name)) }))
    .filter(cat => cat.services.length > 0);

  const handleSubmit = async () => {
    setSubmitError("");
    if (!firstName.trim() || !lastName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setSubmitError("Please fill in your first name, last name, email, and phone number.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (currentUser && bookingShop?.id) {
        const profileName = `${firstName} ${lastName}`.trim() || currentUser.user_metadata?.name || 'Customer';
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profileError) {
          setSubmitError("Could not verify your account type. Please try again.");
          setIsSubmitting(false);
          return;
        }

        const accountRole = profile?.role || currentUser.user_metadata?.role;
        if (accountRole && accountRole !== 'customer') {
          setSubmitError("Business accounts cannot book appointments. Please use a customer account to book.");
          setIsSubmitting(false);
          return;
        }

        if (profile) {
          await supabase.from('profiles').update({ name: profileName }).eq('id', currentUser.id);
        } else {
          await supabase.from('profiles').insert({ id: currentUser.id, role: 'customer', name: profileName });
        }

        const vehicleString = isVehicleService
          ? [
              vehicleType,
              isFleet ? `Fleet ×${fleetQuantity} vehicles` : null,
              vehicleOwnership === "company" ? "(Company vehicle)" : "(Personal vehicle)",
            ].filter(Boolean).join(" — ")
          : vehicleType;

        const { data: booking, error: bookingError } = await createBooking({
          shopId: bookingShop.id,
          customerId: currentUser.id,
          service: selectedService,
          date: selectedDate,
          timeSlot: selectedSlot,
          preferredDates: preferredDates.length > 0 ? JSON.stringify(preferredDates) : null,
          vehicle: vehicleString,
          designOption,
          designFileUrl: designFileUrl || designLinkInput || null,
        });
        if (bookingError || !booking) {
          setSubmitError(bookingError?.message || bookingError?.details || JSON.stringify(bookingError) || "Could not save your request.");
          setIsSubmitting(false);
          return;
        }
        sendNotification("booking_created", booking.id);
        // Send customer contact info as first message so shop can always see it
        await sendMessage({ bookingId: booking.id, senderId: currentUser.id, senderRole: "customer", text: `📋 Contact info — ${firstName.trim()} ${lastName.trim()} · ${customerEmail.trim()} · ${customerPhone.trim()}` });
        // Send design file into chat so the shop can see it immediately
        if (designFileUrl) {
          await sendMessage({ bookingId: booking.id, senderId: currentUser.id, senderRole: "customer", text: `FILE::${designFileUrl}::${designFileName || "design-file"}` });
        } else if (designLinkInput.trim()) {
          await sendMessage({ bookingId: booking.id, senderId: currentUser.id, senderRole: "customer", text: `🎨 My design: ${designLinkInput.trim()}` });
        }
        // Send initial message if customer left one
        if (shopMessage.trim()) {
          await sendMessage({ bookingId: booking.id, senderId: currentUser.id, senderRole: "customer", text: shopMessage.trim() });
        }
      }
      setBookingConfirmed(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
    setIsSubmitting(false);
  };

  if (!bookingShop) return null;
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "linear-gradient(180deg, #0A0A0A 0%, #140A04 20%, #0A0A0A 55%, #05050C 100%)", minHeight: "100vh", color: "#fff", position: "relative", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input, select, textarea { background: #151515; border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; width: 100%; transition: border-color 0.2s, background 0.2s; } input:focus, textarea:focus { border-color: #FF4D00; background: #1a1a1a; } textarea { resize: vertical; min-height: 90px; line-height: 1.5; } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 14px 32px; font-family: 'Bebas Neue', cursive; font-size: 18px; letter-spacing: 2px; cursor: pointer; transition: background 0.2s, transform 0.15s; } .btn-main:hover { background: #FF6A20; transform: translateY(-1px); } .slot { background: #151515; border: 1px solid rgba(255,255,255,0.08); padding: 10px 18px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; transition: all 0.18s; } .slot:hover, .slot.active { background: rgba(255,77,0,0.12); border-color: #FF4D00; color: #FF4D00; transform: translateY(-1px); } .svc-row { width: 100%; text-align: left; color: #fff; padding: 16px 20px; border: 1px solid rgba(255,255,255,0.08); background: #111; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: border-color 0.15s, background 0.15s, transform 0.15s; } .svc-row:hover { border-color: rgba(255,77,0,0.35); background: rgba(255,77,0,0.04); transform: translateX(2px); } .svc-row.active { border-color: #FF4D00; background: rgba(255,77,0,0.08); } @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes glow-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 0.8; } } @keyframes orb-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } } .step-content { animation: fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both; } .booking-confirm-anim { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; } @media (max-width: 768px) { .booking-nav { padding: 12px 16px !important; } .booking-pad { padding: 20px !important; max-width: 100% !important; } .booking-layout { grid-template-columns: 1fr !important; gap: 24px !important; } .booking-sidebar { position: static !important; } .step-label { display: none !important; } .date-grid { grid-template-columns: repeat(3, 1fr) !important; } .name-grid { grid-template-columns: 1fr !important; } .confirm-btns { flex-direction: column !important; } .confirm-btns button { width: 100%; } } @media (max-width: 420px) { .booking-pad { padding: 14px !important; } }`}</style>

      {/* Ambient orbs */}
      <div aria-hidden="true" style={{ position: "fixed", top: "-10%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,77,0,0.18) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 6s ease-in-out infinite", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-8%", width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "orb-drift 14s ease-in-out infinite", zIndex: 0 }} />
      <nav className="booking-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button className="image-button" onClick={() => nav("landing")} aria-label="Go to WrapBridge home">
          <img src="/images/Logo.png" alt="" style={{ height: 68, display: "block" }} />
        </button>
        <button className="link-button" type="button" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.65)", cursor: "pointer" }} onClick={() => { if (bookingStep === 2) { setBookingStep(1); } else { nav("shop"); } }}>← Back</button>
      </nav>

      {bookingConfirmed ? (
        <div className="booking-confirm-anim" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
          <div style={{ fontSize: 56, letterSpacing: 2, marginBottom: 12, color: "#FF4D00" }}>REQUEST SENT!</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
            Your request at <strong style={{ color: "#fff" }}>{bookingShop.name}</strong> has been received.
            {preferredDates.length > 0 && <span> Your preferred dates have been noted.</span>}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>Ref #WL-{requestRef}</div>
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
              {!bookingShop?.insurance_verified && (
                <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", padding: "14px 20px", marginBottom: 20, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                  ⚠️ <strong style={{ color: "#F59E0B" }}>This business has not confirmed insurance coverage.</strong> WrapBridge is a marketplace and does not guarantee service provider work. You may be responsible for verifying the provider's insurance and liability coverage before authorizing any work on your property or vehicle.
                </div>
              )}
              {bookingStep === 1 && (
                <div className="step-content">
                  <div style={{ fontSize: 36, letterSpacing: 1, marginBottom: 6 }}>CHOOSE A SERVICE</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 22 }}>
                    The shop will send you a quote after reviewing your request.
                  </div>
                  {(shopServiceCategories.length > 0 ? shopServiceCategories : SERVICE_CATEGORIES).map(({ category, services }) => (
                    <div key={category} style={{ marginBottom: 24 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 10 }}>{category.toUpperCase()}</div>
                      {services.map(({ name: s, description: d }) => (
                    <button key={s} type="button" onClick={() => setSelectedService(s)} aria-pressed={selectedService === s}
                      className={`svc-row${selectedService === s ? " active" : ""}`}>
                      <div>
                        <div style={{ fontSize: 20, letterSpacing: 1 }}>{s}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{d}</div>
                      </div>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selectedService === s ? "#FF4D00" : "rgba(255,255,255,0.2)"}`, background: selectedService === s ? "#FF4D00" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                        {selectedService === s && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                      </div>
                    </button>
                      ))}
                    </div>
                  ))}
                  {isVehicleService && (
                  <div style={{ marginTop: 24, marginBottom: 6 }}>
                    <label htmlFor="booking-vehicle-type-step1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.72)", marginBottom: 8, letterSpacing: 1, display: "block" }}>VEHICLE TYPE <span style={{ color: "#FF4D00" }}>*</span></label>
                    <input
                      id="booking-vehicle-type-step1"
                      placeholder="e.g. 2023 BMW M4 Competition, 2021 Ford F-150..."
                      value={vehicleType}
                      onChange={e => setVehicleType(e.target.value)}
                    />
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
                      Helps the shop give you an accurate quote
                    </div>
                    {/* Fleet toggle */}
                    <label style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                      <input type="checkbox" checked={isFleet} onChange={e => setIsFleet(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#FF4D00", flexShrink: 0 }} />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.72)" }}>
                        This is a fleet booking (multiple vehicles)
                      </span>
                    </label>
                    {isFleet && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: 1 }}>NUMBER OF VEHICLES</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 0, width: "fit-content" }}>
                          <button type="button" aria-label="Decrease number of vehicles" onClick={() => setFleetQuantity(q => Math.max(2, q - 1))} style={{ width: 36, height: 40, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "none" }}>−</button>
                          <div style={{ width: 56, height: 40, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#FF4D00", fontWeight: 600 }}>{fleetQuantity}</div>
                          <button type="button" aria-label="Increase number of vehicles" onClick={() => setFleetQuantity(q => Math.min(500, q + 1))} style={{ width: 36, height: 40, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "none" }}>+</button>
                        </div>
                      </div>
                    )}
                    {/* Personal / Company */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, letterSpacing: 1 }}>VEHICLE OWNERSHIP</div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {["personal", "company"].map(v => (
                          <button key={v} type="button" onClick={() => setVehicleOwnership(v)} aria-pressed={vehicleOwnership === v}
                            style={{ flex: 1, padding: "10px 14px", border: `1px solid ${vehicleOwnership === v ? "#FF4D00" : "rgba(255,255,255,0.1)"}`, background: vehicleOwnership === v ? "rgba(255,77,0,0.08)" : "#111", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${vehicleOwnership === v ? "#FF4D00" : "rgba(255,255,255,0.25)"}`, background: vehicleOwnership === v ? "#FF4D00" : "transparent", flexShrink: 0, transition: "all 0.15s" }} />
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: vehicleOwnership === v ? "#FF4D00" : "rgba(255,255,255,0.55)", textTransform: "capitalize" }}>{v} vehicle</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  )}
                  <div style={{ marginTop: 20 }}>
                    <button className="btn-main" disabled={!selectedService || (isVehicleService && !vehicleType.trim())} style={{ opacity: (selectedService && (!isVehicleService || vehicleType.trim())) ? 1 : 0.4 }} onClick={() => setBookingStep(2)}>
                      Continue →
                    </button>
                    {isVehicleService && !vehicleType.trim() && selectedService && (
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,77,0,0.8)", marginTop: 8 }}>Please enter your vehicle type to continue.</div>
                    )}
                  </div>
                </div>
              )}

              {bookingStep === 2 && (
                <div className="step-content">
                  <div style={{ fontSize: 36, letterSpacing: 1, marginBottom: 6 }}>YOUR INFO</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
                    No payment needed now — the shop will confirm your appointment and send you a quote.
                  </div>
                  <div className="name-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div><label htmlFor="booking-first-name" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.72)", marginBottom: 6, display: "block" }}>FIRST NAME <span style={{ color: "#FF4D00" }}>*</span></label><input id="booking-first-name" autoComplete="given-name" placeholder="Marcus" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
                    <div><label htmlFor="booking-last-name" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.72)", marginBottom: 6, display: "block" }}>LAST NAME <span style={{ color: "#FF4D00" }}>*</span></label><input id="booking-last-name" autoComplete="family-name" placeholder="Thompson" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
                  </div>
                  <div style={{ marginBottom: 14 }}><label htmlFor="booking-email" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.72)", marginBottom: 6, display: "block" }}>EMAIL <span style={{ color: "#FF4D00" }}>*</span></label><input id="booking-email" type="email" autoComplete="email" placeholder="marcus@email.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} /></div>
                  <div style={{ marginBottom: 14 }}><label htmlFor="booking-phone" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.72)", marginBottom: 6, display: "block" }}>PHONE <span style={{ color: "#FF4D00" }}>*</span></label><input id="booking-phone" type="tel" autoComplete="tel" placeholder="(404) 555-0100" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
                  {isVehicleService && (
                  <div style={{ marginBottom: 14 }}>
                    <label htmlFor="booking-vehicle-type-step2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.72)", marginBottom: 6, display: "block" }}>VEHICLE TYPE</label>
                    <input id="booking-vehicle-type-step2" placeholder="2023 BMW M4 Competition" value={vehicleType} onChange={e => setVehicleType(e.target.value)} />
                    {/* Fleet */}
                    <label style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                      <input type="checkbox" checked={isFleet} onChange={e => setIsFleet(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#FF4D00", flexShrink: 0 }} />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.72)" }}>Fleet booking (multiple vehicles)</span>
                    </label>
                    {isFleet && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6, letterSpacing: 1 }}>NUMBER OF VEHICLES</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 0, width: "fit-content" }}>
                          <button type="button" aria-label="Decrease number of vehicles" onClick={() => setFleetQuantity(q => Math.max(2, q - 1))} style={{ width: 36, height: 40, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "none" }}>−</button>
                          <div style={{ width: 56, height: 40, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#FF4D00", fontWeight: 600 }}>{fleetQuantity}</div>
                          <button type="button" aria-label="Increase number of vehicles" onClick={() => setFleetQuantity(q => Math.min(500, q + 1))} style={{ width: 36, height: 40, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "none" }}>+</button>
                        </div>
                      </div>
                    )}
                    {/* Personal / Company */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8, letterSpacing: 1 }}>VEHICLE OWNERSHIP</div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {["personal", "company"].map(v => (
                          <button key={v} type="button" onClick={() => setVehicleOwnership(v)} aria-pressed={vehicleOwnership === v}
                            style={{ flex: 1, padding: "10px 14px", border: `1px solid ${vehicleOwnership === v ? "#FF4D00" : "rgba(255,255,255,0.1)"}`, background: vehicleOwnership === v ? "rgba(255,77,0,0.08)" : "#111", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${vehicleOwnership === v ? "#FF4D00" : "rgba(255,255,255,0.25)"}`, background: vehicleOwnership === v ? "#FF4D00" : "transparent", flexShrink: 0 }} />
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: vehicleOwnership === v ? "#FF4D00" : "rgba(255,255,255,0.55)", textTransform: "capitalize" }}>{v} vehicle</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  )}                  {/* Preferred dates — calendar picker */}
                  <div style={{ marginBottom: 20 }}>
                    <div id="preferred-dates-label" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.72)", letterSpacing: 1, marginBottom: 4 }}>PREFERRED DATES <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(pick up to 3 — optional)</span></div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>Select dates that work for you — the shop will confirm a time that fits.</div>

                    {/* Month navigation */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <button type="button" aria-label="Previous month" onClick={() => { const d = new Date(bookingCalYear, bookingCalMonth - 1, 1); setBookingCalMonth(d.getMonth()); setBookingCalYear(d.getFullYear()); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 15 }}>‹</button>
                      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, minWidth: 150, textAlign: "center" }}>{new Date(bookingCalYear, bookingCalMonth).toLocaleString("en-US", { month: "long" }).toUpperCase()} {bookingCalYear}</div>
                      <button type="button" aria-label="Next month" onClick={() => { const d = new Date(bookingCalYear, bookingCalMonth + 1, 1); setBookingCalMonth(d.getMonth()); setBookingCalYear(d.getFullYear()); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 15 }}>›</button>
                    </div>

                    {/* Day headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                        <div key={d} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.22)", textAlign: "center", padding: "3px 0", letterSpacing: 1 }}>{d}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    {(() => {
                      const daysInMonth = new Date(bookingCalYear, bookingCalMonth + 1, 0).getDate();
                      const firstDow = new Date(bookingCalYear, bookingCalMonth, 1).getDay();
                      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                      const tomorrowIso = tomorrow.toISOString().slice(0, 10);
                      const cells = [];
                      for (let i = 0; i < firstDow; i++) cells.push(<div key={`e${i}`} />);
                      for (let day = 1; day <= daysInMonth; day++) {
                        const iso = `${bookingCalYear}-${String(bookingCalMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isPast = iso < tomorrowIso;
                        const isBlocked = shopAvail.blockedDates.includes(iso);
                        const isWorkDay = shopAvail.workingDays.includes(new Date(iso + "T00:00:00").getDay());
                        const unavailable = isPast || isBlocked || !isWorkDay;
                        const isSelected = preferredDates.some(p => p.date === iso);
                        const maxed = preferredDates.length >= 3 && !isSelected;
                        cells.push(
                          <button key={day} type="button"
                            disabled={unavailable || maxed}
                            aria-pressed={isSelected}
                            aria-label={`${isSelected ? "Remove" : "Select"} ${fmtDate(iso)}`}
                            onClick={() => {
                              if (unavailable || maxed) return;
                              if (isSelected) setPreferredDates(p => p.filter(x => x.date !== iso));
                              else setPreferredDates(p => [...p, { date: iso, time: "Flexible" }]);
                            }}
                            title={isBlocked ? "Unavailable" : !isWorkDay && !isPast ? "Shop closed" : isSelected ? "Click to deselect" : unavailable ? "" : "Click to select"}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              height: 38, border: "1px solid",
                              borderColor: isSelected ? "#FF4D00" : unavailable ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.09)",
                              background: isSelected ? "rgba(255,77,0,0.15)" : unavailable ? "transparent" : "#1A1A1A",
                              cursor: unavailable || maxed ? "default" : "pointer",
                              opacity: unavailable ? 0.22 : maxed ? 0.45 : 1,
                              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                              color: isSelected ? "#FF4D00" : unavailable ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.75)",
                              fontWeight: isSelected ? 600 : 400,
                              transition: "all 0.12s",
                            }}
                          >
                            {day}
                          </button>
                        );
                      }
                      return <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>{cells}</div>;
                    })()}

                    {/* Legend */}
                    <div style={{ display: "flex", gap: 16, marginTop: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "rgba(255,77,0,0.15)", border: "1px solid #FF4D00", display: "inline-block" }} /> Selected</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.09)", display: "inline-block" }} /> Available</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.03)", display: "inline-block" }} /> Unavailable</span>
                    </div>

                    {/* Time preferences for selected dates */}
                    {preferredDates.length > 0 && (
                      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                        {preferredDates.map((p, i) => (
                          <div key={p.date} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", background: "rgba(255,77,0,0.05)", border: "1px solid rgba(255,77,0,0.15)" }}>
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", flexShrink: 0, minWidth: 120 }}>{i + 1}. {fmtDate(p.date)}</span>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {["Morning", "Afternoon", "Evening", "Flexible"].map(t => (
                                <button key={t} type="button"
                                  aria-pressed={p.time === t}
                                  onClick={() => setPreferredDates(prev => prev.map(x => x.date === p.date ? { ...x, time: t } : x))}
                                  style={{ padding: "3px 10px", border: "1px solid", borderColor: p.time === t ? "#FF4D00" : "rgba(255,255,255,0.1)", background: p.time === t ? "rgba(255,77,0,0.12)" : "transparent", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: p.time === t ? "#FF4D00" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "all 0.15s" }}>
                                  {t}
                                </button>
                              ))}
                            </div>
                            <button className="link-button" type="button" aria-label={`Remove ${fmtDate(p.date)}`} onClick={() => setPreferredDates(pd => pd.filter(x => x.date !== p.date))} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,77,0,0.85)", cursor: "pointer", marginLeft: "auto" }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>                  <div style={{ marginBottom: 14 }}>
                    <div id="design-option-label" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.72)", marginBottom: 10 }}>DESIGN</div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[["own", "🎨", "I have my own design"], ["shop", "✏️", "Need the shop to design"]].map(([val, icon, label]) => (
                        <button key={val} type="button" onClick={() => setDesignOption(val)} aria-pressed={designOption === val}
                          style={{ flex: 1, padding: "14px 12px", border: "1px solid", borderColor: designOption === val ? "#FF4D00" : "rgba(255,255,255,0.1)", background: designOption === val ? "rgba(255,77,0,0.08)" : "#111", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                          <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: designOption === val ? "#FF4D00" : "rgba(255,255,255,0.6)", lineHeight: 1.3 }}>{label}</div>
                        </button>
                      ))}
                    </div>
                    {designOption === "own" && (
                      <div style={{ marginTop: 10 }}>
                        <input type="file" ref={designFileRef} aria-label="Upload design file" style={{ display: "none" }} accept="image/jpeg,image/png,image/gif,image/webp,.pdf" onChange={async e => {
                          const f = e.target.files[0];
                          if (!f) return;
                          setDesignFileUploading(true);
                          const result = await uploadDesignFile(f);
                          setDesignFileUploading(false);
                          if (result) { setDesignFileUrl(result.url); setDesignFileName(result.name); setDesignLinkInput(""); }
                          e.target.value = "";
                        }} />
                        <button
                          type="button"
                          disabled={designFileUploading}
                          onClick={() => designFileRef.current?.click()}
                          style={{ width: "100%", border: `1px dashed ${designFileUrl ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.15)"}`, background: designFileUrl ? "rgba(16,185,129,0.06)" : "transparent", padding: "18px 16px", textAlign: "center", cursor: designFileUploading ? "not-allowed" : "pointer", borderRadius: 2 }}
                        >
                          {designFileUploading ? (
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Uploading…</div>
                          ) : designFileUrl ? (
                            <>
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#10B981" }}>✓ {designFileName}</div>
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Click to replace</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: 26, marginBottom: 6 }}>📁</div>
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Click to upload your design file</div>
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>JPG, PNG, PDF accepted</div>
                            </>
                          )}
                        </button>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", margin: "8px 0" }}>— or paste a link —</div>
                        <label className="sr-only" htmlFor="booking-design-link">Design link</label>
                        <input
                          id="booking-design-link"
                          placeholder="Google Drive, Dropbox, Figma link, etc."
                          value={designLinkInput}
                          onChange={e => { setDesignLinkInput(e.target.value); if (e.target.value) { setDesignFileUrl(""); setDesignFileName(""); } }}
                        />
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label htmlFor="booking-shop-message" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.72)", marginBottom: 6, display: "block" }}>MESSAGE TO SHOP <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>(optional)</span></label>
                    <textarea
                      id="booking-shop-message"
                      placeholder="Any specific details about your vehicle, color preferences, finish type, or questions for the shop..."
                      value={shopMessage}
                      onChange={e => setShopMessage(e.target.value)}
                    />
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "14px 18px", marginBottom: 22, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                    💬 After submitting, the shop will review your request and send you a personalised quote. Once you agree and pay, the shop will schedule your appointment date and time.
                  </div>
                  {submitError && <div role="alert" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF6A20", marginBottom: 12, padding: "10px 14px", background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.2)" }}>{submitError}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button className="link-button" type="button" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.65)", cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => setBookingStep(1)}>← Change service</button>
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
              {[[
                "Service", selectedService || "—"],
                ...(isVehicleService ? [["Vehicle", vehicleType || "—"]] : []),
                ...(isVehicleService && isFleet ? [["Fleet size", `${fleetQuantity} vehicles`]] : []),
                ...(isVehicleService ? [["Ownership", vehicleOwnership === "company" ? "Company" : "Personal"]] : []),
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
                      <div key={p.date} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>{i + 1}. {fmtDate(p.date)} — {p.time}</div>
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
