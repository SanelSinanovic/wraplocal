import { useEffect, useState } from "react";
import { safeExternalUrl } from "../lib/security";

export default function ChatImagePreview({ src, alt = "Uploaded image" }) {
  const [open, setOpen] = useState(false);
  const safeSrc = safeExternalUrl(src);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!safeSrc) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${alt} larger`}
        style={{
          display: "block",
          maxWidth: "100%",
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "zoom-in",
        }}
      >
        <img
          src={safeSrc}
          alt={alt}
          style={{
            maxWidth: "100%",
            maxHeight: 200,
            borderRadius: 4,
            display: "block",
            objectFit: "contain",
          }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(0,0,0,0.88)",
            backdropFilter: "blur(8px)",
            cursor: "zoom-out",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close image preview"
            style={{
              position: "fixed",
              top: 16,
              right: 16,
              width: 42,
              height: 42,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(17,17,17,0.85)",
              color: "#fff",
              fontSize: 26,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
          <div onClick={(event) => event.stopPropagation()} style={{ maxWidth: "96vw", maxHeight: "90vh", textAlign: "center", cursor: "default" }}>
            <img
              src={safeSrc}
              alt={alt}
              style={{
                maxWidth: "96vw",
                maxHeight: "84vh",
                borderRadius: 6,
                objectFit: "contain",
                boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
              }}
            />
            {alt && (
              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.65)", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                {alt}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
