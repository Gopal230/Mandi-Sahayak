import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Notifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const loadNotifications = () => {
      const savedBooking = localStorage.getItem("bookingData");
      const savedFarmer = localStorage.getItem("farmerData");

      let currentBooking = null;
      let currentFarmer = null;

      try {
        currentBooking = savedBooking ? JSON.parse(savedBooking) : null;
      } catch {
        currentBooking = null;
      }

      try {
        currentFarmer = savedFarmer ? JSON.parse(savedFarmer) : null;
      } catch {
        currentFarmer = null;
      }

      setBooking(currentBooking);

      const farmerId =
        currentFarmer?.farmerId ||
        currentBooking?.farmerId ||
        currentFarmer?.phone ||
        currentBooking?.farmerPhone ||
        "guest";

      const storageKey = `notifications-${farmerId}`;
      const savedNotifications = localStorage.getItem(storageKey);

      let existingNotifications = [];

      try {
        existingNotifications = savedNotifications
          ? JSON.parse(savedNotifications)
          : [];
      } catch {
        existingNotifications = [];
      }

      if (currentBooking) {
        const bookingId =
          currentBooking.bookingId || currentBooking.tokenNumber || "booking";

        const confirmationId = `booking-confirmed-${bookingId}`;
        const queueId = `queue-update-${bookingId}`;

        const confirmationExists = existingNotifications.some(
          (item) => item.id === confirmationId
        );

        const queueExists = existingNotifications.some(
          (item) => item.id === queueId
        );

        const updatedNotifications = [...existingNotifications];

        if (!confirmationExists) {
          updatedNotifications.push({
            id: confirmationId,
            type: "booking-confirmed",
            title: "bookingConfirmed",
            message:
              currentBooking.date && currentBooking.timeSlot
                ? `${currentBooking.date} • ${currentBooking.timeSlot}`
                : "viewBookingDetails",
            createdAt: new Date().toISOString(),
            read: false,
            bookingId,
          });
        }

        if (!queueExists) {
          updatedNotifications.push({
            id: queueId,
            type: "queue-update",
            title: "queueTracking",
            message: "waitingForTurn",
            createdAt: new Date().toISOString(),
            read: false,
            bookingId,
          });
        }

        const sortedNotifications = updatedNotifications.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        localStorage.setItem(
          storageKey,
          JSON.stringify(sortedNotifications)
        );

        setNotifications(sortedNotifications);
      } else {
        const sortedNotifications = existingNotifications.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        setNotifications(sortedNotifications);
      }
    };

    loadNotifications();

    window.addEventListener("storage", loadNotifications);
    window.addEventListener("bookingUpdated", loadNotifications);
    window.addEventListener("focus", loadNotifications);

    return () => {
      window.removeEventListener("storage", loadNotifications);
      window.removeEventListener("bookingUpdated", loadNotifications);
      window.removeEventListener("focus", loadNotifications);
    };
  }, []);

  const getFarmerNotificationKey = () => {
    const savedFarmer = localStorage.getItem("farmerData");
    const savedBooking = localStorage.getItem("bookingData");

    let farmer = null;
    let currentBooking = null;

    try {
      farmer = savedFarmer ? JSON.parse(savedFarmer) : null;
    } catch {
      farmer = null;
    }

    try {
      currentBooking = savedBooking ? JSON.parse(savedBooking) : null;
    } catch {
      currentBooking = null;
    }

    const farmerId =
      farmer?.farmerId ||
      currentBooking?.farmerId ||
      farmer?.phone ||
      currentBooking?.farmerPhone ||
      "guest";

    return `notifications-${farmerId}`;
  };

  const saveNotifications = (updatedNotifications) => {
    localStorage.setItem(
      getFarmerNotificationKey(),
      JSON.stringify(updatedNotifications)
    );
    setNotifications(updatedNotifications);
  };

  const markAsRead = (notificationId) => {
    const updatedNotifications = notifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );

    saveNotifications(updatedNotifications);
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map((notification) => ({
      ...notification,
      read: true,
    }));

    saveNotifications(updatedNotifications);
  };

  const handleNotificationAction = (notification) => {
    markAsRead(notification.id);

    if (notification.type === "booking-confirmed") {
      navigate("/my-booking");
    }

    if (notification.type === "queue-update") {
      navigate("/queue");
    }
  };

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

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
                aria-label={t("back")}
              >
                ←
              </button>

              <div className="min-w-0">
                <p className="text-xs text-green-100">
                  {t("appName")}
                </p>

                <h1 className="truncate text-xl font-bold">
                  {t("notifications")}
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
        <section className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-2xl">
                🔔
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t("notifications")}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {t("stayUpdated")}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="shrink-0 text-xs font-semibold text-green-700"
              >
                {t("markAllAsRead")}
              </button>
            )}
          </div>

          {unreadCount > 0 && (
            <div className="mt-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
              <p className="text-xs font-medium text-green-800">
                {unreadCount} {t("unreadNotifications")}
              </p>
            </div>
          )}
        </section>

        {notifications.length > 0 ? (
          <section className="space-y-3">
            {notifications.map((notification) => {
              const isQueue = notification.type === "queue-update";

              return (
                <article
                  key={notification.id}
                  className={`rounded-2xl border p-4 shadow-sm transition ${
                    notification.read
                      ? "border-slate-100 bg-white"
                      : "border-green-100 bg-white shadow-md"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                        isQueue
                          ? "bg-orange-50 text-orange-600"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {isQueue ? "◷" : "✓"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className={`text-sm text-slate-900 ${
                            notification.read
                              ? "font-semibold"
                              : "font-bold"
                          }`}
                        >
                          {t(notification.title)}
                        </h3>

                        {!notification.read && (
                          <span
                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                              isQueue
                                ? "bg-orange-500"
                                : "bg-green-600"
                            }`}
                          />
                        )}
                      </div>

                      <p className="mt-1 text-sm leading-5 text-slate-500">
                        {notification.message.includes("•")
                          ? notification.message
                          : t(notification.message)}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleNotificationAction(notification)
                          }
                          className={`text-xs font-semibold ${
                            isQueue
                              ? "text-orange-600"
                              : "text-green-700"
                          }`}
                        >
                          {isQueue
                            ? t("viewQueueStatus")
                            : t("viewBookingDetails")}{" "}
                          →
                        </button>

                        {!notification.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs font-medium text-slate-400"
                          >
                            {t("markAsRead")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-100 bg-white px-5 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              🔔
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-900">
              {t("noNotifications")}
            </h2>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-5 text-slate-500">
              {t("noNotificationsDescription")}
            </p>

            <button
              type="button"
              onClick={() => navigate("/book-slot")}
              className="mt-5 rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 active:scale-[0.98]"
            >
              {t("bookSlot")}
            </button>
          </section>
        )}

        <section className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg">
              ℹ️
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {t("stayUpdated")}
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-600">
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
            <span className="text-xl">◷</span>
            <span className="mt-1">{t("queue")}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="flex flex-col items-center px-4 py-1 text-xs font-semibold text-green-700"
          >
            <span className="text-xl">🔔</span>
            <span className="mt-1">{t("notifications")}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default Notifications;