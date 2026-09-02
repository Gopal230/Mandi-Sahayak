import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function MyBooking() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [history, setHistory] = useState([]);
  const [farmer, setFarmer] = useState(null);

  const loadBookings = () => {
    const savedFarmer = localStorage.getItem("farmerData");

    if (!savedFarmer) {
      setFarmer(null);
      setBookings([]);
      setHistory([]);
      return;
    }

    let currentFarmer;

    try {
      currentFarmer = JSON.parse(savedFarmer);
    } catch {
      setFarmer(null);
      setBookings([]);
      setHistory([]);
      return;
    }

    setFarmer(currentFarmer);

    const farmerPhone = String(
      currentFarmer?.phone || ""
    ).trim();

    const farmerId =
      currentFarmer?.farmerId ||
      (farmerPhone ? `farmer-${farmerPhone}` : "");

    if (!farmerId && !farmerPhone) {
      setBookings([]);
      setHistory([]);
      return;
    }

    const savedBookings = localStorage.getItem("bookings");
    const savedHistory = localStorage.getItem("bookingHistory");

    let bookingList = [];
    let historyList = [];

    try {
      const parsedBookings = savedBookings
        ? JSON.parse(savedBookings)
        : [];

      if (Array.isArray(parsedBookings)) {
        bookingList = parsedBookings;
      }
    } catch {
      bookingList = [];
    }

    try {
      const parsedHistory = savedHistory
        ? JSON.parse(savedHistory)
        : [];

      if (Array.isArray(parsedHistory)) {
        historyList = parsedHistory;
      }
    } catch {
      historyList = [];
    }

    const belongsToFarmer = (booking) => {
      if (!booking) return false;

      if (booking.farmerId) {
        return booking.farmerId === farmerId;
      }

      if (booking.farmerPhone) {
        return (
          String(booking.farmerPhone).trim() === farmerPhone
        );
      }

      return false;
    };

    const farmerBookings = bookingList.filter(
      belongsToFarmer
    );

    const farmerHistory = historyList.filter(
      belongsToFarmer
    );

    const sortedBookings = [...farmerBookings].sort(
      (a, b) => {
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
      }
    );

    const sortedHistory = [...farmerHistory].sort(
      (a, b) => {
        const dateA = new Date(
          b.cancelledAt ||
            b.completedAt ||
            b.createdAt ||
            `${b.date || ""}T00:00:00`
        ).getTime();

        const dateB = new Date(
          a.cancelledAt ||
            a.completedAt ||
            a.createdAt ||
            `${a.date || ""}T00:00:00`
        ).getTime();

        return dateA - dateB;
      }
    );

    setBookings(sortedBookings);
    setHistory(sortedHistory);
  };

  useEffect(() => {
    loadBookings();

    window.addEventListener("focus", loadBookings);
    window.addEventListener("bookingUpdated", loadBookings);

    return () => {
      window.removeEventListener("focus", loadBookings);
      window.removeEventListener(
        "bookingUpdated",
        loadBookings
      );
    };
  }, []);

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const activeBookings = bookings.filter(
    (item) =>
      item.status !== "Cancelled" &&
      item.status !== "Completed"
  );

  const getQuantity = (booking) => {
    if (booking?.quantityQuintal !== undefined) {
      return booking.quantityQuintal;
    }

    if (booking?.quantityUnit === "quintal") {
      return booking.quantity ?? 0;
    }

    return booking?.quantity ?? 0;
  };

  const getQuantityUnit = () => {
    return t("quintal");
  };

  const handleCancel = (bookingId) => {
    const savedFarmer = localStorage.getItem("farmerData");

    if (!savedFarmer) return;

    let currentFarmer;

    try {
      currentFarmer = JSON.parse(savedFarmer);
    } catch {
      return;
    }

    const farmerPhone = String(
      currentFarmer?.phone || ""
    ).trim();

    const farmerId =
      currentFarmer?.farmerId ||
      (farmerPhone ? `farmer-${farmerPhone}` : "");

    if (!farmerId && !farmerPhone) return;

    const savedBookings = localStorage.getItem("bookings");
    const savedHistory =
      localStorage.getItem("bookingHistory");

    let allBookings = [];
    let allHistory = [];

    try {
      const parsedBookings = savedBookings
        ? JSON.parse(savedBookings)
        : [];

      if (Array.isArray(parsedBookings)) {
        allBookings = parsedBookings;
      }
    } catch {
      allBookings = [];
    }

    try {
      const parsedHistory = savedHistory
        ? JSON.parse(savedHistory)
        : [];

      if (Array.isArray(parsedHistory)) {
        allHistory = parsedHistory;
      }
    } catch {
      allHistory = [];
    }

    const belongsToCurrentFarmer = (booking) => {
      if (!booking) return false;

      if (booking.farmerId) {
        return booking.farmerId === farmerId;
      }

      if (booking.farmerPhone) {
        return (
          String(booking.farmerPhone).trim() ===
          farmerPhone
        );
      }

      return false;
    };

    const selectedBooking = allBookings.find(
      (item) =>
        item.bookingId === bookingId &&
        belongsToCurrentFarmer(item)
    );

    if (!selectedBooking) return;

    const cancelledBooking = {
      ...selectedBooking,
      farmerId,
      farmerPhone,
      status: "Cancelled",
      cancelledAt: new Date().toISOString(),
    };

    const updatedAllBookings = allBookings.filter(
      (item) =>
        !(
          item.bookingId === bookingId &&
          belongsToCurrentFarmer(item)
        )
    );

    const existingHistory = allHistory.filter(
      (item) =>
        !(
          item.bookingId === bookingId &&
          belongsToCurrentFarmer(item)
        )
    );

    const updatedAllHistory = [
      cancelledBooking,
      ...existingHistory,
    ];

    localStorage.setItem(
      "bookings",
      JSON.stringify(updatedAllBookings)
    );

    localStorage.setItem(
      "bookingHistory",
      JSON.stringify(updatedAllHistory)
    );

    const savedCurrentBooking =
      localStorage.getItem("bookingData");

    if (savedCurrentBooking) {
      try {
        const currentBooking = JSON.parse(
          savedCurrentBooking
        );

        const isCurrentBooking =
          currentBooking?.bookingId === bookingId &&
          belongsToCurrentFarmer(currentBooking);

        if (isCurrentBooking) {
          const nextBooking = updatedAllBookings
            .filter(
              (item) =>
                belongsToCurrentFarmer(item) &&
                item.status !== "Cancelled" &&
                item.status !== "Completed"
            )
            .sort((a, b) => {
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
                new Date(
                  b.createdAt || 0
                ).getTime() -
                new Date(
                  a.createdAt || 0
                ).getTime()
              );
            })[0];

          if (nextBooking) {
            localStorage.setItem(
              "bookingData",
              JSON.stringify(nextBooking)
            );
          } else {
            localStorage.removeItem("bookingData");
          }
        }
      } catch {
        localStorage.removeItem("bookingData");
      }
    }

    loadBookings();
    window.dispatchEvent(new Event("bookingUpdated"));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
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

          <div className="mt-5">
            <h1 className="text-2xl font-bold">
              {t("myBooking")}
            </h1>

            <p className="mt-1 text-sm text-green-100">
              {t("manageYourBooking")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t("currentBooking")}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {activeBookings.length} {t("records")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/book-slot")}
            className="rounded-xl bg-green-700 px-3 py-2 text-xs font-semibold text-white"
          >
            + {t("bookSlot")}
          </button>
        </div>

        {activeBookings.length > 0 ? (
          <div className="space-y-4">
            {activeBookings.map((booking) => (
              <section
                key={booking.bookingId}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      {t("bookingDetails")}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {booking.bookingId}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    {booking.status || t("confirmed")}
                  </span>
                </div>

                <div className="space-y-4 p-4">
                  <div className="rounded-xl bg-green-50 p-4 text-center">
                    <p className="text-xs text-slate-500">
                      {t("tokenNumber")}
                    </p>

                    <p className="mt-1 text-2xl font-bold text-green-700">
                      {booking.tokenNumber ||
                        booking.bookingId ||
                        "—"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        {t("procurementCentre")}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {booking.centre}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        {t("crop")}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {booking.crop}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        {t("quantity")}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {getQuantity(booking)}{" "}
                        {getQuantityUnit(booking)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">
                        {t("date")}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {booking.date}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs text-slate-500">
                      {t("timeSlot")}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {booking.timeSlot}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/queue")}
                    className="w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white"
                  >
                    {t("viewQueueStatus")} →
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => navigate("/book-slot")}
                      className="rounded-xl bg-green-50 px-3 py-3 text-sm font-semibold text-green-700"
                    >
                      {t("changeBooking")}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleCancel(booking.bookingId)
                      }
                      className="rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-600"
                    >
                      {t("cancelBooking")}
                    </button>
                  </div>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="rounded-2xl bg-white p-6 text-center shadow-sm">
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

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {t("bookingHistory")}
            </h2>

            <span className="text-xs text-slate-400">
              {history.length} {t("records")}
            </span>
          </div>

          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item, index) => (
                <div
                  key={`${item.bookingId}-${index}`}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.crop}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.centre}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {item.bookingId}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === "Completed"
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-400">
                        {t("date")}
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {item.date}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        {t("quantity")}
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {getQuantity(item)}{" "}
                        {getQuantityUnit(item)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
              <div className="text-2xl">
                📋
              </div>

              <p className="mt-2 text-sm font-medium text-slate-700">
                {t("noBookingHistory")}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {t("bookingHistoryDescription")}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MyBooking;