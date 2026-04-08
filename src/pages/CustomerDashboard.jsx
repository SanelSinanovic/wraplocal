import { useState, useRef, useEffect } from "react";
import { BOOKINGS } from "../data/data";
import { supabase } from "../lib/supabase";
import { fetchCustomerBookings, fetchMessages, sendMessage as dbSendMessage, subscribeToMessages, submitReview, fetchBookingReview, uploadChatFile } from "../lib/queries";

function mergeMessages(existing = [], incoming = []) {
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const merged = [...existing];

  list.forEach(msg => {
    if (!msg) return;
    const hasMatch = merged.some(item => (
      (msg.id && item.id === msg.id) ||
      (item.from === msg.from && item.text === msg.text && item.time === msg.time)
    ));
    if (!hasMatch) merged.push(msg);
  });

  return merged;
}

export default function CustomerDashboard({ nav, currentUser, currentProfile, onLogout, stripeReturn, setStripeReturn }) {
  const [bookings, setBookings] = useState([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [messagesMap, setMessagesMap] = useState({});
  const [chatInput, setChatInput] = useState("");
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const chatEndRef = useRef(null);
  const chatFileRef = useRef(null);
  const [chatFileUploading, setChatFileUploading] = useState(false);

  // ── Payment modal state ──────────────────────────────────
  const [paymentBooking, setPaymentBooking] = useState(null); // { booking, amount }
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Load bookings: real data if logged in, static demo otherwise
  useEffect(() => {
    if (currentUser) {
      fetchCustomerBookings(currentUser.id).then(data => {
        if (data) {
          setBookings(data);
          // Init empty message arrays for each booking
          setMessagesMap(Object.fromEntries(data.map(b => [b.id, []])));
        }
        setBookingsLoaded(true);
      });
    } else {
      // Demo fallback — use static data
      setBookings(BOOKINGS);
      setMessagesMap(Object.fromEntries(BOOKINGS.map(b => [b.id, b.messages])));
      setBookingsLoaded(true);
    }
  }, [currentUser]);

  // When a booking is selected, load its messages and subscribe to realtime
  useEffect(() => {
    if (!selectedBooking || !currentUser) return;
    let channel;
    fetchMessages(selectedBooking.id).then(msgs => {
      setMessagesMap(prev => ({
        ...prev,
        [selectedBooking.id]: mergeMessages(prev[selectedBooking.id] || [], msgs),
      }));
    });
    channel = subscribeToMessages(selectedBooking.id, newMsg => {
      setMessagesMap(prev => {
        const existing = prev[selectedBooking.id] || [];
        return { ...prev, [selectedBooking.id]: mergeMessages(existing, newMsg) };
      });
    });
    return () => { channel?.unsubscribe(); };
  }, [selectedBooking?.id, currentUser]);

  useEffect(() => {
    if (selectedBooking?.status === "completed") {
      setExistingReview(null);
      setReviewStars(0);
      setReviewComment("");
      fetchBookingReview(selectedBooking.id).then(r => {
        if (r) { setExistingReview(r); setReviewStars(r.stars); setReviewComment(r.comment || ""); }
      });
    }
  }, [selectedBooking?.id]);

  useEffect(() => {
    if (selectedBooking) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesMap, selectedBooking]);

  const sendMessageText = async (text) => {
    if (!text || !selectedBooking) return;
    if (currentUser) {
      const result = await dbSendMessage({ bookingId: selectedBooking.id, senderId: currentUser.id, senderRole: "customer", text });
      if (result) {
        const time = new Date(result.sent_at || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        setMessagesMap(prev => ({
          ...prev,
          [selectedBooking.id]: mergeMessages(prev[selectedBooking.id] || [], { id: result.id, from: "me", text, time }),
        }));
      }
    } else {
      // Demo: simulate shop reply (optimistic for non-logged-in demo only)
      const now = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      setMessagesMap(prev => ({
        ...prev,
        [selectedBooking.id]: mergeMessages(prev[selectedBooking.id] || [], { from: "me", text, time: now }),
      }));
      if (selectedBooking.status === "confirmed") {
        setTimeout(() => {
          const replies = [
            "Got it, thanks for letting us know!",
            "Sure thing — we'll see you then.",
            "Great question! We'll make sure everything is ready.",
            "Thanks for reaching out. We'll confirm shortly.",
          ];
          const reply = replies[Math.floor(Math.random() * replies.length)];
          const replyTime = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
          setMessagesMap(prev => ({
            ...prev,
            [selectedBooking.id]: mergeMessages(prev[selectedBooking.id] || [], { from: "shop", text: reply, time: replyTime }),
          }));
        }, 1500);
      }
    }
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    await sendMessageText(text);
  };

  const sendChatFile = async (file) => {
    if (!file || !selectedBooking || !currentUser) return;
    setChatFileUploading(true);
    const result = await uploadChatFile(file, selectedBooking.id);
    setChatFileUploading(false);
    if (result) await sendMessageText(`FILE::${result.url}::${result.name}`);
  };

  const handleQuoteDecision = async (decision, amount) => {
    if (!currentUser || !selectedBooking) return;
    const normalizedAmount = Number(amount) || 0;
    const nextStatus = decision === "accepted" ? "confirmed" : "cancelled";
    const updatePayload = decision === "accepted"
      ? {
          status: nextStatus,
          amount: normalizedAmount,
          fee: Math.round(normalizedAmount * 0.07 * 100) / 100,
          total: normalizedAmount,
        }
      : { status: nextStatus };

    const { error } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", selectedBooking.id)
      .eq("customer_id", currentUser.id);
    if (error) return;

    const marker = `QUOTE_RESPONSE::${decision}::${normalizedAmount.toFixed(2)}`;
    const result = await dbSendMessage({
      bookingId: selectedBooking.id,
      senderId: currentUser.id,
      senderRole: "customer",
      text: marker,
    });

    const nextTotal = decision === "accepted"
      ? normalizedAmount
      : selectedBooking.total;
    const nextFee = decision === "accepted"
      ? Math.round(normalizedAmount * 0.07 * 100) / 100
      : selectedBooking.fee;

    setBookings(prev => prev.map(b => b.id === selectedBooking.id
      ? { ...b, status: nextStatus, amount: decision === "accepted" ? normalizedAmount : b.amount, fee: nextFee, total: nextTotal }
      : b
    ));
    setSelectedBooking(prev => prev
      ? { ...prev, status: nextStatus, amount: decision === "accepted" ? normalizedAmount : prev.amount, fee: nextFee, total: nextTotal }
      : prev
    );

    if (result) {
      const time = new Date(result.sent_at || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const decisionText = decision === "accepted"
        ? `Quote accepted ($${normalizedAmount.toFixed(2)})`
        : `Quote declined ($${normalizedAmount.toFixed(2)})`;
      setMessagesMap(prev => ({
        ...prev,
        [selectedBooking.id]: mergeMessages(prev[selectedBooking.id] || [], {
          id: result.id,
          from: "me",
          text: decisionText,
          time,
          quoteResponse: decision,
          quoteAmount: normalizedAmount,
          rawText: marker,
        }),
      }));
    }
  };

  // ── Confirm booking after Stripe payment (doesn't depend on selectedBooking state) ──
  const confirmBookingFromPayment = async (bookingId, amount) => {
    if (!currentUser) return;
    const normalizedAmount = Number(amount) || 0;
    const fee = Math.round(normalizedAmount * 0.07 * 100) / 100;
    const total = normalizedAmount;
    await supabase.from("bookings").update({ status: "confirmed", amount: normalizedAmount, fee, total }).eq("id", bookingId).eq("customer_id", currentUser.id);
    const marker = `QUOTE_RESPONSE::accepted::${normalizedAmount.toFixed(2)}`;
    await dbSendMessage({ bookingId, senderId: currentUser.id, senderRole: "customer", text: marker });
    setBookings(prev => prev.map(b => String(b.id) === String(bookingId) ? { ...b, status: "confirmed", amount: normalizedAmount, fee, total } : b));
  };

  // ── Consume Stripe return after bookings are loaded ──────────────────────
  useEffect(() => {
    if (!stripeReturn || !bookingsLoaded) return;
    const booking = bookings.find(b => String(b.id) === String(stripeReturn.bookingId));
    if (booking) {
      confirmBookingFromPayment(stripeReturn.bookingId, stripeReturn.amount);
      setSelectedBooking({ ...booking, status: "confirmed" });
      setStripeReturn(null);
    }
  }, [stripeReturn, bookingsLoaded]);

  // ── Redirect to Stripe Checkout ──────────────────────────────────────────
  const handleProceedToPayment = async () => {
    if (!paymentBooking) return;
    setPaymentLoading(true);
    setPaymentError("");
    const { booking, amount } = paymentBooking;
    const successUrl = `${window.location.origin}/?stripe_success=1&booking_id=${booking.id}&amount=${amount}`;
    const cancelUrl  = `${window.location.origin}/?stripe_cancel=1`;
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { bookingId: booking.id, serviceAmount: amount, serviceName: booking.service, shopName: booking.shop, successUrl, cancelUrl },
    });
    if (error || !data?.url) {
      const msg = data?.error || error?.message || error?.toString() || "Unknown error";
      setPaymentError(`Payment setup failed: ${msg}`);
      setPaymentLoading(false);
      return;
    }
    window.location.href = data.url;
  };

  const Navbar = () => (
    <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 24, letterSpacing: 4, color: "#FF4D00", cursor: "pointer" }} onClick={() => nav("landing")}>KI<span style={{ color: "#fff" }}>DOR</span></div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FF4D00", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
          {(currentProfile?.name || "M")[0].toUpperCase()}
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>{currentProfile?.name || "My Account"}</span>
        {currentUser && (
          <button onClick={onLogout} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", background: "none", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", cursor: "pointer", marginLeft: 8 }}>Log Out</button>
        )}
      </div>
    </nav>
  );

  // ── BOOKING DETAIL + CHAT VIEW ──────────────────────────────────────────────
  if (selectedBooking) {
    const b = selectedBooking;
    const messages = messagesMap[b.id] || [];
    const lastQuoteIndex = messages.reduce((idx, msg, i) => msg?.quoteOffer != null ? i : idx, -1);
    const pendingQuote = lastQuoteIndex >= 0
      ? (() => {
          const offerMessage = messages[lastQuoteIndex];
          const alreadyResponded = messages.slice(lastQuoteIndex + 1).some(msg => msg?.quoteResponse === "accepted" || msg?.quoteResponse === "declined" || msg?.quoteResponse === "rejected");
          return alreadyResponded ? null : offerMessage;
        })()
      : null;
    return (
      <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .chat-input { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; flex: 1; } .chat-input:focus { border-color: #FF4D00; } .send-btn { background: #FF4D00; color: #fff; border: none; padding: 12px 24px; font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 2px; cursor: pointer; flex-shrink: 0; } @media (max-width: 768px) { .detail-wrap { padding: 16px !important; } .detail-layout { grid-template-columns: 1fr !important; gap: 16px !important; } .detail-back { font-size: 13px !important; } } @media (max-width: 420px) { .detail-wrap { padding: 12px !important; } }`}</style>
        <Navbar />
        <div className="detail-wrap" style={{ maxWidth: 900, margin: "0 auto", padding: "36px 40px" }}>
          {/* Back */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, cursor: "pointer" }} onClick={() => setSelectedBooking(null)}>
            <span style={{ color: "#FF4D00", fontSize: 20 }}>←</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Back to My Bookings</span>
          </div>

          <div className="detail-layout" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
            {/* LEFT: Chat */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: b.shopColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", overflow: "hidden", flexShrink: 0 }}>
                    {b.shopImage ? <img src={b.shopImage} alt={b.shop} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : b.shopAvatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 22, letterSpacing: 1 }}>{b.shop}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{b.service} · {b.date ? `${b.date}${b.time ? ` at ${b.time}` : ""}` : "Awaiting schedule"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: b.status === "confirmed" ? "#10B981" : "rgba(255,255,255,0.4)" }}>
                    ● {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,0.07)", borderTop: "none", padding: "24px", minHeight: 340, maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "me" ? "flex-end" : "flex-start" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>
                      {msg.from === "me" ? "You" : b.shop} · {msg.time}
                    </div>
                    <div style={{
                      maxWidth: "72%",
                      background: msg.from === "me" ? "#FF4D00" : "#1A1A1A",
                      color: "#fff",
                      padding: "10px 14px",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      lineHeight: 1.5,
                      borderRadius: msg.from === "me" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    }}>
                      {(() => {
                        if (msg.text?.startsWith('FILE::')) {
                          const idx = msg.text.lastIndexOf('::');
                          const url = msg.text.slice(6, idx);
                          const name = msg.text.slice(idx + 2);
                          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
                          if (isImage) return <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4, display: 'block' }} />;
                          return <a href={url} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>📄 {name}</a>;
                        }
                        return msg.text;
                      })()}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              {pendingQuote && (
                <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderTop: "none", padding: "14px 16px", background: "#111" }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 10 }}>
                    Quote received: <span style={{ color: "#10B981", fontWeight: 600 }}>${Number(pendingQuote.quoteOffer).toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setPaymentBooking({ booking: selectedBooking, amount: pendingQuote.quoteOffer })} style={{ background: "#10B981", color: "#fff", border: "none", padding: "9px 14px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer" }}>Accept &amp; Pay →</button>
                    <button onClick={() => handleQuoteDecision("rejected", pendingQuote.quoteOffer)} style={{ background: "transparent", color: "rgba(255,77,0,0.9)", border: "1px solid rgba(255,77,0,0.4)", padding: "9px 14px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer" }}>Decline Quote</button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 0, border: "1px solid rgba(255,255,255,0.07)", borderTop: "none" }}>
                <input type="file" ref={chatFileRef} style={{ display: "none" }} accept="image/jpeg,image/png,image/gif,image/webp,.pdf" onChange={e => { const f = e.target.files[0]; if (f) { sendChatFile(f); e.target.value = ""; } }} />
                <input
                  className="chat-input"
                  placeholder={
                    b.status === "confirmed" ? `Message ${b.shop}…` :
                    b.status === "pending" ? `Request sent — awaiting ${b.shop} approval` :
                    b.status === "cancelled" ? "This booking has been cancelled" :
                    "This booking is completed — chat is read-only"
                  }
                  value={chatInput}
                  disabled={b.status !== "confirmed"}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                />
                {b.status === "confirmed" && (
                  <>
                    <button onClick={() => chatFileRef.current?.click()} disabled={chatFileUploading} style={{ background: "#1A1A1A", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)", padding: "0 14px", color: chatFileUploading ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.55)", cursor: chatFileUploading ? "not-allowed" : "pointer", fontSize: 18 }} title="Attach image or PDF">📎</button>
                    <button className="send-btn" onClick={sendMessage}>Send</button>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT: Booking details */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", padding: "24px" }}>
              <div style={{ fontSize: 22, letterSpacing: 1, marginBottom: 20 }}>BOOKING DETAILS</div>
              {[
                ["Booking ID", b.id],
                ["Service", b.service],
                ["Date", b.date || "Awaiting confirmation from shop"],
                ["Time", b.time || b.time_slot || "Awaiting confirmation from shop"],
                ["Vehicle", b.vehicle],
                ["Shop", b.shop],
                ["Shop Phone", b.shopPhone],
              ].map(([label, val]) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 3 }}>{label.toUpperCase()}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#fff" }}>{val}</div>
                </div>
              ))}
              {/* Show customer's preferred dates while awaiting confirmation */}
              {b.preferred_dates && !b.date && (() => {
                let prefs;
                try { prefs = JSON.parse(b.preferred_dates); } catch { return null; }
                if (!prefs || !prefs.length) return null;
                return (
                  <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(255,77,0,0.05)", border: "1px solid rgba(255,77,0,0.15)" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 8 }}>YOUR PREFERRED DATES</div>
                    {prefs.map((p, i) => (
                      <div key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                        {i + 1}. {p.date} — {p.time}
                      </div>
                    ))}
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>The shop will confirm a date based on your preferences.</div>
                  </div>
                );
              })()}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Service</span><span>${b.amount.toLocaleString()}.00</span>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 1 }}>
                <span>TOTAL</span><span style={{ color: "#FF4D00" }}>${b.amount.toLocaleString()}.00</span>
              </div>
              {b.status === "confirmed" && (
                <button style={{ marginTop: 20, width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", padding: "10px", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 2, cursor: "pointer" }}>
                  Request Reschedule
                </button>
              )}
              {b.status === "completed" && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: 18, letterSpacing: 1, marginBottom: 12 }}>LEAVE A REVIEW</div>
                  {existingReview ? (
                    <div>
                      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ fontSize: 24, color: s <= existingReview.stars ? "#FF4D00" : "rgba(255,255,255,0.15)" }}>★</span>
                        ))}
                      </div>
                      {existingReview.comment && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", fontStyle: "italic", marginBottom: 8 }}>"{existingReview.comment}"</div>}
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Review submitted — thank you!</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s}
                            onMouseEnter={() => setReviewHover(s)}
                            onMouseLeave={() => setReviewHover(0)}
                            onClick={() => setReviewStars(s)}
                            style={{ fontSize: 28, cursor: "pointer", color: s <= (reviewHover || reviewStars) ? "#FF4D00" : "rgba(255,255,255,0.15)", transition: "color 0.1s" }}>★</span>
                        ))}
                      </div>
                      <textarea
                        placeholder="Share your experience (optional)…"
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        style={{ width: "100%", background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 12px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none", resize: "vertical", minHeight: 70, lineHeight: 1.5, marginBottom: 10, boxSizing: "border-box" }}
                      />
                      <button
                        disabled={reviewStars === 0 || reviewSubmitting}
                        onClick={async () => {
                          if (!reviewStars || !currentUser) return;
                          setReviewSubmitting(true);
                          const { data } = await submitReview({ shopId: b.shop_id, bookingId: b.id, customerId: currentUser.id, stars: reviewStars, comment: reviewComment.trim() });
                          if (data) setExistingReview({ stars: reviewStars, comment: reviewComment.trim() });
                          setReviewSubmitting(false);
                        }}
                        style={{ width: "100%", background: reviewStars ? "#FF4D00" : "#2a2a2a", color: reviewStars ? "#fff" : "rgba(255,255,255,0.3)", border: "none", padding: "10px", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 2, cursor: reviewStars ? "pointer" : "default", transition: "all 0.2s" }}>
                        {reviewSubmitting ? "Submitting…" : reviewStars ? `Submit ${reviewStars}-Star Review` : "Select a Rating"}
                      </button>
                    </div>
                  )}
                  <button style={{ marginTop: 12, width: "100%", background: "transparent", border: "1px solid rgba(255,77,0,0.3)", color: "#FF4D00", padding: "10px", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 2, cursor: "pointer" }} onClick={() => nav("search")}>
                    Book Again →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* ── Payment modal ── */}
      {paymentBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", width: "100%", maxWidth: 460, padding: "32px", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 32, letterSpacing: 2, marginBottom: 6 }}>COMPLETE PAYMENT</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 28 }}>{paymentBooking.booking.shop} · {paymentBooking.booking.service}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>Service</span>
              <span>${Number(paymentBooking.amount).toFixed(2)}</span>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 1, marginBottom: 24 }}>
              <span>TOTAL</span>
              <span style={{ color: "#FF4D00" }}>${Number(paymentBooking.amount).toFixed(2)}</span>
            </div>
            {paymentError && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 14 }}>{paymentError}</div>}
            <button
              onClick={handleProceedToPayment}
              disabled={paymentLoading}
              style={{ width: "100%", background: paymentLoading ? "#555" : "#10B981", color: "#fff", border: "none", padding: "14px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 2, cursor: paymentLoading ? "default" : "pointer", marginBottom: 12 }}
            >
              {paymentLoading ? "Connecting to Stripe…" : `🔒 PAY $${Number(paymentBooking.amount).toFixed(2)} →`}
            </button>
            <div style={{ textAlign: "center" }}>
              <span onClick={() => { setPaymentBooking(null); setPaymentError(""); }} style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", cursor: "pointer", textDecoration: "underline" }}>Maybe Later</span>
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>POWERED BY STRIPE</div>
          </div>
        </div>
      )}
      </div>
    );
  }

  // ── BOOKINGS LIST VIEW ──────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 10px 20px; font-family: 'Bebas Neue', cursive; font-size: 14px; letter-spacing: 2px; cursor: pointer; } .booking-row:hover { border-color: rgba(255,77,0,0.3) !important; background: #161616 !important; } @media (max-width: 768px) { .dash-pad { padding: 16px !important; } .booking-row-meta { display: none !important; } .booking-row-right { flex-wrap: wrap; gap: 10px !important; } .dash-title { font-size: 36px !important; } } @media (max-width: 420px) { .dash-pad { padding: 12px !important; } } @keyframes skelPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      <Navbar />
      <div className="dash-pad" style={{ padding: "40px" }}>
        <div className="dash-title" style={{ fontSize: 48, letterSpacing: 2, marginBottom: 8 }}>MY BOOKINGS</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>Click a booking to view details and chat with the shop</div>
        {!bookingsLoaded ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.06)", flexShrink: 0, animation: "skelPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                  <div>
                    <div style={{ width: 140, height: 14, background: "rgba(255,255,255,0.06)", marginBottom: 8, animation: "skelPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                    <div style={{ width: 200, height: 11, background: "rgba(255,255,255,0.04)", animation: "skelPulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <div style={{ width: 60, height: 12, background: "rgba(255,255,255,0.05)", animation: "skelPulse 1.5s ease-in-out infinite" }} />
                  <div style={{ width: 72, height: 22, background: "rgba(255,255,255,0.05)", animation: "skelPulse 1.5s ease-in-out infinite" }} />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", padding: "56px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>🗓️</div>
            <div style={{ fontSize: 32, letterSpacing: 2 }}>NO BOOKINGS YET</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", maxWidth: 320 }}>Find a shop near you and get your vehicle wrapped, tinted, or detailed.</div>
            <button className="btn-main" style={{ marginTop: 8, fontSize: 16 }} onClick={() => nav("search")}>Find a Shop →</button>
          </div>
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {bookings.map(b => (
            <div key={b.id} className="booking-row" onClick={() => setSelectedBooking(b)}
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, background: b.shopColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", overflow: "hidden", flexShrink: 0 }}>
                    {b.shopImage ? <img src={b.shopImage} alt={b.shop} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : b.shopAvatar}
                  </div>
                <div>
                  <div style={{ fontSize: 20, letterSpacing: 1 }}>{b.shop}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{b.service} · {b.date ? `${b.date} at ${b.time}` : "Awaiting schedule"}</div>
                </div>
              </div>
              <div className="booking-row-right" style={{ display: "flex", gap: 20, alignItems: "center" }}>
                {messagesMap[b.id].length > 0 && (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span>💬</span> {messagesMap[b.id].length}
                  </div>
                )}
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: b.status === "confirmed" ? "#10B981" : "rgba(255,255,255,0.4)" }}>
                  ● {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                </div>
                <div style={{ fontSize: 24, color: "#FF4D00" }}>${b.total.toFixed(2)}</div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>View →</span>
              </div>
            </div>
          ))}
        </div>
        )}
        <button className="btn-main" style={{ marginTop: 24, fontSize: 16 }} onClick={() => nav("search")}>Book Another Appointment →</button>
      </div>

      {/* ── Payment modal ── */}
      {paymentBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", width: "100%", maxWidth: 460, padding: "32px", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 32, letterSpacing: 2, marginBottom: 6 }}>COMPLETE PAYMENT</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 28 }}>{paymentBooking.booking.shop} · {paymentBooking.booking.service}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>Service</span>
              <span>${Number(paymentBooking.amount).toFixed(2)}</span>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 1, marginBottom: 24 }}>
              <span>TOTAL</span>
              <span style={{ color: "#FF4D00" }}>${Number(paymentBooking.amount).toFixed(2)}</span>
            </div>
            {paymentError && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 14 }}>{paymentError}</div>}
            <button
              onClick={handleProceedToPayment}
              disabled={paymentLoading}
              style={{ width: "100%", background: paymentLoading ? "#555" : "#10B981", color: "#fff", border: "none", padding: "14px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 2, cursor: paymentLoading ? "default" : "pointer", marginBottom: 12 }}
            >
              {paymentLoading ? "Connecting to Stripe…" : `🔒 PAY $${Number(paymentBooking.amount).toFixed(2)} →`}
            </button>
            <div style={{ textAlign: "center" }}>
              <span onClick={() => { setPaymentBooking(null); setPaymentError(""); }} style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", cursor: "pointer", textDecoration: "underline" }}>Maybe Later</span>
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>POWERED BY STRIPE</div>
          </div>
        </div>
      )}
    </div>
  );
}
