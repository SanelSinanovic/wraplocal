import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";

import { supabase } from "../lib/supabase";
import { fetchCustomerBookings, fetchMessages, sendMessage as dbSendMessage, subscribeToMessages, submitReview, fetchBookingReview, uploadChatFile, sendNotification } from "../lib/queries";
import { requestDataDeletion } from "../lib/privacy";
import { safeExternalUrl } from "../lib/security";
import ChatImagePreview from "../components/ChatImagePreview";

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

export default function CustomerDashboard({ nav, currentUser, currentProfile, onLogout, stripeReturn, setStripeReturn, stripeNotice, setStripeNotice }) {
  const location = useLocation();
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
  const [stripeStatusMessage, setStripeStatusMessage] = useState("");

  // ── Reschedule modal state ───────────────────────────────
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleDone, setRescheduleDone] = useState(false);

  // ── Cancel booking state ─────────────────────────────────
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [dataDeletionStatus, setDataDeletionStatus] = useState("");
  const [dataDeletionError, setDataDeletionError] = useState("");

  // ── Unread messages state ────────────────────────────────
  const [unreadMap, setUnreadMap] = useState({});

  const handleDataDeletionRequest = async () => {
    setDataDeletionStatus("sending");
    setDataDeletionError("");
    try {
      await requestDataDeletion({ accountType: "Customer Account" });
      setDataDeletionStatus("sent");
    } catch (error) {
      setDataDeletionStatus("");
      setDataDeletionError(error?.message || "Could not send request. Please contact support@wrapbridge.com.");
    }
  };

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
      setBookingsLoaded(true);
    }
  }, [currentUser]);

  // Auto-select a booking when arriving from an email deep link (?booking=ID)
  useEffect(() => {
    if (!bookingsLoaded || !bookings.length) return;
    const params = new URLSearchParams(location.search);
    const bookingId = params.get("booking");
    if (bookingId) {
      const found = bookings.find(b => b.id === bookingId);
      if (found) setSelectedBooking(found);
    }
  }, [bookingsLoaded, bookings, location.search]);

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

  // ── Subscribe to ALL bookings for unread dots when on list view ──
  useEffect(() => {
    if (selectedBooking || !bookings.length || !currentUser) return;
    const channels = bookings
      .filter(b => b.status === "confirmed" || b.status === "pending")
      .map(b => subscribeToMessages(b.id, newMsg => {
        if (newMsg.from === "shop") {
          setUnreadMap(prev => ({ ...prev, [b.id]: true }));
          setMessagesMap(prev => ({
            ...prev,
            [b.id]: mergeMessages(prev[b.id] || [], newMsg),
          }));
        }
      }));
    return () => { channels.forEach(c => c?.unsubscribe()); };
  }, [selectedBooking, bookings.length, currentUser]);

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
    if (!stripeNotice) return;
    setStripeStatusMessage(stripeNotice);
    setStripeNotice?.("");
  }, [stripeNotice, setStripeNotice]);

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

  const handleQuoteDecision = async (decision, amount, quoteId) => {
    if (!currentUser || !selectedBooking) return;
    const normalizedAmount = Number(amount) || 0;
    if (decision !== "rejected" && decision !== "declined") return;
    const nextStatus = "cancelled";
    const updatePayload = { status: nextStatus };

    const { error } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", selectedBooking.id)
      .eq("customer_id", currentUser.id);
    if (error) return;
    if (quoteId) {
      await supabase.from("booking_quotes").update({ status: "declined" }).eq("id", quoteId).eq("booking_id", selectedBooking.id);
    }
    sendNotification("booking_cancelled", selectedBooking.id).catch(() => {});

    const marker = `QUOTE_RESPONSE::${decision}::${normalizedAmount.toFixed(2)}`;
    const result = await dbSendMessage({
      bookingId: selectedBooking.id,
      senderId: currentUser.id,
      senderRole: "customer",
      text: marker,
    });

    setBookings(prev => prev.map(b => b.id === selectedBooking.id
      ? { ...b, status: nextStatus }
      : b
    ));
    setSelectedBooking(prev => prev
      ? { ...prev, status: nextStatus }
      : prev
    );

    if (result) {
      const time = new Date(result.sent_at || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const decisionText = `Quote declined ($${normalizedAmount.toFixed(2)})`;
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

  // ── Add a chat receipt after Stripe payment (server-side DB writes are source of truth) ──
  const sendPaymentAcceptanceMessage = async (bookingId, fullAmount) => {
    if (!currentUser) return;
    const normalizedFull = Number(fullAmount) || 0;
    const { data: existingMessage } = await supabase
      .from("messages")
      .select("id")
      .eq("booking_id", bookingId)
      .like("text", "QUOTE_RESPONSE::accepted::%")
      .maybeSingle();
    if (existingMessage) return;
    const marker = `QUOTE_RESPONSE::accepted::${normalizedFull.toFixed(2)}`;
    const result = await dbSendMessage({ bookingId, senderId: currentUser.id, senderRole: "customer", text: marker });
    sendNotification("payment_received", bookingId).catch(() => {});
    if (result) {
      const time = new Date(result.sent_at || Date.now()).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      setMessagesMap(prev => ({
        ...prev,
        [bookingId]: mergeMessages(prev[bookingId] || [], {
          id: result.id,
          from: "me",
          text: `Quote accepted ($${normalizedFull.toFixed(2)})`,
          time,
          quoteResponse: "accepted",
          quoteAmount: normalizedFull,
          rawText: marker,
        }),
      }));
    }
  };

  const processingStripeReturn = useRef(false);

  // ── Consume Stripe return after bookings are loaded ────────────────────────────────
  // The webhook (stripe-webhook edge function) is the source of truth for payment
  // confirmation. After redirect, poll the booking status. Fall back to client-side
  // confirmation if the webhook hasn't processed within 30 seconds.
  useEffect(() => {
    if (!stripeReturn || !bookingsLoaded) return;
    if (processingStripeReturn.current) return;
    const booking = bookings.find(b => String(b.id) === String(stripeReturn.bookingId));
    if (!booking) return;
    processingStripeReturn.current = true;
    const { bookingId, isRemaining, sessionId } = stripeReturn;
    setStripeReturn(null);

    // Poll for webhook confirmation, then fall back to client-side update
    (async () => {
      let confirmed = false;

      // ── Primary: verify directly with Stripe via confirm-payment function ──
      if (sessionId) {
        try {
          const { data: cfData } = await supabase.functions.invoke("confirm-payment", {
            body: { bookingId, sessionId },
          });
          if (cfData?.confirmed) confirmed = true;
        } catch (_) { /* fall through to polling */ }
      }

      // ── Fallback: poll DB for webhook update (up to 30s) ─────────────────
      if (!confirmed) {
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const { data } = await supabase.from("bookings").select("status, payment_verified, total").eq("id", bookingId).single();
          if (data?.payment_verified) { confirmed = true; break; }
          if (!isRemaining && data?.status === "confirmed") { confirmed = true; break; }
        }
      }

      if (!confirmed) {
        setStripeStatusMessage("Payment submitted. Stripe is still confirming it; refresh in a moment if your booking has not updated.");
        processingStripeReturn.current = false;
        return;
      }

      const refreshed = await fetchCustomerBookings(currentUser.id);
      const updatedBooking = refreshed?.find(item => String(item.id) === String(bookingId));
      if (refreshed) {
        setBookings(refreshed);
        setMessagesMap(prev => ({
          ...Object.fromEntries(refreshed.map(item => [item.id, prev[item.id] || []])),
        }));
      }
      if (updatedBooking) {
        setSelectedBooking(updatedBooking);
        setStripeStatusMessage(isRemaining ? "Remaining balance paid successfully." : "Payment successful. Your booking is confirmed.");
        if (!isRemaining) {
          await sendPaymentAcceptanceMessage(bookingId, updatedBooking.amount);
        }
      }
      processingStripeReturn.current = false;
    })().catch(() => {
      setStripeStatusMessage("Payment verification is still processing. Refresh in a moment if your booking has not updated.");
      processingStripeReturn.current = false;
    });
  }, [stripeReturn, bookingsLoaded]);

  // ── Redirect to Stripe Checkout ──────────────────────────────────────────
  const handleProceedToPayment = async () => {
    if (!paymentBooking) return;
    setPaymentLoading(true);
    setPaymentError("");
    const { booking, quoteId, paymentType, isRemaining } = paymentBooking;
    if (!isRemaining && !quoteId) {
      setPaymentError("This older quote must be resent by the shop before online payment.");
      setPaymentLoading(false);
      return;
    }
    const successUrl = `${window.location.origin}/dashboard?stripe_success=1&booking_id=${booking.id}${isRemaining ? "&remaining=1" : ""}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${window.location.origin}/dashboard?stripe_cancel=1`;
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { bookingId: booking.id, quoteId, paymentType: isRemaining ? "remaining" : paymentType || "full", successUrl, cancelUrl },
    });
    if (error || !data?.url) {
      const msg = data?.error || error?.message || error?.toString() || "Unknown error";
      setPaymentError(`Payment setup failed: ${msg}`);
      setPaymentLoading(false);
      return;
    }
    window.location.href = data.url;
  };

  const handleCancelBooking = async (bookingId) => {
    setCancelSubmitting(true);
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId).eq("customer_id", currentUser?.id);
    sendNotification("booking_cancelled", bookingId).catch(() => {});
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "cancelled" } : b));
    setSelectedBooking(prev => prev?.id === bookingId ? { ...prev, status: "cancelled" } : prev);
    setCancelConfirmId(null);
    setCancelSubmitting(false);
  };

  const totalUnread = Object.keys(unreadMap).length;

  const Navbar = () => (
    <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button className="image-button" type="button" onClick={() => nav("landing")} aria-label="Go to WrapBridge home">
        <img src="/images/Logo.png" alt="WrapBridge" style={{ height: 68, display: "block" }} />
      </button>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FF4D00", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
            {(currentProfile?.name || "M")[0].toUpperCase()}
          </div>
          {totalUnread > 0 && (
            <div style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
              {totalUnread > 9 ? "9+" : totalUnread}
            </div>
          )}
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
          // Hide if booking is already paid/confirmed, or if a response message exists in chat
          if (b.payment_verified || (b.status === "confirmed" && Number(b.amount) > 0)) return null;
          const alreadyResponded = messages.slice(lastQuoteIndex + 1).some(msg => msg?.quoteResponse === "accepted" || msg?.quoteResponse === "declined" || msg?.quoteResponse === "rejected");
          return alreadyResponded ? null : offerMessage;
        })()
      : null;
    return (
      <div style={{ fontFamily: "'Bebas Neue', cursive", background: "#0A0A0A", minHeight: "100vh", color: "#fff" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .chat-input { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; flex: 1; } .chat-input:focus { border-color: #FF4D00; } .send-btn { background: #FF4D00; color: #fff; border: none; padding: 12px 24px; font-family: 'Bebas Neue', cursive; font-size: 16px; letter-spacing: 2px; cursor: pointer; flex-shrink: 0; } @media (max-width: 768px) { .detail-wrap { padding: 16px !important; } .detail-layout { grid-template-columns: 1fr !important; gap: 16px !important; } .detail-back { font-size: 13px !important; } } @media (max-width: 420px) { .detail-wrap { padding: 12px !important; } }`}</style>
        <Navbar />
        {stripeStatusMessage && (
          <div style={{ maxWidth: 900, margin: "18px auto 0", padding: "12px 16px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#A7F3D0", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>{stripeStatusMessage}</div>
        )}
        <div className="detail-wrap" style={{ maxWidth: 900, margin: "0 auto", padding: "36px 40px" }}>
          {/* Back */}
          <button className="link-button detail-back" type="button" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, cursor: "pointer" }} onClick={() => setSelectedBooking(null)}>
            <span style={{ color: "#FF4D00", fontSize: 20 }}>←</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Back to My Bookings</span>
          </button>

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
                    {b.refund_status === "full" && <span style={{ marginLeft: 8, color: "#A855F7" }}>↩ Refunded</span>}
                    {b.refund_status === "partial" && <span style={{ marginLeft: 8, color: "#F59E0B" }}>↩ Partial Refund</span>}
                    {b.dispute_status === "open" && <span style={{ marginLeft: 8, color: "#ef4444" }}>⚠ Dispute</span>}
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
                          const safeUrl = safeExternalUrl(url);
                          if (!safeUrl) return "Attachment unavailable";
                          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
                          if (isImage) return <ChatImagePreview src={safeUrl} alt={name} />;
                          return <a href={safeUrl} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>📄 {name}</a>;
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
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>
                    {pendingQuote.paymentType === "deposit" ? (
                      <>
                        Quote: <span style={{ color: "#10B981", fontWeight: 600 }}>${Number(pendingQuote.quoteOffer).toFixed(2)}</span>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}> · {pendingQuote.depositPct}% deposit (${(pendingQuote.quoteOffer * pendingQuote.depositPct / 100).toFixed(2)}) due now</span>
                      </>
                    ) : (
                      <>Quote received: <span style={{ color: "#10B981", fontWeight: 600 }}>${Number(pendingQuote.quoteOffer).toFixed(2)}</span></>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => {
                        if (!pendingQuote.quoteId) {
                          setPaymentError("This older quote must be resent by the shop before online payment.");
                          return;
                        }
                        const fullAmt = pendingQuote.quoteOffer;
                        const pType = pendingQuote.paymentType || "full";
                        const dPct = pendingQuote.depositPct || 100;
                        const chargeAmt = pType === "deposit" ? Math.round(fullAmt * dPct) / 100 : fullAmt;
                        setPaymentBooking({ booking: selectedBooking, quoteId: pendingQuote.quoteId, fullAmount: fullAmt, chargeAmount: chargeAmt, paymentType: pType, depositPct: dPct });
                      }}
                      style={{ background: pendingQuote.quoteId ? "#10B981" : "#2a2a2a", color: "#fff", border: "none", padding: "9px 14px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: pendingQuote.quoteId ? "pointer" : "default", opacity: pendingQuote.quoteId ? 1 : 0.65 }}
                    >
                      {pendingQuote.paymentType === "deposit"
                        ? `Accept & Pay Deposit ($${(pendingQuote.quoteOffer * pendingQuote.depositPct / 100).toFixed(2)}) →`
                        : "Accept & Pay →"}
                    </button>
                    <button onClick={() => handleQuoteDecision("rejected", pendingQuote.quoteOffer, pendingQuote.quoteId)} style={{ background: "transparent", color: "rgba(255,77,0,0.9)", border: "1px solid rgba(255,77,0,0.4)", padding: "9px 14px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 1, cursor: "pointer" }}>Decline Quote</button>
                  </div>
                  {!pendingQuote.quoteId && (
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#F59E0B", marginTop: 8 }}>
                      Ask the shop to resend this quote before paying online.
                    </div>
                  )}
                  {pendingQuote.paymentType === "deposit" && (
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                      Remaining ${(pendingQuote.quoteOffer * (1 - pendingQuote.depositPct / 100)).toFixed(2)} is due directly to the shop at pickup.
                    </div>
                  )}
                  {paymentError && !paymentBooking && (
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#EF4444", marginTop: 8 }}>{paymentError}</div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 0, border: "1px solid rgba(255,255,255,0.07)", borderTop: "none" }}>
                <input type="file" ref={chatFileRef} aria-label="Attach chat file" style={{ display: "none" }} accept="image/jpeg,image/png,image/gif,image/webp,.pdf" onChange={e => { const f = e.target.files[0]; if (f) { sendChatFile(f); e.target.value = ""; } }} />
                <input
                  className="chat-input"
                  aria-label={`Message ${b.shop}`}
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
                    <button type="button" aria-label="Attach image or PDF" onClick={() => chatFileRef.current?.click()} disabled={chatFileUploading} style={{ background: "#1A1A1A", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)", padding: "0 14px", color: chatFileUploading ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.55)", cursor: chatFileUploading ? "not-allowed" : "pointer", fontSize: 18 }} title="Attach image or PDF">📎</button>
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
              {/* Payment breakdown */}
              {(() => {
                const fullPrice = Number(b.amount) || 0;
                const paid = Number(b.total) || 0;
                const remaining = Math.max(0, fullPrice - paid);
                const hasRemaining = b.status === "confirmed" && remaining > 0.005;
                return (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>Full job price</span><span>${fullPrice.toFixed(2)}</span>
                    </div>
                    {hasRemaining && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: 13, marginBottom: 8 }}>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Deposit paid</span><span style={{ color: "#10B981" }}>-${paid.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 1, marginBottom: hasRemaining ? 12 : 0 }}>
                      <span>{hasRemaining ? "REMAINING" : "TOTAL"}</span>
                      <span style={{ color: hasRemaining ? "#F59E0B" : "#FF4D00" }}>${hasRemaining ? remaining.toFixed(2) : fullPrice.toFixed(2)}</span>
                    </div>
                    {hasRemaining && (
                      <button
                        onClick={() => setPaymentBooking({ booking: b, fullAmount: fullPrice, chargeAmount: remaining, paymentType: "remaining", isRemaining: true })}
                        style={{ width: "100%", background: "#F59E0B", border: "none", color: "#000", padding: "12px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2, cursor: "pointer", marginBottom: 8 }}
                      >
                        Pay Remaining Balance (${remaining.toFixed(2)}) →
                      </button>
                    )}
                  </>
                );
              })()}
              {b.status === "confirmed" && (
                <button
                  onClick={() => { setRescheduleBooking(b); setRescheduleNote(""); setRescheduleDone(false); }}
                  style={{ marginTop: 20, width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", padding: "10px", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 2, cursor: "pointer", transition: "border-color 0.2s, color 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,77,0,0.4)"; e.currentTarget.style.color = "#FF4D00"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                >
                  Request Reschedule
                </button>
              )}
              {(b.status === "pending" || b.status === "confirmed") && (
                cancelConfirmId === b.id ? (
                  <div style={{ marginTop: 12, padding: "14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>Are you sure you want to cancel this booking?</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={cancelSubmitting}
                        style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", padding: "9px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 2, cursor: cancelSubmitting ? "default" : "pointer", opacity: cancelSubmitting ? 0.6 : 1 }}
                      >
                        {cancelSubmitting ? "Cancelling…" : "Yes, Cancel"}
                      </button>
                      <button
                        onClick={() => setCancelConfirmId(null)}
                        style={{ flex: 1, background: "transparent", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.12)", padding: "9px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 2, cursor: "pointer" }}
                      >
                        Keep It
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setCancelConfirmId(b.id)}
                    style={{ marginTop: 8, width: "100%", background: "transparent", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.55)", padding: "9px", fontFamily: "'Bebas Neue', cursive", fontSize: 14, letterSpacing: 2, cursor: "pointer", transition: "border-color 0.2s, color 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)"; e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "rgba(239,68,68,0.55)"; }}
                  >
                    Cancel Booking
                  </button>
                )
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
                          <button key={s} type="button"
                            aria-label={`Rate ${s} star${s === 1 ? "" : "s"}`}
                            onMouseEnter={() => setReviewHover(s)}
                            onMouseLeave={() => setReviewHover(0)}
                            onClick={() => setReviewStars(s)}
                            style={{ background: "transparent", border: "none", padding: 0, fontSize: 28, cursor: "pointer", color: s <= (reviewHover || reviewStars) ? "#FF4D00" : "rgba(255,255,255,0.35)", transition: "color 0.1s" }}>★</button>
                        ))}
                      </div>
                      <textarea
                        aria-label="Review comment"
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
            {paymentBooking.isRemaining ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Full job price</span>
                  <span>${Number(paymentBooking.fullAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Deposit already paid</span>
                  <span style={{ color: "#10B981" }}>-${(paymentBooking.fullAmount - paymentBooking.chargeAmount).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Platform fee was collected at deposit. No additional charge on this payment.</div>
              </>
            ) : paymentBooking.paymentType === "deposit" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Full job price</span>
                  <span>${Number(paymentBooking.fullAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Deposit due now ({paymentBooking.depositPct}%)</span>
                  <span style={{ color: "#10B981" }}>${Number(paymentBooking.chargeAmount).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>
                  Remaining ${(paymentBooking.fullAmount - paymentBooking.chargeAmount).toFixed(2)} due at pickup.
                </div>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Service</span>
                <span>${Number(paymentBooking.chargeAmount ?? paymentBooking.fullAmount).toFixed(2)}</span>
              </div>
            )}
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 1, marginBottom: 24 }}>
              <span>{paymentBooking.isRemaining ? "REMAINING BALANCE" : paymentBooking.paymentType === "deposit" ? "DEPOSIT TOTAL" : "TOTAL"}</span>
              <span style={{ color: "#FF4D00" }}>${Number(paymentBooking.chargeAmount ?? paymentBooking.fullAmount).toFixed(2)}</span>
            </div>
            {paymentError && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 14 }}>{paymentError}</div>}
            <button
              onClick={handleProceedToPayment}
              disabled={paymentLoading}
              style={{ width: "100%", background: paymentLoading ? "#555" : "#10B981", color: "#fff", border: "none", padding: "14px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 2, cursor: paymentLoading ? "default" : "pointer", marginBottom: 12 }}
            >
              {paymentLoading ? "Connecting to Stripe…" : `🔒 PAY $${Number(paymentBooking.chargeAmount ?? paymentBooking.fullAmount).toFixed(2)} →`}
            </button>
            <div style={{ textAlign: "center" }}>
              <button className="link-button" type="button" onClick={() => { setPaymentBooking(null); setPaymentError(""); }} style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", cursor: "pointer", textDecoration: "underline" }}>Maybe Later</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>POWERED BY STRIPE</div>
          </div>
        </div>
      )}
      {/* ── Reschedule modal ── */}
      {rescheduleBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", padding: "36px 32px", width: "100%", maxWidth: 440, fontFamily: "'Bebas Neue', cursive" }}>
            {rescheduleDone ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 28, letterSpacing: 1, marginBottom: 8 }}>REQUEST SENT</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>The shop has been notified. They'll reach out to confirm a new time.</div>
                <button onClick={() => setRescheduleBooking(null)} style={{ width: "100%", background: "#FF4D00", color: "#fff", border: "none", padding: "12px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 26, letterSpacing: 1, marginBottom: 4 }}>REQUEST RESCHEDULE</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>{rescheduleBooking.shop} · {rescheduleBooking.service}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 8 }}>PREFERRED NEW DATE / TIME</div>
                <input
                  placeholder="e.g. Any weekday afternoon, March 20 after 2pm…"
                  value={rescheduleNote}
                  onChange={e => setRescheduleNote(e.target.value)}
                  style={{ width: "100%", background: "#151515", border: "1px solid rgba(255,255,255,0.1)", padding: "11px 14px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", marginBottom: 20, boxSizing: "border-box", transition: "border-color 0.2s" }}
                  onFocus={e => e.target.style.borderColor = "#FF4D00"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    disabled={rescheduleSubmitting}
                    onClick={async () => {
                      setRescheduleSubmitting(true);
                      const msg = rescheduleNote.trim()
                        ? `🗓️ I'd like to request a reschedule. Preferred time: ${rescheduleNote.trim()}`
                        : "🗓️ I'd like to request a reschedule for this appointment. Please let me know your available times.";
                      await dbSendMessage({ bookingId: rescheduleBooking.id, senderId: currentUser?.id, senderRole: "customer", text: msg });
                      if (currentUser) {
                        await sendNotification("reschedule_request", rescheduleBooking.id).catch(() => {});
                      }
                      const now = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
                      setMessagesMap(prev => ({
                        ...prev,
                        [rescheduleBooking.id]: mergeMessages(prev[rescheduleBooking.id] || [], { from: "me", text: msg, time: now }),
                      }));
                      setRescheduleSubmitting(false);
                      setRescheduleDone(true);
                    }}
                    style={{ flex: 1, background: rescheduleSubmitting ? "#555" : "#FF4D00", color: "#fff", border: "none", padding: "12px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2, cursor: rescheduleSubmitting ? "default" : "pointer" }}
                  >
                    {rescheduleSubmitting ? "Sending…" : "Send Request"}
                  </button>
                  <button onClick={() => setRescheduleBooking(null)} style={{ background: "transparent", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 18px", fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 1, cursor: "pointer" }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    );
  }

  // ── BOOKINGS LIST VIEW ──────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Bebas Neue', cursive", background: "linear-gradient(180deg, #0A0A0A 0%, #140A04 20%, #0A0A0A 55%, #05050C 100%)", minHeight: "100vh", color: "#fff", position: "relative", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; } .btn-main { background: #FF4D00; color: #fff; border: none; padding: 10px 20px; font-family: 'Bebas Neue', cursive; font-size: 14px; letter-spacing: 2px; cursor: pointer; transition: background 0.2s, transform 0.15s; } .btn-main:hover { background: #FF6A20; transform: translateY(-1px); } .booking-row { width: 100%; color: #fff; text-align: left; background: #111; border: 1px solid rgba(255,255,255,0.07); padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.2s; } .booking-row:hover { border-color: rgba(255,77,0,0.3); background: linear-gradient(90deg, rgba(255,77,0,0.07) 0%, rgba(255,77,0,0.02) 60%, #111 100%); transform: translateX(2px); } @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } } .brow-anim { animation: fadeInUp 0.4s cubic-bezier(0.22,1,0.36,1) both; } @media (max-width: 768px) { .dash-pad { padding: 16px !important; } .booking-row-meta { display: none !important; } .booking-row-right { flex-wrap: wrap; gap: 10px !important; } .dash-title { font-size: 36px !important; } } @media (max-width: 420px) { .dash-pad { padding: 12px !important; } } @keyframes skelPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes glow-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 0.8; } } @keyframes orb-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }`}</style>
      <div aria-hidden="true" style={{ position: "fixed", top: "-10%", right: "-8%", width: 600, height: 600, background: "radial-gradient(circle, rgba(255,77,0,0.18) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "glow-breathe 6s ease-in-out infinite", zIndex: 0 }} />
      <div aria-hidden="true" style={{ position: "fixed", bottom: "-10%", left: "-8%", width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none", animation: "orb-drift 14s ease-in-out infinite", zIndex: 0 }} />
      <Navbar />
      <div className="dash-pad" style={{ padding: "40px" }}>
        {stripeStatusMessage && (
          <div style={{ marginBottom: 18, padding: "12px 16px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#A7F3D0", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>{stripeStatusMessage}</div>
        )}
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
          {bookings.map((b, i) => (
            <button key={b.id} type="button" className="booking-row brow-anim" onClick={() => { setSelectedBooking(b); setUnreadMap(prev => { const n = { ...prev }; delete n[b.id]; return n; }); }}
              style={{ animationDelay: `${Math.min(i * 0.07, 0.4)}s` }}>
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
                    {unreadMap[b.id] && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF4D00", flexShrink: 0 }} />
                    )}
                  </div>
                )}
                {!messagesMap[b.id].length && unreadMap[b.id] && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                    <span>💬</span> 1
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF4D00", flexShrink: 0 }} />
                  </div>
                )}
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: b.status === "confirmed" ? "#10B981" : "rgba(255,255,255,0.4)" }}>
                  ● {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  {b.refund_status === "full" && <span style={{ marginLeft: 6, color: "#A855F7" }}>↩ Refunded</span>}
                  {b.dispute_status === "open" && <span style={{ marginLeft: 6, color: "#ef4444" }}>⚠</span>}
                </div>
                <div style={{ fontSize: 24, color: "#FF4D00" }}>${b.total.toFixed(2)}</div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>View →</span>
              </div>
            </button>
          ))}
        </div>
        )}
        <button className="btn-main" style={{ marginTop: 24, fontSize: 16 }} onClick={() => nav("search")}>Book Another Appointment →</button>
        <div style={{ marginTop: 28, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "18px 20px", maxWidth: 680 }}>
          <div style={{ fontSize: 22, letterSpacing: 1, marginBottom: 6 }}>PRIVACY</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 14 }}>
            Need your account data removed? Send a deletion request to WrapBridge support.
          </div>
          <button onClick={handleDataDeletionRequest} disabled={dataDeletionStatus === "sending" || dataDeletionStatus === "sent"} style={{ display: "inline-block", background: "transparent", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.16)", padding: "10px 16px", fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 1.5, cursor: dataDeletionStatus === "sending" || dataDeletionStatus === "sent" ? "default" : "pointer", opacity: dataDeletionStatus === "sending" ? 0.6 : 1 }}>
            {dataDeletionStatus === "sending" ? "Sending..." : dataDeletionStatus === "sent" ? "Request Sent" : "Request Data Deletion"}
          </button>
          {dataDeletionStatus === "sent" && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#10B981", marginTop: 10 }}>Your request was sent to WrapBridge support.</div>}
          {dataDeletionError && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#EF4444", marginTop: 10 }}>{dataDeletionError}</div>}
        </div>
      </div>

      {/* ── Payment modal ── */}
      {paymentBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", width: "100%", maxWidth: 460, padding: "32px", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 32, letterSpacing: 2, marginBottom: 6 }}>{paymentBooking.isRemaining ? "PAY REMAINING BALANCE" : "COMPLETE PAYMENT"}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 28 }}>{paymentBooking.booking.shop} · {paymentBooking.booking.service}</div>
            {paymentBooking.isRemaining ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Full job price</span>
                  <span>${Number(paymentBooking.fullAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Deposit already paid</span>
                  <span style={{ color: "#10B981" }}>-${(paymentBooking.fullAmount - paymentBooking.chargeAmount).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Platform fee was collected at deposit. No additional charge on this payment.</div>
              </>
            ) : paymentBooking.paymentType === "deposit" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Full job price</span>
                  <span>${Number(paymentBooking.fullAmount).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Deposit due now ({paymentBooking.depositPct}%)</span>
                  <span style={{ color: "#10B981" }}>${Number(paymentBooking.chargeAmount).toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>
                  Remaining ${(paymentBooking.fullAmount - paymentBooking.chargeAmount).toFixed(2)} due at pickup.
                </div>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 10 }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Service</span>
                <span>${Number(paymentBooking.chargeAmount ?? paymentBooking.fullAmount).toFixed(2)}</span>
              </div>
            )}
            <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 1, marginBottom: 24 }}>
              <span>{paymentBooking.isRemaining ? "REMAINING BALANCE" : paymentBooking.paymentType === "deposit" ? "DEPOSIT TOTAL" : "TOTAL"}</span>
              <span style={{ color: "#FF4D00" }}>${Number(paymentBooking.chargeAmount ?? paymentBooking.fullAmount).toFixed(2)}</span>
            </div>
            {paymentError && <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 14 }}>{paymentError}</div>}
            <button
              onClick={handleProceedToPayment}
              disabled={paymentLoading}
              style={{ width: "100%", background: paymentLoading ? "#555" : "#10B981", color: "#fff", border: "none", padding: "14px", fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 2, cursor: paymentLoading ? "default" : "pointer", marginBottom: 12 }}
            >
              {paymentLoading ? "Connecting to Stripe…" : `🔒 PAY $${Number(paymentBooking.chargeAmount ?? paymentBooking.fullAmount).toFixed(2)} →`}
            </button>
            <div style={{ textAlign: "center" }}>
              <button className="link-button" type="button" onClick={() => { setPaymentBooking(null); setPaymentError(""); }} style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", cursor: "pointer", textDecoration: "underline" }}>Maybe Later</button>
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 1 }}>POWERED BY STRIPE</div>
          </div>
        </div>
      )}
    </div>
  );
}
