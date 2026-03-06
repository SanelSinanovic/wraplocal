import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import SearchPage from "./pages/SearchPage";
import ShopProfile from "./pages/ShopProfile";
import BookingFlow from "./pages/BookingFlow";
import CustomerDashboard from "./pages/CustomerDashboard";
import PricingPage from "./pages/PricingPage";
import CompanyDashboard from "./pages/CompanyDashboard";
import CustomerLogin from "./pages/CustomerLogin";
import CompanyLogin from "./pages/CompanyLogin";

const CUSTOMER_CREDS = { email: "marcus@email.com", password: "customer123" };
const COMPANY_CREDS = { email: "info@chromekings.com", password: "company123" };

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

  const nav = (v) => {
    setView(v);
    setBookingConfirmed(false);
    setBookingStep(1);
    setSelectedSlot(null);
    setSelectedDate(null);
    setLoginError("");
    setLoginForm({ email: "", password: "" });
  };

  const handleLogin = (type) => {
    const creds = type === "customer" ? CUSTOMER_CREDS : COMPANY_CREDS;
    if (loginForm.email === creds.email && loginForm.password === creds.password) {
      nav(type === "customer" ? "customer-dash" : "company-dash");
    } else {
      setLoginError("Invalid email or password. Please try again.");
    }
  };

  if (view === "landing") return <LandingPage nav={nav} setBookingShop={setBookingShop} setSelectedShop={setSelectedShop} />;
  if (view === "search") return <SearchPage nav={nav} searchQuery={searchQuery} setSearchQuery={setSearchQuery} setSelectedShop={setSelectedShop} setBookingShop={setBookingShop} />;
  if (view === "shop") return <ShopProfile nav={nav} selectedShop={selectedShop} setBookingShop={setBookingShop} />;
  if (view === "booking") return <BookingFlow nav={nav} bookingShop={bookingShop} bookingStep={bookingStep} setBookingStep={setBookingStep} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} selectedDate={selectedDate} setSelectedDate={setSelectedDate} bookingConfirmed={bookingConfirmed} setBookingConfirmed={setBookingConfirmed} />;
  if (view === "customer-dash") return <CustomerDashboard nav={nav} />;
  if (view === "pricing") return <PricingPage nav={nav} />;
  if (view === "company-dash") return <CompanyDashboard nav={nav} dashTab={dashTab} setDashTab={setDashTab} />;
  if (view === "customer-login") return <CustomerLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} />;
  if (view === "company-login") return <CompanyLogin nav={nav} loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} handleLogin={handleLogin} />;
  return null;
}
