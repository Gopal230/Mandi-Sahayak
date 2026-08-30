import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Notifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const loadBooking = () => {
      const savedBooking = localStorage.getItem("bookingData");

      if (savedBooking) {
        try {
          setBooking(JSON.parse(savedBooking));
        } catch {
          setBooking(null);
        }
      } else {
        setBooking(null);
      }
    };

    loadBooking();

    window.addEventListener("storage", loadBooking);
    window.addEventListener("bookingUpdated", loadBooking);

    return () => {
      window.removeEventListener("storage", loadBooking);
      window.removeEventListener("bookingUpdated", loadBooking);
    };
  }, []);

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const notifications = [];

  if (booking) {
    notifications.push({
      id: "booking-confirmed",
      icon: "✓",
      title: t("bookingConfirmed"),
      message:
        booking.date && booking.timeSlot
          ? `${booking.date} • ${booking.timeSlot}`
          : t("viewBookingDetails"),
      action: () => navigate("/my-booking"),
      actionText: t("viewBookingDetails"),
      tone: "green",
    });

    notifications.push({
      id: "queue-update",
      icon: "◷",
      title: t("queueTracking"),
      message: t("waitingForTurn"),
      action: () => navigate("/queue"),
      actionText: t("viewQueueStatus"),
      tone: "orange",
    });
  }

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

        </section>

        {notifications.length > 0 ? (
          <section className="space-y-3">

            {notifications.map((notification) => (

              <article
                key={notification.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >

                <div className="flex items-start gap-3">

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                      notification.tone === "green"
                        ? "bg-green-50 text-green-700"
                        : "bg-orange-50 text-orange-600"
                    }`}
                  >
                    {notification.icon}
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex items-start justify-between gap-3">

                      <h3 className="text-sm font-semibold text-slate-900">
                        {notification.title}
                      </h3>

                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          notification.tone === "green"
                            ? "bg-green-600"
                            : "bg-orange-500"
                        }`}
                      />

                    </div>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {notification.message}
                    </p>

                    <button
                      type="button"
                      onClick={notification.action}
                      className={`mt-3 text-xs font-semibold ${
                        notification.tone === "green"
                          ? "text-green-700"
                          : "text-orange-600"
                      }`}
                    >
                      {notification.actionText} →
                    </button>

                  </div>

                </div>

              </article>

            ))}

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