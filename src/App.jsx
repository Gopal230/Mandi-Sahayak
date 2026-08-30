import { BrowserRouter, Routes, Route } from "react-router-dom";

import Registration from "./pages/farmer/Registration";
import OTPVerification from "./pages/farmer/OTPVerification";
import Login from "./pages/farmer/Login";
import Dashboard from "./pages/farmer/Dashboard";
import BookSlot from "./pages/farmer/BookSlot";
import MyBooking from "./pages/farmer/MyBooking";
import QueueStatus from "./pages/farmer/QueueStatus";
import Procurement from "./pages/farmer/Procurement";
import Payment from "./pages/farmer/Payment";
import Notifications from "./pages/farmer/Notifications";
import Profile from "./pages/farmer/Profile";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Registration />} />
        <Route path="/verify-otp" element={<OTPVerification />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/book-slot" element={<BookSlot />} />
        <Route path="/my-booking" element={<MyBooking />} />
        <Route path="/queue" element={<QueueStatus />} />
        <Route path="/procurement" element={<Procurement />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;