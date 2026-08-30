import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Procurement() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const savedBooking = localStorage.getItem("bookingData");

    if (savedBooking) {
      try {
        setBooking(JSON.parse(savedBooking));
      } catch {
        setBooking(null);
      }
    }
  }, []);

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(
      i18n.language === "hi" ? "hi-IN" : "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  if (!booking) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
        <header className="bg-green-700 text-white">
          <div className="mx-auto w-full max-w-lg px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl hover:bg-white/10"
              >
                ←
              </button>

              <div className="flex shrink-0 rounded-full bg-white/15 p-1">
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
              <p className="text-xs font-medium uppercase tracking-wider text-green-100">
                {t("procurement")}
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                {t("trackProgress")}
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-lg px-4 py-6">
          <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
              🌾
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {t("noActiveBooking")}
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-500">
              {t("noActiveBookingDescription")}
            </p>

            <button
              type="button"
              onClick={() => navigate("/book-slot")}
              className="mt-6 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
            >
              {t("bookSlot")}
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      <header className="bg-green-700 text-white">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl hover:bg-white/10"
            >
              ←
            </button>

            <div className="flex shrink-0 rounded-full bg-white/15 p-1">
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
            <p className="text-xs font-medium uppercase tracking-wider text-green-100">
              {t("procurement")}
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              {t("trackProgress")}
            </h1>

            <p className="mt-1 max-w-md text-sm leading-5 text-green-100">
              {t("bookingConfirmed")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t("currentBooking")}
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {booking.crop || "—"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {booking.quantity
                    ? `${booking.quantity} ${t("kg")}`
                    : "—"}
                </p>
              </div>

              <div className="shrink-0 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                {t("confirmed")}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-700 text-sm font-semibold text-white">
                  ✓
                </div>

                <div className="h-0.5 flex-1 bg-green-200" />

                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-semibold text-slate-400">
                  2
                </div>

                <div className="h-0.5 flex-1 bg-slate-200" />

                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-semibold text-slate-400">
                  3
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 text-[11px] leading-4">
                <span className="font-medium text-green-700">
                  {t("slotBooked")}
                </span>

                <span className="px-1 text-center text-slate-400">
                  {t("procurement")}
                </span>

                <span className="text-right text-slate-400">
                  {t("completed")}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">
                {t("bookingDetails")}
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <span className="text-sm text-slate-500">
                  {t("procurementCentre")}
                </span>

                <span className="max-w-[55%] text-right text-sm font-medium text-slate-900">
                  {booking.centre || "—"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <span className="text-sm text-slate-500">
                  {t("crop")}
                </span>

                <span className="text-right text-sm font-medium text-slate-900">
                  {booking.crop || "—"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <span className="text-sm text-slate-500">
                  {t("quantity")}
                </span>

                <span className="text-right text-sm font-medium text-slate-900">
                  {booking.quantity
                    ? `${booking.quantity} ${t("kg")}`
                    : "—"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <span className="text-sm text-slate-500">
                  {t("date")}
                </span>

                <span className="text-right text-sm font-medium text-slate-900">
                  {formatDate(booking.date)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <span className="text-sm text-slate-500">
                  {t("timeSlot")}
                </span>

                <span className="max-w-[55%] text-right text-sm font-medium text-slate-900">
                  {booking.timeSlot || "—"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                ℹ
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  {t("waitingInQueue")}
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {t("waitingForTurn")}
                </p>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={() => navigate("/queue")}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            {t("viewQueueStatus")} →
          </button>
        </div>
      </main>
    </div>
  );
}

export default Procurement;