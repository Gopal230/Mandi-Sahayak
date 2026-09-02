import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [farmer, setFarmer] = useState(null);
  const [bookings, setBookings] = useState([]);

  const loadData = () => {
    const savedFarmer = localStorage.getItem("farmerData");

    if (!savedFarmer) {
      setFarmer(null);
      setBookings([]);
      navigate("/login");
      return;
    }

    let currentFarmer;

    try {
      currentFarmer = JSON.parse(savedFarmer);
    } catch {
      localStorage.removeItem("farmerData");
      setFarmer(null);
      setBookings([]);
      navigate("/login");
      return;
    }

    if (!currentFarmer || !currentFarmer.phone) {
      setFarmer(currentFarmer || null);
      setBookings([]);
      return;
    }

    setFarmer(currentFarmer);

    const savedBookings = localStorage.getItem("bookings");

    if (!savedBookings) {
      setBookings([]);
      return;
    }

    try {
      const parsedBookings = JSON.parse(savedBookings);

      if (!Array.isArray(parsedBookings)) {
        setBookings([]);
        return;
      }

      const currentFarmerPhone = String(
        currentFarmer.phone
      ).replace(/\D/g, "");

      const farmerBookings = parsedBookings.filter((item) => {
        if (!item || !item.farmerPhone) {
          return false;
        }

        const bookingPhone = String(item.farmerPhone).replace(
          /\D/g,
          ""
        );

        return (
          bookingPhone === currentFarmerPhone &&
          item.status !== "Cancelled" &&
          item.status !== "Completed"
        );
      });

      setBookings(farmerBookings);
    } catch {
      setBookings([]);
    }
  };

  useEffect(() => {
    loadData();

    window.addEventListener("focus", loadData);
    window.addEventListener("bookingUpdated", loadData);

    return () => {
      window.removeEventListener("focus", loadData);
      window.removeEventListener("bookingUpdated", loadData);
    };
  }, []);

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const farmerName =
    farmer?.fullName ||
    farmer?.name ||
    t("farmer");

  const activeBookings = bookings;

  const currentBooking =
    [...activeBookings].sort((a, b) => {
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
    })[0] || null;

  const queuePosition =
    currentBooking?.queuePosition ??
    currentBooking?.queue?.position ??
    null;

  const farmersAhead =
    currentBooking?.farmersAhead ??
    currentBooking?.queue?.farmersAhead ??
    null;

  const estimatedWaitingTime =
    currentBooking?.estimatedWaitingTime ??
    currentBooking?.queue?.estimatedWaitingTime ??
    null;

  const quantity =
    currentBooking?.quantityQuintal ??
    currentBooking?.quantity ??
    null;

  const quantityUnit =
    currentBooking?.quantityUnit ||
    "quintal";

  const queueProgress =
    queuePosition && queuePosition > 0
      ? Math.max(
          10,
          Math.min(90, 100 - queuePosition * 12)
        )
      : 10;

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
        {currentBooking ? (
          <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-700 to-green-600 text-white shadow-lg">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-green-100">
                    {t("currentBooking")}
                  </p>

                  <h2 className="mt-1 truncate text-xl font-bold">
                    {currentBooking.centre}
                  </h2>
                </div>

                <span className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                  {currentBooking.status || t("confirmed")}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xs text-green-100">
                    {t("tokenNumber")}
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {currentBooking.tokenNumber ||
                      currentBooking.bookingId ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xs text-green-100">
                    {t("queueStatus")}
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {queuePosition
                      ? `#${queuePosition}`
                      : "—"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xs text-green-100">
                    {t("estimatedWaitingTime")}
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {estimatedWaitingTime !== null
                      ? `${estimatedWaitingTime} min`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/10 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-green-100">
                      {farmersAhead !== null
                        ? t("farmersAhead", {
                            count: farmersAhead,
                          })
                        : t("queueStatus")}
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {currentBooking.crop || "—"}
                      {quantity !== null && (
                        <>
                          {" • "}
                          {quantity}{" "}
                          {quantityUnit === "quintal"
                            ? t("quintal", {
                                defaultValue: "Quintal",
                              })
                            : quantityUnit}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs text-green-100">
                      {t("date")}
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {currentBooking.date || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-500"
                    style={{
                      width: `${queueProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-green-100">
                  <span>
                    {currentBooking.timeSlot || "—"}
                  </span>

                  <span>
                    {queuePosition
                      ? t("viewYourPosition")
                      : t("queueStatus")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/queue")}
                className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-green-700"
              >
                {t("viewQueueStatus")} →
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-3xl">
              📅
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              {t("noActiveBooking")}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {t("noActiveBookingDescription")}
            </p>

            <button
              type="button"
              onClick={() => navigate("/book-slot")}
              className="mt-5 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white"
            >
              {t("bookSlot")} →
            </button>
          </section>
        )}

        {activeBookings.length > 1 && (
          <button
            type="button"
            onClick={() => navigate("/my-booking")}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-left"
          >
            <div>
              <p className="text-xs font-semibold text-green-700">
                {activeBookings.length} {t("records")}
              </p>

              <p className="mt-1 text-sm font-medium text-slate-700">
                {t("myBooking")}
              </p>
            </div>

            <span className="text-green-700">
              →
            </span>
          </button>
        )}

        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {t("services")}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {t("chooseWhatYouNeed")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                {activeBookings.length > 0
                  ? `${activeBookings.length} ${t("records")}`
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
                {currentBooking && farmersAhead !== null
                  ? t("farmersAhead", {
                      count: farmersAhead,
                    })
                  : t("viewYourPosition")}
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/procurement")}
              className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-50 text-xl">
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
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-xl">
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
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-xl">
                🔔
              </div>

              <h3 className="mt-3 font-semibold text-slate-900">
                {t("notifications")}
              </h3>

              <p className="mt-1 text-xs leading-4 text-slate-500">
                {t("stayUpdated")}
              </p>
            </button>
          </div>
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
            <span className="mt-1">{t("queueStatus")}</span>
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