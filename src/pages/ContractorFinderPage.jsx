import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bookmark, BriefcaseBusiness, CheckCircle2, Mail, MapPin, MessageCircle, Phone, Search, Send, ShieldCheck, Star, UserRound, X } from "lucide-react";
import { createOrFetchContractorThread, fetchCompanyContractorThreads, fetchContractorThreadMessages, fetchContractors, fetchUserShop, sendContractorMessage, subscribeToContractorMessages } from "../lib/queries";

const SPECIALTY_FILTERS = ["All", "Full Wraps", "Fleet Wraps", "PPF", "Window Tint", "Signage", "Window Graphics"];

function matchesSpecialty(profile, activeSpecialty) {
  if (activeSpecialty === "All") return true;
  if (activeSpecialty === "Signage") {
    return profile.specialties.some(specialty => ["Channel Letters", "Monument Signs", "Window Graphics", "Wall Graphics", "Signage"].includes(specialty));
  }
  return profile.specialties.includes(activeSpecialty);
}

function getInitials(value) {
  return String(value || "CO").split(" ").filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "CO";
}

function formatMessageTime(value) {
  return new Date(value || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function mergeMessages(existingMessages, incomingMessage) {
  if (!incomingMessage) return existingMessages;
  if (existingMessages.some(message => message.id && message.id === incomingMessage.id)) return existingMessages;
  return [...existingMessages, incomingMessage];
}

function ContractorAvatar({ profile, small = false }) {
  const className = small ? "contractor-avatar small" : "contractor-avatar";
  if (profile?.photo) return <img className={className} src={profile.photo} alt={profile.name} />;
  return <div className={`${className} fallback`} aria-label={profile?.name || "Contractor"}>{getInitials(profile?.name)}</div>;
}

export default function ContractorFinderPage({ nav, currentUser, currentProfile, onLogout }) {
  const [contractors, setContractors] = useState([]);
  const [threads, setThreads] = useState([]);
  const [companyShop, setCompanyShop] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSpecialty, setActiveSpecialty] = useState("All");
  const [savedIds, setSavedIds] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [composeProfile, setComposeProfile] = useState(null);
  const [contactMessage, setContactMessage] = useState("");
  const [contactStatus, setContactStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const chatEndRef = useRef(null);

  const role = currentUser ? (currentProfile?.role || currentUser?.user_metadata?.role || "company") : null;
  const firstName = currentUser ? ((currentProfile?.name || currentUser?.user_metadata?.name || currentUser?.email || "").split(" ")[0].split("@")[0]) : "";
  const companyName = companyShop?.name || currentProfile?.business_name || currentProfile?.name || currentUser?.user_metadata?.business_name || currentUser?.email?.split("@")[0] || "Company";

  const loadDirectory = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setLoadError("");
    const [contractorResult, shopResult, threadResult] = await Promise.all([
      fetchContractors(),
      fetchUserShop(currentUser.id),
      fetchCompanyContractorThreads(currentUser.id),
    ]);
    setContractors(contractorResult.data || []);
    setCompanyShop(shopResult.data || null);
    setThreads(threadResult.data || []);
    if (contractorResult.error) setLoadError("Contractor profiles are not ready yet. Run the contractor accounts migration in Supabase, then refresh.");
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  useEffect(() => {
    if (!selectedThread?.id) {
      setMessages([]);
      return undefined;
    }
    fetchContractorThreadMessages(selectedThread.id).then(result => setMessages(result.data || []));
    const channel = subscribeToContractorMessages(selectedThread.id, incomingMessage => {
      setMessages(previous => mergeMessages(previous, incomingMessage));
    });
    return () => { channel?.unsubscribe(); };
  }, [selectedThread?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedThread?.id]);

  const filteredContractors = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return contractors.filter(profile => {
      const searchableText = [
        profile.name,
        profile.title,
        profile.location,
        profile.radius,
        profile.headline,
        profile.bio,
        ...profile.specialties,
        ...profile.certifications,
      ].join(" ").toLowerCase();
      return (!normalizedSearch || searchableText.includes(normalizedSearch)) && matchesSpecialty(profile, activeSpecialty);
    });
  }, [contractors, searchTerm, activeSpecialty]);

  const savedContractors = contractors.filter(profile => savedIds.includes(profile.id));
  const averageYears = contractors.length ? Math.round(contractors.reduce((total, profile) => total + profile.years, 0) / contractors.length) : 0;

  const refreshThreads = async () => {
    if (!currentUser) return [];
    const threadResult = await fetchCompanyContractorThreads(currentUser.id);
    setThreads(threadResult.data || []);
    return threadResult.data || [];
  };

  const toggleSaved = (profileId) => {
    setSavedIds(current => current.includes(profileId) ? current.filter(savedId => savedId !== profileId) : [...current, profileId]);
  };

  const openContact = (profile) => {
    setComposeProfile(profile);
    setContactStatus("");
    setContactMessage(`Hi ${profile.name},\n\n${companyName} found your installer profile on WrapBridge and would like to discuss availability for upcoming work.\n\nThanks,`);
  };

  const startConversation = async () => {
    if (!composeProfile || !currentUser) return;
    const text = contactMessage.trim();
    if (!text) {
      setContactStatus("Add a short message first.");
      return;
    }
    setContactStatus("sending");
    const threadResult = await createOrFetchContractorThread({
      contractorId: composeProfile.id,
      companyId: currentUser.id,
      shopId: companyShop?.id || null,
      companyName,
      subject: `Installer availability: ${composeProfile.name}`,
    });
    if (threadResult.error || !threadResult.data) {
      setContactStatus("Could not open this conversation. Please try again.");
      return;
    }
    const messageResult = await sendContractorMessage({ threadId: threadResult.data.id, senderId: currentUser.id, senderRole: "company", text });
    if (messageResult.error) {
      setContactStatus("Conversation opened, but the message could not send.");
      setSelectedThread(threadResult.data);
      return;
    }
    setMessages(previous => mergeMessages(previous, messageResult.data));
    const refreshedThreads = await refreshThreads();
    setSelectedThread(refreshedThreads.find(thread => thread.id === threadResult.data.id) || threadResult.data);
    setComposeProfile(null);
    setContactMessage("");
    setContactStatus("");
  };

  const sendReply = async () => {
    const text = messageInput.trim();
    if (!text || !selectedThread || !currentUser) return;
    setMessageInput("");
    const result = await sendContractorMessage({ threadId: selectedThread.id, senderId: currentUser.id, senderRole: "company", text });
    if (result.data) setMessages(previous => mergeMessages(previous, result.data));
    refreshThreads();
  };

  return (
    <div className="contractor-page" style={{ fontFamily: "'Bebas Neue', cursive", background: "linear-gradient(180deg, #090909 0%, #120805 28%, #090909 62%, #05050C 100%)", minHeight: "100vh", color: "#fff", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        .contractor-nav-btn { background: transparent; border: 1px solid rgba(255,255,255,0.16); color: rgba(255,255,255,0.62); padding: 10px 18px; font-family: 'Bebas Neue', cursive; font-size: 14px; letter-spacing: 2px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.18s; }
        .contractor-nav-btn:hover { border-color: rgba(255,77,0,0.55); color: #FF4D00; transform: translateY(-1px); }
        .contractor-main-btn { background: #FF4D00; border: none; color: #fff; padding: 12px 20px; font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 2px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.18s, transform 0.18s; white-space: nowrap; }
        .contractor-main-btn:hover { background: #FF6A20; transform: translateY(-1px); }
        .contractor-main-btn:disabled { cursor: not-allowed; opacity: 0.55; transform: none; }
        .contractor-row { background: #111; border: 1px solid rgba(255,255,255,0.07); display: grid; grid-template-columns: 104px minmax(0, 1fr) 210px; gap: 20px; padding: 18px; align-items: center; position: relative; overflow: hidden; transition: border-color 0.18s, transform 0.18s, background 0.18s; }
        .contractor-row:hover { border-color: rgba(255,77,0,0.36); background: #131313; transform: translateY(-2px); }
        .contractor-avatar { width: 104px; height: 104px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); filter: saturate(0.96) contrast(1.05); flex-shrink: 0; }
        .contractor-avatar.small { width: 44px; height: 44px; }
        .contractor-avatar.fallback { display: flex; align-items: center; justify-content: center; background: rgba(255,77,0,0.12); color: #FF4D00; font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 24px; filter: none; }
        .contractor-avatar.small.fallback { font-size: 13px; }
        .contractor-chip { border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.035); color: rgba(255,255,255,0.54); padding: 5px 10px; font-family: 'DM Sans', sans-serif; font-size: 11px; white-space: nowrap; }
        .contractor-chip.accent { border-color: rgba(255,77,0,0.3); background: rgba(255,77,0,0.08); color: #FF4D00; }
        .filter-chip { border: 1px solid rgba(255,255,255,0.12); background: transparent; color: rgba(255,255,255,0.42); padding: 7px 13px; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
        .filter-chip:hover { border-color: rgba(255,255,255,0.28); color: rgba(255,255,255,0.78); }
        .filter-chip.active { border-color: #FF4D00; background: rgba(255,77,0,0.12); color: #FF4D00; }
        .stat-tile { background: #111; border: 1px solid rgba(255,255,255,0.07); padding: 18px 20px; position: relative; overflow: hidden; }
        .stat-tile::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--accent); }
        .conversation-row { display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 10px; cursor: pointer; transition: all 0.16s; }
        .conversation-row:hover, .conversation-row.active { border-color: rgba(255,77,0,0.38); background: rgba(255,77,0,0.08); }
        .chat-input { flex: 1; min-width: 0; background: #151515; border: none; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; padding: 14px; }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 200; }
        @keyframes fadeUpContractor { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .contractor-anim { animation: fadeUpContractor 0.42s cubic-bezier(0.22,1,0.36,1) both; }
        @media (max-width: 920px) {
          .contractor-page-pad { padding: 24px 20px 44px !important; }
          .contractor-nav { padding: 14px 20px !important; }
          .contractor-hero { grid-template-columns: 1fr !important; gap: 16px !important; }
          .contractor-layout { grid-template-columns: 1fr !important; }
          .contractor-side { order: -1; position: relative !important; top: auto !important; }
          .contractor-row { grid-template-columns: 88px minmax(0, 1fr); gap: 14px; }
          .contractor-avatar { width: 88px; height: 88px; }
          .contractor-avatar.small { width: 44px; height: 44px; }
          .contractor-actions { grid-column: 1 / -1; display: grid !important; grid-template-columns: 1fr 1fr 48px; }
        }
        @media (max-width: 560px) {
          .contractor-nav { flex-wrap: wrap; gap: 10px !important; }
          .contractor-nav-actions { width: 100%; justify-content: space-between !important; }
          .contractor-title { font-size: 48px !important; }
          .contractor-row { grid-template-columns: 1fr; }
          .contractor-avatar { width: 100%; height: 210px; }
          .contractor-avatar.small { width: 44px; height: 44px; }
          .contractor-actions { grid-template-columns: 1fr !important; }
          .contractor-filterbar { align-items: stretch !important; }
        }
      `}</style>

      <nav className="contractor-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, padding: "16px 40px", background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 68, display: "block", cursor: "pointer", flexShrink: 0 }} onClick={() => nav("landing")} />
        <div className="contractor-nav-actions" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          {firstName && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.42)", marginRight: 4 }}>{firstName}</span>}
          <button className="contractor-nav-btn" onClick={() => nav(role === "company" ? "company-dash" : "landing")}><ArrowLeft size={15} aria-hidden />Dashboard</button>
          <button className="contractor-nav-btn" onClick={onLogout}>Sign Out</button>
        </div>
      </nav>

      <main className="contractor-page-pad" style={{ padding: "38px 40px 64px", position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,77,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,77,0,0.03) 1px, transparent 1px)", backgroundSize: "54px 54px", maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent 70%)" }} />
        <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto" }}>
          <section className="contractor-hero" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 28, alignItems: "end", marginBottom: 26 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,77,0,0.1)", border: "1px solid rgba(255,77,0,0.3)", padding: "6px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: 2, color: "#FF4D00", marginBottom: 16 }}>
                <BriefcaseBusiness size={14} aria-hidden /> CONTRACTOR NETWORK
              </div>
              <h1 className="contractor-title" style={{ fontSize: 72, lineHeight: 0.95, letterSpacing: 3, margin: "0 0 16px" }}>FIND INSTALLERS</h1>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "rgba(255,255,255,0.52)", lineHeight: 1.65, maxWidth: 680, margin: 0 }}>
                Browse independent contractors for overflow wrap, tint, signage, and commercial graphics work. Contact them directly inside WrapBridge; this page does not collect payments.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "CONTRACTORS", value: contractors.length, accent: "rgba(255,77,0,0.7)" },
                { label: "AVG EXPERIENCE", value: `${averageYears} YRS`, accent: "rgba(16,185,129,0.65)" },
                { label: "CONVERSATIONS", value: threads.length, accent: "rgba(59,130,246,0.65)" },
                { label: "PAYMENTS", value: "DIRECT", accent: "rgba(245,158,11,0.65)" },
              ].map(tile => (
                <div key={tile.label} className="stat-tile" style={{ "--accent": tile.accent }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: 1.8, color: "rgba(255,255,255,0.28)", marginBottom: 8 }}>{tile.label}</div>
                  <div style={{ fontSize: 28, letterSpacing: 1.4, color: tile.accent }}>{tile.value}</div>
                </div>
              ))}
            </div>
          </section>

          {selectedThread && (
            <section style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 18 }}>
              <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 26, letterSpacing: 1.2 }}>{selectedThread.contractor?.name || "Contractor"}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.34)", marginTop: 2 }}>{selectedThread.subject}</div>
                </div>
                <button className="contractor-nav-btn" onClick={() => setSelectedThread(null)} aria-label="Close conversation" style={{ padding: 10 }}><X size={16} aria-hidden /></button>
              </div>
              <div style={{ height: 300, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.length === 0 && <div style={{ textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 80 }}>No messages yet.</div>}
                {messages.map(message => {
                  const isMine = message.sender_id === currentUser.id;
                  return (
                    <div key={message.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>{isMine ? companyName : selectedThread.contractor?.name || "Contractor"} - {formatMessageTime(message.sent_at)}</div>
                      <div style={{ maxWidth: "76%", background: isMine ? "#FF4D00" : "#1A1A1A", color: "#fff", padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.5, borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px" }}>{message.text}</div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <input className="chat-input" placeholder={`Message ${selectedThread.contractor?.name || "contractor"}...`} value={messageInput} onChange={event => setMessageInput(event.target.value)} onKeyDown={event => event.key === "Enter" && sendReply()} />
                <button className="contractor-main-btn" onClick={sendReply} style={{ borderRadius: 0 }}><Send size={15} aria-hidden />Send</button>
              </div>
            </section>
          )}

          <section className="contractor-filterbar" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px", display: "flex", alignItems: "center", gap: 10, background: "#151515", border: "1px solid rgba(255,255,255,0.1)", padding: "0 14px", minHeight: 44 }}>
              <Search size={16} color="rgba(255,255,255,0.36)" aria-hidden />
              <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search name, city, or specialty..." style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", minWidth: 0 }} />
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {SPECIALTY_FILTERS.map(specialty => <button key={specialty} className={`filter-chip${activeSpecialty === specialty ? " active" : ""}`} onClick={() => setActiveSpecialty(specialty)}>{specialty}</button>)}
            </div>
          </section>

          {loadError && <div style={{ background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.35)", padding: 18, fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.72)", marginBottom: 18 }}>{loadError}</div>}

          <div className="contractor-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 18, alignItems: "start" }}>
            <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.38)", marginBottom: 2 }}>
                <b style={{ color: "#fff" }}>{filteredContractors.length}</b> contractor{filteredContractors.length !== 1 ? "s" : ""} matching your search
              </div>

              {loading ? (
                <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "54px 28px", textAlign: "center", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.34)" }}>Loading contractor profiles...</div>
              ) : filteredContractors.length === 0 ? (
                <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "54px 28px", textAlign: "center" }}>
                  <UserRound size={42} color="rgba(255,255,255,0.24)" aria-hidden />
                  <div style={{ fontSize: 28, letterSpacing: 1.5, marginTop: 14, marginBottom: 6 }}>NO CONTRACTORS FOUND</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 18 }}>{contractors.length ? "Try a different city, specialty, or name." : "Contractor profiles will appear here after installers create listed accounts."}</div>
                  {contractors.length > 0 && <button className="contractor-main-btn" onClick={() => { setSearchTerm(""); setActiveSpecialty("All"); }}>Clear Filters</button>}
                </div>
              ) : filteredContractors.map((profile, index) => {
                const saved = savedIds.includes(profile.id);
                return (
                  <article key={profile.id} className="contractor-row contractor-anim" style={{ animationDelay: `${Math.min(index * 0.06, 0.36)}s` }}>
                    <ContractorAvatar profile={profile} />
                    <div style={{ position: "relative", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 5 }}>
                        <h2 style={{ fontSize: 27, letterSpacing: 1.2, margin: 0, lineHeight: 1 }}>{profile.name}</h2>
                        <span className="contractor-chip accent" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ShieldCheck size={12} aria-hidden /> Listed</span>
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.48)", marginBottom: 10 }}>{profile.title}</div>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.55, margin: "0 0 12px", maxWidth: 720 }}>{profile.headline || profile.bio || "Available for contract install work."}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.56)" }}><BriefcaseBusiness size={14} color="#FF4D00" aria-hidden /> {profile.years} years experience</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.56)" }}><MapPin size={14} color="#3B82F6" aria-hidden /> {profile.location || "Location not set"}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.56)" }}><CheckCircle2 size={14} color="#10B981" aria-hidden /> {profile.availability}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(profile.specialties.length ? profile.specialties : ["General Install"]).map(specialty => <span key={specialty} className="contractor-chip">{specialty}</span>)}
                        {profile.certifications.slice(0, 1).map(certification => <span key={certification} className="contractor-chip accent">{certification}</span>)}
                      </div>
                    </div>
                    <div className="contractor-actions" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#F59E0B", marginBottom: 3 }}><Star size={13} fill={profile.rating ? "#F59E0B" : "none"} aria-hidden /> {profile.rating ? profile.rating.toFixed(1) : "New"}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{profile.completedJobs}+ installs</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 3 }}>TRAVEL</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.52)", lineHeight: 1.35 }}>{profile.radius}</div>
                        </div>
                      </div>
                      <button className="contractor-main-btn" onClick={() => openContact(profile)}><MessageCircle size={16} aria-hidden /> Message</button>
                      {profile.phone ? <a className="contractor-nav-btn" href={`tel:${profile.phone.replace(/[^0-9]/g, "")}`}><Phone size={15} aria-hidden /> Call</a> : <a className="contractor-nav-btn" href={`mailto:${profile.email}`} style={{ pointerEvents: profile.email ? "auto" : "none", opacity: profile.email ? 1 : 0.4 }}><Mail size={15} aria-hidden /> Email</a>}
                      <button className="contractor-nav-btn" title={saved ? "Remove from saved contractors" : "Save contractor"} aria-label={saved ? "Remove saved contractor" : "Save contractor"} onClick={() => toggleSaved(profile.id)} style={{ color: saved ? "#FF4D00" : "rgba(255,255,255,0.5)", borderColor: saved ? "rgba(255,77,0,0.45)" : "rgba(255,255,255,0.16)" }}>
                        <Bookmark size={15} fill={saved ? "#FF4D00" : "none"} aria-hidden /> {saved ? "Saved" : "Save"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>

            <aside className="contractor-side" style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", padding: 18, position: "sticky", top: 104 }}>
              <div style={{ fontSize: 24, letterSpacing: 1.4, marginBottom: 6 }}>CONVERSATIONS</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.34)", lineHeight: 1.55, marginBottom: 16 }}>Replies from contractors appear here.</div>
              {threads.length === 0 ? (
                <div style={{ border: "1px dashed rgba(255,255,255,0.12)", padding: "22px 14px", textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.28)", lineHeight: 1.5, marginBottom: 22 }}>Start a conversation from any contractor profile.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {threads.map(thread => (
                    <div key={thread.id} className={`conversation-row${selectedThread?.id === thread.id ? " active" : ""}`} onClick={() => setSelectedThread(thread)}>
                      <div style={{ width: 38, height: 38, background: "rgba(255,77,0,0.12)", border: "1px solid rgba(255,77,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: "#FF4D00", flexShrink: 0 }}>{getInitials(thread.contractor?.name)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.78)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{thread.contractor?.name || "Contractor"}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.34)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatMessageTime(thread.last_message_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 24, letterSpacing: 1.4, marginBottom: 6 }}>SAVED PROFILES</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.34)", lineHeight: 1.55, marginBottom: 16 }}>Keep a shortlist while you compare crews for upcoming work.</div>
              {savedContractors.length === 0 ? (
                <div style={{ border: "1px dashed rgba(255,255,255,0.12)", padding: "24px 16px", textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.28)", lineHeight: 1.5 }}>Saved installers will appear here.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {savedContractors.map(profile => (
                    <div key={profile.id} style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: 10 }}>
                      <ContractorAvatar profile={profile} small />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.78)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.34)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.location || "Location not set"} - {profile.years} yrs</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {composeProfile && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Message contractor">
          <div style={{ width: "100%", maxWidth: 520, background: "#111", border: "1px solid rgba(255,255,255,0.12)", padding: 22, boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 30, letterSpacing: 1.5 }}>MESSAGE {composeProfile.name.toUpperCase()}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.38)", marginTop: 3 }}>This opens an in-app conversation. No payment is collected.</div>
              </div>
              <button className="contractor-nav-btn" onClick={() => setComposeProfile(null)} aria-label="Close message form" style={{ padding: 10 }}><X size={16} aria-hidden /></button>
            </div>
            <textarea value={contactMessage} onChange={event => setContactMessage(event.target.value)} style={{ width: "100%", minHeight: 170, resize: "vertical", background: "#181818", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", padding: 14, fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.55, outline: "none", marginBottom: 12 }} />
            {contactStatus && !["sending"].includes(contactStatus) && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF4D00", marginBottom: 12 }}>{contactStatus}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="contractor-nav-btn" onClick={() => setComposeProfile(null)}>Cancel</button>
              <button className="contractor-main-btn" onClick={startConversation} disabled={contactStatus === "sending"}><Send size={15} aria-hidden />{contactStatus === "sending" ? "Sending..." : "Send Message"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
