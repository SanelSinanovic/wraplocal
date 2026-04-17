import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#fff", padding: 32, textAlign: "center" }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, letterSpacing: 3, marginBottom: 8 }}>
            <span style={{ color: "#FF4D00" }}>WRAP</span>BRIDGE
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, marginBottom: 24 }}>Something went wrong. Please try again.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = "/"; }}
            style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "12px 32px", borderRadius: 4, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: 1 }}
          >
            Back to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
