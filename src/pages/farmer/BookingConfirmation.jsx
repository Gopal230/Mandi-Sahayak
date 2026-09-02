import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function BookingConfirmation() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const savedBooking = localStorage.getItem("bookingData");

    if (!savedBooking) {
      navigate("/dashboard", { replace: true });
      return;
    }

    try {
      const parsedBooking = JSON.parse(savedBooking);
      setBooking(parsedBooking);
    } catch (error) {
      console.error("Unable to read booking data:", error);
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!booking) return;

    const timer = setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [booking, navigate]);

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="bg-green-700 text-white">
        <div className="mx-auto flex w-full max-w-lg items-center justify-end px-4 py-4">

          <div className="flex items-center rounded-full bg-white/15 p-1">

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
      </header>

      {/* Main */}
      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-lg items-center justify-center px-4 py-10">

        <div className="w-full rounded-3xl bg-white px-6 py-10 text-center shadow-sm">

          {/* Success icon */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100">

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-3xl font-bold text-white shadow-sm">
              ✓
            </div>

          </div>

          {/* Success message */}
          <h1 className="mt-7 text-2xl font-bold text-slate-900">
            {t("bookingConfirmedTitle")}
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
            {t("bookingConfirmedMessage")}
          </p>

          {/* Booking ID */}
          <div className="mt-7 rounded-2xl border border-green-100 bg-green-50 p-4">

            <p className="text-xs font-medium uppercase tracking-wide text-green-700">
              {t("bookingIdLabel")}
            </p>

            <p className="mt-1 text-xl font-bold tracking-wide text-slate-900">
              {booking.bookingId}
            </p>

          </div>

          {/* Booking summary */}
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-sm text-slate-500">
                {t("crop")}
              </span>

              <span className="text-sm font-semibold text-slate-900">
                {booking.crop}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 py-3">
              <span className="text-sm text-slate-500">
                {t("date")}
              </span>

              <span className="text-sm font-semibold text-slate-900">
                {booking.date}
              </span>
            </div>

            <div className="flex items-center justify-between pt-3">
              <span className="text-sm text-slate-500">
                {t("timeSlot")}
              </span>

              <span className="text-right text-sm font-semibold text-slate-900">
                {booking.timeSlot}
              </span>
            </div>

          </div>

          {/* Redirect message */}
          <div className="mt-7">

            <div className="mx-auto h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-full animate-pulse rounded-full bg-green-600" />
            </div>

            <p className="mt-3 text-xs text-slate-400">
              {t("redirectingToDashboard")}
            </p>

          </div>

          {/* Manual button */}
          <button
            type="button"
            onClick={() => navigate("/dashboard", { replace: true })}
            className="mt-6 min-h-12 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            {t("goToDashboard")}
          </button>

        </div>

      </main>

    </div>
  );
}

export default BookingConfirmation;