import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function Payment() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const loadBooking = () => {
    const savedBooking = localStorage.getItem("bookingData");

    if (!savedBooking) {
      setBooking(null);
      return;
    }

    try {
      const parsedBooking = JSON.parse(savedBooking);
      setBooking(parsedBooking);

      const paymentCompleted =
        parsedBooking?.paymentStatus === "Completed" ||
        parsedBooking?.paymentStatus === "Paid" ||
        parsedBooking?.status === "Payment Completed" ||
        parsedBooking?.status === "Completed";

      if (paymentCompleted) {
        const feedbackKey = `feedback-${parsedBooking.bookingId}`;
        const savedFeedback = localStorage.getItem(feedbackKey);

        if (!savedFeedback) {
          setShowFeedback(true);
        } else {
          try {
            const parsedFeedback = JSON.parse(savedFeedback);
            setRating(parsedFeedback.rating || 0);
            setFeedbackSubmitted(true);
          } catch {
            setShowFeedback(true);
          }
        }
      }
    } catch {
      setBooking(null);
    }
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

  const getQuantity = () => {
    if (!booking) return null;

    if (booking.quantityQuintal !== undefined) {
      return booking.quantityQuintal;
    }

    if (booking.quantityUnit === "quintal") {
      return booking.quantity ?? null;
    }

    return booking.quantity ?? null;
  };

  const handleSubmitFeedback = () => {
    if (!booking || rating === 0) return;

    const feedbackData = {
      feedbackId: `feedback-${booking.bookingId}`,
      bookingId: booking.bookingId,
      farmerId: booking.farmerId || "",
      rating,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      `feedback-${booking.bookingId}`,
      JSON.stringify(feedbackData)
    );

    setFeedbackSubmitted(true);
    setShowFeedback(false);
  };

  const handleLater = () => {
    if (!booking) return;

    localStorage.setItem(
      `feedback-dismissed-${booking.bookingId}`,
      "true"
    );

    setShowFeedback(false);
  };

  const handleCloseFeedback = () => {
    if (!booking) return;

    localStorage.setItem(
      `feedback-dismissed-${booking.bookingId}`,
      "true"
    );

    setShowFeedback(false);
  };

  const paymentCompleted =
    booking?.paymentStatus === "Completed" ||
    booking?.paymentStatus === "Paid" ||
    booking?.status === "Payment Completed" ||
    booking?.status === "Completed";

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
            <section
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                paymentCompleted
                  ? "border-green-200"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                    paymentCompleted
                      ? "bg-green-100 text-green-700"
                      : "bg-green-50 text-green-700"
                  }`}
                >
                  {paymentCompleted ? "✓" : "₹"}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {t("payment")}
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    {paymentCompleted
                      ? t("paymentCompleted")
                      : t("paymentPending")}
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {paymentCompleted
                      ? t("paymentCompletedDescription")
                      : t("paymentWillAppear")}
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
                    {getQuantity() !== null
                      ? `${getQuantity()} ${t("quintal")}`
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
                    {booking.paymentAmount !== undefined &&
                    booking.paymentAmount !== null
                      ? `₹${booking.paymentAmount}`
                      : t("notAvailable")}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    {t("paymentStatusLabel")}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      paymentCompleted
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {paymentCompleted
                      ? t("completed")
                      : t("pending")}
                  </span>
                </div>

                {booking.transactionId && (
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-500">
                      {t("transactionId")}
                    </span>

                    <span className="max-w-[55%] break-all text-right text-xs font-medium text-slate-700">
                      {booking.transactionId}
                    </span>
                  </div>
                )}
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-400">
                {paymentCompleted
                  ? t("paymentSuccessBackendMessage")
                  : t("paymentBackendMessage")}
              </p>
            </section>

            {feedbackSubmitted && (
              <section className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-green-700 shadow-sm">
                  ✓
                </div>

                <h2 className="mt-3 text-base font-bold text-slate-900">
                  {t("feedbackThanks")}
                </h2>

                <div className="mt-2 text-lg tracking-widest text-amber-500">
                  {"★".repeat(rating)}
                  <span className="text-slate-200">
                    {"★".repeat(5 - rating)}
                  </span>
                </div>
              </section>
            )}

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

      {showFeedback && paymentCompleted && !feedbackSubmitted && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={handleCloseFeedback}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500 hover:bg-slate-200"
              aria-label="Close"
            >
              ×
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
              ✓
            </div>

            <h2 className="mt-4 text-center text-xl font-bold text-slate-900">
              {t("rateYourExperience")}
            </h2>

            <p className="mt-2 text-center text-sm leading-5 text-slate-500">
              {t("rateExperienceDescription")}
            </p>

            <div className="mt-6 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-3xl transition ${
                    star <= rating
                      ? "text-amber-400"
                      : "text-slate-200"
                  }`}
                  aria-label={`${star} stars`}
                >
                  ★
                </button>
              ))}
            </div>

            <p className="mt-3 text-center text-xs font-medium text-slate-400">
              {rating > 0
                ? `${rating}/5`
                : t("selectRating")}
            </p>

            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={rating === 0}
              className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
                rating > 0
                  ? "bg-green-700 hover:bg-green-800"
                  : "cursor-not-allowed bg-slate-300"
              }`}
            >
              {t("submitFeedback")}
            </button>

            <button
              type="button"
              onClick={handleLater}
              className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              {t("maybeLater")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payment;