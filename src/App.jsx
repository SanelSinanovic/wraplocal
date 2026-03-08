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
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

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
    setView(v);
    setBookingConfirmed(false);
    setBookingStep(1);
    setSelectedSlot(null);
    setSelectedDate(null);
    setLoginError("");
    setLoginForm({ email: "", password: "" });
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
      nav(type === "customer" ? "customer-dash" : "company-dash");
    } catch {
      setLoginError("Something went wrong. Please try again.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav("landing");
  };

  if (view === "landing") return <LandingPage nav={nav} shops={shops} setBookingShop={setBookingShop} setSelectedShop={setSelectedShop} />;
  if (view === "search") return <SearchPage nav={nav} shops={shops} searchQuery={searchQuery} setSearchQuery={setSearchQuery} setSelectedShop={setSelectedShop} setBookingShop={setBookingShop} />;
  if (view === "shop") return <ShopProfile nav={nav} selectedShop={selectedShop} setBookingShop={setBookingShop} />;
  if (view === "booking") return <BookingFlow nav={nav} bookingShop={bookingShop} bookingStep={bookingStep} setBookingStep={setBookingStep} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} setSelectedDate={setSelectedDate} bookingConfirmed={bookingConfirmed} setBookingConfirmed={setBookingConfirmed} currentUser={currentUser} />;
  if (view === "customer-dash") return <CustomerDashboard nav={nav} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} />;
  if (view === "pricing") return <PricingPage nav={nav} />;
  if (view === "company-dash") return <CompanyDashboard nav={nav} dashTab={dashTab} setDashTab={setDashTab} currentUser={currentUser} currentProfile={currentProfile} onLogout={handleLogout} />;
  if (view === "customer-login") return <CustomerLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} />;
  if (view === "company-login") return <CompanyLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} />;
  return null;
}
