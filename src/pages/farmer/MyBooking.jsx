import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function MyBooking() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedBooking = localStorage.getItem("bookingData");
    const savedHistory = localStorage.getItem("bookingHistory");

    if (savedBooking) {
      setBooking(JSON.parse(savedBooking));
    }

    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const handleCancel = () => {
    if (!booking) return;

    const cancelledBooking = {
      ...booking,
      status: "Cancelled",
    };

    const updatedHistory = [cancelledBooking, ...history];

    localStorage.setItem(
      "bookingHistory",
      JSON.stringify(updatedHistory)
    );

    localStorage.removeItem("bookingData");

    setBooking(null);
    setHistory(updatedHistory);
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

        {booking ? (
          <section className="rounded-2xl bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 p-4">

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  {t("currentBooking")}
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {t("bookingDetails")}
                </h2>
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
                  {booking.bookingId || "FQ-0000"}
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
                    {booking.quantity} {t("kg")}
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
                  onClick={handleCancel}
                  className="rounded-xl bg-red-50 px-3 py-3 text-sm font-semibold text-red-600"
                >
                  {t("cancelBooking")}
                </button>

              </div>

            </div>

          </section>
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
                  key={`${item.date}-${index}`}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >

                  <div className="flex items-start justify-between">

                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.crop}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.centre}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                      {item.status || t("completed")}
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
                        {item.quantity} {t("kg")}
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