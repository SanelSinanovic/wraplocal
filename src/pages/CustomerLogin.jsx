import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function CustomerLogin({ nav, loginForm, setLoginForm, loginError, setLoginError, handleLogin, bookingContext }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);

  const checkEmail = async (email) => {
    if (!email.includes("@")) return;
    setEmailChecking(true);
    const { data } = await supabase.rpc("email_exists", { email_address: email });
    setEmailChecking(false);
    setEmailTaken(!!data);
  };

  const handleSignup = async () => {
    setSignupError("");
    const { name, email, password, confirm } = signupForm;
    if (!name.trim()) return setSignupError("Please enter your name.");
    if (!email.includes("@")) return setSignupError("Please enter a valid email.");
    if (password.length < 8) return setSignupError("Password must be at least 8 characters.");
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return setSignupError("Password must include uppercase, lowercase, and a number.");
    if (password !== confirm) return setSignupError("Passwords do not match.");
    if (!tosAccepted) return setSignupError("You must agree to the Terms of Service to create an account.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "customer", name: name.trim() },
        emailRedirectTo: window.location.href.split("#")[0],
      },
    });
    setLoading(false);
    if (error) return setSignupError(error.message);
    setSignupSuccess(true);
  };

  const handleForgotPassword = async () => {
    const email = forgotEmail.trim();
    if (!email.includes("@")) return setForgotError("Please enter a valid email address.");
    setForgotError("");
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) return setForgotError(error.message);
    setForgotEmail(email);
    setForgotSent(true);
  };

  const switchMode = (m) => { setMode(m); setSignupError(""); setLoginError(""); setSignupSuccess(false); setForgotMode(false); setForgotSent(false); setForgotEmail(""); setForgotError(""); };

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "linear-gradient(180deg, #0A0A0A 0%, #140A04 20%, #0A0A0A 55%, #05050C 100%)", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input { width: 100%; background: #161616; border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 15px; outline: none; transition: border-color 0.2s, background 0.2s; } input:focus { border-color: #FF4D00; background: #1c1c1c; } @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } @keyframes glowPulse { 0%,100% { opacity: 0.06; } 50% { opacity: 0.13; } } @keyframes glow-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 0.85; } } @keyframes orb-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(25px,-18px); } } .login-card { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; } .login-submit { background: #FF4D00; color: #fff; border: none; padding: 16px; font-family: 'Bebas Neue', cursive; font-size: 20px; letter-spacing: 3px; cursor: pointer; width: 100%; transition: background 0.2s, transform 0.15s; } .login-submit:hover { background: #FF6A20; transform: translateY(-1px); } .login-submit:active { transform: translateY(0); } @media (max-width: 768px) { .login-nav { padding: 12px 16px !important; } .login-outer { padding: 24px 20px !important; } .login-heading { font-size: 30px !important; letter-spacing: 1px !important; } } @media (max-width: 420px) { .login-outer { padding: 20px 14px !important; } .login-heading { font-size: 26px !important; } }`}</style>
      <div aria-hidden="true" style={{ position: "fixed", top: "-10%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,77,0,0.2) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 6s ease-in-out infinite", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-8%", width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "orb-drift 14s ease-in-out infinite", zIndex: 0 }} />
      <nav className="login-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 68, display: "block", cursor: "pointer" }} onClick={() => nav("landing")} />
      </nav>
      <div className="login-outer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,77,0,0.07) 0%, transparent 70%)", pointerEvents: "none", animation: "glowPulse 4s ease-in-out infinite" }} />
        <div className="login-card" style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
          {bookingContext && (
            <div style={{ background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.3)", padding: "14px 18px", marginBottom: 28, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 1, color: "#FF4D00", marginBottom: 2 }}>SIGN IN TO CONTINUE</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>You need an account to book and track your appointment requests.</div>
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 130, cursor: "pointer" }} onClick={() => nav("landing")} />
          </div>

          {/* Mode tabs */}
          <div style={{ display: "flex", marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {[["login", "Sign In"], ["signup", "Create Account"]].map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${mode === m ? "#FF4D00" : "transparent"}`, color: mode === m ? "#fff" : "rgba(255,255,255,0.35)", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, padding: "12px 0", cursor: "pointer", transition: "all 0.2s" }}>{label}</button>
            ))}
          </div>

          {mode === "login" ? (
            <>
              <div className="login-heading" style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>CUSTOMER LOGIN</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>Track your bookings and manage appointments</div>
              {loginError && (
                <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>{loginError}</div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>EMAIL ADDRESS</div>
                <input type="email" placeholder="marcus@email.com" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>PASSWORD</span>
                  <span onClick={() => { setForgotMode(true); setForgotEmail(loginForm.email); }} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", cursor: "pointer", letterSpacing: 0 }}>Forgot password?</span>
                </div>
                <input type="password" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleLogin("customer")} />
              </div>
              {forgotMode ? (
                forgotSent ? (
                  <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                    <div style={{ fontSize: 28, letterSpacing: 1, marginBottom: 8 }}>CHECK YOUR EMAIL</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 20 }}>We sent a password reset link to <b style={{ color: "#fff" }}>{forgotEmail}</b>.</div>
                    <button onClick={() => { setForgotMode(false); setForgotSent(false); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", padding: "10px 24px", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 2, cursor: "pointer" }}>Back to Sign In</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>RESET EMAIL</div>
                    <input type="email" placeholder="your@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} style={{ marginBottom: 14 }} onKeyDown={e => e.key === "Enter" && handleForgotPassword()} />
                    {forgotError && (
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF4D00", marginBottom: 12, lineHeight: 1.5 }}>{forgotError}</div>
                    )}
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                      <button onClick={handleForgotPassword} disabled={forgotLoading} className="login-submit" style={{ opacity: forgotLoading ? 0.6 : 1, cursor: forgotLoading ? "not-allowed" : "pointer" }}>{forgotLoading ? "Sending..." : "Send Reset Link"}</button>
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", cursor: "pointer" }} onClick={() => setForgotMode(false)}>← Back to sign in</div>
                  </>
                )
              ) : (
                <>
                  <button onClick={() => handleLogin("customer")} className="login-submit" style={{ marginBottom: 16 }}>Sign In</button>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                    Are you a business? <span style={{ color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("company-login")}>Company login →</span>
                  </div>
                </>
              )}
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
              <div className="login-heading" style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>CREATE ACCOUNT</div>
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
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={signupForm.email}
                  onChange={e => { setSignupForm(f => ({ ...f, email: e.target.value })); setEmailTaken(false); }}
                  onBlur={e => checkEmail(e.target.value)}
                  style={emailTaken ? { borderColor: "#FF4D00" } : {}}
                />
                {emailTaken && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", marginTop: 6 }}>
                    An account with this email already exists. <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => switchMode("login")}>Sign in instead →</span>
                  </div>
                )}
                {emailChecking && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Checking...</div>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
                <input type="password" placeholder="Min. 8 characters" value={signupForm.password} onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>CONFIRM PASSWORD</div>
                <input type="password" placeholder="••••••••" value={signupForm.confirm} onChange={e => setSignupForm(f => ({ ...f, confirm: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSignup()} />
              </div>
              <button onClick={handleSignup} disabled={loading || emailTaken || emailChecking} className="login-submit" style={{ opacity: (loading || emailTaken || emailChecking) ? 0.4 : 1, cursor: (loading || emailTaken || emailChecking) ? "not-allowed" : "pointer", marginBottom: 16 }}>
                {loading ? "Creating Account..." : "Create Account →"}
              </button>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                <input type="checkbox" id="tos-customer" checked={tosAccepted} onChange={e => setTosAccepted(e.target.checked)} style={{ width: 15, height: 15, marginTop: 2, accentColor: "#FF4D00", flexShrink: 0, cursor: "pointer" }} />
                <label htmlFor="tos-customer" style={{ cursor: "pointer" }}>
                  I agree to the <span onClick={() => nav("terms")} style={{ color: "#FF4D00", cursor: "pointer" }}>Terms of Service</span> and <span onClick={() => nav("privacy")} style={{ color: "#FF4D00", cursor: "pointer" }}>Privacy Policy</span>
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
