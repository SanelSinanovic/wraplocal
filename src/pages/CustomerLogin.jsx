import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function CustomerLogin({ nav, loginForm, setLoginForm, loginError, setLoginError, handleLogin, bookingContext }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setSignupError("");
    const { name, email, password, confirm } = signupForm;
    if (!name.trim()) return setSignupError("Please enter your name.");
    if (!email.includes("@")) return setSignupError("Please enter a valid email.");
    if (password.length < 6) return setSignupError("Password must be at least 6 characters.");
    if (password !== confirm) return setSignupError("Passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "customer", name: name.trim() } },
    });
    setLoading(false);
    if (error) return setSignupError(error.message);
    nav("customer-dash");
  };

  const switchMode = (m) => { setMode(m); setSignupError(""); setLoginError(""); setSignupSuccess(false); };

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input { width: 100%; background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 15px; outline: none; } input:focus { border-color: #FF4D00; } @media (max-width: 768px) { .login-nav { padding: 12px 16px !important; } }`}</style>
      <nav className="login-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>WRAP<span style={{ color: "#fff" }}>LOCAL</span></div>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {bookingContext && (
            <div style={{ background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.3)", padding: "14px 18px", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 1, color: "#FF4D00", marginBottom: 2 }}>SIGN IN TO CONTINUE</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>You need an account to book and track your appointment requests.</div>
              </div>
            </div>
          )}

          {/* Mode tabs */}
          <div style={{ display: "flex", marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {[["login", "Sign In"], ["signup", "Create Account"]].map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${mode === m ? "#FF4D00" : "transparent"}`, color: mode === m ? "#fff" : "rgba(255,255,255,0.35)", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, padding: "12px 0", cursor: "pointer", transition: "all 0.2s" }}>{label}</button>
            ))}
          </div>

          {mode === "login" ? (
            <>
              <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>CUSTOMER LOGIN</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>Track your bookings and manage appointments</div>
              {loginError && (
                <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>{loginError}</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>EMAIL ADDRESS</div>
                <input type="email" placeholder="marcus@email.com" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
                <input type="password" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleLogin("customer")} />
              </div>
              <button onClick={() => handleLogin("customer")} style={{ width: "100%", background: "#FF4D00", color: "#fff", border: "none", padding: "16px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 3, cursor: "pointer", marginBottom: 16 }}>Sign In</button>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                Are you a business? <span style={{ color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("company-login")}>Company login →</span>
              </div>
            </>
          ) : signupSuccess ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 32, letterSpacing: 2, marginBottom: 12 }}>CHECK YOUR EMAIL</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 28 }}>
                We sent a confirmation link to <b style={{ color: "#fff" }}>{signupForm.email}</b>.<br />Click it to activate your account, then sign in.
              </div>
              <button onClick={() => switchMode("login")} style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "14px 32px", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, cursor: "pointer" }}>Go to Sign In</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>CREATE ACCOUNT</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>Book wrap shops and track your appointments</div>
              {signupError && (
                <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>{signupError}</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>FULL NAME</div>
                <input type="text" placeholder="Marcus Thompson" value={signupForm.name} onChange={e => setSignupForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>EMAIL ADDRESS</div>
                <input type="email" placeholder="you@email.com" value={signupForm.email} onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
                <input type="password" placeholder="Min. 6 characters" value={signupForm.password} onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>CONFIRM PASSWORD</div>
                <input type="password" placeholder="••••••••" value={signupForm.confirm} onChange={e => setSignupForm(f => ({ ...f, confirm: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSignup()} />
              </div>
              <button onClick={handleSignup} disabled={loading} style={{ width: "100%", background: "#FF4D00", color: "#fff", border: "none", padding: "16px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 3, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginBottom: 16 }}>
                {loading ? "Creating Account..." : "Create Account →"}
              </button>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.5 }}>
                By signing up you agree to our Terms of Service.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
