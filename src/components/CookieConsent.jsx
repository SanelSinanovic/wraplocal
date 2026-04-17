import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("wb_cookie_consent")) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem("wb_cookie_consent", "1");
    setVisible(false);
  };

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "rgba(10,10,10,0.97)", borderTop: "1px solid rgba(255,77,0,0.2)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap", fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.5 }}>
        We use cookies and local storage for essential functionality like keeping you logged in. No advertising trackers.{" "}
        <a href="#privacy" style={{ color: "#FF4D00", textDecoration: "none" }}>Privacy Policy</a>
      </p>
      <button
        onClick={accept}
        style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "8px 24px", borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: 1, whiteSpace: "nowrap", flexShrink: 0 }}
      >
        Got it
      </button>
    </div>
  );
}
