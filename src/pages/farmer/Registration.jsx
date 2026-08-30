import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Registration() {
  const navigate = useNavigate();

  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");

  const districts = [
    "Aligarh",
    "Agra",
    "Hathras",
    "Mathura",
    "Bulandshahr",
  ];

  const villages = {
    Aligarh: ["Jamalpur", "Dodhpur", "Quarsi", "Sasni Gate"],
    Agra: ["Kheragarh", "Fatehabad", "Etmadpur"],
    Hathras: ["Sadabad", "Sikandra Rao", "Mursan"],
    Mathura: ["Govardhan", "Chhata", "Kosi Kalan"],
    Bulandshahr: ["Sikandrabad", "Khurja", "Anupshahr"],
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);

    const farmerData = {
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      district: district,
      village: village,
      aadhaarLast4: formData.get("aadhaarLast4"),
      ifscCode: formData.get("ifscCode"),
    };

    localStorage.setItem("farmerData", JSON.stringify(farmerData));

    navigate("/verify-otp");
  };

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
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Step 1 of 2
            </span>

            <span className="text-xs text-gray-400">
              Registration
            </span>
          </div>

          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-green-700 rounded-full"></div>
          </div>

          <h2 className="text-xl font-semibold mt-6 text-gray-900">
            Create your account
          </h2>

          <p className="text-gray-500 text-sm mt-1 mb-6">
            Enter your details to register as a farmer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>

            <input
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              required
              className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

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
                required
                placeholder="Enter 10-digit mobile number"
                className="flex-1 border border-gray-200 rounded-r-lg p-3 bg-gray-50 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <p className="text-xs text-gray-400 mt-1.5">
              We'll send an OTP to verify this number.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aadhaar last 4 digits
            </label>

            <input
              type="text"
              name="aadhaarLast4"
              maxLength="4"
              inputMode="numeric"
              required
              placeholder="XXXX"
              className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 tracking-widest outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District
            </label>

            <select
              name="district"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setVillage("");
              }}
              required
              className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 text-gray-700 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select district</option>

              {districts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Village
            </label>

            <select
              name="village"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              disabled={!district}
              required
              className={`w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 ${
                district
                  ? "bg-gray-50 text-gray-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <option value="">
                {district ? "Select village" : "Select district first"}
              </option>

              {district &&
                villages[district]?.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank IFSC code
            </label>

            <input
              type="text"
              name="ifscCode"
              required
              placeholder="e.g. SBIN0001234"
              className="w-full border border-gray-200 rounded-lg p-3 bg-gray-50 uppercase outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-1 accent-green-700"
            />

            <p className="text-xs leading-4 text-gray-500">
              I confirm that the information provided is correct and agree to use the procurement service.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition"
          >
            Continue to OTP →
          </button>

        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already registered?{" "}

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-green-700 font-semibold hover:underline"
          >
            Login
          </button>
        </p>

        <p className="text-center text-xs text-gray-400 mt-5">
          Secure farmer procurement management
        </p>

      </div>
    </div>
  );
}

export default Registration;