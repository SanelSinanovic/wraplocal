import { useState, useEffect } from "react";
import { getCookieConsent, onCookiePreferencesOpen, setCookieConsent } from "../lib/consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
    return onCookiePreferencesOpen(() => setVisible(true));
  }, []);

  if (!visible) return null;

  const saveChoice = (allowed) => {
    setCookieConsent(allowed);
    setVisible(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "rgba(10,10,10,0.97)", borderTop: "1px solid rgba(255,77,0,0.2)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 760 }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.5 }}>
          Essential cookies and storage keep login, security, and bookings working. Optional analytics stay off unless you allow them.{" "}
          <a href="/privacy" style={{ color: "#FF4D00", textDecoration: "none" }}>Privacy Policy</a>
        </p>
      </div>
      <button
        onClick={() => saveChoice(false)}
        style={{ background: "transparent", color: "rgba(255,255,255,0.82)", border: "1px solid rgba(255,255,255,0.22)", padding: "8px 18px", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 1, whiteSpace: "nowrap", flexShrink: 0 }}
      >
        Don't Allow
      </button>
      <button
        onClick={() => saveChoice(true)}
        style={{ background: "#C73A00", color: "#fff", border: "none", padding: "8px 22px", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 1, whiteSpace: "nowrap", flexShrink: 0 }}
      >
        Allow
      </button>
    </div>
  );
}
