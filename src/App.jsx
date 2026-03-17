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

export default function App() {
  const [view, setView] = useState("landing");
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

  // ── Supabase: shops + auth state ──────────────────────────
  const [shops, setShops] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
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
      window.history.replaceState({}, '', window.location.pathname);
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

    return () => subscription.unsubscribe();
  }, []);

  const nav = (v) => {
    // Gate booking behind customer auth
    if (v === "booking") {
      const role = currentProfile?.role || currentUser?.user_metadata?.role;
      if (!currentUser) {
        setPostLoginNav("booking");
        setView("customer-login");
        return;
      }
      if (role === "company") {
        setView("company-dash");
        return;
      }
    }
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
  if (view === "shop") return <ShopProfile nav={nav} selectedShop={selectedShop} setBookingShop={setBookingShop} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} />;
  if (view === "booking") return <BookingFlow nav={nav} bookingShop={bookingShop} bookingStep={bookingStep} setBookingStep={setBookingStep} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} setSelectedDate={setSelectedDate} bookingConfirmed={bookingConfirmed} setBookingConfirmed={setBookingConfirmed} currentUser={currentUser} />;
  if (view === "customer-dash") return <CustomerDashboard nav={nav} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} stripeReturn={stripeReturn} setStripeReturn={setStripeReturn} />;
  if (view === "pricing") return <PricingPage nav={nav} />;
  if (view === "company-dash") return <CompanyDashboard nav={nav} dashTab={dashTab} setDashTab={setDashTab} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} />;
  if (view === "customer-login") return <CustomerLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} bookingContext={!!postLoginNav} />;
  if (view === "company-login") return <CompanyLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} />;
  return null;
}
