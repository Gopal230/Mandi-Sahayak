import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function BookSlot() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [centre, setCentre] = useState("");
  const [crop, setCrop] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [showReview, setShowReview] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const centres = [
    "Procurement Centre 1",
    "Procurement Centre 2",
    "Procurement Centre 3",
  ];

  const slots = [
    {
      time: "09:00 AM - 10:00 AM",
      available: 6,
    },
    {
      time: "10:00 AM - 11:00 AM",
      available: 0,
    },
    {
      time: "11:00 AM - 12:00 PM",
      available: 3,
    },
    {
      time: "02:00 PM - 03:00 PM",
      available: 8,
    },
  ];

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  const handleReview = (e) => {
    e.preventDefault();

    if (!centre || !crop || !quantity || !date || !timeSlot) {
      return;
    }

    setShowReview(true);
  };

  const handleConfirm = () => {
    const bookingData = {
      bookingId: `FQ-${Math.floor(1000 + Math.random() * 9000)}`,
      centre,
      crop,
      quantity,
      date,
      timeSlot,
      status: "Confirmed",
    };

    localStorage.setItem(
      "bookingData",
      JSON.stringify(bookingData)
    );

    navigate("/booking-confirmation");
  };

  if (showReview) {
    return (
      <div className="min-h-screen bg-slate-50">

        <header className="bg-green-700 text-white">
          <div className="mx-auto w-full max-w-lg px-4 py-4">

            <div className="flex items-center justify-between">

              <button
                type="button"
                onClick={() => setShowReview(false)}
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

            <div className="pb-2 pt-5">

              <h1 className="text-2xl font-bold">
                {t("reviewBooking")}
              </h1>

              <p className="mt-1 text-sm text-green-100">
                {t("reviewBookingDescription")}
              </p>

            </div>

          </div>
        </header>

        <main className="mx-auto w-full max-w-lg px-4 py-5">

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="mb-5 rounded-xl bg-green-50 p-4">

              <p className="text-xs font-medium text-green-700">
                {t("booking")}
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {date}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {timeSlot}
              </p>

            </div>

            <div className="space-y-4">

              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <span className="text-sm text-slate-500">
                  {t("procurementCentre")}
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {centre}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <span className="text-sm text-slate-500">
                  {t("crop")}
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {crop}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <span className="text-sm text-slate-500">
                  {t("quantity")}
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {quantity} {t("kg")}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-slate-500">
                  {t("timeSlot")}
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {timeSlot}
                </span>
              </div>

            </div>

          </div>

          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">

            <div className="flex gap-3">

              <span className="text-xl">ℹ️</span>

              <p className="text-sm leading-5 text-amber-800">
                Please check your booking details carefully before confirming.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="mt-5 min-h-12 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800"
          >
            {t("confirmBooking")} ✓
          </button>

          <button
            type="button"
            onClick={() => setShowReview(false)}
            className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            {t("back")}
          </button>

        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">

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

          <div className="flex items-center gap-3 pb-2 pt-5">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">
              📅
            </div>

            <div>

              <h1 className="text-2xl font-bold">
                {t("bookSlot")}
              </h1>

              <p className="mt-1 text-sm text-green-100">
                {t("chooseCentreCropTime")}
              </p>

            </div>

          </div>

        </div>

      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">

        <form onSubmit={handleReview} className="space-y-4">

          <section className="rounded-2xl bg-white p-4 shadow-sm">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                📍
              </div>

              <div>

                <h2 className="font-semibold text-slate-900">
                  {t("procurementCentre")}
                </h2>

                <p className="text-xs text-slate-500">
                  {t("selectCentreDescription")}
                </p>

              </div>

            </div>

            <select
              value={centre}
              onChange={(e) => {
                setCentre(e.target.value);
                setTimeSlot("");
              }}
              required
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >

              <option value="">
                {t("selectProcurementCentre")}
              </option>

              {centres.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}

            </select>

          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                🌾
              </div>

              <div>

                <h2 className="font-semibold text-slate-900">
                  {t("crop")}
                </h2>

                <p className="text-xs text-slate-500">
                  {t("selectCropDescription")}
                </p>

              </div>

            </div>

            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              required
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            >

              <option value="">
                {t("selectCrop")}
              </option>

              <option value="Wheat">{t("wheat")}</option>
              <option value="Rice">{t("rice")}</option>
              <option value="Mustard">{t("mustard")}</option>
              <option value="Maize">{t("maize")}</option>
              <option value="Other">{t("other")}</option>

            </select>

          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                ⚖️
              </div>

              <div>

                <h2 className="font-semibold text-slate-900">
                  {t("quantity")}
                </h2>

                <p className="text-xs text-slate-500">
                  {t("quantityDescription")}
                </p>

              </div>

            </div>

            <div className="flex">

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={t("enterQuantity")}
                required
                className="min-w-0 flex-1 rounded-l-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />

              <span className="flex items-center rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 px-3 text-sm text-slate-500">
                {t("kg")}
              </span>

            </div>

          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">

            <div className="mb-4 flex items-center gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                📅
              </div>

              <div>

                <h2 className="font-semibold text-slate-900">
                  {t("date")}
                </h2>

                <p className="text-xs text-slate-500">
                  {t("selectDateDescription")}
                </p>

              </div>

            </div>

            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTimeSlot("");
              }}
              required
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />

          </section>

          {date && (
            <section className="rounded-2xl bg-white p-4 shadow-sm">

              <div className="mb-4 flex items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-lg">
                  🕐
                </div>

                <div>

                  <h2 className="font-semibold text-slate-900">
                    {t("timeSlot")}
                  </h2>

                  <p className="text-xs text-slate-500">
                    {t("chooseTimeDescription")}
                  </p>

                </div>

              </div>

              <div className="space-y-2">

                {slots.map((slot) => {

                  const isAvailable = slot.available > 0;
                  const isSelected = timeSlot === slot.time;

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        if (isAvailable) {
                          setTimeSlot(slot.time);
                        }
                      }}
                      className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-green-600 bg-green-50"
                          : isAvailable
                          ? "border-slate-200 bg-slate-50 hover:border-green-400"
                          : "cursor-not-allowed border-slate-100 bg-slate-100 opacity-60"
                      }`}
                    >

                      <div>

                        <p
                          className={`text-sm font-semibold ${
                            isSelected
                              ? "text-green-700"
                              : "text-slate-700"
                          }`}
                        >
                          {slot.time}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">

                          {isAvailable
                            ? `${slot.available} ${t("slotsAvailable")}`
                            : t("slotFull")}

                        </p>

                      </div>

                      {isSelected && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-700 text-sm text-white">
                          ✓
                        </span>
                      )}

                      {!isAvailable && (
                        <span className="text-xs font-semibold text-slate-400">
                          {t("full")}
                        </span>
                      )}

                    </button>
                  );
                })}

              </div>

            </section>
          )}

          <button
            type="submit"
            disabled={!centre || !crop || !quantity || !date || !timeSlot}
            className={`min-h-12 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${
              centre && crop && quantity && date && timeSlot
                ? "bg-green-700 hover:bg-green-800"
                : "cursor-not-allowed bg-slate-300"
            }`}
          >
            {t("reviewBooking")} →
          </button>

        </form>

      </main>

    </div>
  );
}

export default BookSlot;