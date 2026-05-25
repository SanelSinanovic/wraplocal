import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { createContractorProfile, fetchContractorThreadMessages, fetchContractorThreads, sendContractorMessage, subscribeToContractorMessages, updateContractorProfile, validateUploadFile } from "../lib/queries";

const emptyForm = {
  name: "",
  title: "",
  years_experience: "0",
  location: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  headline: "",
  bio: "",
  service_radius: "",
  availability: "Available for projects",
  specialties: "",
  certifications: "",
  is_listed: true,
};

function listToText(items) {
  return (items || []).join(", ");
}

function textToList(value) {
  return String(value || "").split(",").map(item => item.trim()).filter(Boolean);
}

function formatMessageTime(value) {
  return new Date(value || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function mergeThreadMessages(existingMessages, incomingMessage) {
  if (!incomingMessage) return existingMessages;
  if (existingMessages.some(message => message.id && message.id === incomingMessage.id)) return existingMessages;
  return [...existingMessages, incomingMessage];
}

export default function ContractorDashboard({ nav, currentUser, currentProfile, onLogout }) {
  const [activeTab, setActiveTab] = useState("inbox");
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyForm);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const photoInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const syncForm = useCallback((contractorProfile) => {
    setProfileForm({
      name: contractorProfile?.name || currentProfile?.name || currentUser?.email?.split("@")[0] || "",
      title: contractorProfile?.title || currentUser?.user_metadata?.title || "Independent Installer",
      years_experience: String(contractorProfile?.years_experience ?? contractorProfile?.years ?? 0),
      location: contractorProfile?.location || [contractorProfile?.city, contractorProfile?.state].filter(Boolean).join(", "),
      city: contractorProfile?.city || currentUser?.user_metadata?.city || "",
      state: contractorProfile?.state || currentUser?.user_metadata?.state || "",
      phone: contractorProfile?.phone || "",
      email: contractorProfile?.email || currentUser?.email || "",
      headline: contractorProfile?.headline || "",
      bio: contractorProfile?.bio || "",
      service_radius: contractorProfile?.service_radius || contractorProfile?.radius || "",
      availability: contractorProfile?.availability || "Available for projects",
      specialties: listToText(contractorProfile?.specialties),
      certifications: listToText(contractorProfile?.certifications),
      is_listed: contractorProfile?.is_listed !== false,
    });
  }, [currentProfile?.name, currentUser?.email, currentUser?.user_metadata?.city, currentUser?.user_metadata?.state, currentUser?.user_metadata?.title]);

  const loadDashboard = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setLoadError("");
    const created = await createContractorProfile({ ownerId: currentUser.id, name: currentProfile?.name || currentUser?.user_metadata?.name || currentUser.email?.split("@")[0], email: currentUser.email || "" });
    if (created.error || !created.data) {
      setLoadError("Contractor setup is not ready. Run the contractor accounts migration in Supabase, then refresh.");
      setLoading(false);
      return;
    }
    setProfile(created.data);
    syncForm(created.data);
    const threadResult = await fetchContractorThreads(created.data.id);
    setThreads(threadResult.data || []);
    setSelectedThread(previous => previous || threadResult.data?.[0] || null);
    setLoading(false);
  }, [currentProfile?.name, currentUser, syncForm]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!selectedThread?.id) { setMessages([]); return undefined; }
    let channel;
    fetchContractorThreadMessages(selectedThread.id).then(result => setMessages(result.data || []));
    channel = subscribeToContractorMessages(selectedThread.id, incomingMessage => {
      setMessages(previous => mergeThreadMessages(previous, incomingMessage));
    });
    return () => { channel?.unsubscribe(); };
  }, [selectedThread?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedThread?.id]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaveStatus("saving");
    const city = profileForm.city.trim();
    const state = profileForm.state.trim();
    const location = profileForm.location.trim() || [city, state].filter(Boolean).join(", ");
    const result = await updateContractorProfile(profile.id, {
      name: profileForm.name.trim() || profile.name,
      title: profileForm.title.trim() || "Independent Installer",
      years_experience: Math.max(0, Number(profileForm.years_experience) || 0),
      location,
      city,
      state,
      phone: profileForm.phone.trim(),
      email: profileForm.email.trim(),
      headline: profileForm.headline.trim(),
      bio: profileForm.bio.trim(),
      service_radius: profileForm.service_radius.trim(),
      availability: profileForm.availability.trim() || "Available for projects",
      specialties: textToList(profileForm.specialties),
      certifications: textToList(profileForm.certifications),
      is_listed: profileForm.is_listed,
    });
    if (result.data) {
      setProfile(result.data);
      syncForm(result.data);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2500);
    } else {
      setSaveStatus("error");
    }
  };

  const uploadPhoto = async (file) => {
    if (!file || !profile) return;
    const validationError = validateUploadFile(file);
    if (validationError) { setSaveStatus(validationError); return; }
    setPhotoUploading(true);
    const extension = file.name.split(".").pop().toLowerCase();
    const path = `${currentUser.id}/contractor-profile.${extension}`;
    const { error } = await supabase.storage.from("shop-images").upload(path, file, { upsert: true });
    if (error) {
      setSaveStatus(`Upload failed: ${error.message}`);
      setPhotoUploading(false);
      return;
    }
    const { data: publicData } = supabase.storage.from("shop-images").getPublicUrl(path);
    const result = await updateContractorProfile(profile.id, { photo_url: publicData.publicUrl });
    if (result.data) setProfile(result.data);
    setPhotoUploading(false);
  };

  const sendMessage = async () => {
    const text = messageInput.trim();
    if (!text || !selectedThread || !currentUser) return;
    setMessageInput("");
    const result = await sendContractorMessage({ threadId: selectedThread.id, senderId: currentUser.id, senderRole: "contractor", text });
    if (result.data) setMessages(previous => mergeThreadMessages(previous, result.data));
    const refreshed = await fetchContractorThreads(profile.id);
    setThreads(refreshed.data || []);
  };

  return (
    <div className="contractor-dashboard" style={{ fontFamily: "'Bebas Neue', cursive", background: "linear-gradient(180deg, #090909 0%, #110705 28%, #090909 62%, #05050C 100%)", minHeight: "100vh", color: "#fff", display: "flex", position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .contractor-nav-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 16px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; color: rgba(255,255,255,0.5); border-radius: 4px; transition: all 0.2s; } .contractor-nav-item:hover, .contractor-nav-item.active { background: rgba(255,77,0,0.1); color: #FF4D00; } .contractor-input, .contractor-textarea { width: 100%; background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 12px 14px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; } .contractor-textarea { min-height: 92px; resize: vertical; line-height: 1.5; } .contractor-input:focus, .contractor-textarea:focus { border-color: rgba(255,77,0,0.55); } .thread-row { border: 1px solid rgba(255,255,255,0.06); background: #111; padding: 14px; cursor: pointer; transition: all 0.16s; } .thread-row:hover, .thread-row.active { border-color: rgba(255,77,0,0.35); background: rgba(255,77,0,0.06); } @media (max-width: 768px) { .contractor-dashboard { flex-direction: column !important; } .contractor-sidebar { width: 100% !important; flex-direction: row !important; flex-wrap: wrap; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; padding: 8px !important; } .contractor-sidebar-logo, .contractor-sidebar-sub, .contractor-sidebar-footer { display: none !important; } .contractor-main { padding: 16px !important; } .contractor-grid { grid-template-columns: 1fr !important; } .contractor-chat-grid { grid-template-columns: 1fr !important; } }`}</style>
      <div className="contractor-sidebar" style={{ width: 220, background: "#0D0D0D", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "24px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <img src="/images/Logo.png" alt="WrapBridge" className="contractor-sidebar-logo" style={{ width: 170, cursor: "pointer", display: "block", marginBottom: 32 }} onClick={() => nav("landing")} />
        <div className="contractor-sidebar-sub" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 2, marginBottom: 8, padding: "0 4px" }}>{profile?.name?.toUpperCase() || "CONTRACTOR"}</div>
        {[["inbox", "Messages"], ["profile", "Profile"]].map(([tab, label]) => (
          <div key={tab} className={`contractor-nav-item${activeTab === tab ? " active" : ""}`} onClick={() => setActiveTab(tab)}>
            <span>{label}</span>
            {tab === "inbox" && threads.length > 0 && <span style={{ background: "#FF4D00", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10 }}>{threads.length}</span>}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onLogout} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", background: "none", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 12px", cursor: "pointer", marginBottom: 12, width: "100%" }}>Log Out</button>
        <div className="contractor-sidebar-footer" style={{ padding: "14px 16px", background: "rgba(255,77,0,0.05)", border: "1px solid rgba(255,77,0,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>Companies can message you directly from the contractor finder.</div>
      </div>

      <main className="contractor-main" style={{ flex: 1, overflow: "auto", padding: "32px 40px" }}>
        {loading ? (
          <div style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.35)", padding: 40 }}>Loading contractor dashboard...</div>
        ) : loadError ? (
          <div style={{ background: "rgba(255,77,0,0.08)", border: "1px solid rgba(255,77,0,0.35)", padding: 22, fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>{loadError}</div>
        ) : activeTab === "inbox" ? (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 42, letterSpacing: 2, marginBottom: 6 }}>COMPANY MESSAGES</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Chat with companies that contact you for installer work.</div>
            </div>
            <div className="contractor-chat-grid" style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", gap: 16, alignItems: "stretch" }}>
              <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {threads.length === 0 ? (
                  <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "36px 22px", textAlign: "center", fontFamily: "'DM Sans', sans-serif", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>No company conversations yet. New inquiries will appear here.</div>
                ) : threads.map(thread => (
                  <div key={thread.id} className={`thread-row${selectedThread?.id === thread.id ? " active" : ""}`} onClick={() => setSelectedThread(thread)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, background: "rgba(255,77,0,0.12)", border: "1px solid rgba(255,77,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: "#FF4D00", flexShrink: 0 }}>{thread.companyAvatar}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{thread.companyName}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{formatMessageTime(thread.last_message_at)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
              <section style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", minHeight: 520, display: "flex", flexDirection: "column" }}>
                {selectedThread ? (
                  <>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 24, letterSpacing: 1 }}>{selectedThread.companyName}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{selectedThread.subject}</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                      {messages.length === 0 && <div style={{ textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 80 }}>No messages yet.</div>}
                      {messages.map(message => {
                        const isMine = message.sender_id === currentUser.id;
                        return (
                          <div key={message.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>{isMine ? "You" : selectedThread.companyName} · {formatMessageTime(message.sent_at)}</div>
                            <div style={{ maxWidth: "74%", background: isMine ? "#FF4D00" : "#1A1A1A", color: "#fff", padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.5, borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px" }}>{message.text}</div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                    <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <input className="contractor-input" placeholder={`Message ${selectedThread.companyName}...`} value={messageInput} onChange={event => setMessageInput(event.target.value)} onKeyDown={event => event.key === "Enter" && sendMessage()} style={{ border: "none", borderRight: "1px solid rgba(255,255,255,0.07)" }} />
                      <button onClick={sendMessage} style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "0 24px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2, cursor: "pointer" }}>Send</button>
                    </div>
                  </>
                ) : (
                  <div style={{ margin: "auto", textAlign: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.28)" }}>Select a conversation.</div>
                )}
              </section>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 18, marginBottom: 28, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 42, letterSpacing: 2, marginBottom: 6 }}>CONTRACTOR PROFILE</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>This is what companies see in the contractor finder.</div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: profileForm.is_listed ? "#10B981" : "rgba(255,255,255,0.4)", cursor: "pointer" }}>
                <input type="checkbox" checked={profileForm.is_listed} onChange={event => setProfileForm(previous => ({ ...previous, is_listed: event.target.checked }))} style={{ accentColor: "#FF4D00" }} /> Listed
              </label>
            </div>
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <div onClick={() => photoInputRef.current?.click()} style={{ width: 104, height: 104, background: "#1A1A1A", border: "2px solid rgba(255,77,0,0.45)", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {profile?.photo_url ? <img src={profile.photo_url} alt="Contractor profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.5 }}>NO<br />PHOTO</div>}
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={event => { const file = event.target.files?.[0]; if (file) uploadPhoto(file); event.target.value = ""; }} />
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoUploading} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", padding: "10px 20px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 1, cursor: photoUploading ? "not-allowed" : "pointer", opacity: photoUploading ? 0.6 : 1 }}>{photoUploading ? "UPLOADING..." : profile?.photo_url ? "CHANGE PHOTO" : "UPLOAD PHOTO"}</button>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.5, marginTop: 8 }}>Use a clear profile photo so companies know who they are contacting.</div>
                </div>
              </div>
            </div>
            <div className="contractor-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[["Name", "name", "text"], ["Title", "title", "text"], ["Years Experience", "years_experience", "number"], ["Phone", "phone", "tel"], ["Email", "email", "email"], ["Availability", "availability", "text"], ["City", "city", "text"], ["State", "state", "text"], ["Display Location", "location", "text"], ["Service Radius", "service_radius", "text"]].map(([label, key, type]) => (
                <div key={key}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>{label.toUpperCase()}</div>
                  <input className="contractor-input" type={type} value={profileForm[key]} onChange={event => setProfileForm(previous => ({ ...previous, [key]: event.target.value }))} />
                </div>
              ))}
            </div>
            {[["Headline", "headline"], ["Bio", "bio"], ["Specialties", "specialties"], ["Certifications", "certifications"]].map(([label, key]) => (
              <div key={key} style={{ marginTop: 16 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 6 }}>{label.toUpperCase()}</div>
                <textarea className="contractor-textarea" value={profileForm[key]} onChange={event => setProfileForm(previous => ({ ...previous, [key]: event.target.value }))} placeholder={key === "specialties" || key === "certifications" ? "Separate items with commas" : ""} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24 }}>
              <button onClick={saveProfile} disabled={saveStatus === "saving"} style={{ background: saveStatus === "saving" ? "#555" : "#FF4D00", color: "#fff", border: "none", padding: "14px 32px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 2, cursor: saveStatus === "saving" ? "default" : "pointer" }}>{saveStatus === "saving" ? "Saving..." : "Save Profile"}</button>
              {saveStatus === "saved" && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#10B981" }}>Saved</span>}
              {saveStatus && !["saving", "saved"].includes(saveStatus) && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF4D00" }}>{saveStatus}</span>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
