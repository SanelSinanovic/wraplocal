import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function CompanyLogin({ nav, loginForm, setLoginForm, loginError, setLoginError, handleLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [signupForm, setSignupForm] = useState({ businessName: "", name: "", email: "", password: "", confirm: "", phone: "" });
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setSignupError("");
    const { businessName, name, email, password, confirm } = signupForm;
    if (!businessName.trim()) return setSignupError("Please enter your business name.");
    if (!name.trim()) return setSignupError("Please enter your name.");
    if (!email.includes("@")) return setSignupError("Please enter a valid email.");
    if (password.length < 6) return setSignupError("Password must be at least 6 characters.");
    if (password !== confirm) return setSignupError("Passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "company", name: name.trim(), business_name: businessName.trim() } },
    });
    setLoading(false);
    if (error) return setSignupError(error.message);
    setSignupSuccess(true);
  };

  const switchMode = (m) => { setMode(m); setSignupError(""); setLoginError(""); setSignupSuccess(false); };

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input { width: 100%; background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 15px; outline: none; } input:focus { border-color: #FF4D00; } @media (max-width: 768px) { .login-nav { padding: 12px 16px !important; } }`}</style>
      <nav className="login-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>KI<span style={{ color: "#fff" }}>DOR</span></div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer" }} onClick={() => nav("pricing")}>View Pricing</span>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, #FF4D00, #FF8C00)", marginBottom: 32 }} />

          {/* Mode tabs */}
          <div style={{ display: "flex", marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {[["login", "Sign In"], ["signup", "List Your Business"]].map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${mode === m ? "#FF4D00" : "transparent"}`, color: mode === m ? "#fff" : "rgba(255,255,255,0.35)", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, padding: "12px 0", cursor: "pointer", transition: "all 0.2s" }}>{label}</button>
            ))}
          </div>

          {mode === "login" ? (
            <>
              <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>BUSINESS LOGIN</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>Access your shop dashboard and manage bookings</div>
              {loginError && (
                <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>{loginError}</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>BUSINESS EMAIL</div>
                <input type="email" placeholder="info@yourshop.com" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
                <input type="password" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleLogin("company")} />
              </div>
              <button onClick={() => handleLogin("company")} style={{ width: "100%", background: "#FF4D00", color: "#fff", border: "none", padding: "16px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 3, cursor: "pointer", marginBottom: 16 }}>Sign In to Dashboard</button>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                <span style={{ cursor: "pointer" }} onClick={() => nav("customer-login")}>Customer login →</span>
              </div>
            </>
          ) : signupSuccess ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 32, letterSpacing: 2, marginBottom: 12 }}>CHECK YOUR EMAIL</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 12 }}>
                We sent a confirmation link to <b style={{ color: "#fff" }}>{signupForm.email}</b>.<br />Click it to activate your account, then sign in.
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 28, padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                After confirming, our team will review your listing and set up your shop profile. You can also set it up yourself in the dashboard under Profile.
              </div>
              <button onClick={() => switchMode("login")} style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "14px 32px", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, cursor: "pointer" }}>Go to Sign In</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>LIST YOUR BUSINESS</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>Join Kidor and start receiving bookings</div>
              {signupError && (
                <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>{signupError}</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>BUSINESS NAME</div>
                <input type="text" placeholder="Chrome Kings Wraps" value={signupForm.businessName} onChange={e => setSignupForm(f => ({ ...f, businessName: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>YOUR NAME</div>
                <input type="text" placeholder="John Smith" value={signupForm.name} onChange={e => setSignupForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>BUSINESS EMAIL</div>
                <input type="email" placeholder="info@yourshop.com" value={signupForm.email} onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))} />
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
                {loading ? "Creating Account..." : "Create Business Account →"}
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
