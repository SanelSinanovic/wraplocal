import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ContractorLogin({ nav, loginForm, setLoginForm, loginError, setLoginError, handleLogin }) {
  const [mode, setMode] = useState("login");
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", confirm: "", title: "", city: "", state: "" });
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const checkEmail = async (email) => {
    if (!email.includes("@")) return;
    setEmailChecking(true);
    const { data } = await supabase.rpc("email_exists", { email_address: email });
    setEmailChecking(false);
    setEmailTaken(!!data);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setSignupError("");
    setLoginError("");
    setSignupSuccess(false);
    setForgotMode(false);
    setForgotSent(false);
    setForgotError("");
  };

  const handleSignup = async () => {
    setSignupError("");
    const { name, email, password, confirm, title, city, state } = signupForm;
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
        data: { role: "contractor", name: name.trim(), title: title.trim(), city: city.trim(), state: state.trim() },
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setForgotLoading(false);
    if (error) return setForgotError(error.message);
    setForgotEmail(email);
    setForgotSent(true);
  };

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "linear-gradient(180deg, #0A0A0A 0%, #140A04 22%, #0A0A0A 58%, #05050C 100%)", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input { width: 100%; background: #161616; border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 15px; outline: none; transition: border-color 0.2s, background 0.2s; } input:focus { border-color: #FF4D00; background: #1c1c1c; } @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } .login-card { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; } .login-submit { background: #FF4D00; color: #fff; border: none; padding: 16px; font-family: 'Bebas Neue', cursive; font-size: 20px; letter-spacing: 3px; cursor: pointer; width: 100%; transition: background 0.2s, transform 0.15s; } .login-submit:hover { background: #FF6A20; transform: translateY(-1px); } @media (max-width: 768px) { .login-nav { padding: 12px 16px !important; } .login-outer { padding: 24px 20px !important; } .login-heading { font-size: 30px !important; } }`}</style>
      <div aria-hidden="true" style={{ position: "fixed", top: "-10%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,77,0,0.2) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-8%", width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />
      <nav className="login-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", zIndex: 1 }}>
        <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 68, display: "block", cursor: "pointer" }} onClick={() => nav("landing")} />
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", cursor: "pointer" }} onClick={() => nav("company-login")}>Business Login</span>
      </nav>
      <div className="login-outer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, position: "relative" }}>
        <div className="login-card" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, #FF4D00, #FF8C00)", marginBottom: 32 }} />
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 126, cursor: "pointer" }} onClick={() => nav("landing")} />
          </div>
          <div style={{ display: "flex", marginBottom: 30, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {[["login", "Sign In"], ["signup", "Create Contractor Account"]].map(([itemMode, label]) => (
              <button key={itemMode} onClick={() => switchMode(itemMode)} style={{ flex: 1, background: "none", border: "none", borderBottom: `2px solid ${mode === itemMode ? "#FF4D00" : "transparent"}`, color: mode === itemMode ? "#fff" : "rgba(255,255,255,0.35)", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, padding: "12px 0", cursor: "pointer" }}>{label}</button>
            ))}
          </div>

          {mode === "login" ? (
            <>
              <div className="login-heading" style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>CONTRACTOR LOGIN</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 30 }}>Manage your installer profile and company messages</div>
              {loginError && <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>{loginError}</div>}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>EMAIL ADDRESS</div>
                <input type="email" placeholder="installer@email.com" value={loginForm.email} onChange={event => setLoginForm(previous => ({ ...previous, email: event.target.value }))} />
              </div>
              <div style={{ marginBottom: 26 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>PASSWORD</span>
                  <span onClick={() => { setForgotMode(true); setForgotEmail(loginForm.email); }} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", cursor: "pointer" }}>Forgot password?</span>
                </div>
                <input type="password" placeholder="••••••••" value={loginForm.password} onChange={event => setLoginForm(previous => ({ ...previous, password: event.target.value }))} onKeyDown={event => event.key === "Enter" && handleLogin("contractor")} />
              </div>
              {forgotMode ? (
                forgotSent ? (
                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <div style={{ fontSize: 28, letterSpacing: 1, marginBottom: 8 }}>CHECK YOUR EMAIL</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 18 }}>We sent a password reset link to <b style={{ color: "#fff" }}>{forgotEmail}</b>.</div>
                    <button onClick={() => { setForgotMode(false); setForgotSent(false); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", padding: "10px 24px", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 2, cursor: "pointer" }}>Back to Sign In</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>RESET EMAIL</div>
                    <input type="email" placeholder="installer@email.com" value={forgotEmail} onChange={event => setForgotEmail(event.target.value)} style={{ marginBottom: 12 }} onKeyDown={event => event.key === "Enter" && handleForgotPassword()} />
                    {forgotError && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF4D00", marginBottom: 12 }}>{forgotError}</div>}
                    <button onClick={handleForgotPassword} disabled={forgotLoading} className="login-submit" style={{ opacity: forgotLoading ? 0.6 : 1, marginBottom: 14 }}>{forgotLoading ? "Sending..." : "Send Reset Link"}</button>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", cursor: "pointer" }} onClick={() => setForgotMode(false)}>Back to sign in</div>
                  </>
                )
              ) : (
                <>
                  <button onClick={() => handleLogin("contractor")} className="login-submit" style={{ marginBottom: 16 }}>Sign In to Dashboard</button>
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                    <span style={{ cursor: "pointer" }} onClick={() => nav("customer-login")}>Customer login</span>
                    <span style={{ cursor: "pointer" }} onClick={() => nav("company-login")}>Business login</span>
                  </div>
                </>
              )}
            </>
          ) : signupSuccess ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 32, letterSpacing: 2, marginBottom: 12 }}>CHECK YOUR EMAIL</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 26 }}>We sent a confirmation link to <b style={{ color: "#fff" }}>{signupForm.email}</b>. Confirm it, then sign in to finish your contractor profile.</div>
              <button onClick={() => switchMode("login")} style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "14px 32px", fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 2, cursor: "pointer" }}>Go to Sign In</button>
            </div>
          ) : (
            <>
              <div className="login-heading" style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>CONTRACTOR ACCOUNT</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>Create an installer profile companies can contact</div>
              {signupError && <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>{signupError}</div>}
              {[["FULL NAME", "name", "Marcus Reed"], ["TITLE", "title", "Fleet Wrap Installer"], ["CITY", "city", "Atlanta"], ["STATE", "state", "GA"]].map(([label, key, placeholder]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                  <input type="text" placeholder={placeholder} value={signupForm[key]} onChange={event => setSignupForm(previous => ({ ...previous, [key]: event.target.value }))} />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>EMAIL ADDRESS</div>
                <input type="email" placeholder="installer@email.com" value={signupForm.email} onChange={event => { setSignupForm(previous => ({ ...previous, email: event.target.value })); setEmailTaken(false); }} onBlur={event => checkEmail(event.target.value)} style={emailTaken ? { borderColor: "#FF4D00" } : {}} />
                {emailTaken && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF4D00", marginTop: 6 }}>An account with this email already exists. <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => switchMode("login")}>Sign in instead</span></div>}
                {emailChecking && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Checking...</div>}
              </div>
              {[["PASSWORD", "password", "Min. 8 characters"], ["CONFIRM PASSWORD", "confirm", "••••••••"]].map(([label, key, placeholder]) => (
                <div key={key} style={{ marginBottom: key === "confirm" ? 24 : 14 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                  <input type="password" placeholder={placeholder} value={signupForm[key]} onChange={event => setSignupForm(previous => ({ ...previous, [key]: event.target.value }))} onKeyDown={event => event.key === "Enter" && handleSignup()} />
                </div>
              ))}
              <button onClick={handleSignup} disabled={loading || emailTaken || emailChecking} className="login-submit" style={{ opacity: (loading || emailTaken || emailChecking) ? 0.4 : 1, cursor: (loading || emailTaken || emailChecking) ? "not-allowed" : "pointer", marginBottom: 16 }}>{loading ? "Creating Account..." : "Create Contractor Account"}</button>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                <input type="checkbox" id="tos-contractor" checked={tosAccepted} onChange={event => setTosAccepted(event.target.checked)} style={{ width: 15, height: 15, marginTop: 2, accentColor: "#FF4D00", flexShrink: 0, cursor: "pointer" }} />
                <label htmlFor="tos-contractor" style={{ cursor: "pointer" }}>I agree to the <span onClick={() => nav("terms")} style={{ color: "#FF4D00", cursor: "pointer" }}>Terms of Service</span> and <span onClick={() => nav("privacy")} style={{ color: "#FF4D00", cursor: "pointer" }}>Privacy Policy</span></label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
