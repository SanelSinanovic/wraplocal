import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import SearchPage from "./pages/SearchPage";
import ShopProfile from "./pages/ShopProfile";
import BookingFlow from "./pages/BookingFlow";
import CustomerDashboard from "./pages/CustomerDashboard";
import PricingPage from "./pages/PricingPage";
import CompanyDashboard from "./pages/CompanyDashboard";
import CustomerLogin from "./pages/CustomerLogin";
import CompanyLogin from "./pages/CompanyLogin";
import { supabase } from "./lib/supabase";
import { fetchShops, fetchProfile, fetchShopById } from "./lib/queries";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import AccessibilityPage from "./pages/AccessibilityPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AdminDashboard from "./pages/AdminDashboard";

// Map old hash-based view names to clean URL paths (backward compat for nav())
const VIEW_TO_PATH = {
  landing: "/",
  search: "/search",
  shop: "/shop",
  booking: "/book",
  "customer-dash": "/dashboard",
  "company-dash": "/company",
  pricing: "/pricing",
  "customer-login": "/login",
  "company-login": "/business/login",
  terms: "/terms",
  privacy: "/privacy",
  accessibility: "/accessibility",
  "reset-password": "/reset-password",
  admin: "/admin",
};

// Map clean URL paths to SEO metadata
const PATH_META = {
  "/":               { title: "WrapBridge — Find & Book Vehicle Wrap, Tint & Detailing Shops",     description: "WrapBridge connects you with the best vehicle wrap, window tint, and detailing shops near you. Compare portfolios, get quotes, and book online." },
  "/search":         { title: "Find Shops Near You — WrapBridge",                                   description: "Browse vehicle wrap, window tint, PPF, and detailing shops on WrapBridge. Filter by service and location." },
  "/shop":           { title: "Shop Profile — WrapBridge",                                          description: "View services, portfolio and book an appointment through WrapBridge." },
  "/book":           { title: "Book a Service — WrapBridge",                                        description: "Request a quote and book your vehicle service through WrapBridge." },
  "/dashboard":      { title: "My Bookings — WrapBridge",                                          description: "Manage your vehicle service bookings on WrapBridge." },
  "/company":        { title: "Shop Dashboard — WrapBridge",                                       description: "Manage your shop, bookings, and payouts on WrapBridge." },
  "/pricing":        { title: "Pricing — WrapBridge",                                               description: "Simple, transparent pricing for vehicle wrap and tint shops listing on WrapBridge." },
  "/login":          { title: "Sign In — WrapBridge",                                               description: "Sign in to your WrapBridge customer account to manage bookings." },
  "/business/login": { title: "Shop Login — WrapBridge",                                            description: "Sign in to your WrapBridge shop dashboard." },
  "/terms":          { title: "Terms of Service \u2014 WrapBridge",                                  description: "Read WrapBridge's Terms of Service, including our payment, refund, and liability policies." },
  "/privacy":        { title: "Privacy Policy \u2014 WrapBridge",                                   description: "Read WrapBridge's Privacy Policy to understand how we collect, use, and protect your data." },
  "/accessibility":  { title: "Accessibility Statement \u2014 WrapBridge",                          description: "Read WrapBridge's Accessibility Statement and our commitment to ADA accessibility and WCAG 2.1 Level AA." },
  "/reset-password": { title: "Reset Password \u2014 WrapBridge",                                   description: "Reset your WrapBridge account password." },
};

// Loading spinner shown while fetching shop data from URL params
function PageLoader() {
  return <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>Loading…</div>;
}

function NotFoundPage({ nav }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 72, letterSpacing: 3, color: "#FF4D00" }}>404</div>
        <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 42, letterSpacing: 2, margin: "0 0 8px" }}>Page not found</h1>
        <p style={{ color: "rgba(255,255,255,0.55)", marginBottom: 24 }}>The page you’re looking for doesn’t exist or has moved.</p>
        <button onClick={() => nav("landing")} style={{ background: "#FF4D00", color: "#fff", border: "none", padding: "12px 22px", fontFamily: "'Bebas Neue', cursive", fontSize: 17, letterSpacing: 2, cursor: "pointer" }}>Back Home</button>
      </div>
    </div>
  );
}

function RequireAuth({ children, role, authReady, currentUser, currentProfile }) {
  const location = useLocation();
  if (!authReady) return <PageLoader />;
  const loginPath = role === "company" ? "/business/login" : "/login";
  if (!currentUser) return <Navigate to={loginPath} state={{ from: location }} replace />;
  const accountRole = currentProfile?.role || currentUser?.user_metadata?.role;
  const accountHome = accountRole === "company" ? "/company" : accountRole === "admin" ? "/admin" : "/dashboard";
  if (role && accountRole && accountRole !== role && accountRole !== "admin") return <Navigate to={accountHome} replace />;
  return children;
}

// Wrapper: load shop from URL param for ShopProfile
function ShopProfileLoader({ nav, setBookingShop, currentUser, currentProfile, onLogout, selectedShop, setSelectedShop }) {
  const { shopId } = useParams();
  const [shop, setShop] = useState(selectedShop?.id === shopId ? selectedShop : null);
  const [loading, setLoading] = useState(!shop);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedShop?.id === shopId) { setShop(selectedShop); setLoading(false); return; }
    setLoading(true);
    fetchShopById(shopId).then(data => {
      if (data) { setShop(data); setSelectedShop(data); }
      else navigate("/search", { replace: true });
      setLoading(false);
    });
  }, [shopId]);

  if (loading) return <PageLoader />;
  if (!shop) return null;
  return <ShopProfile nav={nav} selectedShop={shop} setBookingShop={setBookingShop} currentUser={currentUser} currentProfile={currentProfile} onLogout={onLogout} />;
}

// Wrapper: load shop from URL param for BookingFlow
function BookingFlowLoader({ nav, currentUser, bookingShop, setBookingShop, ...bookingProps }) {
  const { shopId } = useParams();
  const [shop, setShop] = useState(bookingShop?.id === shopId ? bookingShop : null);
  const [loading, setLoading] = useState(!shop);
  const navigate = useNavigate();

  useEffect(() => {
    if (bookingShop?.id === shopId) { setShop(bookingShop); setLoading(false); return; }
    setLoading(true);
    fetchShopById(shopId).then(data => {
      if (data) { setShop(data); setBookingShop(data); }
      else navigate("/search", { replace: true });
      setLoading(false);
    });
  }, [shopId]);

  if (loading) return <PageLoader />;
  if (!shop) return null;
  return <BookingFlow nav={nav} bookingShop={shop} currentUser={currentUser} {...bookingProps} />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedShop, setSelectedShop] = useState(null);
  const [bookingShop, setBookingShop] = useState(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [dashTab, setDashTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const validTabs = ["overview","requests","bookings","payments","availability","profile"];
    return validTabs.includes(tab) ? tab : "overview";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState(null);
  const [stripeReturn, setStripeReturn] = useState(null);
  const [stripeNotice, setStripeNotice] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [postLoginNav, setPostLoginNav] = useState(null);
  const [recoveryReady, setRecoveryReady] = useState(false);

  // ── Redirect old hash-based URLs to clean paths on first load ───────────
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#") && !hash.includes("type=recovery") && !hash.includes("type=signup") && !hash.includes("access_token")) {
      const view = hash.replace("#", "").split("?")[0];
      const path = VIEW_TO_PATH[view];
      if (path) navigate(path, { replace: true });
    }
  }, []);

  // ── Dynamic page title + meta description ───────────────────────────────
  useEffect(() => {
    const pathname = location.pathname;
    const basePath = pathname.startsWith("/shop/") ? "/shop" :
                     pathname.startsWith("/book/") ? "/book" : pathname;

    let title = PATH_META[basePath]?.title || "WrapBridge";
    let description = PATH_META[basePath]?.description || PATH_META["/"].description;

    if (pathname.startsWith("/shop/") && selectedShop?.name) {
      title = `${selectedShop.name} \u2014 WrapBridge`;
      description = `${selectedShop.name} on WrapBridge \u2014 view services, portfolio and book an appointment online.`;
    } else if (pathname.startsWith("/book/") && bookingShop?.name) {
      title = `Book ${bookingShop.name} \u2014 WrapBridge`;
      description = `Request a quote and book your vehicle service at ${bookingShop.name} through WrapBridge.`;
    }

    const url = `https://wrapbridge.com${pathname}`;

    document.title = title;
    const setMeta = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
    setMeta('meta[name="description"]',         "content", description);
    setMeta('meta[property="og:title"]',         "content", title);
    setMeta('meta[property="og:description"]',   "content", description);
    setMeta('meta[property="og:url"]',            "content", url);
    setMeta('meta[name="twitter:title"]',         "content", title);
    setMeta('meta[name="twitter:description"]',   "content", description);
  }, [location.pathname, selectedShop, bookingShop]);

  // ── Supabase: shops + auth state ──────────────────────────
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

    // Load shops on mount
    setShopsLoading(true);
    fetchShops().then(data => { if (data) setShops(data); setShopsLoading(false); });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        fetchProfile(session.user.id).then(p => setCurrentProfile(p));
      }
      setAuthReady(true);
    });

    // Detect Stripe Checkout redirect. Payment amounts are never trusted from the URL.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_success') === '1') {
      const bookingId = urlParams.get('booking_id');
      const isRemaining = urlParams.get('remaining') === '1';
      const sessionId = urlParams.get('session_id') || null;
      if (bookingId && sessionId) setStripeReturn({ bookingId, isRemaining, sessionId });
      navigate('/dashboard', { replace: true });
    } else if (urlParams.get('stripe_cancel') === '1') {
      setStripeNotice('Payment was cancelled. No charge was made.');
      navigate('/dashboard', { replace: true });
    }

    // Listen for auth changes (login / logout / password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true });
        setRecoveryReady(true);
        return;
      }
      if (session?.user) {
        setCurrentUser(session.user);
        fetchProfile(session.user.id).then(p => {
          setCurrentProfile(p);
          if (event === "SIGNED_IN" && window.location.hash.includes("type=signup")) {
            const role = p?.role || session.user.user_metadata?.role;
            navigate(role === "company" ? "/company" : "/dashboard", { replace: true });
          }
        });
      } else {
        setCurrentUser(null);
        setCurrentProfile(null);
      }
      setAuthReady(true);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  // Scroll to top on route change
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  // ── nav() — kept for backward compatibility with all child components ───
  const nav = useCallback((v, ctx = {}) => {
    // Gate booking behind customer auth
    if (v === "booking") {
      const role = currentProfile?.role || currentUser?.user_metadata?.role;
      if (!currentUser) {
        if (ctx.bookingShop) setBookingShop(ctx.bookingShop);
        setPostLoginNav("booking");
        navigate("/login");
        return;
      }
      if (role === "company") { navigate("/company"); return; }
    }

    // Update shop context state
    if (ctx.selectedShop) setSelectedShop(ctx.selectedShop);
    if (ctx.bookingShop)  setBookingShop(ctx.bookingShop);

    // Reset booking state
    setBookingConfirmed(false);
    setBookingStep(1);
    setSelectedSlot(null);
    setSelectedDate(null);
    setLoginError("");
    setLoginForm({ email: "", password: "" });

    // Build URL path — include shop ID for shop/booking routes
    let path = VIEW_TO_PATH[v] || "/";
    if (v === "shop") {
      const shop = ctx.selectedShop || selectedShop;
      path = shop?.id ? `/shop/${shop.id}` : "/search";
    } else if (v === "booking") {
      const shop = ctx.bookingShop || bookingShop;
      path = shop?.id ? `/book/${shop.id}` : "/search";
    }

    navigate(path);

    // Re-fetch shops for customer-facing pages
    if (v === "search" || v === "landing") {
      setShopsLoading(true);
      fetchShops().then(data => { if (data) setShops(data); setShopsLoading(false); });
    }
  }, [navigate, currentUser, currentProfile, selectedShop, bookingShop]);

  const handleLogin = async (type) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });
      if (error) {
        setLoginError("Invalid email or password. Please try again.");
        return;
      }
      const profile = await fetchProfile(data.user.id);
      if (profile && profile.role && profile.role !== type && profile.role !== "admin") {
        setLoginError(`This account is registered as a ${profile.role}. Please use the correct login page.`);
        await supabase.auth.signOut();
        return;
      }
      setCurrentUser(data.user);
      setCurrentProfile(profile);
      if (profile?.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }
      // Redirect back to the page the user came from (e.g. /dashboard?booking=ID from email link)
      const fromLocation = location.state?.from;
      if (fromLocation?.pathname === "/dashboard" && type === "customer") {
        navigate({ pathname: fromLocation.pathname, search: fromLocation.search }, { replace: true });
        return;
      }
      if (postLoginNav && type === "customer") {
        const dest = postLoginNav;
        setPostLoginNav(null);
        if (dest === "booking" && bookingShop?.id) {
          navigate(`/book/${bookingShop.id}`);
        } else {
          navigate("/dashboard");
        }
        return;
      }
      nav(type === "customer" ? "customer-dash" : "company-dash");
    } catch {
      setLoginError("Something went wrong. Please try again.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav("landing");
  };

  const refreshShops = useCallback(() => fetchShops().then(d => { if (d) setShops(d); }), []);
  const commonProps = { nav, currentUser, currentProfile, onLogout: handleLogout };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <main id="main-content">
        <Routes>
          <Route path="/" element={<LandingPage {...commonProps} shops={shops} setBookingShop={setBookingShop} setSelectedShop={setSelectedShop} setServiceFilter={setServiceFilter} />} />
          <Route path="/search" element={<SearchPage {...commonProps} shops={shops} shopsLoading={shopsLoading} searchQuery={searchQuery} setSearchQuery={setSearchQuery} serviceFilter={serviceFilter} setServiceFilter={setServiceFilter} setSelectedShop={setSelectedShop} setBookingShop={setBookingShop} />} />
          <Route path="/shop/:shopId" element={<ShopProfileLoader {...commonProps} selectedShop={selectedShop} setSelectedShop={setSelectedShop} setBookingShop={setBookingShop} />} />
          <Route path="/book/:shopId" element={<BookingFlowLoader {...commonProps} bookingShop={bookingShop} setBookingShop={setBookingShop} bookingStep={bookingStep} setBookingStep={setBookingStep} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} setSelectedDate={setSelectedDate} bookingConfirmed={bookingConfirmed} setBookingConfirmed={setBookingConfirmed} />} />
          <Route path="/dashboard" element={<RequireAuth role="customer" authReady={authReady} currentUser={currentUser} currentProfile={currentProfile}><CustomerDashboard {...commonProps} stripeReturn={stripeReturn} setStripeReturn={setStripeReturn} stripeNotice={stripeNotice} setStripeNotice={setStripeNotice} /></RequireAuth>} />
          <Route path="/company" element={<RequireAuth role="company" authReady={authReady} currentUser={currentUser} currentProfile={currentProfile}><CompanyDashboard {...commonProps} dashTab={dashTab} setDashTab={setDashTab} refreshShops={refreshShops} /></RequireAuth>} />
          <Route path="/pricing" element={<PricingPage nav={nav} currentUser={currentUser} currentProfile={currentProfile} />} />
          <Route path="/login" element={<CustomerLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} bookingContext={!!postLoginNav} />} />
          <Route path="/business/login" element={<CompanyLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} />} />
          <Route path="/terms" element={<TermsPage nav={nav} />} />
          <Route path="/privacy" element={<PrivacyPage nav={nav} />} />
          <Route path="/accessibility" element={<AccessibilityPage nav={nav} />} />
          <Route path="/reset-password" element={<ResetPasswordPage nav={nav} recoveryReady={recoveryReady} />} />
          <Route path="/admin" element={<RequireAuth authReady={authReady} currentUser={currentUser} currentProfile={currentProfile}><AdminDashboard {...commonProps} /></RequireAuth>} />
          <Route path="*" element={<NotFoundPage nav={nav} />} />
        </Routes>
      </main>
    </>
  );
}
