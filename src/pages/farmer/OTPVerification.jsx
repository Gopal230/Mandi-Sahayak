import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function OTPVerification() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  const farmerData = JSON.parse(
    localStorage.getItem("farmerData") || "{}"
  );

  const phone = farmerData?.phone || "";

  const maskedPhone = phone
    ? `+91 ${phone.slice(0, 2)}XXXXXX${phone.slice(-2)}`
    : "+91 XXXXX XXXXX";

  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    setError("");

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
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

    const newOtp = ["", "", "", "", "", ""];

    pastedData.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtp(newOtp);
    setError("");

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = () => {
    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    localStorage.setItem("isLoggedIn", "true");

    navigate("/dashboard");
  };

  const handleResend = () => {
    if (!canResend) return;

    setOtp(["", "", "", "", "", ""]);
    setError("");
    setTimer(30);
    setCanResend(false);

    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 sm:p-8">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700 text-2xl shadow-sm">
            🌾
          </div>
        </div>

        <h1 className="mt-3 text-2xl font-bold text-green-800 text-center">
          FarmQueue
        </h1>

        <p className="text-center text-gray-500 mt-1 text-sm">
          Farmer Procurement Portal
        </p>

        <div className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Step 2 of 2
            </span>

            <span className="text-xs text-gray-400">
              Mobile Verification
            </span>
          </div>

          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="w-full h-full bg-green-700 rounded-full" />
          </div>
        </div>

        <div className="text-center mt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-xl">
            📱
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mt-4">
            Verify your mobile number
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            We've sent a 6-digit OTP to
          </p>

          <p className="text-sm font-semibold text-gray-800 mt-1">
            {maskedPhone}
          </p>
        </div>

        <div
          className="flex justify-center gap-2 sm:gap-3 mt-7"
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
              maxLength={1}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`w-11 h-12 sm:w-12 sm:h-13 text-center text-lg font-semibold border rounded-xl bg-gray-50 outline-none transition ${
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  : "border-gray-200 focus:border-green-600 focus:ring-2 focus:ring-green-100"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-xs text-red-600 mt-3">
            {error}
          </p>
        )}

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Didn't receive the OTP?
          </p>

          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="mt-1 text-sm font-semibold text-green-700 hover:underline"
            >
              Resend OTP
            </button>
          ) : (
            <p className="mt-1 text-sm font-semibold text-gray-400">
              Resend OTP in {timer}s
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleVerify}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3.5 rounded-xl transition mt-6 shadow-sm"
        >
          Verify & Continue →
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-full text-sm text-gray-500 hover:text-green-700 mt-4"
        >
          ← Change mobile number
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <span>🔒</span>
          <span>Your mobile number is securely verified</span>
        </div>
      </div>
    </div>
  );
}

export default OTPVerification;