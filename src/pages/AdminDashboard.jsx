import { useState, useEffect } from "react";
import { fetchPlatformStats, fetchAllShops, fetchAllBookings, fetchAllUsers, adminToggleShopListed, adminSetInsuranceStatus, isAdmin } from "../lib/adminQueries";

export default function AdminDashboard({ nav, currentUser, currentProfile, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(null);
  const [shopSearch, setShopSearch] = useState("");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  // Auth guard
  useEffect(() => {
    if (!currentUser) { setAuthorized(false); return; }
    isAdmin(currentUser.id).then(ok => {
      setAuthorized(ok);
      if (ok) loadData();
    });
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    const [s, sh, b, u] = await Promise.all([
      fetchPlatformStats(),
      fetchAllShops(),
      fetchAllBookings(),
      fetchAllUsers(),
    ]);
    setStats(s);
    setShops(sh);
    setBookings(b);
    setUsers(u);
    setLoading(false);
  };

  if (authorized === null) return <div style={fullPage}>Checking access…</div>;
  if (authorized === false) return (
    <div style={fullPage}>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, letterSpacing: 3, marginBottom: 8 }}>
        <span style={{ color: "#FF4D00" }}>WRAP</span>BRIDGE
      </div>
      <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", fontSize: 16, marginBottom: 24 }}>Admin access required.</p>
      <button onClick={() => nav("landing")} style={btnMain}>Back to Home</button>
    </div>
  );

  const fmt = (n) => n != null ? n.toLocaleString("en-US") : "—";
  const fmtUSD = (n) => n != null ? "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—";

  const filteredShops = shops.filter(s => {
    if (!shopSearch) return true;
    const q = shopSearch.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.id?.includes(q);
  });

  const filteredBookings = bookings.filter(b => {
    if (bookingFilter === "all") return true;
    if (bookingFilter === "disputed") return !!b.dispute_status;
    if (bookingFilter === "refunded") return !!b.refund_status;
    return b.status === bookingFilter;
  });
  const filteredUsers = users.filter(u => userFilter === "all" || u.role === userFilter);

  const toggleListed = async (shop) => {
    const ok = await adminToggleShopListed(shop.id, !shop.is_listed);
    if (ok) setShops(prev => prev.map(s => s.id === shop.id ? { ...s, is_listed: !s.is_listed } : s));
  };

  const maxGMV = stats?.months ? Math.max(...stats.months.map(m => m.gmv), 1) : 1;

  return (
    <div className="admin-wrap" style={{ fontFamily: "'Bebas Neue', cursive", background: "linear-gradient(180deg, #090909 0%, #0A0610 25%, #090909 60%, #05050C 100%)", minHeight: "100vh", color: "#fff", display: "flex", position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        .adm-nav { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; color: rgba(255,255,255,0.5); border-radius: 4px; transition: all 0.2s; }
        .adm-nav:hover, .adm-nav.active { background: rgba(139,92,246,0.12); color: #A78BFA; }
        .adm-card { background: #111; border: 1px solid rgba(255,255,255,0.07); padding: 24px; transition: border-color 0.2s; }
        .adm-card:hover { border-color: rgba(255,255,255,0.13); }
        .adm-stat { background: #111; border: 1px solid rgba(255,255,255,0.07); padding: 22px 20px; position: relative; overflow: hidden; }
        .adm-stat.purple { background: linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.03) 60%, #111 100%); border-color: rgba(139,92,246,0.3); }
        .adm-stat.green { background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.03) 60%, #111 100%); border-color: rgba(16,185,129,0.22); }
        .adm-stat.blue { background: linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.03) 60%, #111 100%); border-color: rgba(59,130,246,0.22); }
        .adm-stat.amber { background: linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.03) 60%, #111 100%); border-color: rgba(245,158,11,0.22); }
        .adm-stat.orange { background: linear-gradient(135deg, rgba(255,77,0,0.12) 0%, rgba(255,77,0,0.04) 60%, #111 100%); border-color: rgba(255,77,0,0.3); }
        .adm-row { display: flex; align-items: center; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(255,255,255,0.6); transition: background 0.15s; }
        .adm-row:hover { background: rgba(139,92,246,0.06); }
        .adm-pill { display: inline-block; padding: 2px 10px; font-size: 11px; font-weight: 600; border-radius: 3px; letter-spacing: 0.5px; text-transform: uppercase; }
        .adm-input { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; width: 100%; outline: none; }
        .adm-input:focus { border-color: rgba(139,92,246,0.5); }
        .adm-filter { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); padding: 6px 14px; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; }
        .adm-filter:hover { border-color: rgba(139,92,246,0.4); color: rgba(255,255,255,0.7); }
        .adm-filter.active { background: rgba(139,92,246,0.15); border-color: rgba(139,92,246,0.5); color: #A78BFA; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 0.85; } }
        @keyframes orb-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }
        .anim-0 { animation: fadeUp 0.4s ease both; }
        .anim-1 { animation: fadeUp 0.4s 0.07s ease both; }
        .anim-2 { animation: fadeUp 0.4s 0.14s ease both; }
        .anim-3 { animation: fadeUp 0.4s 0.21s ease both; }
        @media (max-width: 900px) { .admin-wrap { flex-direction: column !important; } .adm-sidebar { width: 100% !important; flex-direction: row !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; padding: 8px !important; flex-wrap: wrap; } .adm-sidebar .sidebar-logo { display: none !important; } .adm-sidebar .sidebar-sub { display: none !important; } .adm-sidebar .sidebar-footer { display: none !important; } .adm-nav { padding: 8px 12px !important; font-size: 12px !important; } .adm-main { padding: 16px !important; } .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 500px) { .stats-grid { grid-template-columns: 1fr !important; } .adm-main { padding: 10px !important; } }
      `}</style>

      {/* Ambient orbs */}
      <div aria-hidden="true" style={{ position: "fixed", top: "-10%", right: "-5%", width: 650, height: 650, background: "radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 7s ease-in-out infinite", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-5%", width: 550, height: 550, background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "orb-drift 16s ease-in-out infinite", zIndex: 0 }} />

      {/* Sidebar */}
      <div className="adm-sidebar" style={{ width: 220, background: "#0B0B0F", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "24px 16px", display: "flex", flexDirection: "column", flexShrink: 0, zIndex: 1 }}>
        <img src="/images/Logo.png" alt="WrapBridge" className="sidebar-logo" style={{ width: 170, cursor: "pointer", display: "block", marginBottom: 12 }} onClick={() => nav("landing")} />
        <div className="sidebar-sub" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(139,92,246,0.6)", letterSpacing: 2, marginBottom: 20, padding: "0 4px" }}>ADMIN PANEL</div>
        {[["overview", "📊 Overview"], ["shops", "🏪 Shops"], ["bookings", "📋 Bookings"], ["users", "👥 Users"]].map(([k, l]) => (
          <div key={k} className={`adm-nav${tab === k ? " active" : ""}`} onClick={() => setTab(k)}>{l}</div>
        ))}
        <div style={{ flex: 1 }} />
        {currentUser && (
          <button onClick={onLogout} className="sidebar-footer" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", background: "none", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 12px", cursor: "pointer", width: "100%" }}>Log Out</button>
        )}
      </div>

      {/* Main */}
      <div className="adm-main" style={{ flex: 1, overflow: "auto", padding: "32px 40px", zIndex: 1 }}>
        {loading ? <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", padding: 40 }}>Loading platform data…</div> : (
          <>
            {tab === "overview" && <OverviewTab stats={stats} fmtUSD={fmtUSD} fmt={fmt} maxGMV={maxGMV} />}
            {tab === "shops" && <ShopsTab shops={filteredShops} search={shopSearch} setSearch={setShopSearch} toggleListed={toggleListed} setShops={setShops} fmtDate={fmtDate} />}
            {tab === "bookings" && <BookingsTab bookings={filteredBookings} filter={bookingFilter} setFilter={setBookingFilter} fmtUSD={fmtUSD} fmtDate={fmtDate} fmt={fmt} />}
            {tab === "users" && <UsersTab users={filteredUsers} filter={userFilter} setFilter={setUserFilter} fmtDate={fmtDate} fmt={fmt} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, fmtUSD, fmt, maxGMV }) {
  if (!stats) return null;
  return (
    <div>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 3, marginBottom: 24 }}>
        Platform Overview
      </div>

      {/* Top-level KPIs */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="adm-stat purple anim-0">
          <div style={statLabel}>TOTAL GMV</div>
          <div style={statValue}>{fmtUSD(stats.totalGMV)}</div>
          <div style={statSub}>{fmt(stats.totalBookings)} bookings</div>
        </div>
        <div className="adm-stat green anim-1">
          <div style={statLabel}>PLATFORM REVENUE</div>
          <div style={{ ...statValue, color: "#10B981" }}>{fmtUSD(stats.totalRevenue)}</div>
          <div style={statSub}>7% take rate</div>
        </div>
        <div className="adm-stat blue anim-2">
          <div style={statLabel}>TOTAL USERS</div>
          <div style={statValue}>{fmt(stats.totalCustomers + stats.totalCompanies)}</div>
          <div style={statSub}>{fmt(stats.totalCustomers)} customers · {fmt(stats.totalCompanies)} companies</div>
        </div>
        <div className="adm-stat amber anim-3">
          <div style={statLabel}>SHOPS</div>
          <div style={statValue}>{fmt(stats.totalShops)}</div>
          <div style={statSub}>{fmt(stats.listedShops)} listed · {fmt(stats.stripeShops)} Stripe active</div>
        </div>
      </div>

      {/* Booking status breakdown */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          ["Pending", stats.pendingBookings, "#F59E0B"],
          ["Confirmed", stats.confirmedBookings, "#3B82F6"],
          ["Completed", stats.completedBookings, "#10B981"],
          ["Cancelled", stats.cancelledBookings, "#EF4444"],
        ].map(([label, val, color]) => (
          <div key={label} className="adm-stat" style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 32, color, letterSpacing: 2 }}>{fmt(val)}</div>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      <div className="adm-card" style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 20 }}>MONTHLY GMV (LAST 6 MONTHS)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
          {stats.months.map(m => (
            <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>${Math.round(m.gmv).toLocaleString()}</div>
              <div style={{ width: "100%", background: "rgba(139,92,246,0.15)", borderRadius: 2, position: "relative", overflow: "hidden", height: Math.max(4, (m.gmv / maxGMV) * 120) }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(139,92,246,0.6) 0%, rgba(139,92,246,0.25) 100%)" }} />
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly detail table */}
      <div className="adm-card">
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 16 }}>MONTHLY BREAKDOWN</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Month", "Bookings", "GMV", "Revenue (7%)", "New Shops", "New Users"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.months.map(m => (
                <tr key={m.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={td}>{m.label}</td>
                  <td style={td}>{m.bookings}</td>
                  <td style={td}>${m.gmv.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ ...td, color: "#10B981" }}>${m.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={td}>{m.newShops}</td>
                  <td style={td}>{m.newUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── SHOPS TAB ────────────────────────────────────────────────────────────────

function ShopsTab({ shops, search, setSearch, toggleListed, setShops, fmtDate }) {
  const handleInsurance = async (shop, status) => {
    const ok = await adminSetInsuranceStatus(shop.id, status);
    if (ok) setShops(prev => prev.map(s => s.id === shop.id ? { ...s, insurance_status: status, insurance_verified: status === "verified" } : s));
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 3 }}>All Shops ({shops.length})</div>
        <input className="adm-input" placeholder="Search by name, city, or ID…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
      </div>
      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Shop", "Location", "Rating", "Listed", "Stripe", "Insurance", "Created", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500, letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shops.map(s => (
                <tr key={s.id} className="adm-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", padding: 0 }}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {s.banner_url ? (
                        <img src={s.banner_url} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 4, background: "rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#A78BFA" }}>{s.avatar || "?"}</div>
                      )}
                      <span style={{ color: "#fff", fontWeight: 500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={td}>{[s.city, s.state].filter(Boolean).join(", ") || "—"}</td>
                  <td style={td}>{s.rating ? `⭐ ${s.rating} (${s.review_count})` : "—"}</td>
                  <td style={td}><StatusPill ok={s.is_listed} yes="Listed" no="Unlisted" /></td>
                  <td style={td}><StatusPill ok={s.stripe_onboarded} yes="Active" no="Not Set" /></td>
                  <td style={td}>
                    {s.insurance_status === "verified" && <span style={{ color: "#3B82F6", fontWeight: 600, fontSize: 11 }}>🛡️ Verified</span>}
                    {s.insurance_status === "pending" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {s.insurance_doc_url && <a href={s.insurance_doc_url} target="_blank" rel="noopener noreferrer" style={{ color: "#F59E0B", fontSize: 11, textDecoration: "none", fontWeight: 600 }}>📄 Review</a>}
                        <button onClick={() => handleInsurance(s, "verified")} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.4)", color: "#3B82F6", padding: "2px 8px", fontSize: 10, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>✓</button>
                        <button onClick={() => handleInsurance(s, "rejected")} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#EF4444", padding: "2px 8px", fontSize: 10, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>✗</button>
                      </div>
                    )}
                    {s.insurance_status === "rejected" && <span style={{ color: "#EF4444", fontWeight: 600, fontSize: 11 }}>Rejected</span>}
                    {!s.insurance_status && <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>None</span>}
                  </td>
                  <td style={td}>{fmtDate(s.created_at)}</td>
                  <td style={td}>
                    <button onClick={() => toggleListed(s)} style={{ background: s.is_listed ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", border: `1px solid ${s.is_listed ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"}`, color: s.is_listed ? "#EF4444" : "#10B981", padding: "4px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                      {s.is_listed ? "Unlist" : "List"}
                    </button>
                  </td>
                </tr>
              ))}
              {shops.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, textAlign: "center", padding: 32, color: "rgba(255,255,255,0.25)" }}>No shops found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── BOOKINGS TAB ─────────────────────────────────────────────────────────────

function BookingsTab({ bookings, filter, setFilter, fmtUSD, fmtDate, fmt }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 3 }}>All Bookings ({fmt(bookings.length)})</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "pending", "confirmed", "completed", "cancelled", "disputed", "refunded"].map(f => (
            <button key={f} className={`adm-filter${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["ID", "Service", "Status", "Amount", "Fee (7%)", "Paid", "Refund", "Dispute", "Scheduled", "Created"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500, letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id} className="adm-row" style={{ padding: 0 }}>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{b.id.slice(0, 8)}…</td>
                  <td style={td}>{b.service || "—"}</td>
                  <td style={td}><BookingStatusPill status={b.status} /></td>
                  <td style={td}>{b.amount ? fmtUSD(parseFloat(b.amount)) : "—"}</td>
                  <td style={{ ...td, color: "#10B981" }}>{b.fee ? fmtUSD(parseFloat(b.fee)) : "—"}</td>
                  <td style={td}>{b.payment_verified ? <span style={{ color: "#10B981" }}>✓ Yes</span> : <span style={{ color: "rgba(255,255,255,0.25)" }}>No</span>}</td>
                  <td style={td}>{b.refund_status === "full" ? <span style={{ color: "#A855F7" }}>Full</span> : b.refund_status === "partial" ? <span style={{ color: "#F59E0B" }}>Partial</span> : <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>}</td>
                  <td style={td}>{b.dispute_status === "open" ? <span style={{ color: "#EF4444", fontWeight: 600 }}>⚠ Open</span> : b.dispute_status === "won" ? <span style={{ color: "#10B981" }}>Won</span> : b.dispute_status === "lost" ? <span style={{ color: "#EF4444" }}>Lost</span> : <span style={{ color: "rgba(255,255,255,0.15)" }}>—</span>}</td>
                  <td style={td}>{b.date || "—"}</td>
                  <td style={td}>{fmtDate(b.created_at)}</td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={10} style={{ ...td, textAlign: "center", padding: 32, color: "rgba(255,255,255,0.25)" }}>No bookings found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── USERS TAB ────────────────────────────────────────────────────────────────

function UsersTab({ users, filter, setFilter, fmtDate, fmt }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 3 }}>All Users ({fmt(users.length)})</div>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "customer", "company", "admin"].map(f => (
            <button key={f} className={`adm-filter${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Name", "Role", "User ID", "Created"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="adm-row" style={{ padding: 0 }}>
                  <td style={{ ...td, color: "#fff", fontWeight: 500 }}>{u.name || "—"}</td>
                  <td style={td}><RolePill role={u.role} /></td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{u.id.slice(0, 12)}…</td>
                  <td style={td}>{fmtDate(u.created_at)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} style={{ ...td, textAlign: "center", padding: 32, color: "rgba(255,255,255,0.25)" }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── HELPER COMPONENTS ────────────────────────────────────────────────────────

function StatusPill({ ok, yes, no }) {
  return <span className="adm-pill" style={{ background: ok ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)", color: ok ? "#10B981" : "rgba(255,255,255,0.3)", border: `1px solid ${ok ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}` }}>{ok ? yes : no}</span>;
}

function BookingStatusPill({ status }) {
  const map = { pending: ["#F59E0B", "rgba(245,158,11,0.12)", "rgba(245,158,11,0.35)"], confirmed: ["#3B82F6", "rgba(59,130,246,0.12)", "rgba(59,130,246,0.35)"], completed: ["#10B981", "rgba(16,185,129,0.12)", "rgba(16,185,129,0.35)"], cancelled: ["#EF4444", "rgba(239,68,68,0.12)", "rgba(239,68,68,0.35)"] };
  const [color, bg, border] = map[status] || ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0.08)"];
  return <span className="adm-pill" style={{ color, background: bg, border: `1px solid ${border}` }}>{status || "unknown"}</span>;
}

function RolePill({ role }) {
  const map = { customer: ["#3B82F6", "rgba(59,130,246,0.12)"], company: ["#F59E0B", "rgba(245,158,11,0.12)"], admin: ["#A78BFA", "rgba(139,92,246,0.12)"] };
  const [color, bg] = map[role] || ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.05)"];
  return <span className="adm-pill" style={{ color, background: bg, border: `1px solid ${color}33` }}>{role || "unknown"}</span>;
}

// ── STYLE CONSTANTS ──────────────────────────────────────────────────────────

const fullPage = { minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "'DM Sans', sans-serif" };
const btnMain = { background: "#FF4D00", color: "#fff", border: "none", padding: "12px 28px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2, cursor: "pointer" };
const statLabel = { fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 8 };
const statValue = { fontFamily: "'Bebas Neue', cursive", fontSize: 36, letterSpacing: 2, color: "#fff", lineHeight: 1 };
const statSub = { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 };
const td = { padding: "10px 14px", whiteSpace: "nowrap" };
