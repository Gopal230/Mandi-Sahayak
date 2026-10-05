import { lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AuthProvider from "./auth/AuthProvider";
import { OFFICER } from "./auth/roles";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";

const Registration = lazy(() => import("./pages/farmer/Registration"));
const OTPVerification = lazy(() => import("./pages/farmer/OTPVerification"));
const Login = lazy(() => import("./pages/farmer/Login"));
const Dashboard = lazy(() => import("./pages/farmer/Dashboard"));
const BookSlot = lazy(() => import("./pages/farmer/BookSlot"));
const BookingConfirmation = lazy(() => import("./pages/farmer/BookingConfirmation"));
const MyBooking = lazy(() => import("./pages/farmer/MyBooking"));
const QueueStatus = lazy(() => import("./pages/farmer/QueueStatus"));
const Procurement = lazy(() => import("./pages/farmer/Procurement"));
const Payment = lazy(() => import("./pages/farmer/Payment"));
const Notifications = lazy(() => import("./pages/farmer/Notifications"));
const Profile = lazy(() => import("./pages/farmer/Profile"));

const OfficerLogin = lazy(() => import("./pages/officer/OfficerLogin"));
const OfficerRegistration = lazy(() => import("./pages/officer/OfficerRegistration"));
const OfficerPortal = lazy(() => import("./pages/officer/OfficerPortal"));

const LanguageSelect = lazy(() => import("./pages/LanguageSelect"));
const PortalSelect = lazy(() => import("./pages/PortalSelect"));
const NotFound = lazy(() => import("./pages/NotFound"));

/**
 * Route table for both portals.
 *
 * Guards separate public from private, and farmer from officer. Neither is a
 * security control — the server enforces every endpoint, and an officer
 * calling a farmer route gets a 403 regardless (architecture §18.7). They
 * exist so nobody lands on a screen that can only render errors.
 *
 * `/verify-otp` is deliberately shared: one OTP screen completes farmer
 * registration, farmer login and staff two-factor alike, then routes by the
 * role `GET /me` reports.
 */
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/*
              Entry flow, in order: choose a language, choose a portal, then the
              sign-in screen for that portal. Registration moved off "/" to
              "/register" so the language choice is genuinely first — a farmer
              who cannot read the interface cannot fill in a form in it.
            */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/" element={<LanguageSelect />} />
              <Route path="/portal" element={<PortalSelect />} />
              <Route path="/register" element={<Registration />} />
              <Route path="/login" element={<Login />} />
              <Route path="/staff-login" element={<OfficerLogin />} />
              <Route path="/staff-register" element={<OfficerRegistration />} />
              <Route path="/verify-otp" element={<OTPVerification />} />
            </Route>

            {/* Farmer portal */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/book-slot" element={<BookSlot />} />
              <Route path="/booking-confirmation" element={<BookingConfirmation />} />
              <Route path="/my-booking" element={<MyBooking />} />
              <Route path="/queue" element={<QueueStatus />} />
              <Route path="/procurement" element={<Procurement />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Officer portal */}
            <Route element={<ProtectedRoute role={OFFICER} />}>
              <Route path="/officer/*" element={<OfficerPortal />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
