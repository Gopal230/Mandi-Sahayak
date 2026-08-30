import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Payment() {
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
              {t("payment")}
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              {t("paymentStatus")}
            </h1>

            <p className="mt-1 text-sm leading-5 text-green-100">
              {t("paymentDescription")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">
        {!booking ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              ₹
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {t("noActiveBooking")}
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-500">
              {t("paymentBookingRequired")}
            </p>

            <button
              type="button"
              onClick={() => navigate("/book-slot")}
              className="mt-6 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800"
            >
              {t("bookSlot")}
            </button>
          </section>
        ) : (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">
                  ₹
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t("payment")}
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    {t("paymentPending")}
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {t("paymentWillAppear")}
                  </p>
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
              <h2 className="font-semibold text-slate-900">
                {t("paymentInformation")}
              </h2>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    {t("paymentAmount")}
                  </span>

                  <span className="text-sm font-semibold text-slate-400">
                    {t("notAvailable")}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    {t("paymentStatusLabel")}
                  </span>

                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {t("pending")}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-400">
                {t("paymentBackendMessage")}
              </p>
            </section>

            <button
              type="button"
              onClick={() => navigate("/procurement")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("viewProcurementStatus")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default Payment;