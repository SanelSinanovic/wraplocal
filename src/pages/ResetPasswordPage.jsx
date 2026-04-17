import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ResetPasswordPage({ nav, recoveryReady }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) return setError("Password must include uppercase, lowercase, and a number.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) return setError(err.message);
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => nav("customer-login"), 3000);
  };

  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "linear-gradient(180deg, #0A0A0A 0%, #140A04 20%, #0A0A0A 55%, #05050C 100%)", minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } input { width: 100%; background: #161616; border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 15px; outline: none; transition: border-color 0.2s, background 0.2s; } input:focus { border-color: #FF4D00; background: #1c1c1c; } @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } @keyframes glowPulse { 0%,100% { opacity: 0.06; } 50% { opacity: 0.13; } } @keyframes glow-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 0.85; } } @keyframes orb-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(25px,-18px); } } .reset-card { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; } .reset-submit { background: #FF4D00; color: #fff; border: none; padding: 16px; font-family: 'Bebas Neue', cursive; font-size: 20px; letter-spacing: 3px; cursor: pointer; width: 100%; transition: background 0.2s, transform 0.15s; } .reset-submit:hover { background: #FF6A20; transform: translateY(-1px); } .reset-submit:active { transform: translateY(0); } @media (max-width: 768px) { .reset-nav { padding: 12px 16px !important; } .reset-outer { padding: 24px 20px !important; } .reset-heading { font-size: 30px !important; letter-spacing: 1px !important; } } @media (max-width: 420px) { .reset-outer { padding: 20px 14px !important; } .reset-heading { font-size: 26px !important; } }`}</style>
      <div aria-hidden="true" style={{ position: "fixed", top: "-10%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,77,0,0.2) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 6s ease-in-out infinite", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-8%", width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "orb-drift 14s ease-in-out infinite", zIndex: 0 }} />
      <nav className="reset-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 68, display: "block", cursor: "pointer" }} onClick={() => nav("landing")} />
      </nav>
      <div className="reset-outer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,77,0,0.07) 0%, transparent 70%)", pointerEvents: "none", animation: "glowPulse 4s ease-in-out infinite" }} />
        <div className="reset-card" style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>

          {!recoveryReady ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 32, letterSpacing: 2, marginBottom: 12 }}>VERIFYING LINK</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>Please wait a moment…</div>
            </div>
          ) : done ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 32, letterSpacing: 2, marginBottom: 12 }}>PASSWORD UPDATED</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                Your password has been changed. Redirecting you to sign in…
              </div>
            </div>
          ) : (
            <>
              <div className="reset-heading" style={{ fontSize: 40, letterSpacing: 2, marginBottom: 8 }}>SET NEW PASSWORD</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32, lineHeight: 1.5 }}>
                Choose a new password for your account.
              </div>

              {error && (
                <div style={{ background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "12px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#FF4D00", marginBottom: 20 }}>{error}</div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>NEW PASSWORD</div>
                <input type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReset()} />
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>CONFIRM PASSWORD</div>
                <input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && handleReset()} />
              </div>

              <button onClick={handleReset} disabled={loading} className="reset-submit" style={{ opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", marginBottom: 16 }}>
                {loading ? "Updating..." : "Update Password →"}
              </button>
              <div onClick={() => nav("customer-login")} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", cursor: "pointer" }}>
                ← Back to sign in
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
