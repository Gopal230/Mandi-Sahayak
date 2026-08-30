import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const savedFarmer = localStorage.getItem("farmerData");
    const savedBooking = localStorage.getItem("bookingData");

    if (savedFarmer) {
      setFarmer(JSON.parse(savedFarmer));
    }

    if (savedBooking) {
      setBooking(JSON.parse(savedBooking));
    }
  }, []);

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const farmerName = farmer?.fullName || farmer?.name || t("farmer");

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      <header className="bg-green-700 text-white">

        <div className="mx-auto w-full max-w-lg px-4 py-4">

          <div className="flex items-center justify-between gap-3">

            <div className="flex min-w-0 items-center gap-3">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">
                🌾
              </div>

              <div className="min-w-0">

                <p className="text-xs text-green-100">
                  {t("appName")}
                </p>

                <h1 className="truncate text-lg font-bold">
                  {t("namasteFarmer")}
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

          <div className="mt-5">

            <p className="text-sm text-green-100">
              {t("welcome")}
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              {farmerName}
            </h2>

            {farmer?.district && farmer?.village && (
              <p className="mt-1 text-sm text-green-100">
                📍 {farmer.village}, {farmer.district}
              </p>
            )}

          </div>

        </div>

      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">

        <section className="mb-5">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {t("services")}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {t("chooseWhatYouNeed")}
              </p>
            </div>

          </div>

        </section>

        <section className="grid grid-cols-2 gap-3">

          <button
            type="button"
            onClick={() => navigate("/book-slot")}
            className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.98]"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-xl">
              📅
            </div>

            <h3 className="mt-3 font-semibold text-slate-900">
              {t("bookSlot")}
            </h3>

            <p className="mt-1 text-xs leading-4 text-slate-500">
              {t("bookProcurementSlot")}
            </p>

          </button>

          <button
            type="button"
            onClick={() => navigate("/my-booking")}
            className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.98]"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
              🎟️
            </div>

            <h3 className="mt-3 font-semibold text-slate-900">
              {t("myBooking")}
            </h3>

            <p className="mt-1 text-xs leading-4 text-slate-500">
              {booking
                ? t("slotDetails")
                : t("noActiveBookingShort")}
            </p>

          </button>

          <button
            type="button"
            onClick={() => navigate("/queue")}
            className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.98]"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl">
              🕐
            </div>

            <h3 className="mt-3 font-semibold text-slate-900">
              {t("queueStatus")}
            </h3>

            <p className="mt-1 text-xs leading-4 text-slate-500">
              {t("viewYourPosition")}
            </p>

          </button>

          <button
            type="button"
            onClick={() => navigate("/procurement")}
            className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.98]"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-xl">
              🌾
            </div>

            <h3 className="mt-3 font-semibold text-slate-900">
              {t("procurement")}
            </h3>

            <p className="mt-1 text-xs leading-4 text-slate-500">
              {t("trackProgress")}
            </p>

          </button>

          <button
            type="button"
            onClick={() => navigate("/payment")}
            className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.98]"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
              💳
            </div>

            <h3 className="mt-3 font-semibold text-slate-900">
              {t("payment")}
            </h3>

            <p className="mt-1 text-xs leading-4 text-slate-500">
              {t("paymentStatus")}
            </p>

          </button>

          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.98]"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-xl">
              🔔
            </div>

            <h3 className="mt-3 font-semibold text-slate-900">
              {t("notifications")}
            </h3>

            <p className="mt-1 text-xs leading-4 text-slate-500">
              {t("stayUpdated")}
            </p>

          </button>

        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
              ℹ️
            </div>

            <div className="min-w-0">

              <h3 className="font-semibold text-slate-900">
                {t("howItWorks")}
              </h3>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                {t("bookTrackStayUpdated")}
              </p>

            </div>

          </div>

        </section>

        {booking && (
          <section className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4">

            <div className="flex items-center justify-between gap-3">

              <div className="min-w-0">

                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  {t("currentBooking")}
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                  {booking.crop} • {booking.quantity} {t("kg")}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {booking.date} • {booking.timeSlot}
                </p>

              </div>

              <button
                type="button"
                onClick={() => navigate("/my-booking")}
                className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-green-700 shadow-sm"
              >
                {t("view")}
              </button>

            </div>

          </section>
        )}

      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex flex-col items-center px-4 py-1 text-xs font-semibold text-green-700"
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
            className="flex flex-col items-center px-4 py-1 text-xs text-slate-500"
          >
            <span className="text-xl">👤</span>
            <span className="mt-1">{t("profile")}</span>
          </button>

        </div>

      </nav>

    </div>
  );
}

export default Dashboard;