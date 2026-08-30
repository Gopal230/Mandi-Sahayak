import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function OTPVerification() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  const handleChange = (value, index) => {
    // Allow only numbers
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Automatically move to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Move to previous box when Backspace is pressed
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();

    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedData) return;

    const newOtp = [...otp];

    pastedData.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">

        {/* Wheat Icon */}
        <div className="flex justify-center mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700 text-2xl shadow-sm">
            🌾
          </div>
        </div>

        {/* Brand */}
        <h1 className="text-2xl font-bold text-green-800 text-center">
          FarmQueue
        </h1>

        <p className="text-center text-gray-500 mt-1">
          Farmer Procurement Portal
        </p>

        {/* Step Indicator */}
        <div className="mt-8">

          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Step 2 of 2
            </span>

            <span className="text-xs text-gray-400">
              Verification
            </span>
          </div>

          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="w-full h-full bg-green-700 rounded-full"></div>
          </div>

        </div>

        {/* OTP Heading */}
        <div className="text-center mt-8">

          <h2 className="text-xl font-semibold text-gray-900">
            Verify your mobile number
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            We've sent a 6-digit OTP to
          </p>

          <p className="text-sm font-semibold text-gray-800 mt-1">
            +91 XXXXX XXXXX
          </p>

        </div>

        {/* OTP Inputs */}
        <div
          className="flex justify-center gap-2 mt-7"
          onPaste={handlePaste}
        >
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              value={digit}
              maxLength="1"
              inputMode="numeric"
              autoComplete="one-time-code"
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-11 h-12 text-center text-lg font-semibold
                         border border-gray-200 rounded-lg bg-gray-50
                         outline-none focus:border-green-600
                         focus:ring-2 focus:ring-green-100"
            />
          ))}
        </div>

        {/* Resend OTP */}
        <div className="text-center mt-5">

          <p className="text-sm text-gray-500">
            Didn't receive the OTP?
          </p>

          <button
            type="button"
            className="mt-1 text-sm font-semibold text-green-700 hover:underline"
          >
            Resend OTP
          </button>

        </div>

        {/* Verify Button */}
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="w-full bg-green-700 hover:bg-green-800
                     text-white font-semibold py-3 rounded-lg
                     transition mt-6"
        >
          Verify & Continue →
        </button>

        {/* Change Number */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-full text-sm text-gray-500
                     hover:text-green-700 mt-4"
        >
          ← Change mobile number
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Your mobile number is securely verified
        </p>

      </div>

    </div>
  );
}

export default OTPVerification;