import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function QueueStatus() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadBooking = async () => {
    setRefreshing(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const savedFarmer = localStorage.getItem("farmerData");

    if (!savedFarmer) {
      setBooking(null);
      setRefreshing(false);
      navigate("/login");
      return;
    }

    let currentFarmer = null;

    try {
      currentFarmer = JSON.parse(savedFarmer);
    } catch {
      setBooking(null);
      setRefreshing(false);
      navigate("/login");
      return;
    }

    const farmerId = currentFarmer?.farmerId || "";
    const farmerPhone = currentFarmer?.phone || "";
    const savedBookings = localStorage.getItem("bookings");

    if (!savedBookings || (!farmerId && !farmerPhone)) {
      setBooking(null);
      setRefreshing(false);
      return;
    }

    try {
      const bookings = JSON.parse(savedBookings);

      if (!Array.isArray(bookings)) {
        setBooking(null);
        setRefreshing(false);
        return;
      }

      const farmerBookings = bookings.filter((item) => {
        const belongsToFarmer =
          (farmerId && item.farmerId === farmerId) ||
          (!item.farmerId &&
            farmerPhone &&
            item.farmerPhone === farmerPhone);

        return (
          belongsToFarmer &&
          item.status !== "Cancelled" &&
          item.status !== "Completed"
        );
      });

      if (farmerBookings.length === 0) {
        setBooking(null);
        setRefreshing(false);
        return;
      }

      const sortedBookings = [...farmerBookings].sort((a, b) => {
        const dateA = new Date(
          `${a.date || ""}T00:00:00`
        ).getTime();

        const dateB = new Date(
          `${b.date || ""}T00:00:00`
        ).getTime();

        if (dateA !== dateB) {
          return dateA - dateB;
        }

        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });

      setBooking(sortedBookings[0]);
      setLastUpdated(new Date());
    } catch {
      setBooking(null);
    }

    setRefreshing(false);
  };

  useEffect(() => {
    loadBooking();

    window.addEventListener("bookingUpdated", loadBooking);
    window.addEventListener("focus", loadBooking);

    return () => {
      window.removeEventListener("bookingUpdated", loadBooking);
      window.removeEventListener("focus", loadBooking);
    };
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

  const position = booking.queuePosition ?? null;
  const farmersAhead = booking.farmersAhead ?? null;
  const estimatedWait =
    booking.estimatedWaitingTime ??
    booking.estimatedWaitMinutes ??
    null;

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

            <span className="shrink-0 rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              {booking.status || t("confirmed")}
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
            {booking.tokenNumber || booking.bookingId || "—"}
          </div>

          <div className="mx-auto mt-5 h-px w-full bg-slate-100"></div>

          <p className="mt-5 text-sm text-slate-500">
            {t("yourPosition")}
          </p>

          <div className="mt-1 text-6xl font-bold text-slate-900">
            {position ?? "—"}
          </div>

          <p className="mt-1 text-sm text-slate-500">
            {farmersAhead !== null
              ? t("farmersAhead", {
                  count: farmersAhead,
                })
              : "Queue information will appear once updated."}
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
                {estimatedWait !== null
                  ? `~${estimatedWait} ${t("minutes")}`
                  : "—"}
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
                  {farmersAhead !== null
                    ? t("farmersAhead", {
                        count: farmersAhead,
                      })
                    : "Waiting for queue update"}
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
          onClick={loadBooking}
          disabled={refreshing}
          className={`mt-4 w-full rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm transition ${
            refreshing
              ? "border-slate-200 bg-slate-100 text-slate-400"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {refreshing ? "↻ Refreshing..." : `🔄 ${t("refreshStatus")}`}
        </button>

        {lastUpdated && !refreshing && (
          <p className="mt-2 text-center text-xs text-slate-400">
            Last updated at{" "}
            {lastUpdated.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

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