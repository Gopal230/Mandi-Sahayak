import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">

        <div className="flex justify-center mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-700 text-2xl shadow-sm">
            🌾
          </div>
        </div>

        <h1 className="text-2xl font-bold text-green-800 text-center">
          FarmQueue
        </h1>

        <p className="text-center text-gray-500 mt-1">
          Farmer Procurement Portal
        </p>

        <div className="mt-8">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
            Farmer Login
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-3">
            Welcome back
          </h2>

          <p className="text-sm text-gray-500 mt-1 mb-6">
            Enter your registered mobile number to continue.
          </p>

          <form className="space-y-5">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile number
              </label>

              <div className="flex">
                <span className="bg-gray-100 border border-gray-200 border-r-0 p-3 rounded-l-lg text-gray-600">
                  +91
                </span>

                <input
                  type="tel"
                  name="phone"
                  maxLength="10"
                  inputMode="numeric"
                  placeholder="Enter 10-digit mobile number"
                  className="flex-1 border border-gray-200 rounded-r-lg p-3 bg-gray-50 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <p className="text-xs text-gray-400 mt-1.5">
                We'll send an OTP to verify your number.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/verify-otp")}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition"
            >
              Continue to OTP →
            </button>

          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Don't have an account?
            </p>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm text-green-700 font-semibold hover:underline mt-1"
            >
              Register as a farmer
            </button>
          </div>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Secure farmer procurement management
        </p>

      </div>
    </div>
  );
}

export default Login;