import { useState, useEffect } from "react";
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
import { fetchShops, fetchProfile } from "./lib/queries";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";

// Read initial view from URL hash (e.g. #search) so hard-refresh stays on the right page
function getInitialView() {
  const hash = window.location.hash.replace("#", "");
  const valid = ["landing","search","shop","booking","customer-dash","company-dash","pricing","customer-login","company-login","terms","privacy"];
  return valid.includes(hash) ? hash : "landing";
}

const PAGE_META = {
  landing:        { title: "Kidor — Find & Book Vehicle Wrap, Tint & Detailing Shops",     description: "Kidor connects you with the best vehicle wrap, window tint, and detailing shops near you. Compare portfolios, get quotes, and book online." },
  search:         { title: "Find Shops Near You — Kidor",                                     description: "Browse vehicle wrap, window tint, PPF, and detailing shops on Kidor. Filter by service and location." },
  shop:           { title: "Shop Profile — Kidor",                                            description: "View services, portfolio and book an appointment through Kidor." },
  booking:        { title: "Book a Service — Kidor",                                          description: "Request a quote and book your vehicle service through Kidor." },
  "customer-dash":{ title: "My Bookings — Kidor",                                            description: "Manage your vehicle service bookings on Kidor." },
  "company-dash": { title: "Shop Dashboard — Kidor",                                         description: "Manage your shop, bookings, and payouts on Kidor." },
  pricing:        { title: "Pricing — Kidor",                                                 description: "Simple, transparent pricing for vehicle wrap and tint shops listing on Kidor." },
  "customer-login":{ title: "Sign In — Kidor",                                               description: "Sign in to your Kidor customer account to manage bookings." },
  "company-login": { title: "Shop Login — Kidor",                                            description: "Sign in to your Kidor shop dashboard." },  terms:           { title: "Terms of Service \u2014 Kidor",                                      description: "Read Kidor's Terms of Service, including our payment, refund, and liability policies." },
  privacy:         { title: "Privacy Policy \u2014 Kidor",                                        description: "Read Kidor's Privacy Policy to understand how we collect, use, and protect your data." },};

export default function App() {
  const [view, setView] = useState(getInitialView);
  const [selectedShop, setSelectedShop] = useState(null);
  const [bookingShop, setBookingShop] = useState(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [dashTab, setDashTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState(null);
  const [stripeReturn, setStripeReturn] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [postLoginNav, setPostLoginNav] = useState(null);

  // ── Dynamic page title + meta description ───────────────────────────────
  useEffect(() => {
    let title = PAGE_META[view]?.title || "Kidor";
    let description = PAGE_META[view]?.description || PAGE_META.landing.description;

    if (view === "shop" && selectedShop?.name) {
      title = `${selectedShop.name} \u2014 Kidor`;
      description = `${selectedShop.name} on Kidor \u2014 view services, portfolio and book an appointment online.`;
    } else if (view === "booking" && bookingShop?.name) {
      title = `Book ${bookingShop.name} \u2014 Kidor`;
      description = `Request a quote and book your vehicle service at ${bookingShop.name} through Kidor.`;
    }

    document.title = title;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute("content", description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);
  }, [view, selectedShop, bookingShop]);

  // ── Supabase: shops + auth state ──────────────────────────
  const [shops, setShops] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    // Seed initial history entry so the initial view has a state
    if (!window.history.state?.view) {
      window.history.replaceState({ view }, "", "#" + view);
    }

    // Load shops on mount
    fetchShops().then(data => { if (data) setShops(data); });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
        fetchProfile(session.user.id).then(p => setCurrentProfile(p));
      }
    });

    // Detect Stripe Checkout redirect (?stripe_success=1&booking_id=xxx&amount=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_success') === '1') {
      const bookingId = urlParams.get('booking_id');
      const amount = parseFloat(urlParams.get('amount'));
      if (bookingId && !isNaN(amount)) setStripeReturn({ bookingId, amount });
      window.history.replaceState({ view: 'customer-dash' }, '', '#customer-dash');
      setView('customer-dash');
    }

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        fetchProfile(session.user.id).then(p => setCurrentProfile(p));
      } else {
        setCurrentUser(null);
        setCurrentProfile(null);
      }
    });

    // Sync browser back/forward buttons with app view
    const handlePopState = (e) => {
      const v = e.state?.view || window.location.hash.replace("#", "") || "landing";
      setView(v);
      if (v === "search" || v === "landing") {
        fetchShops().then(data => { if (data) setShops(data); });
      }
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const nav = (v) => {
    // Gate booking behind customer auth
    if (v === "booking") {
      const role = currentProfile?.role || currentUser?.user_metadata?.role;
      if (!currentUser) {
        setPostLoginNav("booking");
        window.history.pushState({ view: "customer-login" }, "", "#customer-login");
        setView("customer-login");
        return;
      }
      if (role === "company") {
        window.history.pushState({ view: "company-dash" }, "", "#company-dash");
        setView("company-dash");
        return;
      }
    }
    window.history.pushState({ view: v }, "", "#" + v);
    setView(v);
    setBookingConfirmed(false);
    setBookingStep(1);
    setSelectedSlot(null);
    setSelectedDate(null);
    setLoginError("");
    setLoginForm({ email: "", password: "" });
    // Re-fetch shops whenever the customer-facing pages are visited
    // so newly registered companies appear immediately
    if (v === "search" || v === "landing") {
      fetchShops().then(data => { if (data) setShops(data); });
    }
  };

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
      // If the profile has a role, verify it matches the login page they used
      if (profile && profile.role && profile.role !== type) {
        setLoginError(`This account is registered as a ${profile.role}. Please use the correct login page.`);
        await supabase.auth.signOut();
        return;
      }
      setCurrentUser(data.user);
      setCurrentProfile(profile);
      if (postLoginNav && type === "customer") {
        const dest = postLoginNav;
        setPostLoginNav(null);
        setView(dest);
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

  if (view === "landing") return <LandingPage nav={nav} shops={shops} setBookingShop={setBookingShop} setSelectedShop={setSelectedShop} setServiceFilter={setServiceFilter} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} />;
  if (view === "search") return <SearchPage nav={nav} shops={shops} searchQuery={searchQuery} setSearchQuery={setSearchQuery} serviceFilter={serviceFilter} setServiceFilter={setServiceFilter} setSelectedShop={setSelectedShop} setBookingShop={setBookingShop} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} />;
  if (view === "shop") return selectedShop ? <ShopProfile nav={nav} selectedShop={selectedShop} setBookingShop={setBookingShop} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} /> : <SearchPage nav={nav} shops={shops} searchQuery={searchQuery} setSearchQuery={setSearchQuery} serviceFilter={serviceFilter} setServiceFilter={setServiceFilter} setSelectedShop={setSelectedShop} setBookingShop={setBookingShop} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} />;
  if (view === "booking") return bookingShop ? <BookingFlow nav={nav} bookingShop={bookingShop} bookingStep={bookingStep} setBookingStep={setBookingStep} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} setSelectedDate={setSelectedDate} bookingConfirmed={bookingConfirmed} setBookingConfirmed={setBookingConfirmed} currentUser={currentUser} /> : <SearchPage nav={nav} shops={shops} searchQuery={searchQuery} setSearchQuery={setSearchQuery} serviceFilter={serviceFilter} setServiceFilter={setServiceFilter} setSelectedShop={setSelectedShop} setBookingShop={setBookingShop} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} />;
  if (view === "customer-dash") return <CustomerDashboard nav={nav} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} stripeReturn={stripeReturn} setStripeReturn={setStripeReturn} />;
  if (view === "pricing") return <PricingPage nav={nav} />;
  if (view === "company-dash") return <CompanyDashboard nav={nav} dashTab={dashTab} setDashTab={setDashTab} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} />;
  if (view === "customer-login") return <CustomerLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} bookingContext={!!postLoginNav} />;
  if (view === "company-login") return <CompanyLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} />;
  if (view === "terms") return <TermsPage nav={nav} />;
  if (view === "privacy") return <PrivacyPage nav={nav} />;
  return null;
}
