export default function CompanyLogin({ nav, loginForm, setLoginForm, loginError, setLoginError, handleLogin }) {
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input { width: 100%; background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 15px; outline: none; } input:focus { border-color: #FF4D00; }`}</style>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>WRAP<span style={{ color: "#fff" }}>LOCAL</span></div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer" }} onClick={() => nav("pricing")}>View Pricing</span>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, #FF4D00, #FF8C00)", marginBottom: 32 }} />
          <div style={{ fontSize: 48, letterSpacing: 2, marginBottom: 8 }}>BUSINESS LOGIN</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 36 }}>Access your shop dashboard and manage bookings</div>
          {loginError && (
            <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>
              {loginError}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>BUSINESS EMAIL</div>
            <input type="email" placeholder="info@yourshop.com" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
            <input type="password" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin("company")} />
          </div>
          <button onClick={() => handleLogin("company")} style={{ width: "100%", background: "#FF4D00", color: "#fff", border: "none", padding: "16px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 3, cursor: "pointer", marginBottom: 16 }}>Sign In to Dashboard</button>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
            <span style={{ color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("pricing")}>List your business →</span>
            <span>·</span>
            <span style={{ cursor: "pointer" }} onClick={() => nav("customer-login")}>Customer login →</span>
          </div>
          <div style={{ marginTop: 24, padding: "12px 16px", background: "#111", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            Demo: info@chromekings.com / company123
          </div>
        </div>
      </div>
    </div>
  );
}
