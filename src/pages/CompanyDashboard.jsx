import { useState } from "react";
import { DASHBOARD_BOOKINGS } from "../data/data";

// Parse "Mon DD, YYYY" → { month (0-indexed), day, year }
function parseDate(str) {
  const d = new Date(str);
  return { month: d.getMonth(), day: d.getDate(), year: d.getFullYear() };
}

export default function CompanyDashboard({ nav, dashTab, setDashTab }) {
  const [bookingsView, setBookingsView] = useState("list");
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun

  // Map bookings to day numbers for the current calendar month
  const bookingsByDay = {};
  DASHBOARD_BOOKINGS.forEach(b => {
    const { month, day, year } = parseDate(b.date);
    if (month === calMonth && year === calYear) {
      if (!bookingsByDay[day]) bookingsByDay[day] = [];
      bookingsByDay[day].push(b);
    }
  });

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
        <div className="sidebar-sub" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginBottom: 8, padding: "0 4px" }}>CHROME KINGS WRAPS</div>
        {[["overview", "📊 Overview"], ["bookings", "📅 Bookings"], ["profile", "✏️ Profile"], ["payments", "💰 Payments"], ["settings", "⚙️ Settings"]].map(([k, l]) => (
          <div key={k} className={`nav-item${dashTab === k ? " active" : ""}`} onClick={() => setDashTab(k)}>{l}</div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="sidebar-footer" style={{ padding: "14px 16px", background: "rgba(255,77,0,0.05)", border: "1px solid rgba(255,77,0,0.15)" }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>SUBSCRIPTION</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#10B981", marginBottom: 4 }}>● Active - Monthly</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Renews Mar 15, 2026</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#FF4D00", marginTop: 6, cursor: "pointer" }}>Upgrade to Annual →</div>
        </div>
      </div>

      {/* Main content */}
      <div className="company-main" style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
        {dashTab === "overview" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 40, letterSpacing: 2 }}>DASHBOARD</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>February 2026 overview</div>
              </div>
              <div style={{ background: "#FF4D00", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>+ Block Time Off</div>
            </div>
            <div className="stats-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {[["Total Revenue", "$6,720", "+18% vs last mo", "#10B981"], ["Bookings", "12", "+4 vs last mo", "#10B981"], ["WrapLocal Fee (7%)", "-$470.40", "This month", "#F59E0B"], ["Net Payout", "$6,249.60", "To your account", "#FF4D00"]].map(([l, v, s, c]) => (
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
                {DASHBOARD_BOOKINGS.filter(b => b.status === "confirmed").map(b => (
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
                {[["Full Color Change", 2400, 40], ["Partial Wraps", 1950, 33], ["PPF", 1140, 19], ["Racing Stripes", 480, 8]].map(([s, amt, pct]) => (
                  <div key={s} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{s}</span>
                      <span>${amt.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#FF4D00", borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {dashTab === "bookings" && (
          <div>
            {/* Header + toggle */}
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

            {/* LIST VIEW */}
            {bookingsView === "list" && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["ID", "Customer", "Service", "Date", "Status", "Amount", "Your Payout"].map(h => (
                      <th key={h} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 400, textAlign: "left", padding: "8px 12px", letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DASHBOARD_BOOKINGS.map(b => (
                    <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF4D00" }}>{b.id}</td>
                      <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>{b.customer}</td>
                      <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{b.service}</td>
                      <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{b.date}</td>
                      <td style={{ padding: "14px 12px" }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: b.status === "confirmed" ? "#10B981" : "rgba(255,255,255,0.4)" }}>● {b.status}</span>
                      </td>
                      <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>${b.amount}</td>
                      <td style={{ padding: "14px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#10B981" }}>${b.payout.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* CALENDAR VIEW */}
            {bookingsView === "calendar" && (
              <div>
                {/* Month nav */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                  <button onClick={prevMonth} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>‹</button>
                  <div style={{ fontSize: 28, letterSpacing: 2 }}>{MONTH_NAMES[calMonth].toUpperCase()} {calYear}</div>
                  <button onClick={nextMonth} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 16 }}>›</button>
                  <div style={{ marginLeft: "auto", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                    {Object.values(bookingsByDay).flat().length} booking{Object.values(bookingsByDay).flat().length !== 1 ? "s" : ""} this month
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

        {dashTab === "payments" && (
          <div>
            <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>PAYMENTS & PAYOUTS</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>WrapLocal retains 7% of all bookings as a platform fee</div>
            <div className="stats-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
              <div className="stat-card">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>PENDING PAYOUT</div>
                <div style={{ fontSize: 40, color: "#10B981" }}>$2,183.40</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Deposits within 48 hrs</div>
              </div>
              <div className="stat-card">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>TOTAL PAID OUT</div>
                <div style={{ fontSize: 40 }}>$18,420</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>All time</div>
              </div>
              <div className="stat-card">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>SUBSCRIPTION</div>
                <div style={{ fontSize: 40, color: "#FF4D00" }}>$49.99</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Next billing: Mar 15</div>
              </div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: 22, letterSpacing: 1, marginBottom: 20 }}>FEE BREAKDOWN — February 2026</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 0" }}><span>Total Booking Revenue</span><span style={{ color: "#fff" }}>$6,720.00</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 0" }}><span>WrapLocal Fee (7%)</span><span style={{ color: "#F59E0B" }}>-$470.40</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "8px 0" }}><span>Monthly Subscription</span><span style={{ color: "#F59E0B" }}>-$49.99</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}><span style={{ fontSize: 18, fontFamily: "'Bebas Neue', cursive", letterSpacing: 1 }}>NET PAYOUT</span><span style={{ fontSize: 18, color: "#10B981", fontFamily: "'Bebas Neue', cursive" }}>$6,199.61</span></div>
              </div>
            </div>
          </div>
        )}

        {(dashTab === "profile" || dashTab === "settings") && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 32 }}>{dashTab === "profile" ? "EDIT PROFILE" : "SETTINGS"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {(dashTab === "profile"
                ? [["Business Name", "Chrome Kings Wraps"], ["Location", "Atlanta, GA 30305"], ["Phone", "(404) 555-0123"], ["Website", "chromekingswraps.com"], ["Bio", "Atlanta's premier wrap studio since 2015."]]
                : [["Contact Email", "info@chromekings.com"], ["Notification Preferences", "Email + SMS"], ["Booking Window", "2 weeks in advance"], ["Cancellation Policy", "48-hour notice required"]]
              ).map(([l, v]) => (
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
