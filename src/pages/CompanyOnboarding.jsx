import { useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { updateShop, geocodeCityState, validateUploadFile } from "../lib/queries";
import { SERVICE_CATEGORIES } from "../lib/services";

const STEPS = [
  { id: 1, label: "Photo" },
  { id: 2, label: "Details" },
  { id: 3, label: "Services" },
  { id: 4, label: "Launch" },
];

export default function CompanyOnboarding({ currentUser, userShop, onComplete, nav }) {
  const [step, setStep] = useState(1);

  // Step 1 — Photo
  const photoInputRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(userShop?.banner_url || "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // Step 2 — Details
  const [form, setForm] = useState({
    name: userShop?.name || currentUser?.user_metadata?.business_name || "",
    phone: userShop?.phone || "",
    address: userShop?.address || "",
    city: userShop?.city || "",
    state: userShop?.state || "",
    zip: userShop?.zip || "",
    website: userShop?.website || "",
  });

  // Step 3 — Services
  const [selectedServices, setSelectedServices] = useState(userShop?.tags || []);

  // Step 4 — Launch
  const [goLive, setGoLive] = useState(false);
  const [insuranceStatus, setInsuranceStatus] = useState(userShop?.insurance_status || null);
  const [insuranceDocUrl, setInsuranceDocUrl] = useState(userShop?.insurance_doc_url || "");
  const [insuranceUploading, setInsuranceUploading] = useState(false);
  const [insuranceError, setInsuranceError] = useState("");
  const insuranceInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Geocoding for step 2
  const [geoCoords, setGeoCoords] = useState(null);
  const [geoChecking, setGeoChecking] = useState(false);

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    const valErr = validateUploadFile(file);
    if (valErr) { setPhotoError(valErr); return; }
    setPhotoUploading(true);
    setPhotoError("");
    const ext = file.name.split(".").pop();
    const path = `${currentUser.id}/profile.${ext}`;
    const { error: upErr } = await supabase.storage.from("shop-images").upload(path, file, { upsert: true });
    if (upErr) { setPhotoError("Upload failed: " + upErr.message); setPhotoUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("shop-images").getPublicUrl(path);
    setPhotoUrl(publicUrl);
    setPhotoUploading(false);
  };

  const toggleService = (name) =>
    setSelectedServices(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);

  const handleComplete = async () => {
    setSaving(true);
    setSaveError("");
    let geoUpdates = {};
    // Use pre-fetched coords from step 2 check; if unavailable, try one more time
    let resolvedGeo = geoCoords;
    if (!resolvedGeo && (form.city || form.state)) {
      resolvedGeo = await geocodeCityState(form.city.trim(), form.state.trim(), form.address.trim(), form.zip.trim());
    }
    if (resolvedGeo) geoUpdates = { latitude: resolvedGeo.lat, longitude: resolvedGeo.lon };
    const updates = {
      name: form.name.trim() || userShop.name,
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      zip: form.zip.trim(),
      website: form.website.trim(),
      tags: selectedServices,
      banner_url: photoUrl || "",
      is_listed: goLive && !!photoUrl && insuranceStatus === "verified",
      ...geoUpdates,
    };
    const updated = await updateShop(userShop.id, updates);
    setSaving(false);
    if (!updated) { setSaveError("Could not save. Please try again."); return; }
    onComplete(updated);
  };

  const canAdvanceStep2 = form.name.trim() && form.city.trim() && form.state.trim() && form.phone.trim();
  const insuranceApproved = insuranceStatus === "verified";
  const canGoLive = !!photoUrl && insuranceApproved;

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "linear-gradient(180deg, #0A0A0A 0%, #140A04 20%, #0A0A0A 55%, #05050C 100%)", minHeight: "100vh", color: "#fff", position: "relative", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .ob-input { width: 100%; background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; } .ob-input:focus { border-color: #FF4D00; } @keyframes glow-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 0.85; } } @keyframes orb-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } } @media (max-width: 768px) { .ob-nav { padding: 12px 20px !important; } .ob-progress { padding: 16px 20px !important; } .ob-content { padding: 32px 20px 60px !important; } .ob-step-title { font-size: 30px !important; letter-spacing: 1px !important; } } @media (max-width: 420px) { .ob-nav { padding: 10px 14px !important; } .ob-progress { padding: 12px 14px !important; } .ob-content { padding: 24px 14px 48px !important; } .ob-step-title { font-size: 26px !important; } }`}</style>
      <div aria-hidden="true" style={{ position: "fixed", top: "-10%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,77,0,0.18) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 6s ease-in-out infinite", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-8%", width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "orb-drift 14s ease-in-out infinite", zIndex: 0 }} />

      {/* Navbar */}
      <nav className="ob-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button className="image-button" type="button" onClick={() => nav("landing")} aria-label="Go to WrapBridge home">
          <img src="/images/Logo.png" alt="" style={{ height: 68, display: "block" }} />
        </button>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Business Setup</div>
      </nav>

      {/* Progress bar */}
      <div className="ob-progress" style={{ background: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 40px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", gap: 0 }}>
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {/* connector line */}
                {i > 0 && (
                  <div style={{ position: "absolute", left: 0, top: 14, width: "50%", height: 2, background: done || active ? "#FF4D00" : "rgba(255,255,255,0.08)" }} />
                )}
                {i < STEPS.length - 1 && (
                  <div style={{ position: "absolute", right: 0, top: 14, width: "50%", height: 2, background: done ? "#FF4D00" : "rgba(255,255,255,0.08)" }} />
                )}
                {/* circle */}
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#FF4D00" : active ? "transparent" : "transparent", border: `2px solid ${done || active ? "#FF4D00" : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, position: "relative" }}>
                  {done ? (
                    <svg width="12" height="10" viewBox="0 0 12 10"><polyline points="1,5 4.5,9 11,1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: active ? "#FF4D00" : "rgba(255,255,255,0.3)", fontWeight: 600 }}>{s.id}</div>
                  )}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 1, color: active ? "#FF4D00" : done ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", marginTop: 6 }}>{s.label.toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="ob-content" style={{ display: "flex", justifyContent: "center", padding: "48px 24px 80px" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>

          {/* ── STEP 1: Photo ── */}
          {step === 1 && (
            <div>
              <div className="ob-step-title" style={{ fontSize: 40, letterSpacing: 2, marginBottom: 6 }}>PROFILE PHOTO</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 36 }}>
                This is your shop's banner — it appears in search results and on your profile page. Use a clean, high-quality photo of your work or your shop front.
              </div>

              {/* Drop zone */}
              <input type="file" ref={photoInputRef} aria-label="Upload shop profile photo" style={{ display: "none" }} accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }} />
              <button
                type="button"
                onClick={() => !photoUploading && photoInputRef.current?.click()}
                disabled={photoUploading}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("image/")) handlePhotoUpload(f); }}
                style={{ width: "100%", color: "#fff", border: `2px dashed ${photoUrl ? "#FF4D00" : "rgba(255,255,255,0.12)"}`, background: photoUrl ? "transparent" : "#111", borderRadius: 2, overflow: "hidden", cursor: photoUploading ? "not-allowed" : "pointer", marginBottom: 12, position: "relative", minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {photoUrl ? (
                  <>
                    <img src={photoUrl} alt="Uploaded shop banner preview" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.7)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", padding: "4px 10px", borderRadius: 2 }}>Click to replace</div>
                  </>
                ) : photoUploading ? (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Uploading…</div>
                ) : (
                  <div style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>📷</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>Click or drag &amp; drop a photo</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)" }}>JPG, PNG, WEBP recommended · Minimum 800×400px</div>
                  </div>
                )}
              </button>
              {photoError && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF4D00", marginBottom: 12 }}>{photoError}</div>}
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 36 }}>
                💡 Shops with photos get 5× more views. You must upload a photo before going live.
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setStep(2)} style={{ flex: 1, background: photoUrl ? "#FF4D00" : "rgba(255,77,0,0.3)", color: "#fff", border: "none", padding: "16px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 3, cursor: "pointer" }}>
                  {photoUrl ? "Next: Business Details →" : "Skip for Now →"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Details ── */}
          {step === 2 && (
            <div>
              <div className="ob-step-title" style={{ fontSize: 40, letterSpacing: 2, marginBottom: 6 }}>BUSINESS DETAILS</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 36 }}>
                Help customers find your shop and know how to reach you.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  ["BUSINESS NAME", "name", "text", "e.g. Chrome Kings Wraps"],
                  ["PHONE NUMBER", "phone", "tel", "e.g. (404) 555-0123"],
                  ["WEBSITE", "website", "text", "e.g. chromekingswraps.com (optional)"],
                ].map(([label, key, type, ph]) => (
                  <div key={key}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>
                      {label}{key !== "website" && <span style={{ color: "#FF4D00" }}> *</span>}
                    </div>
                    <input className="ob-input" type={type} placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                {/* Location row */}
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>
                    LOCATION <span style={{ color: "#FF4D00" }}>*</span>
                  </div>
                  <input className="ob-input" placeholder="Street address  (e.g. 1234 Peachtree St NW)" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={{ marginBottom: 8 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 120px", gap: 8 }}>
                    <input className="ob-input" placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    <input className="ob-input" placeholder="ST" maxLength={2} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} style={{ textTransform: "uppercase" }} />
                    <input className="ob-input" placeholder="Zip code" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} />
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>Full address gives your shop an accurate map pin. If map lookup misses it, you can still continue.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button onClick={() => setStep(1)} style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.12)", padding: "14px 24px", fontFamily: "'Bebas Neue', cursive", fontSize: 17, letterSpacing: 2, cursor: "pointer" }}>← Back</button>
                <button
                  disabled={!canAdvanceStep2 || geoChecking}
                  onClick={async () => {
                    if (!canAdvanceStep2) return;
                    setGeoChecking(true);
                    try {
                      const geo = await geocodeCityState(form.city.trim(), form.state.trim(), form.address.trim(), form.zip.trim());
                      setGeoCoords(geo || null);
                    } finally {
                      setGeoChecking(false);
                      setStep(3);
                    }
                  }}
                  style={{ flex: 1, background: canAdvanceStep2 && !geoChecking ? "#FF4D00" : "rgba(255,77,0,0.3)", color: "#fff", border: "none", padding: "16px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 3, cursor: canAdvanceStep2 && !geoChecking ? "pointer" : "not-allowed" }}
                >
                  {geoChecking ? "Saving Location…" : "Next: Services →"}
                </button>
              </div>
              {!canAdvanceStep2 && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 10 }}>Fill in Name, Phone, City and State to continue.</div>
              )}
            </div>
          )}

          {/* ── STEP 3: Services ── */}
          {step === 3 && (
            <div>
              <div className="ob-step-title" style={{ fontSize: 40, letterSpacing: 2, marginBottom: 6 }}>SERVICES OFFERED</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 32 }}>
                Select every service your shop provides. Customers filter by service, so the more accurate, the better.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 36 }}>
                {SERVICE_CATEGORIES.map(({ category, services }) => (
                  <div key={category}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 2, marginBottom: 10 }}>{category.toUpperCase()}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                      {services.map(({ name }) => {
                        const checked = selectedServices.includes(name);
                        return (
                          <button
                            type="button"
                            key={name}
                            aria-pressed={checked}
                            onClick={() => toggleService(name)}
                            style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${checked ? "#FF4D00" : "rgba(255,255,255,0.08)"}`, background: checked ? "rgba(255,77,0,0.08)" : "#111", cursor: "pointer", transition: "all 0.15s" }}
                          >
                            <div style={{ width: 16, height: 16, border: `2px solid ${checked ? "#FF4D00" : "rgba(255,255,255,0.2)"}`, background: checked ? "#FF4D00" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {checked && <svg width="9" height="7" viewBox="0 0 9 7"><polyline points="1,3.5 3.5,6 8,1" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: checked ? "#fff" : "rgba(255,255,255,0.5)" }}>{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setStep(2)} style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.12)", padding: "14px 24px", fontFamily: "'Bebas Neue', cursive", fontSize: 17, letterSpacing: 2, cursor: "pointer" }}>← Back</button>
                <button onClick={() => setStep(4)} style={{ flex: 1, background: "#FF4D00", color: "#fff", border: "none", padding: "16px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 3, cursor: "pointer" }}>
                  Next: Preview & Launch →
                </button>
              </div>
              {selectedServices.length === 0 && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 10 }}>Select at least one service so customers can find you.</div>
              )}
            </div>
          )}

          {/* ── STEP 4: Launch ── */}
          {step === 4 && (
            <div>
              <div className="ob-step-title" style={{ fontSize: 40, letterSpacing: 2, marginBottom: 6 }}>PREVIEW &amp; LAUNCH</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 32 }}>
                Here's how your listing will appear in search results. Toggle <strong style={{ color: "#fff" }}>Go Live</strong> to make it publicly visible.
              </div>

              {/* Preview card */}
              <div style={{ border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", marginBottom: 24 }}>
                <div style={{ display: "flex" }}>
                  <div style={{ width: 160, height: 110, background: "#1A1A1A", flexShrink: 0, overflow: "hidden" }}>
                    {photoUrl
                      ? <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>NO PHOTO</div>
                    }
                  </div>
                  <div style={{ padding: "16px 20px", flex: 1 }}>
                    <div style={{ fontSize: 22, letterSpacing: 1, marginBottom: 4 }}>{form.name || "Your Shop Name"}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                      ★ New · {[form.city, form.state].filter(Boolean).join(", ") || "Location not set"}
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {selectedServices.slice(0, 4).map(s => (
                        <span key={s} style={{ padding: "2px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{s}</span>
                      ))}
                      {selectedServices.length > 4 && (
                        <span style={{ padding: "2px 8px", fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>+{selectedServices.length - 4} more</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "18px 20px", marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  [!!photoUrl, "Profile photo uploaded"],
                  [!!form.name.trim(), "Business name set"],
                  [!!form.phone.trim(), "Phone number added"],
                  [!!form.city.trim() && !!form.state.trim(), "Location set"],
                  [selectedServices.length > 0, "At least one service selected"],
                ].map(([ok, label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: ok ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>
                    <span style={{ fontSize: 15 }}>{ok ? "✅" : "⬜"}</span>
                    {label}
                  </div>
                ))}
              </div>

              {/* Insurance upload */}
              <div style={{ padding: "16px 20px", border: `1px solid ${insuranceStatus === "verified" ? "#3B82F6" : insuranceStatus === "pending" ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.1)"}`, background: insuranceStatus === "verified" ? "rgba(59,130,246,0.07)" : insuranceStatus === "pending" ? "rgba(245,158,11,0.05)" : "#111", marginBottom: 12, transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: insuranceStatus !== "verified" ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 18, letterSpacing: 1, color: insuranceStatus === "verified" ? "#3B82F6" : insuranceStatus === "pending" ? "#F59E0B" : "rgba(255,255,255,0.7)" }}>BUSINESS INSURANCE</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                      {insuranceStatus === "verified" ? "🛡️ Verified — your shop can be listed" : insuranceStatus === "pending" ? "Under review (1–2 business days)" : "Upload your certificate of insurance to go live"}
                    </div>
                  </div>
                  {insuranceStatus === "verified" && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#3B82F6", fontWeight: 600 }}>🛡️ VERIFIED</span>}
                  {insuranceStatus === "pending" && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>⏳ PENDING</span>}
                </div>
                {insuranceStatus !== "verified" && (
                  <div>
                    <input type="file" ref={insuranceInputRef} accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      e.target.value = "";
                      const maxSize = 10 * 1024 * 1024;
                      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
                      if (file.size > maxSize) { setInsuranceError("File too large (max 10MB)"); return; }
                      if (!allowedTypes.includes(file.type)) { setInsuranceError("Only JPG, PNG, WebP, or PDF accepted"); return; }
                      setInsuranceUploading(true); setInsuranceError("");
                      const ext = file.name.split(".").pop();
                      const path = `${userShop.id}/insurance.${ext}`;
                      const { error: upErr } = await supabase.storage.from("insurance-docs").upload(path, file, { upsert: true });
                      if (upErr) { setInsuranceError("Upload failed: " + upErr.message); setInsuranceUploading(false); return; }
                      const { error: dbErr } = await supabase.from("shops").update({ insurance_doc_url: path, insurance_status: "pending", insurance_verified: false, is_listed: false }).eq("id", userShop.id);
                      setInsuranceUploading(false);
                      if (dbErr) { setInsuranceError("Failed to save: " + dbErr.message); return; }
                      setInsuranceDocUrl(path);
                      setInsuranceStatus("pending");
                      setGoLive(false);
                    }} />
                    <button onClick={() => insuranceInputRef.current?.click()} disabled={insuranceUploading} style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#3B82F6", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, cursor: insuranceUploading ? "default" : "pointer", opacity: insuranceUploading ? 0.6 : 1 }}>
                      {insuranceUploading ? "Uploading…" : insuranceDocUrl ? "↩ Re-upload" : "📄 Upload Certificate"}
                    </button>
                    {insuranceError && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#EF4444", marginTop: 6 }}>{insuranceError}</div>}
                    {insuranceStatus === "rejected" && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(239,68,68,0.8)", marginTop: 6 }}>Rejected — please upload a valid document.</div>}
                  </div>
                )}
              </div>

              {/* Go live toggle */}
              <button
                type="button"
                aria-pressed={goLive}
                disabled={!canGoLive}
                onClick={() => canGoLive && setGoLive(v => !v)}
                style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", border: `1px solid ${goLive ? "#10B981" : "rgba(255,255,255,0.1)"}`, background: goLive ? "rgba(16,185,129,0.07)" : "#111", cursor: canGoLive ? "pointer" : "not-allowed", marginBottom: 8, transition: "all 0.2s", opacity: canGoLive ? 1 : 0.5 }}
              >
                <div>
                  <div style={{ fontSize: 18, letterSpacing: 1, color: goLive ? "#10B981" : "rgba(255,255,255,0.7)" }}>GO LIVE NOW</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{insuranceApproved ? "Make your shop visible to customers immediately" : "Admin must approve insurance before your shop can be listed"}</div>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: goLive ? "#10B981" : "rgba(255,255,255,0.12)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 3, left: goLive ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </div>
              </button>
              {!photoUrl && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 20 }}>⚠ Upload a profile photo to enable Go Live.</div>
              )}
              {photoUrl && !insuranceApproved && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(245,158,11,0.9)", marginBottom: 20 }}>⚠ Insurance approval is required before your shop appears in search.</div>
              )}

              {saveError && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF4D00", background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.2)", padding: "10px 14px", marginBottom: 16 }}>{saveError}</div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button onClick={() => setStep(3)} style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.12)", padding: "14px 24px", fontFamily: "'Bebas Neue', cursive", fontSize: 17, letterSpacing: 2, cursor: "pointer" }}>← Back</button>
                <button onClick={handleComplete} disabled={saving} style={{ flex: 1, background: saving ? "rgba(255,77,0,0.5)" : "#FF4D00", color: "#fff", border: "none", padding: "16px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 3, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : goLive && insuranceApproved ? "🚀 Save & Go Live" : "Save & Go to Dashboard →"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
