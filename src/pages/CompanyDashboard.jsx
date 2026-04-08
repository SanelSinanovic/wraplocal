import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { fetchUserShop, fetchCompanyBookings, createShop, updateShop, fetchMessages, sendMessage as dbSendMessage, subscribeToMessages, subscribeToShopBookings, fetchPortfolioImages, addPortfolioImage, deletePortfolioImage, setHeroPortfolioImage, scheduleBooking, uploadChatFile, geocodeCityState, fetchShopAvailability, saveShopAvailability } from "../lib/queries";
import { SERVICE_CATEGORIES, ALL_SERVICE_NAMES } from "../lib/services";
import CompanyOnboarding from "./CompanyOnboarding";

// Parse "Mon DD, YYYY" → { month (0-indexed), day, year }
function parseDate(str) {
  if (!str) return { month: NaN, day: NaN, year: NaN };

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(`${str}T12:00:00`);
    return { month: d.getMonth(), day: d.getDate(), year: d.getFullYear() };
  }

  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const shortMatch = String(str).trim().match(/^([A-Za-z]{3})\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (shortMatch) {
    const [, mon, day, year] = shortMatch;
    return {
      month: monthMap[mon.toLowerCase()],
      day: Number(day),
      year: year ? Number(year) : new Date().getFullYear(),
    };
  }

  const d = new Date(str);
  return { month: d.getMonth(), day: d.getDate(), year: d.getFullYear() };
}

function isValidCalendarDate(parts) {
  return Number.isInteger(parts?.month)
    && Number.isInteger(parts?.day)
    && Number.isInteger(parts?.year)
    && !Number.isNaN(parts.month)
    && !Number.isNaN(parts.day)
    && !Number.isNaN(parts.year);
}

function mergeMessages(existing = [], incoming = []) {
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const merged = [...existing];

  list.forEach(msg => {
    if (!msg) return;
    const hasMatch = merged.some(item => (
      (msg.id && item.id === msg.id) ||
      (item.from === msg.from && item.text === msg.text && item.time === msg.time)
    ));
    if (!hasMatch) merged.push(msg);
  });

  return merged;
}

// ── Booking detail + chat panel ─────────────────────────────────────────────
// Defined at module level so React never remounts it when parent state changes
function BookingDetailPanel({ selectedBooking, messagesMap, chatInput, setChatInput, quoteInput, setQuoteInput, sendQuoteOffer, sendCompanyMessage, sendCompanyFileMessage, chatEndRef, updateBookingStatus, setSelectedBooking, backLabel, onScheduled, shopUserId }) {
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedSaved, setSchedSaved] = useState(false);
  const companyFileRef = useRef(null);
  const [companyFileUploading, setCompanyFileUploading] = useState(false);

  const handleCompanyFileAttach = async (file) => {
    if (!file || !sendCompanyFileMessage) return;
    setCompanyFileUploading(true);
    const result = await uploadChatFile(file, selectedBooking.id);
    setCompanyFileUploading(false);
    if (result) sendCompanyFileMessage(`FILE::${result.url}::${result.name}`);
  };

  const handleSchedule = async () => {
    if (!schedDate || !schedTime || !selectedBooking) return;
    setSchedSaving(true);
    const { data } = await scheduleBooking(selectedBooking.id, schedDate, schedTime);
    if (data) {
      // Format the date nicely for the message
      const dateForMsg = (() => { try { const d = new Date(`${schedDate}T12:00:00`); return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); } catch { return schedDate; } })();
      if (shopUserId) {
        await dbSendMessage({ bookingId: selectedBooking.id, senderId: shopUserId, senderRole: 'shop', text: `📅 Great news! Your appointment has been confirmed for ${dateForMsg} at ${schedTime}. See you then!` });
      }
      setSchedSaved(true);
      onScheduled && onScheduled(selectedBooking.id, schedDate, schedTime);
      setTimeout(() => setSchedSaved(false), 3000);
    }
    setSchedSaving(false);
  };

  if (!selectedBooking) return null;
  const b = selectedBooking;
  const messages = messagesMap[b.id] || [];
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }} onClick={() => setSelectedBooking(null)}>
        <span style={{ color: "#FF4D00", fontSize: 18 }}>←</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{backLabel}</span>
      </div>
      <div className="booking-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <div>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 20, letterSpacing: 1 }}>#{String(b.id).slice(0,8)} — {b.customer}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{b.service}{b.date ? ` · ${b.date}${b.time_slot ? ` at ${b.time_slot}` : ""}` : " · Awaiting schedule"}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {b.status === "pending" && (
                <button onClick={() => updateBookingStatus(b.id, "confirmed")} style={{ background: "#10B981", color: "#fff", border: "none", padding: "8px 16px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer" }}>✓ Confirm</button>
              )}
              {b.status !== "completed" && b.status !== "cancelled" && (() => {
                const canComplete = b.status === "confirmed" && Number(b.amount) > 0;
                return (
                  <button
                    onClick={() => canComplete && updateBookingStatus(b.id, "completed")}
                    title={!canComplete ? "Only available after a quote has been sent and accepted" : ""}
                    style={{ background: "transparent", color: canComplete ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)", border: `1px solid ${canComplete ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)"}`, padding: "8px 16px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: canComplete ? "pointer" : "not-allowed" }}>
                    Complete
                  </button>
                );
              })()}
              {b.status !== "cancelled" && !cancelConfirm && (
                <button onClick={() => setCancelConfirm(true)} style={{ background: "transparent", color: "rgba(255,77,0,0.6)", border: "1px solid rgba(255,77,0,0.2)", padding: "8px 16px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer" }}>Cancel</button>
              )}
              {cancelConfirm && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.3)", padding: "8px 14px" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Cancel this booking?</span>
                  <button onClick={() => { updateBookingStatus(b.id, "cancelled"); setCancelConfirm(false); }} style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "6px 14px", fontFamily: "'Bebas Neue', cursive", fontSize: 13, letterSpacing: 1, cursor: "pointer" }}>Yes, Cancel</button>
                  <button onClick={() => setCancelConfirm(false)} style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 14px", fontFamily: "'Bebas Neue', cursive", fontSize: 13, letterSpacing: 1, cursor: "pointer" }}>Keep</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none", padding: 20, minHeight: 280, maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.length === 0 && (
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 60 }}>No messages yet. Send the customer a quote or message below.</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "shop" ? "flex-end" : "flex-start" }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>{msg.from === "shop" ? "You" : b.customer} · {msg.time}</div>
                <div style={{ maxWidth: "72%", background: msg.from === "shop" ? "#FF4D00" : "#1A1A1A", color: "#fff", padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.5, borderRadius: msg.from === "shop" ? "12px 12px 2px 12px" : "12px 12px 12px 2px" }}>
                  {(() => {
                    if (msg.text?.startsWith('FILE::')) {
                      const idx = msg.text.lastIndexOf('::');
                      const url = msg.text.slice(6, idx);
                      const name = msg.text.slice(idx + 2);
                      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
                      if (isImage) return <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4, display: 'block' }} />;
                      return <a href={url} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>📄 {name}</a>;
                    }
                    return msg.text;
                  })()}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {(b.status === "pending" || (b.status === "confirmed" && !b.amount)) && (
            <div style={{ display: "flex", gap: 8, border: "1px solid rgba(255,255,255,0.07)", borderTop: "none", padding: 12, background: "#111" }}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quoteInput}
                onChange={e => setQuoteInput(e.target.value)}
                placeholder="Enter quote amount (e.g. 1200)"
                style={{ flex: 1, background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 12px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none" }}
              />
              <button onClick={sendQuoteOffer} style={{ background: "#10B981", color: "#fff", border: "none", padding: "10px 16px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer" }}>Send Quote</button>
            </div>
          )}
          <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none" }}>
            <input type="file" ref={companyFileRef} style={{ display: "none" }} accept="image/jpeg,image/png,image/gif,image/webp,.pdf" onChange={e => { const f = e.target.files[0]; if (f) { handleCompanyFileAttach(f); e.target.value = ""; } }} />
            <input
              style={{ flex: 1, background: "#1A1A1A", border: "none", padding: "12px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none" }}
              placeholder={`Message ${b.customer}… send a quote, confirm details, etc.`}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendCompanyMessage()}
            />
            <button onClick={() => companyFileRef.current?.click()} disabled={companyFileUploading} style={{ background: "#1A1A1A", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)", padding: "0 14px", color: companyFileUploading ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.55)", cursor: companyFileUploading ? "not-allowed" : "pointer", fontSize: 18 }} title="Attach image or PDF">📎</button>
            <button onClick={sendCompanyMessage} style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "12px 24px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2, cursor: "pointer" }}>Send</button>
          </div>
        </div>
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
          <div style={{ fontSize: 18, letterSpacing: 1, marginBottom: 16 }}>REQUEST DETAILS</div>
          {[["Customer", b.customer], ["Service", b.service], ["Vehicle", b.vehicle || "—"], ["Design", b.design_option || "—"]].map(([l, v]) => (
            <div key={l} style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 2 }}>{l.toUpperCase()}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#fff" }}>{v}</div>
            </div>
          ))}
          {/* Customer preferred dates */}
          {b.preferred_dates && (() => {
            let prefs;
            try { prefs = JSON.parse(b.preferred_dates); } catch { return null; }
            if (!prefs || !prefs.length) return null;
            return (
              <div style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#10B981", letterSpacing: 1, marginBottom: 8 }}>CUSTOMER'S PREFERRED DATES</div>
                {prefs.map((p, i) => (
                  <div key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: i === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{i + 1}. {p.date} — {p.time}</span>
                    {i === 0 && <span style={{ fontSize: 10, color: "#10B981", border: "1px solid rgba(16,185,129,0.4)", padding: "1px 6px" }}>TOP CHOICE</span>}
                  </div>
                ))}
              </div>
            );
          })()}
          {b.date && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 2 }}>SCHEDULED DATE</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#10B981" }}>{b.date}{b.time_slot ? ` at ${b.time_slot}` : ""}</div>
            </div>
          )}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 6 }}>STATUS</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: b.status === "confirmed" ? "#10B981" : b.status === "pending" ? "#F59E0B" : b.status === "cancelled" ? "#EF4444" : "rgba(255,255,255,0.5)" }}>
            ● {b.status?.charAt(0).toUpperCase() + b.status?.slice(1)}
          </div>

          {/* ── Schedule appointment ── */}
          {b.status === "confirmed" && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 16, letterSpacing: 1, marginBottom: 12 }}>CONFIRM APPOINTMENT DATE</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 4 }}>DATE</div>
                <input
                  type="date"
                  value={schedDate || (b.date ? new Date(b.date).toISOString().split('T')[0] : "")}
                  onChange={e => setSchedDate(e.target.value)}
                  style={{ width: "100%", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.12)", padding: "8px 10px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none", colorScheme: "dark" }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 4 }}>TIME</div>
                <select
                  value={schedTime || b.time_slot || ""}
                  onChange={e => setSchedTime(e.target.value)}
                  style={{ width: "100%", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.12)", padding: "8px 10px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none" }}
                >
                  <option value="">Select time</option>
                  {["8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSchedule}
                disabled={schedSaving || (!schedDate && !b.date) || (!schedTime && !b.time_slot)}
                style={{ width: "100%", background: schedSaved ? "#10B981" : "#FF4D00", color: "#fff", border: "none", padding: "9px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer", opacity: schedSaving ? 0.6 : 1 }}
              >
                {schedSaving ? "Saving..." : schedSaved ? "✓ Scheduled!" : "Confirm Schedule"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompanyDashboard({ nav, dashTab, setDashTab, currentUser, currentProfile, onLogout }) {
  const [bookingsView, setBookingsView] = useState("list");
  const [showArchived, setShowArchived] = useState(false);
  const [dashboardBookings, setDashboardBookings] = useState([]);
  const [userShop, setUserShop] = useState(null);
  const [isNewShop, setIsNewShop] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", city: "", state: "", zip: "", phone: "", website: "", bio: "", price_from: "" });
  const [selectedServices, setSelectedServices] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [shopError, setShopError] = useState("");
  const [bookingsError, setBookingsError] = useState("");
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedBookingSource, setSelectedBookingSource] = useState("bookings");
  const [messagesMap, setMessagesMap] = useState({});
  const [chatInput, setChatInput] = useState("");
  const [quoteInput, setQuoteInput] = useState("");
  const chatEndRef = useRef(null);
  const photoInputRef = useRef(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const portfolioInputRef = useRef(null);
  const [portfolioImages, setPortfolioImages] = useState([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [isListed, setIsListed] = useState(false);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  // ── Availability tab state ────────────────────────────────────────────────
  const [availWorkingDays, setAvailWorkingDays] = useState([1, 2, 3, 4, 5, 6]);
  const [availBlockedDates, setAvailBlockedDates] = useState([]);
  const [availSaving, setAvailSaving] = useState(false);
  const [availLoaded, setAvailLoaded] = useState(false);
  const [availCalMonth, setAvailCalMonth] = useState(today.getMonth());
  const [availCalYear, setAvailCalYear] = useState(today.getFullYear());

  // ── Stripe Connect state ─────────────────────────────────────────────────
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");

  const syncProfileForm = (shop) => {
    setProfileForm({
      name: shop.name || "",
      city: shop.city || "",
      state: shop.state || "",
      zip: shop.zip || "",
      phone: shop.phone || "",
      website: shop.website || "",
      bio: shop.bio || "",
      price_from: shop.price_from != null ? String(shop.price_from) : "",
    });
    setSelectedServices((shop.tags || []).filter(t => ALL_SERVICE_NAMES.includes(t)));
    setProfilePhotoUrl(shop.banner_url || "");
    setIsListed(!!shop.is_listed);
    setStripeAccountId(shop.stripe_account_id || "");
  };

  useEffect(() => {
    if (!currentUser) return;
    let bookingsChannel = null;
    setShopError("");

    (async () => {
      const { data: shop, error: fetchError } = await fetchUserShop(currentUser.id);
      if (fetchError) {
        setShopError("Could not load your shop: " + fetchError.message);
        return;
      }
      if (!shop) {
        const businessName =
          currentUser.user_metadata?.business_name ||
          currentProfile?.name ||
          'My Wrap Shop';
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          role: 'company',
          name: currentUser.user_metadata?.name || businessName,
        }, { onConflict: 'id' });
        const { data: newShop, error: createError } = await createShop({ ownerId: currentUser.id, name: businessName });
        if (createError || !newShop) {
          setShopError("Could not create your shop: " + (createError?.message || "Unknown error"));
          return;
        }
        setUserShop(newShop);
        syncProfileForm(newShop);
        setIsNewShop(true);
        setDashTab("profile");
        return;
      }
      setUserShop(shop);
      syncProfileForm(shop);

      const { data: portData } = await fetchPortfolioImages(shop.id);
      setPortfolioImages(portData || []);

      const { data: bookingsData, error: bookingsError } = await fetchCompanyBookings(shop.id);
      if (bookingsError) {
        console.error('fetchCompanyBookings error:', bookingsError);
        setBookingsError('Could not load bookings: ' + (bookingsError.message || JSON.stringify(bookingsError)));
      } else {
        setDashboardBookings(bookingsData || []);
      }
      setBookingsLoaded(true);

      // Realtime: refresh bookings list whenever anything changes on this shop
      bookingsChannel = subscribeToShopBookings(shop.id, async () => {
        const { data: refreshed } = await fetchCompanyBookings(shop.id);
        if (refreshed) setDashboardBookings(refreshed);
      });
    })();

    return () => { bookingsChannel?.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // When company selects a booking, load its messages and subscribe
  useEffect(() => {
    if (!selectedBooking || !currentUser) return;
    let channel;
    fetchMessages(selectedBooking.id).then(msgs => {
      setMessagesMap(prev => ({
        ...prev,
        [selectedBooking.id]: mergeMessages(prev[selectedBooking.id] || [], msgs),
      }));
    });
    channel = subscribeToMessages(selectedBooking.id, newMsg => {
      setMessagesMap(prev => {
        const existing = prev[selectedBooking.id] || [];
        return { ...prev, [selectedBooking.id]: mergeMessages(existing, newMsg) };
      });
    });
    return () => { channel?.unsubscribe(); };
  }, [selectedBooking?.id, currentUser]);

  useEffect(() => {
    if (selectedBooking) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesMap, selectedBooking]);

  // Load availability lazily when the tab is first opened
  useEffect(() => {
    if (dashTab !== "availability" || !userShop?.id || availLoaded) return;
    fetchShopAvailability(userShop.id).then(avail => {
      setAvailWorkingDays(avail.workingDays);
      setAvailBlockedDates(avail.blockedDates);
      setAvailLoaded(true);
    });
  }, [dashTab, userShop?.id, availLoaded]);

  // Refresh stripe_account_id whenever the payments tab is opened
  // (handles the return from Stripe onboarding)
  useEffect(() => {
    if (dashTab !== "payments" || !userShop?.id) return;
    supabase
      .from("shops")
      .select("stripe_account_id")
      .eq("id", userShop.id)
      .single()
      .then(({ data }) => {
        if (data?.stripe_account_id) setStripeAccountId(data.stripe_account_id);
      });
  }, [dashTab, userShop?.id]);

  const sendCompanyMessageText = async (text) => {
    if (!text || !selectedBooking) return;
    const result = await dbSendMessage({ bookingId: selectedBooking.id, senderId: currentUser.id, senderRole: "company", text });
    if (result) {
      const time = new Date(result.sent_at || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      setMessagesMap(prev => ({
        ...prev,
        [selectedBooking.id]: mergeMessages(prev[selectedBooking.id] || [], { id: result.id, from: "shop", text, time }),
      }));
    }
  };

  const sendCompanyMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    await sendCompanyMessageText(text);
  };

  const sendQuoteOffer = async () => {
    if (!selectedBooking || !["pending", "confirmed"].includes(selectedBooking.status)) return;
    const amount = Number(quoteInput);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const marker = `QUOTE_OFFER::${amount.toFixed(2)}`;
    const result = await dbSendMessage({ bookingId: selectedBooking.id, senderId: currentUser.id, senderRole: "shop", text: marker });
    if (!result) return;

    const time = new Date(result.sent_at || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    setMessagesMap(prev => ({
      ...prev,
      [selectedBooking.id]: mergeMessages(prev[selectedBooking.id] || [], {
        id: result.id,
        from: "shop",
        text: `Quote offer: $${amount.toFixed(2)}`,
        time,
        quoteOffer: amount,
        rawText: marker,
      }),
    }));
    setQuoteInput("");
  };

  const updateBookingStatus = async (bookingId, status) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (!error) {
      let updatedBooking = null;
      setDashboardBookings(prev => prev.map(b => {
        if (b.id !== bookingId) return b;
        updatedBooking = { ...b, status };
        return updatedBooking;
      }));
      setSelectedBooking(prev => {
        if (!prev || prev.id !== bookingId) return prev;
        updatedBooking = { ...prev, status };
        return updatedBooking;
      });

      if (status === "confirmed" && updatedBooking?.date) {
        const dateParts = parseDate(updatedBooking.date);
        if (isValidCalendarDate(dateParts)) {
          setCalMonth(dateParts.month);
          setCalYear(dateParts.year);
          setSelectedDay(dateParts.day);
          setBookingsView("calendar");
        }
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!userShop) return;
    setSaveStatus("saving");
    const city = profileForm.city.trim();
    const state = profileForm.state.trim();
    // Geocode whenever city or state changes
    let geoUpdates = {};
    if (city || state) {
      const geo = await geocodeCityState(city, state);
      if (geo) geoUpdates = { latitude: geo.lat, longitude: geo.lon };
    }
    const updates = {
      name: profileForm.name.trim() || userShop.name,
      city,
      state,
      zip: profileForm.zip.trim(),
      phone: profileForm.phone.trim(),
      website: profileForm.website.trim(),
      bio: profileForm.bio.trim(),
      price_from: profileForm.price_from ? parseFloat(profileForm.price_from) : 0,
      tags: selectedServices,
      banner_url: profilePhotoUrl || userShop.banner_url || "",
      is_listed: isListed,
      ...geoUpdates,
    };
    const updated = await updateShop(userShop.id, updates);
    if (updated) {
      setUserShop(updated);
      setIsNewShop(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 3000);
    } else {
      setSaveStatus("error");
    }
  };

  const handlePortfolioUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    await uploadPortfolioFiles(files);
  };

  const uploadPortfolioFiles = async (files) => {
    if (!files.length) return;
    setPortfolioUploading(true);
    setPortfolioError("");
    const nextOrder = portfolioImages.length;
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const ext = file.name.split('.').pop();
      const path = `${currentUser.id}/portfolio/${Date.now()}_${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('shop-images')
        .upload(path, file, { upsert: false });
      if (upErr) {
        setPortfolioError("Upload failed: " + upErr.message);
        break;
      }
      const { data: { publicUrl } } = supabase.storage.from('shop-images').getPublicUrl(path);
      const { data: row } = await addPortfolioImage(userShop.id, publicUrl, nextOrder + i);
      if (row) uploaded.push(row);
    }
    setPortfolioImages(prev => [...prev, ...uploaded]);
    setPortfolioUploading(false);
  };

  const handlePortfolioDelete = async (img) => {
    const { error } = await deletePortfolioImage(img.id);
    if (!error) {
      setPortfolioImages(prev => prev.filter(p => p.id !== img.id));
    }
  };

  const handleSetHero = async (img) => {
    if (!userShop) return;
    await setHeroPortfolioImage(img.id, userShop.id);
    setPortfolioImages(prev =>
      prev.map(p => ({ ...p, display_order: p.id === img.id ? -1 : (p.display_order === -1 ? 0 : p.display_order) }))
        .sort((a, b) => a.display_order - b.display_order)
    );
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError("");
    const ext = file.name.split('.').pop();
    const path = `${currentUser.id}/profile.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('shop-images')
      .upload(path, file, { upsert: true });
    if (upErr) {
      setPhotoError("Upload failed: " + upErr.message);
      setPhotoUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('shop-images').getPublicUrl(path);
    setProfilePhotoUrl(publicUrl);
    setPhotoUploading(false);
  };

  const handleScheduled = (bookingId, date, timeSlot) => {
    setDashboardBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, date, time_slot: timeSlot } : b
    ));
    setSelectedBooking(prev => prev && prev.id === bookingId ? { ...prev, date, time_slot: timeSlot } : prev);
  };

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  // ── Onboarding complete handler ────────────────────────────────────────────
  const handleOnboardingComplete = (updatedShop) => {
    setUserShop(updatedShop);
    syncProfileForm(updatedShop);
    setIsNewShop(false);
    setDashTab("overview");
  };

  // Show onboarding wizard for brand-new shops
  if (isNewShop && userShop) {
    return <CompanyOnboarding currentUser={currentUser} userShop={userShop} onComplete={handleOnboardingComplete} nav={nav} />;
  }

  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun

  const activeBookings = dashboardBookings.filter(b => !["completed", "cancelled"].includes(b.status));
  const archivedBookings = dashboardBookings.filter(b => ["completed", "cancelled"].includes(b.status));
  const calendarBookings = dashboardBookings.filter(b => b.status === "confirmed");

  // Map bookings to day numbers for the current calendar month
  const bookingsByDay = {};
  calendarBookings.forEach(b => {
    const { month, day, year } = parseDate(b.date);
    if (month === calMonth && year === calYear) {
      if (!bookingsByDay[day]) bookingsByDay[day] = [];
      bookingsByDay[day].push(b);
    }
  });

  const pendingCount = dashboardBookings.filter(b => b.status === "pending").length;

  // BookingDetailPanel is defined at module level — see top of file

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  return (
    <div className="company-wrap" style={{ fontFamily: "'Bebas Neue', cursive", background: "#090909", minHeight: "100vh", color: "#fff", display: "flex" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; color: rgba(255,255,255,0.5); border-radius: 4px; transition: all 0.2s; } .nav-item:hover, .nav-item.active { background: rgba(255,77,0,0.1); color: #FF4D00; } .stat-card { background: #111; border: 1px solid rgba(255,255,255,0.06); padding: 24px; } .cal-day { min-height: 80px; background: #111; border: 1px solid rgba(255,255,255,0.05); padding: 8px; cursor: default; transition: border-color 0.15s; vertical-align: top; } .cal-day.has-booking { cursor: pointer; } .cal-day.has-booking:hover { border-color: rgba(255,77,0,0.4); } .cal-day.selected { border-color: #FF4D00 !important; background: rgba(255,77,0,0.07); } .cal-day.today-cell { border-color: rgba(255,255,255,0.18); } .view-toggle { display: flex; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; } .view-toggle button { background: transparent; border: none; padding: 8px 18px; font-family: 'Bebas Neue', cursive; font-size: 15px; letter-spacing: 1px; color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s; } .view-toggle button.active { background: #FF4D00; color: #fff; } @media (max-width: 768px) { .company-wrap { flex-direction: column !important; } .company-sidebar { width: 100% !important; flex-direction: row !important; flex-shrink: unset !important; flex-wrap: wrap; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; padding: 8px !important; } .sidebar-logo { display: none !important; } .sidebar-sub { display: none !important; } .sidebar-footer { display: none !important; } .nav-item { flex: 0 0 auto; padding: 8px 12px !important; font-size: 12px !important; } .company-main { padding: 16px !important; } .stats-4 { grid-template-columns: repeat(2, 1fr) !important; } .stats-2 { grid-template-columns: 1fr !important; } .stats-3 { grid-template-columns: 1fr !important; } .cal-day { min-height: 44px !important; padding: 3px !important; font-size: 11px !important; } .bookings-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px; } .form-2col { grid-template-columns: 1fr !important; } .profile-actions { flex-direction: column !important; } .booking-detail-grid { grid-template-columns: 1fr !important; } .location-grid { grid-template-columns: 1fr !important; } } @media (max-width: 420px) { .company-main { padding: 10px !important; } .nav-item { padding: 6px 8px !important; font-size: 11px !important; } } @keyframes skelPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

      {/* Sidebar */}
      <div className="company-sidebar" style={{ width: 220, background: "#0D0D0D", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "24px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div className="sidebar-logo" style={{ fontSize: 20, letterSpacing: 4, color: "#FF4D00", marginBottom: 32, padding: "0 4px", cursor: "pointer" }} onClick={() => nav("landing")}>KI<span style={{ color: "#fff" }}>DOR</span></div>
        <div className="sidebar-sub" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginBottom: 8, padding: "0 4px" }}>{userShop?.name?.toUpperCase() || "MY SHOP"}</div>
        {[["overview", "📊 Overview"], ["requests", "📬 Requests"], ["bookings", "📅 Bookings"], ["availability", "🗓️ Availability"], ["profile", "✏️ Profile"], ["payments", "💰 Payments"], ["settings", "⚙️ Settings"]].map(([k, l]) => (
          <div key={k} className={`nav-item${dashTab === k ? " active" : ""}`} onClick={() => { setDashTab(k); setSelectedBooking(null); }} style={{ justifyContent: "space-between" }}>
            <span>{l}</span>
            {k === "requests" && pendingCount > 0 && (
              <span style={{ background: "#FF4D00", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10, minWidth: 20, textAlign: "center" }}>{pendingCount}</span>
            )}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        {currentUser && (
          <button onClick={onLogout} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", background: "none", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 12px", cursor: "pointer", marginBottom: 12, width: "100%" }}>Log Out</button>
        )}
        <div className="sidebar-footer" style={{ padding: "14px 16px", background: "rgba(255,77,0,0.05)", border: "1px solid rgba(255,77,0,0.15)" }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>SUBSCRIPTION</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#10B981", marginBottom: 4 }}>● Active - Monthly</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Renews Mar 15, 2026</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#FF4D00", marginTop: 6, cursor: "pointer" }}>Upgrade to Annual →</div>
        </div>
      </div>

      {/* Main content */}
      <div className="company-main" style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
        {shopError && (
          <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.4)", padding: "16px 20px", marginBottom: 24, fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", lineHeight: 1.6 }}>
            <b>Shop setup failed:</b> {shopError}
            <button onClick={() => { setShopError(""); }} style={{ marginLeft: 16, background: "#FF4D00", color: "#fff", border: "none", padding: "4px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>Retry</button>
          </div>
        )}
        {bookingsError && (
          <div style={{ background: "rgba(255,77,0,0.06)", border: "1px solid rgba(255,77,0,0.25)", padding: "12px 16px", marginBottom: 16, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,120,60,0.9)", lineHeight: 1.6 }}>
            ⚠️ {bookingsError}
            <button onClick={() => setBookingsError("")} style={{ marginLeft: 12, background: "none", border: "none", color: "#FF4D00", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, textDecoration: "underline" }}>Dismiss</button>
          </div>
        )}
        {dashTab === "overview" && (() => {
          const totalRevenue = dashboardBookings.reduce((s, b) => s + (b.amount || 0), 0);
          const totalFee = Math.round(totalRevenue * 0.07 * 100) / 100;
          const netPayout = Math.round((totalRevenue - totalFee) * 100) / 100;
          const now = new Date();
          const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
          return (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 40, letterSpacing: 2 }}>DASHBOARD</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>{monthName} overview</div>
              </div>
            </div>
            {!profilePhotoUrl && (
              <div
                onClick={() => setDashTab("profile")}
                style={{ background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.3)", padding: "14px 20px", marginBottom: 16, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, cursor: "pointer" }}
              >
                🔒 <strong style={{ color: "#FF4D00" }}>Your listing is hidden from customers.</strong> Add a profile photo to appear in search results. <span style={{ color: "#FF4D00", textDecoration: "underline" }}>Go to Profile →</span>
              </div>
            )}
            {!isListed && (
              <div
                onClick={() => setDashTab("profile")}
                style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)", padding: "14px 20px", marginBottom: 24, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, cursor: "pointer" }}
              >
                💳 <strong style={{ color: "#F59E0B" }}>Your shop is not listed.</strong> Activate your monthly listing to be discoverable by customers. <span style={{ color: "#F59E0B", textDecoration: "underline" }}>Go to Profile →</span>
              </div>
            )}
            <div className="stats-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                ["Total Revenue", `$${totalRevenue.toLocaleString()}`, `${dashboardBookings.length} booking${dashboardBookings.length !== 1 ? "s" : ""}`, "#10B981"],
                ["Bookings", String(dashboardBookings.length), "All time", "#10B981"],
                ["Kidor Fee (7%)", `-$${totalFee.toFixed(2)}`, "Platform fee", "#F59E0B"],
                ["Net Payout", `$${netPayout.toLocaleString()}`, "After fees", "#FF4D00"],
              ].map(([l, v, s, c]) => (
                <div key={l} className="stat-card">
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{l}</div>
                  <div style={{ fontSize: 36, letterSpacing: 1, color: l === "Kidor Fee (7%)" ? "rgba(255,255,255,0.7)" : "#fff", marginBottom: 6 }}>{v}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: c }}>{s}</div>
                </div>
              ))}
            </div>
            <div className="stats-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div className="stat-card">
                <div style={{ fontSize: 22, letterSpacing: 1, marginBottom: 16 }}>UPCOMING BOOKINGS</div>
                {dashboardBookings.filter(b => b.status === "confirmed").length === 0 && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)", padding: "12px 0" }}>No confirmed bookings yet.</div>
                )}
                {dashboardBookings.filter(b => b.status === "confirmed").map(b => (
                  <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 500 }}>{b.customer}</div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{b.service} · {b.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#FF4D00" }}>${b.amount}</div>
                      <div style={{ color: "#10B981", fontSize: 12 }}>● Confirmed</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="stat-card">
                <div style={{ fontSize: 22, letterSpacing: 1, marginBottom: 16 }}>REVENUE BREAKDOWN</div>
                {(() => {
                  const totalRev = dashboardBookings.reduce((s, b) => s + (b.amount || 0), 0);
                  const byService = {};
                  dashboardBookings.forEach(b => {
                    if (!b.service) return;
                    byService[b.service] = (byService[b.service] || 0) + (b.amount || 0);
                  });
                  const entries = Object.entries(byService).sort((a, b) => b[1] - a[1]);
                  if (!entries.length) return <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>No booking data yet.</div>;
                  return entries.map(([service, amt]) => {
                    const pct = totalRev > 0 ? Math.round(amt / totalRev * 100) : 0;
                    return (
                      <div key={service} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{service}</span>
                          <span>${amt.toLocaleString()}</span>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: "#FF4D00", borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
          );
        })()}

        {dashTab === "requests" && (
          <div>
            {selectedBooking ? (
              <BookingDetailPanel selectedBooking={selectedBooking} messagesMap={messagesMap} chatInput={chatInput} setChatInput={setChatInput} quoteInput={quoteInput} setQuoteInput={setQuoteInput} sendQuoteOffer={sendQuoteOffer} sendCompanyMessage={sendCompanyMessage} sendCompanyFileMessage={sendCompanyMessageText} chatEndRef={chatEndRef} updateBookingStatus={updateBookingStatus} setSelectedBooking={setSelectedBooking} backLabel="← Back to booking requests" onScheduled={handleScheduled} shopUserId={currentUser?.id} />
            ) : (
              <div>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 4 }}>BOOKING REQUESTS</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>New appointment requests from customers waiting for your response</div>
                </div>
                {dashboardBookings.filter(b => b.status === "pending").length === 0 ? (
                  <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", padding: "48px 32px", textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                    <div style={{ fontSize: 24, letterSpacing: 1, marginBottom: 8 }}>NO PENDING REQUESTS</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>New booking requests will appear here when customers submit them.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {dashboardBookings.filter(b => b.status === "pending").map(b => (
                      <div key={b.id}
                        onClick={() => { setSelectedBooking(b); setChatInput(""); setQuoteInput(""); }}
                        style={{ background: "#111", border: "1px solid rgba(255,77,0,0.25)", padding: "20px 24px", cursor: "pointer", transition: "border-color 0.2s", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "#FF4D00"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,77,0,0.25)"}>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          <div style={{ width: 44, height: 44, background: "rgba(255,77,0,0.12)", border: "1px solid rgba(255,77,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>📅</div>
                          <div>
                            <div style={{ fontSize: 20, letterSpacing: 1, marginBottom: 4 }}>{b.customer}</div>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>{b.service}</div>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{b.date} at {b.time_slot} · {b.vehicle || "Vehicle not specified"}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#F59E0B" }}>● Pending Review</span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00" }}>Open Request →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {dashTab === "bookings" && (
          <div>
            {selectedBooking && <BookingDetailPanel selectedBooking={selectedBooking} messagesMap={messagesMap} chatInput={chatInput} setChatInput={setChatInput} quoteInput={quoteInput} setQuoteInput={setQuoteInput} sendQuoteOffer={sendQuoteOffer} sendCompanyMessage={sendCompanyMessage} sendCompanyFileMessage={sendCompanyMessageText} chatEndRef={chatEndRef} updateBookingStatus={updateBookingStatus} setSelectedBooking={setSelectedBooking} backLabel="← Back to all bookings" onScheduled={handleScheduled} shopUserId={currentUser?.id} />}

            {/* Header + toggle */}
            {!selectedBooking && (
            <div className="bookings-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 4 }}>ALL BOOKINGS</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Manage and track your appointments</div>
              </div>
              <div className="view-toggle">
                <button className={bookingsView === "list" ? "active" : ""} onClick={() => setBookingsView("list")}>☰ List</button>
                <button className={bookingsView === "calendar" ? "active" : ""} onClick={() => setBookingsView("calendar")}>📅 Calendar</button>
              </div>
            </div>
            )}

            {/* LIST VIEW */}
            {!selectedBooking && bookingsView === "list" && (
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Customer", "Service", "Date", "Vehicle", "Status", "Action"].map(h => (
                        <th key={h} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 400, textAlign: "left", padding: "8px 12px", letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!bookingsLoaded ? (
                      [1,2,3].map(i => (
                        <tr key={i}>
                          {["52%","38%","28%","42%","26%","16%"].map((w, j) => (
                            <td key={j} style={{ padding: "14px 12px" }}><div style={{ height: 11, width: w, background: "rgba(255,255,255,0.06)", animation: "skelPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} /></td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <>
                        {activeBookings.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: "24px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>No active bookings — new and confirmed jobs will appear here.</td></tr>
                        )}
                        {activeBookings.map(b => (
                          <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => { setSelectedBooking(b); setChatInput(""); setQuoteInput(""); }}>
                            <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500 }}>{b.customer}</td>
                            <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{b.service}</td>
                            <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{b.date}</td>
                            <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{b.vehicle || "—"}</td>
                            <td style={{ padding: "14px 12px" }}>
                              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: b.status === "confirmed" ? "#10B981" : b.status === "pending" ? "#F59E0B" : "rgba(255,255,255,0.4)" }}>● {b.status}</span>
                            </td>
                            <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00" }}>Open →</td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>

                {archivedBookings.length > 0 && (
                  <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showArchived ? 16 : 0 }}>
                      <div>
                        <div style={{ fontSize: 22, letterSpacing: 1 }}>ARCHIVED BOOKINGS</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{archivedBookings.length} completed or cancelled job{archivedBookings.length !== 1 ? "s" : ""}</div>
                      </div>
                      <button onClick={() => setShowArchived(v => !v)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", padding: "8px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                        {showArchived ? "Hide Archived" : "Show Archived"}
                      </button>
                    </div>

                    {showArchived && (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {["Customer", "Service", "Date", "Vehicle", "Status", "Action"].map(h => (
                              <th key={h} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 400, textAlign: "left", padding: "8px 12px", letterSpacing: 1 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {archivedBookings.map(b => (
                            <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", opacity: 0.9 }} onClick={() => { setSelectedBooking(b); setChatInput(""); setQuoteInput(""); }}>
                              <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500 }}>{b.customer}</td>
                              <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{b.service}</td>
                              <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{b.date}</td>
                              <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{b.vehicle || "—"}</td>
                              <td style={{ padding: "14px 12px" }}>
                                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: b.status === "completed" ? "rgba(255,255,255,0.55)" : "#EF4444" }}>● {b.status}</span>
                              </td>
                              <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00" }}>Open →</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CALENDAR VIEW */}
            {!selectedBooking && bookingsView === "calendar" && (
              <div>
                {/* Month nav */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                  <button onClick={prevMonth} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>‹</button>
                  <div style={{ fontSize: 28, letterSpacing: 2 }}>{MONTH_NAMES[calMonth].toUpperCase()} {calYear}</div>
                  <button onClick={nextMonth} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>›</button>
                  <div style={{ marginLeft: "auto", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                    {Object.values(bookingsByDay).flat().length} confirmed booking{Object.values(bookingsByDay).flat().length !== 1 ? "s" : ""} this month
                  </div>
                </div>

                {/* Day-of-week headers */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
                  {DAY_NAMES.map(d => (
                    <div key={d} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "6px 0", letterSpacing: 1 }}>{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                  {/* Empty cells before first day */}
                  {Array.from({ length: firstDow }).map((_, i) => (
                    <div key={`empty-${i}`} style={{ minHeight: 80, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }} />
                  ))}
                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dayBookings = bookingsByDay[day] || [];
                    const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
                    const isSelected = selectedDay === day;
                    return (
                      <div
                        key={day}
                        className={`cal-day${dayBookings.length ? " has-booking" : ""}${isSelected ? " selected" : ""}${isToday ? " today-cell" : ""}`}
                        onClick={() => dayBookings.length && setSelectedDay(isSelected ? null : day)}
                      >
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: isToday ? "#FF4D00" : "rgba(255,255,255,0.35)", marginBottom: 6, fontWeight: isToday ? 700 : 400 }}>{day}</div>
                        {dayBookings.map((b, i) => (
                          <div key={i} style={{ background: b.status === "confirmed" ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${b.status === "confirmed" ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`, padding: "3px 6px", marginBottom: 3, borderRadius: 2 }}>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: b.status === "confirmed" ? "#10B981" : "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.customer}</div>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.service}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Selected day detail */}
                {selectedDay && bookingsByDay[selectedDay] && (
                  <div style={{ marginTop: 24, background: "#111", border: "1px solid rgba(255,77,0,0.25)", padding: "20px 24px" }}>
                    <div style={{ fontSize: 22, letterSpacing: 1, marginBottom: 16 }}>{MONTH_NAMES[calMonth].toUpperCase()} {selectedDay} — {bookingsByDay[selectedDay].length} BOOKING{bookingsByDay[selectedDay].length > 1 ? "S" : ""}</div>
                    {bookingsByDay[selectedDay].map(b => (
                      <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.status === "confirmed" ? "#10B981" : "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                          <div>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500 }}>{b.customer}</div>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{b.service} · #{b.id}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: b.status === "confirmed" ? "#10B981" : "rgba(255,255,255,0.4)" }}>● {b.status}</span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00" }}>${b.amount}</span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Payout: <span style={{ color: "#10B981" }}>${b.payout.toFixed(2)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {dashTab === "payments" && (() => {
          const totalRevenue = dashboardBookings.reduce((s, b) => s + (b.amount || 0), 0);
          const totalFee = Math.round(totalRevenue * 0.07 * 100) / 100;
          const netPayout = Math.round((totalRevenue - totalFee) * 100) / 100;
          const now = new Date();
          const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase();

          const handleConnectStripe = async () => {
            setConnectLoading(true);
            setConnectError("");
            try {
              const returnUrl = window.location.origin + window.location.pathname + "#company-dash?tab=payments";
              // Get the session token explicitly so the edge function can verify the user
              const { data: { session } } = await supabase.auth.getSession();
              const accessToken = session?.access_token;
              if (!accessToken) throw new Error("Not logged in");

              const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bXpjdm92Z3p0cG5reG5vbXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODQ1NjMsImV4cCI6MjA4ODU2MDU2M30.bEul8TJAuwlXGQusLVvLbvuauTan02IJm8ktwwqF7so";
              const res = await fetch(
                `https://cxmzcvovgztpnkxnomun.supabase.co/functions/v1/create-connect-onboarding`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + ANON_KEY,
                    "apikey": ANON_KEY,
                    "x-user-token": accessToken,
                  },
                  body: JSON.stringify({ shopId: userShop.id, returnUrl, refreshUrl: returnUrl }),
                }
              );
              const data = await res.json();
              if (!res.ok || data.error || !data.url) {
                throw new Error(data.error || ("HTTP " + res.status + ": " + JSON.stringify(data)));
              }
              window.location.href = data.url;
            } catch (e) {
              setConnectError(e.message);
              setConnectLoading(false);
            }
          };

          return (
          <div>
            <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>PAYMENTS & PAYOUTS</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>Kidor retains 7% of all bookings as a platform fee</div>

            {/* ── Stripe Connect payout setup ── */}
            <div style={{ marginBottom: 32, border: stripeAccountId ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)", background: stripeAccountId ? "rgba(16,185,129,0.05)" : "rgba(245,158,11,0.05)", padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 18, letterSpacing: 1, marginBottom: 4, color: stripeAccountId ? "#10B981" : "#F59E0B" }}>{stripeAccountId ? "✓ STRIPE CONNECTED" : "⚠ STRIPE PAYOUT SETUP REQUIRED"}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                    {stripeAccountId
                      ? <>Your Stripe account <span style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.7)" }}>{stripeAccountId.slice(0, 18)}…</span> receives 93% of each payment automatically.</>  
                      : "Connect a Stripe account so you receive 93% of each booking payment directly to your bank."}
                  </div>
                </div>
                {stripeAccountId ? (
                  <button
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bXpjdm92Z3p0cG5reG5vbXVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODQ1NjMsImV4cCI6MjA4ODU2MDU2M30.bEul8TJAuwlXGQusLVvLbvuauTan02IJm8ktwwqF7so";
                        const res = await fetch("https://cxmzcvovgztpnkxnomun.supabase.co/functions/v1/create-express-login", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + ANON_KEY, "apikey": ANON_KEY, "x-user-token": session?.access_token || "" },
                          body: JSON.stringify({ shopId: userShop.id }),
                        });
                        const data = await res.json();
                        if (data.url) window.open(data.url, "_blank");
                        else setConnectError(data.error || "Could not open Stripe dashboard");
                      } catch (e) {
                        setConnectError(e.message);
                      }
                    }}
                    style={{ padding: "9px 20px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.4)", color: "#10B981", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
                  >Manage on Stripe →</button>
                ) : (
                  <button onClick={handleConnectStripe} disabled={connectLoading} style={{ padding: "10px 22px", background: "#F59E0B", border: "none", color: "#000", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 1, cursor: connectLoading ? "not-allowed" : "pointer", opacity: connectLoading ? 0.6 : 1 }}>{connectLoading ? "REDIRECTING…" : "CONNECT STRIPE ACCOUNT"}</button>
                )}
              </div>
              {connectError && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#F87171", marginTop: 10 }}>{connectError}</div>}
            </div>
            <div className="stats-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
              <div className="stat-card">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>TOTAL REVENUE</div>
                <div style={{ fontSize: 40, color: "#10B981" }}>${totalRevenue.toLocaleString()}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>All bookings</div>
              </div>
              <div className="stat-card">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>PLATFORM FEE (7%)</div>
                <div style={{ fontSize: 40, color: "#F59E0B" }}>${totalFee.toFixed(2)}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Retained by Kidor</div>
              </div>
              <div className="stat-card">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>NET PAYOUT</div>
                <div style={{ fontSize: 40, color: "#FF4D00" }}>${netPayout.toLocaleString()}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>After fees</div>
              </div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: 22, letterSpacing: 1, marginBottom: 20 }}>FEE BREAKDOWN — {monthLabel}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 0" }}><span>Total Booking Revenue</span><span style={{ color: "#fff" }}>${totalRevenue.toFixed(2)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 0" }}><span>Kidor Fee (7%)</span><span style={{ color: "#F59E0B" }}>-${totalFee.toFixed(2)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}><span style={{ fontSize: 18, fontFamily: "'Bebas Neue', cursive", letterSpacing: 1 }}>NET PAYOUT</span><span style={{ fontSize: 18, color: "#10B981", fontFamily: "'Bebas Neue', cursive" }}>${netPayout.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
          );
        })()}

        {dashTab === "availability" && (
          <div style={{ maxWidth: 660 }}>
            <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>AVAILABILITY</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>Set your working days and block specific dates — customers only see when you're available.</div>

            {/* Working days */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", padding: "24px", marginBottom: 20 }}>
              <div style={{ fontSize: 22, letterSpacing: 1, marginBottom: 4 }}>WORKING DAYS</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>Tick every day your shop is normally open.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["Sun", 0], ["Mon", 1], ["Tue", 2], ["Wed", 3], ["Thu", 4], ["Fri", 5], ["Sat", 6]].map(([label, dow]) => {
                  const active = availWorkingDays.includes(dow);
                  return (
                    <div key={dow}
                      onClick={() => setAvailWorkingDays(prev => active ? prev.filter(d => d !== dow) : [...prev, dow].sort((a, b) => a - b))}
                      style={{ padding: "9px 16px", border: `1px solid ${active ? "#FF4D00" : "rgba(255,255,255,0.1)"}`, background: active ? "rgba(255,77,0,0.1)" : "#1A1A1A", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: active ? "#FF4D00" : "rgba(255,255,255,0.4)", transition: "all 0.15s", userSelect: "none" }}>
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Block specific dates */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", padding: "24px", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 22, letterSpacing: 1 }}>BLOCK SPECIFIC DATES</div>
                {availBlockedDates.length > 0 && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#F59E0B" }}>{availBlockedDates.length} date{availBlockedDates.length !== 1 ? "s" : ""} blocked</div>}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>Click any future date to toggle it blocked. Blocked dates show as unavailable to customers.</div>

              {/* Month nav */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                <button onClick={() => { const d = new Date(availCalYear, availCalMonth - 1, 1); setAvailCalMonth(d.getMonth()); setAvailCalYear(d.getFullYear()); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>‹</button>
                <div style={{ fontSize: 22, letterSpacing: 2, minWidth: 164, textAlign: "center" }}>{new Date(availCalYear, availCalMonth).toLocaleString("en-US", { month: "long" }).toUpperCase()} {availCalYear}</div>
                <button onClick={() => { const d = new Date(availCalYear, availCalMonth + 1, 1); setAvailCalMonth(d.getMonth()); setAvailCalYear(d.getFullYear()); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>›</button>
              </div>

              {/* Day-of-week headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                  <div key={d} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "3px 0", letterSpacing: 1 }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              {(() => {
                const daysInMonth = new Date(availCalYear, availCalMonth + 1, 0).getDate();
                const firstDow = new Date(availCalYear, availCalMonth, 1).getDay();
                const todayIso = new Date().toISOString().slice(0, 10);
                const cells = [];
                for (let i = 0; i < firstDow; i++) cells.push(<div key={`e${i}`} />);
                for (let day = 1; day <= daysInMonth; day++) {
                  const iso = `${availCalYear}-${String(availCalMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isPast = iso <= todayIso;
                  const isBlocked = availBlockedDates.includes(iso);
                  const isWorkDay = availWorkingDays.includes(new Date(availCalYear, availCalMonth, day).getDay());
                  cells.push(
                    <div key={day}
                      title={isBlocked ? "Click to unblock" : isPast ? "" : "Click to block"}
                      onClick={() => { if (isPast) return; setAvailBlockedDates(prev => isBlocked ? prev.filter(d => d !== iso) : [...prev, iso]); }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        height: 38, border: "1px solid",
                        borderColor: isBlocked ? "rgba(239,68,68,0.5)" : isWorkDay ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                        background: isBlocked ? "rgba(239,68,68,0.12)" : !isWorkDay ? "rgba(0,0,0,0.2)" : "#1E1E1E",
                        cursor: isPast ? "default" : "pointer",
                        opacity: isPast ? 0.28 : 1,
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                        color: isBlocked ? "#EF4444" : isWorkDay ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)",
                        transition: "border-color 0.12s, background 0.12s",
                      }}
                    >
                      {day}
                    </div>
                  );
                }
                return <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>{cells}</div>;
              })()}

              {/* Legend */}
              <div style={{ display: "flex", gap: 20, marginTop: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, background: "#1E1E1E", border: "1px solid rgba(255,255,255,0.07)", display: "inline-block" }} /> Open</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.5)", display: "inline-block" }} /> Blocked</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 12, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.03)", display: "inline-block" }} /> Non-working day</span>
              </div>
            </div>

            {/* Save */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={async () => {
                  if (!userShop?.id) return;
                  setAvailSaving(true);
                  await saveShopAvailability(userShop.id, availWorkingDays, availBlockedDates);
                  setAvailSaving(false);
                  setSaveStatus("avail_saved");
                  setTimeout(() => setSaveStatus(""), 2500);
                }}
                disabled={availSaving}
                style={{ background: availSaving ? "#555" : "#FF4D00", color: "#fff", border: "none", padding: "14px 32px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 2, cursor: availSaving ? "default" : "pointer", opacity: availSaving ? 0.7 : 1 }}
              >
                {availSaving ? "Saving…" : "Save Availability"}
              </button>
              {saveStatus === "avail_saved" && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#10B981" }}>✓ Saved</span>}
            </div>
          </div>
        )}

        {dashTab === "profile" && (
          <div style={{ maxWidth: 600 }}>
            {isNewShop && (
              <div style={{ background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.3)", padding: "20px 24px", marginBottom: 32 }}>
                <div style={{ fontSize: 26, letterSpacing: 2, marginBottom: 6 }}>🎉 WELCOME TO KIDOR!</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                  Your account is live. Fill in your business details below so customers can find and book you. The more you complete, the better your listing looks.
                </div>
              </div>
            )}
            <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 32 }}>BUSINESS PROFILE</div>
            {!profilePhotoUrl && (
              <div style={{ background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.3)", padding: "14px 20px", marginBottom: 16, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                🔒 <strong style={{ color: "#FF4D00" }}>Your listing is hidden from customers.</strong> Upload a profile photo to make your shop discoverable in search results.
              </div>
            )}
            {!isListed && (
              <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.3)", padding: "14px 20px", marginBottom: 24, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                💳 <strong style={{ color: "#F59E0B" }}>Your shop is not listed.</strong> Toggle listing status below to be discoverable by customers.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Profile Photo Upload */}
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 10 }}>
                  PROFILE PHOTO <span style={{ color: "#FF4D00" }}>*</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    style={{ width: 100, height: 100, background: "#1A1A1A", border: `2px solid ${profilePhotoUrl ? "#FF4D00" : "rgba(255,255,255,0.15)"}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 8, lineHeight: 1.5 }}>NO<br/>PHOTO</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      ref={photoInputRef}
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "10px 20px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 1, cursor: photoUploading ? "not-allowed" : "pointer", opacity: photoUploading ? 0.6 : 1 }}
                    >
                      {photoUploading ? "UPLOADING..." : profilePhotoUrl ? "CHANGE PHOTO" : "UPLOAD PHOTO"}
                    </button>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8, lineHeight: 1.5 }}>
                      This photo appears on your public listing.<br/>JPG, PNG, or WEBP recommended.
                    </div>
                    {photoError && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", marginTop: 6 }}>{photoError}</div>}
                  </div>
                </div>
              </div>
              {[
                ["Business Name", "name", "text", "e.g. Chrome Kings Wraps"],
                ["Phone", "phone", "tel", "e.g. (404) 555-0123"],
                ["Website", "website", "text", "e.g. chromekingswraps.com"],
                ["Starting Price ($)", "price_from", "number", "e.g. 500"],
              ].map(([label, key, type, placeholder]) => (
                <div key={key}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>{label.toUpperCase()}</div>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={profileForm[key]}
                    onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none" }}
                  />
                </div>
              ))}
              {/* City / State / Zip on one row */}
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>LOCATION</div>
                <div className="location-grid" style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px", gap: 8 }}>
                  <input placeholder="City  (e.g. Atlanta)" value={profileForm.city} onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))} style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none" }} />
                  <input placeholder="State" maxLength={2} value={profileForm.state} onChange={e => setProfileForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", textTransform: "uppercase" }} />
                  <input placeholder="Zip code" value={profileForm.zip} onChange={e => setProfileForm(f => ({ ...f, zip: e.target.value }))} style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none" }} />
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 5 }}>Used to show your shop to nearby customers. Save your profile to update.</div>
              </div>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 10 }}>SERVICES OFFERED</div>
                {SERVICE_CATEGORIES.map(({ category, services }) => (
                  <div key={category} style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 2, marginBottom: 8 }}>{category.toUpperCase()}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {services.map(({ name }) => {
                        const checked = selectedServices.includes(name);
                        return (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: checked ? "#fff" : "rgba(255,255,255,0.5)" }}>
                            <div
                              onClick={() => setSelectedServices(prev =>
                                prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
                              )}
                              style={{ width: 16, height: 16, border: `2px solid ${checked ? "#FF4D00" : "rgba(255,255,255,0.2)"}`, background: checked ? "#FF4D00" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
                            >
                              {checked && <div style={{ width: 8, height: 2, background: "#fff", position: "relative" }}><div style={{ position: "absolute", width: 2, height: 8, background: "#fff", top: -3, left: 3 }} /></div>}
                            </div>
                            {name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>BIO / ABOUT YOUR SHOP</div>
                <textarea
                  placeholder="Tell customers what makes your shop special..."
                  value={profileForm.bio}
                  onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                  rows={4}
                  style={{ width: "100%", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", resize: "vertical" }}
                />
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 26, letterSpacing: 2 }}>LISTING STATUS</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>Controls whether your shop appears in customer search results</div>
                  </div>
                  <div
                    onClick={() => setIsListed(v => !v)}
                    style={{ width: 52, height: 28, background: isListed ? "#10B981" : "rgba(255,255,255,0.1)", borderRadius: 14, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}
                  >
                    <div style={{ position: "absolute", top: 3, left: isListed ? 27 : 3, width: 22, height: 22, background: "#fff", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
                  </div>
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: isListed ? "#10B981" : "rgba(245,158,11,0.9)", display: "flex", alignItems: "center", gap: 8 }}>
                  {isListed ? "● Listed — Visible to customers" : "● Not listed — Hidden from search results"}
                </div>
              </div>

              {/* ── Portfolio Images ── */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 26, letterSpacing: 2 }}>PORTFOLIO</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                      Drag & drop photos here · Click ★ to set the hero (first) image
                    </div>
                  </div>
                  <div>
                    <input type="file" accept="image/*" multiple ref={portfolioInputRef} onChange={handlePortfolioUpload} style={{ display: "none" }} />
                    <button
                      type="button"
                      onClick={() => portfolioInputRef.current?.click()}
                      disabled={portfolioUploading}
                      style={{ background: "transparent", border: "1px solid rgba(255,77,0,0.5)", color: "#FF4D00", padding: "10px 20px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 1, cursor: portfolioUploading ? "not-allowed" : "pointer", opacity: portfolioUploading ? 0.6 : 1 }}
                    >
                      {portfolioUploading ? "UPLOADING..." : "+ ADD PHOTOS"}
                    </button>
                  </div>
                </div>
                {portfolioError && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", marginBottom: 12 }}>{portfolioError}</div>}
                {portfolioImages.length === 0 ? (
                  <div
                    onClick={() => portfolioInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadPortfolioFiles(Array.from(e.dataTransfer.files)); }}
                    style={{ border: `2px dashed ${dragOver ? "#FF4D00" : "rgba(255,255,255,0.1)"}`, background: dragOver ? "rgba(255,77,0,0.05)" : "transparent", padding: "48px 20px", textAlign: "center", cursor: "pointer", transition: "all 0.15s" }}
                  >
                    <div style={{ fontSize: 36, marginBottom: 10, opacity: dragOver ? 0.8 : 0.3 }}>🖼</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: dragOver ? "rgba(255,77,0,0.8)" : "rgba(255,255,255,0.25)" }}>
                      {dragOver ? "Drop photos to upload" : "Drag & drop photos here, or click to browse"}
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.15)", marginTop: 6 }}>JPG, PNG, WEBP · Multiple files supported</div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadPortfolioFiles(Array.from(e.dataTransfer.files)); }}
                    style={{ outline: dragOver ? "2px dashed #FF4D00" : "2px dashed transparent", outlineOffset: 4, borderRadius: 2, transition: "outline 0.15s" }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {portfolioImages.map((img, idx) => {
                        const isHero = img.display_order === -1;
                        return (
                          <div key={img.id} style={{ position: "relative", aspectRatio: "4/3", background: "#1A1A1A", overflow: "hidden" }}>
                            <img src={img.url} alt="Portfolio" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            {/* Hero badge */}
                            {isHero && (
                              <div style={{ position: "absolute", top: 6, left: 6, background: "#FF4D00", padding: "2px 8px", fontFamily: "'Bebas Neue', cursive", fontSize: 11, letterSpacing: 1, color: "#fff", lineHeight: 1.6 }}>
                                ★ HERO
                              </div>
                            )}
                            {/* Set hero button */}
                            <button
                              onClick={() => handleSetHero(img)}
                              title={isHero ? "Already hero image" : "Set as hero (shown first)"}
                              style={{ position: "absolute", bottom: 6, left: 6, background: isHero ? "#FF4D00" : "rgba(0,0,0,0.7)", border: isHero ? "none" : "1px solid rgba(255,255,255,0.3)", color: isHero ? "#fff" : "rgba(255,255,255,0.7)", width: 28, height: 28, borderRadius: 2, cursor: isHero ? "default" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              ★
                            </button>
                            {/* Delete button */}
                            <button
                              onClick={() => handlePortfolioDelete(img)}
                              style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.75)", border: "none", color: "#fff", width: 26, height: 26, borderRadius: 2, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                              title="Remove photo"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      {/* Add more tile */}
                      <div
                        onClick={() => portfolioInputRef.current?.click()}
                        style={{ aspectRatio: "4/3", border: `2px dashed ${dragOver ? "#FF4D00" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 6, transition: "border-color 0.15s" }}
                      >
                        <div style={{ fontSize: 22, opacity: 0.3 }}>+</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>ADD</div>
                      </div>
                    </div>
                    {dragOver && (
                      <div style={{ marginTop: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,77,0,0.7)", textAlign: "center" }}>
                        Drop to add photos
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={saveStatus === "saving" || !profilePhotoUrl}
                  style={{ background: profilePhotoUrl ? "#FF4D00" : "rgba(255,77,0,0.3)", color: "#fff", border: "none", padding: "14px 32px", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, cursor: (saveStatus === "saving" || !profilePhotoUrl) ? "not-allowed" : "pointer", opacity: saveStatus === "saving" ? 0.6 : 1 }}
                >
                  {saveStatus === "saving" ? "Saving..." : "Save Profile"}
                </button>
                {!profilePhotoUrl && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,77,0,0.8)" }}>⚠ Profile photo required</span>}
                {saveStatus === "saved" && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#10B981" }}>✓ Profile saved!</span>}
                {saveStatus === "error" && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00" }}>Something went wrong. Try again.</span>}
              </div>
            </div>
          </div>
        )}

        {dashTab === "settings" && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 32 }}>SETTINGS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[["Contact Email", currentUser?.email || ""], ["Notification Preferences", "Email + SMS"], ["Booking Window", "2 weeks in advance"], ["Cancellation Policy", "48-hour notice required"]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>{l.toUpperCase()}</div>
                  <input defaultValue={v} style={{ width: "100%", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none" }} />
                </div>
              ))}
              <button style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "14px", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, cursor: "pointer", marginTop: 8 }}>Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
