import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const loadFarmer = () => {
      const savedFarmer = localStorage.getItem("farmerData");

      if (savedFarmer) {
        try {
          setFarmer(JSON.parse(savedFarmer));
        } catch {
          setFarmer(null);
        }
      } else {
        setFarmer(null);
      }
    };

    loadFarmer();

    window.addEventListener("focus", loadFarmer);

    return () => {
      window.removeEventListener("focus", loadFarmer);
    };
  }, []);

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const handleLogout = () => {
    localStorage.removeItem("farmerData");
    localStorage.removeItem("bookingData");
    localStorage.removeItem("notificationData");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("pendingPhone");

    setShowLogoutConfirm(false);
    setFarmer(null);

    navigate("/login");
  };

  const farmerName =
    farmer?.fullName ||
    farmer?.name ||
    t("farmer");

  const mobileNumber =
    farmer?.phone ||
    farmer?.mobile ||
    farmer?.mobileNumber ||
    null;

  const district = farmer?.district || null;
  const village = farmer?.village || null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-green-700 text-white">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl hover:bg-white/10"
              >
                ←
              </button>

              <div className="min-w-0">
                <p className="text-xs text-green-100">
                  {t("appName")}
                </p>

                <h1 className="truncate text-xl font-bold">
                  {t("profile")}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center rounded-full bg-white/15 p-1">
              <button
                type="button"
                onClick={() => changeLanguage("en")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  i18n.language === "en"
                    ? "bg-white text-green-700"
                    : "text-white"
                }`}
              >
                {t("english")}
              </button>

              <button
                type="button"
                onClick={() => changeLanguage("hi")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  i18n.language === "hi"
                    ? "bg-white text-green-700"
                    : "text-white"
                }`}
              >
                {t("hindi")}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
              {farmerName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-slate-900">
                {farmerName}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {t("farmer")}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <h2 className="mb-3 text-base font-bold text-slate-900">
            {t("yourInformation")}
          </h2>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {mobileNumber && (
              <div className="flex items-center gap-4 border-b border-slate-100 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
                  📱
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    {t("mobileNumber")}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {mobileNumber}
                  </p>
                </div>
              </div>
            )}

            {district && (
              <div className="flex items-center gap-4 border-b border-slate-100 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                  📍
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    {t("district")}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {district}
                  </p>
                </div>
              </div>
            )}

            {village && (
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-lg">
                  🏡
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    {t("village")}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {village}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-3 text-base font-bold text-slate-900">
            {t("settings")}
          </h2>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="flex w-full items-center gap-4 border-b border-slate-100 p-4 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-lg">
                🔔
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {t("notifications")}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {t("stayUpdated")}
                </p>
              </div>

              <span className="text-lg text-slate-400">
                ›
              </span>
            </button>

            <div className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-lg">
                🌐
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {t("language")}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {i18n.language === "hi"
                    ? t("hindi")
                    : t("english")}
                </p>
              </div>

              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => changeLanguage("en")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    i18n.language === "en"
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  EN
                </button>

                <button
                  type="button"
                  onClick={() => changeLanguage("hi")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    i18n.language === "hi"
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  हि
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:bg-red-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-lg">
              🚪
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-600">
                {t("logout")}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {t("logoutDescription")}
              </p>
            </div>

            <span className="text-lg text-slate-400">
              ›
            </span>
          </button>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex flex-col items-center px-4 py-1 text-xs text-slate-500"
          >
            <span className="text-xl">🏠</span>
            <span className="mt-1">{t("home")}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/book-slot")}
            className="flex flex-col items-center px-4 py-1 text-xs text-slate-500"
          >
            <span className="text-xl">📅</span>
            <span className="mt-1">{t("book")}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/queue")}
            className="flex flex-col items-center px-4 py-1 text-xs text-slate-500"
          >
            <span className="text-xl">🕐</span>
            <span className="mt-1">{t("queue")}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex flex-col items-center px-4 py-1 text-xs font-semibold text-green-700"
          >
            <span className="text-xl">👤</span>
            <span className="mt-1">{t("profile")}</span>
          </button>
        </div>
      </nav>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl">
              🚪
            </div>

            <h2 className="mt-4 text-center text-lg font-bold text-slate-900">
              {t("logoutConfirmTitle")}
            </h2>

            <p className="mt-2 text-center text-sm leading-5 text-slate-500">
              {t("logoutConfirmDescription")}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
              >
                {t("logout")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;