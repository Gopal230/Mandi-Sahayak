import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Registration() {
  const navigate = useNavigate();

  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [errors, setErrors] = useState({});

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

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    e.target.value = value;

    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handleAccountNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 18);
    e.target.value = value;

    if (errors.accountNumber) {
      setErrors((prev) => ({ ...prev, accountNumber: "" }));
    }
  };

  const handleIfscChange = (e) => {
    const value = e.target.value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 11);

    e.target.value = value;

    if (errors.ifscCode) {
      setErrors((prev) => ({ ...prev, ifscCode: "" }));
    }
  };

  const validateForm = (formData) => {
    const newErrors = {};

    const fullName = String(
      formData.get("fullName") || ""
    ).trim();

    const phone = String(
      formData.get("phone") || ""
    ).trim();

    const accountNumber = String(
      formData.get("accountNumber") || ""
    ).trim();

    const ifscCode = String(
      formData.get("ifscCode") || ""
    ).trim().toUpperCase();

    if (fullName.length < 2) {
      newErrors.fullName = "Please enter a valid full name.";
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      newErrors.phone =
        "Enter a valid 10-digit mobile number.";
    }

    if (!/^\d{9,18}$/.test(accountNumber)) {
      newErrors.accountNumber =
        "Account number must contain 9–18 digits.";
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      newErrors.ifscCode =
        "Enter a valid 11-character IFSC code.";
    }

    if (!district) {
      newErrors.district = "Please select your district.";
    }

    if (!village) {
      newErrors.village = "Please select your village.";
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const newErrors = validateForm(formData);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const phone = String(
      formData.get("phone") || ""
    ).trim();

    const farmerData = {
      farmerId: `farmer-${phone}`,
      fullName: String(
        formData.get("fullName") || ""
      ).trim(),
      phone,
      district,
      village,
      accountNumber: String(
        formData.get("accountNumber") || ""
      ).trim(),
      ifscCode: String(
        formData.get("ifscCode") || ""
      ).trim().toUpperCase(),
    };

    localStorage.setItem(
      "farmerData",
      JSON.stringify(farmerData)
    );

    localStorage.setItem(
      "pendingPhone",
      phone
    );

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
              autoComplete="name"
              className={`w-full border rounded-lg p-3 bg-gray-50 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 ${
                errors.fullName
                  ? "border-red-400"
                  : "border-gray-200"
              }`}
            />

            {errors.fullName && (
              <p className="text-xs text-red-500 mt-1">
                {errors.fullName}
              </p>
            )}
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
                inputMode="numeric"
                autoComplete="tel"
                placeholder="Enter 10-digit mobile number"
                onChange={handlePhoneChange}
                className={`flex-1 border rounded-r-lg p-3 bg-gray-50 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 ${
                  errors.phone
                    ? "border-red-400"
                    : "border-gray-200"
                }`}
              />
            </div>

            {errors.phone ? (
              <p className="text-xs text-red-500 mt-1.5">
                {errors.phone}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5">
                We'll send an OTP to verify this number.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank account number
            </label>

            <input
              type="text"
              name="accountNumber"
              required
              inputMode="numeric"
              autoComplete="off"
              minLength="9"
              maxLength="18"
              placeholder="Enter bank account number"
              onChange={handleAccountNumberChange}
              className={`w-full border rounded-lg p-3 bg-gray-50 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 ${
                errors.accountNumber
                  ? "border-red-400"
                  : "border-gray-200"
              }`}
            />

            {errors.accountNumber ? (
              <p className="text-xs text-red-500 mt-1">
                {errors.accountNumber}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                Enter your bank account number using digits only.
              </p>
            )}
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
                setErrors((prev) => ({
                  ...prev,
                  district: "",
                  village: "",
                }));
              }}
              required
              className={`w-full border rounded-lg p-3 bg-gray-50 text-gray-700 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 ${
                errors.district
                  ? "border-red-400"
                  : "border-gray-200"
              }`}
            >
              <option value="">
                Select district
              </option>

              {districts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            {errors.district && (
              <p className="text-xs text-red-500 mt-1">
                {errors.district}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Village
            </label>

            <select
              name="village"
              value={village}
              onChange={(e) => {
                setVillage(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  village: "",
                }));
              }}
              disabled={!district}
              required
              className={`w-full border rounded-lg p-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 ${
                errors.village
                  ? "border-red-400"
                  : district
                  ? "bg-gray-50 text-gray-700 border-gray-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
              }`}
            >
              <option value="">
                {district
                  ? "Select village"
                  : "Select district first"}
              </option>

              {district &&
                villages[district]?.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>

            {errors.village && (
              <p className="text-xs text-red-500 mt-1">
                {errors.village}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank IFSC code
            </label>

            <input
              type="text"
              name="ifscCode"
              required
              minLength="11"
              maxLength="11"
              autoComplete="off"
              placeholder="e.g. SBIN0001234"
              onChange={handleIfscChange}
              className={`w-full border rounded-lg p-3 bg-gray-50 uppercase outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 ${
                errors.ifscCode
                  ? "border-red-400"
                  : "border-gray-200"
              }`}
            />

            {errors.ifscCode ? (
              <p className="text-xs text-red-500 mt-1">
                {errors.ifscCode}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">
                Enter your bank's 11-character IFSC code.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-1 accent-green-700"
            />

            <p className="text-xs leading-4 text-gray-500">
              I confirm that the information provided is correct
              and agree to use the procurement service.
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