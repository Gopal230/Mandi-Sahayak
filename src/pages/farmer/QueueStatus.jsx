import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function QueueStatus() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);

  const [queue] = useState({
    token: "FQ-0284",
    position: 18,
    farmersAhead: 17,
    estimatedWait: 35,
    status: "waiting",
  });

  useEffect(() => {
    const savedBooking = localStorage.getItem("bookingData");

    if (savedBooking) {
      setBooking(JSON.parse(savedBooking));
    }
  }, []);

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50">

        <header className="bg-green-700 text-white">
          <div className="mx-auto w-full max-w-lg px-4 py-4">

            <div className="flex items-center justify-between">

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-white/10"
              >
                ←
              </button>

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

            <h1 className="mt-5 text-2xl font-bold">
              {t("queueStatus")}
            </h1>

          </div>
        </header>

        <main className="mx-auto w-full max-w-lg px-4 py-6">

          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-3xl">
              📅
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              {t("noActiveBooking")}
            </h2>

            <p className="mt-2 text-sm leading-5 text-slate-500">
              {t("bookBeforeQueue")}
            </p>

            <button
              type="button"
              onClick={() => navigate("/book-slot")}
              className="mt-5 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white"
            >
              {t("bookSlot")} →
            </button>

          </div>

        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

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

          <div className="mt-5">

            <p className="text-sm text-green-100">
              {t("queueTracking")}
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              {t("queueStatus")}
            </h1>

          </div>

        </div>

      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">

        <section className="rounded-2xl bg-white p-4 shadow-sm">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                {t("yourBooking")}
              </p>

              <h2 className="mt-1 text-lg font-bold text-slate-900">
                {booking.crop}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {booking.centre}
              </p>

            </div>

            <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600">
              {t("waiting")}
            </span>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">

            <div className="rounded-xl bg-slate-50 p-3">

              <p className="text-xs text-slate-400">
                {t("date")}
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {booking.date}
              </p>

            </div>

            <div className="rounded-xl bg-slate-50 p-3">

              <p className="text-xs text-slate-400">
                {t("timeSlot")}
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {booking.timeSlot}
              </p>

            </div>

          </div>

        </section>

        <section className="mt-4 rounded-2xl bg-white p-5 text-center shadow-sm">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("yourToken")}
          </p>

          <div className="mt-2 text-3xl font-bold tracking-wide text-green-700">
            #{queue.token}
          </div>

          <div className="mx-auto mt-5 h-px w-full bg-slate-100"></div>

          <p className="mt-5 text-sm text-slate-500">
            {t("yourPosition")}
          </p>

          <div className="mt-1 text-6xl font-bold text-slate-900">
            {queue.position}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {t("farmersAhead", {
              count: queue.farmersAhead,
            })}
          </p>

        </section>

        <section className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
              ⏱️
            </div>

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                {t("estimatedWaitingTime")}
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                ~{queue.estimatedWait} {t("minutes")}
              </p>

            </div>

          </div>

        </section>

        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <h2 className="font-semibold text-slate-900">
              {t("queueProgress")}
            </h2>

            <span className="text-xs font-semibold text-orange-600">
              {t("waiting")}
            </span>

          </div>

          <div className="mt-6 space-y-5">

            <div className="flex gap-3">

              <div className="flex flex-col items-center">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm text-white">
                  ✓
                </div>

                <div className="mt-1 h-8 w-px bg-green-200"></div>

              </div>

              <div className="pt-1">

                <p className="text-sm font-semibold text-slate-900">
                  {t("slotBooked")}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {t("bookingConfirmed")}
                </p>

              </div>

            </div>

            <div className="flex gap-3">

              <div className="flex flex-col items-center">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm text-white">
                  •
                </div>

                <div className="mt-1 h-8 w-px bg-slate-200"></div>

              </div>

              <div className="pt-1">

                <p className="text-sm font-semibold text-slate-900">
                  {t("waitingInQueue")}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {t("farmersAhead", {
                    count: queue.farmersAhead,
                  })}
                </p>

              </div>

            </div>

            <div className="flex gap-3">

              <div className="flex flex-col items-center">

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-400">
                  3
                </div>

                <div className="mt-1 h-8 w-px bg-slate-200"></div>

              </div>

              <div className="pt-1">

                <p className="text-sm font-medium text-slate-400">
                  {t("procurement")}
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  {t("waitingForTurn")}
                </p>

              </div>

            </div>

            <div className="flex gap-3">

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-400">
                4
              </div>

              <div className="pt-1">

                <p className="text-sm font-medium text-slate-400">
                  {t("completed")}
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  {t("procurementCompleted")}
                </p>

              </div>

            </div>

          </div>

        </section>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
        >
          🔄 {t("refreshStatus")}
        </button>

        <button
          type="button"
          onClick={() => navigate("/my-booking")}
          className="mt-3 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white"
        >
          {t("viewBookingDetails")} →
        </button>

      </main>

    </div>
  );
}

export default QueueStatus;