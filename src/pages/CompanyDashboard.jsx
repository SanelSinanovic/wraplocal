import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { fetchUserShop, fetchCompanyBookings, createShop, updateShop, fetchMessages, sendMessage as dbSendMessage, subscribeToMessages, subscribeToShopBookings } from "../lib/queries";

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
function BookingDetailPanel({ selectedBooking, messagesMap, chatInput, setChatInput, sendCompanyMessage, chatEndRef, updateBookingStatus, setSelectedBooking, backLabel }) {
  if (!selectedBooking) return null;
  const b = selectedBooking;
  const messages = messagesMap[b.id] || [];
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }} onClick={() => setSelectedBooking(null)}>
        <span style={{ color: "#FF4D00", fontSize: 18 }}>←</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{backLabel}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <div>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 20, letterSpacing: 1 }}>#{String(b.id).slice(0,8)} — {b.customer}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{b.service} · {b.date} at {b.time_slot}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {b.status === "pending" && (
                <button onClick={() => updateBookingStatus(b.id, "confirmed")} style={{ background: "#10B981", color: "#fff", border: "none", padding: "8px 16px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer" }}>✓ Confirm</button>
              )}
              {b.status !== "completed" && b.status !== "cancelled" && (
                <button onClick={() => updateBookingStatus(b.id, "completed")} style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.15)", padding: "8px 16px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer" }}>Complete</button>
              )}
              {b.status !== "cancelled" && (
                <button onClick={() => updateBookingStatus(b.id, "cancelled")} style={{ background: "transparent", color: "rgba(255,77,0,0.6)", border: "1px solid rgba(255,77,0,0.2)", padding: "8px 16px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer" }}>Cancel</button>
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
                <div style={{ maxWidth: "72%", background: msg.from === "shop" ? "#FF4D00" : "#1A1A1A", color: "#fff", padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.5, borderRadius: msg.from === "shop" ? "12px 12px 2px 12px" : "12px 12px 12px 2px" }}>{msg.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none" }}>
            <input
              style={{ flex: 1, background: "#1A1A1A", border: "none", padding: "12px 16px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none" }}
              placeholder={`Message ${b.customer}… send a quote, confirm details, etc.`}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendCompanyMessage()}
            />
            <button onClick={sendCompanyMessage} style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "12px 24px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2, cursor: "pointer" }}>Send</button>
          </div>
        </div>
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
          <div style={{ fontSize: 18, letterSpacing: 1, marginBottom: 16 }}>REQUEST DETAILS</div>
          {[["Customer", b.customer],["Service", b.service],["Date", b.date],["Time", b.time_slot],["Vehicle", b.vehicle || "—"],["Design", b.design_option || "—"]].map(([l, v]) => (
            <div key={l} style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 2 }}>{l.toUpperCase()}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#fff" }}>{v}</div>
            </div>
          ))}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 6 }}>STATUS</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: b.status === "confirmed" ? "#10B981" : b.status === "pending" ? "#F59E0B" : b.status === "cancelled" ? "#EF4444" : "rgba(255,255,255,0.5)" }}>
            ● {b.status?.charAt(0).toUpperCase() + b.status?.slice(1)}
          </div>
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
  const [profileForm, setProfileForm] = useState({ name: "", city: "", phone: "", website: "", bio: "", price_from: "" });
  const [saveStatus, setSaveStatus] = useState("");
  const [shopError, setShopError] = useState("");
  const [bookingsError, setBookingsError] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedBookingSource, setSelectedBookingSource] = useState("bookings");
  const [messagesMap, setMessagesMap] = useState({});
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const syncProfileForm = (shop) => {
    setProfileForm({
      name: shop.name || "",
      city: shop.city || "",
      phone: shop.phone || "",
      website: shop.website || "",
      bio: shop.bio || "",
      price_from: shop.price_from != null ? String(shop.price_from) : "",
    });
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

      const { data: bookingsData, error: bookingsError } = await fetchCompanyBookings(shop.id);
      if (bookingsError) {
        console.error('fetchCompanyBookings error:', bookingsError);
        setBookingsError('Could not load bookings: ' + (bookingsError.message || JSON.stringify(bookingsError)));
      } else {
        setDashboardBookings(bookingsData || []);
      }

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
  }, [selectedBooking, currentUser]);

  useEffect(() => {
    if (selectedBooking) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesMap, selectedBooking]);

  const sendCompanyMessage = async () => {
    const text = chatInput.trim();
    if (!text || !selectedBooking) return;
    setChatInput("");
    const result = await dbSendMessage({ bookingId: selectedBooking.id, senderId: currentUser.id, senderRole: "company", text });
    // Supabase postgres_changes doesn't echo back to the sender, so add locally
    if (result) {
      const time = new Date(result.sent_at || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      setMessagesMap(prev => ({
        ...prev,
        [selectedBooking.id]: mergeMessages(prev[selectedBooking.id] || [], { id: result.id, from: "shop", text, time }),
      }));
    }
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
    const updates = {
      name: profileForm.name.trim() || userShop.name,
      city: profileForm.city.trim(),
      phone: profileForm.phone.trim(),
      website: profileForm.website.trim(),
      bio: profileForm.bio.trim(),
      price_from: profileForm.price_from ? parseFloat(profileForm.price_from) : 0,
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

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; color: rgba(255,255,255,0.5); border-radius: 4px; transition: all 0.2s; } .nav-item:hover, .nav-item.active { background: rgba(255,77,0,0.1); color: #FF4D00; } .stat-card { background: #111; border: 1px solid rgba(255,255,255,0.06); padding: 24px; } .cal-day { min-height: 80px; background: #111; border: 1px solid rgba(255,255,255,0.05); padding: 8px; cursor: default; transition: border-color 0.15s; vertical-align: top; } .cal-day.has-booking { cursor: pointer; } .cal-day.has-booking:hover { border-color: rgba(255,77,0,0.4); } .cal-day.selected { border-color: #FF4D00 !important; background: rgba(255,77,0,0.07); } .cal-day.today-cell { border-color: rgba(255,255,255,0.18); } .view-toggle { display: flex; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; } .view-toggle button { background: transparent; border: none; padding: 8px 18px; font-family: 'Bebas Neue', cursive; font-size: 15px; letter-spacing: 1px; color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s; } .view-toggle button.active { background: #FF4D00; color: #fff; } @media (max-width: 768px) { .company-wrap { flex-direction: column !important; } .company-sidebar { width: 100% !important; flex-direction: row !important; flex-shrink: unset !important; flex-wrap: wrap; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; padding: 8px !important; } .sidebar-logo { display: none !important; } .sidebar-sub { display: none !important; } .sidebar-footer { display: none !important; } .nav-item { flex: 0 0 auto; padding: 8px 12px !important; font-size: 12px !important; } .company-main { padding: 16px !important; } .stats-4 { grid-template-columns: repeat(2, 1fr) !important; } .stats-2 { grid-template-columns: 1fr !important; } .stats-3 { grid-template-columns: 1fr !important; } .cal-day { min-height: 52px !important; padding: 4px !important; } .bookings-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px; } }`}</style>

      {/* Sidebar */}
      <div className="company-sidebar" style={{ width: 220, background: "#0D0D0D", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "24px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div className="sidebar-logo" style={{ fontSize: 20, letterSpacing: 4, color: "#FF4D00", marginBottom: 32, padding: "0 4px", cursor: "pointer" }} onClick={() => nav("landing")}>WRAP<span style={{ color: "#fff" }}>LOCAL</span></div>
        <div className="sidebar-sub" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginBottom: 8, padding: "0 4px" }}>{userShop?.name?.toUpperCase() || "MY SHOP"}</div>
        {[["overview", "📊 Overview"], ["requests", "📬 Requests"], ["bookings", "📅 Bookings"], ["profile", "✏️ Profile"], ["payments", "💰 Payments"], ["settings", "⚙️ Settings"]].map(([k, l]) => (
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
            <div className="stats-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                ["Total Revenue", `$${totalRevenue.toLocaleString()}`, `${dashboardBookings.length} booking${dashboardBookings.length !== 1 ? "s" : ""}`, "#10B981"],
                ["Bookings", String(dashboardBookings.length), "All time", "#10B981"],
                ["WrapLocal Fee (7%)", `-$${totalFee.toFixed(2)}`, "Platform fee", "#F59E0B"],
                ["Net Payout", `$${netPayout.toLocaleString()}`, "After fees", "#FF4D00"],
              ].map(([l, v, s, c]) => (
                <div key={l} className="stat-card">
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{l}</div>
                  <div style={{ fontSize: 36, letterSpacing: 1, color: l === "WrapLocal Fee (7%)" ? "rgba(255,255,255,0.7)" : "#fff", marginBottom: 6 }}>{v}</div>
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
              <BookingDetailPanel selectedBooking={selectedBooking} messagesMap={messagesMap} chatInput={chatInput} setChatInput={setChatInput} sendCompanyMessage={sendCompanyMessage} chatEndRef={chatEndRef} updateBookingStatus={updateBookingStatus} setSelectedBooking={setSelectedBooking} backLabel="← Back to booking requests" />
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
                        onClick={() => { setSelectedBooking(b); setChatInput(""); }}
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
            {selectedBooking && <BookingDetailPanel selectedBooking={selectedBooking} messagesMap={messagesMap} chatInput={chatInput} setChatInput={setChatInput} sendCompanyMessage={sendCompanyMessage} chatEndRef={chatEndRef} updateBookingStatus={updateBookingStatus} setSelectedBooking={setSelectedBooking} backLabel="← Back to all bookings" />}

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
                    {activeBookings.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: "24px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>No active bookings — new and confirmed jobs will appear here.</td></tr>
                    )}
                    {activeBookings.map(b => (
                      <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => { setSelectedBooking(b); setChatInput(""); }}>
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
                            <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", opacity: 0.9 }} onClick={() => { setSelectedBooking(b); setChatInput(""); }}>
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
          return (
          <div>
            <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>PAYMENTS & PAYOUTS</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>WrapLocal retains 7% of all bookings as a platform fee</div>
            <div className="stats-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
              <div className="stat-card">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>TOTAL REVENUE</div>
                <div style={{ fontSize: 40, color: "#10B981" }}>${totalRevenue.toLocaleString()}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>All bookings</div>
              </div>
              <div className="stat-card">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>PLATFORM FEE (7%)</div>
                <div style={{ fontSize: 40, color: "#F59E0B" }}>${totalFee.toFixed(2)}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Retained by WrapLocal</div>
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
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 0" }}><span>WrapLocal Fee (7%)</span><span style={{ color: "#F59E0B" }}>-${totalFee.toFixed(2)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}><span style={{ fontSize: 18, fontFamily: "'Bebas Neue', cursive", letterSpacing: 1 }}>NET PAYOUT</span><span style={{ fontSize: 18, color: "#10B981", fontFamily: "'Bebas Neue', cursive" }}>${netPayout.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
          );
        })()}

        {dashTab === "profile" && (
          <div style={{ maxWidth: 600 }}>
            {isNewShop && (
              <div style={{ background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.3)", padding: "20px 24px", marginBottom: 32 }}>
                <div style={{ fontSize: 26, letterSpacing: 2, marginBottom: 6 }}>🎉 WELCOME TO WRAPLOCAL!</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.7 }}>
                  Your account is live. Fill in your business details below so customers can find and book you. The more you complete, the better your listing looks.
                </div>
              </div>
            )}
            <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 32 }}>BUSINESS PROFILE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[  
                ["Business Name", "name", "text", "e.g. Chrome Kings Wraps"],
                ["Phone", "phone", "tel", "e.g. (404) 555-0123"],
                ["Website", "website", "text", "e.g. chromekingswraps.com"],
                ["City", "city", "text", "e.g. Atlanta"],
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
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button
                  onClick={handleSaveProfile}
                  disabled={saveStatus === "saving"}
                  style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "14px 32px", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, cursor: saveStatus === "saving" ? "not-allowed" : "pointer", opacity: saveStatus === "saving" ? 0.6 : 1 }}
                >
                  {saveStatus === "saving" ? "Saving..." : "Save Profile"}
                </button>
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
