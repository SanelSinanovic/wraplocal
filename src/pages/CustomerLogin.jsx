export default function CustomerLogin({ nav, loginForm, setLoginForm, loginError, setLoginError, handleLogin }) {
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input { width: 100%; background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 15px; outline: none; } input:focus { border-color: #FF4D00; } @media (max-width: 768px) { .login-nav { padding: 12px 16px !important; } }`}</style>
      <nav className="login-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>WRAP<span style={{ color: "#fff" }}>LOCAL</span></div>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ fontSize: 48, letterSpacing: 2, marginBottom: 8 }}>CUSTOMER LOGIN</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 36 }}>Track your bookings and manage appointments</div>
          {loginError && (
            <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>
              {loginError}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>EMAIL ADDRESS</div>
            <input type="email" placeholder="marcus@email.com" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
            <input type="password" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin("customer")} />
          </div>
          <button onClick={() => handleLogin("customer")} style={{ width: "100%", background: "#FF4D00", color: "#fff", border: "none", padding: "16px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 3, cursor: "pointer", marginBottom: 16 }}>Sign In</button>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
            Are you a business? <span style={{ color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("company-login")}>Company login →</span>
          </div>
          <div style={{ marginTop: 24, padding: "12px 16px", background: "#111", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            Demo: marcus@email.com / customer123
          </div>
        </div>
      </div>
    </div>
  );
}
