import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  formatDate,
  formatQuantity,
  formatTimeRange,
  kgToQuintal,
} from "../../lib/format";
import { translateDisplayStatus } from "../../lib/codes";
import LanguageToggle from "../../components/LanguageToggle";
import { DataTypeNote } from "../../components/StateViews";

function BookingConfirmation() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const booking = location.state?.booking ?? null;

  if (!booking) {
    return <Navigate to="/my-booking" replace />;
  }

  const locale = i18n.language;
  const zone = booking.centre?.timezone;
  const quantityQuintal = kgToQuintal(booking.quantityKg);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-green-700 text-white">
        <div className="mx-auto flex w-full max-w-lg items-center justify-end px-4 py-4">
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-8">
        <div className="rounded-3xl bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-3xl font-bold text-white shadow-sm">
              ✓
            </div>
          </div>

          <h1 className="mt-7 text-2xl font-bold text-black">
            {t("bookingConfirmedTitle")}
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black">
            {t("bookingConfirmedMessage")}
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-black">
                {t("bookingCode")}
              </p>

              <p className="mt-1 text-lg font-bold tracking-wide text-black">
                {booking.bookingCode}
              </p>
            </div>

            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-black">
                {t("tokenNumberLabel")}
              </p>

              <p className="mt-1 text-lg font-bold tracking-wide text-black">
                {booking.tokenNumber}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-sm text-black">
                {t("procurementCentre")}
              </span>

              <span className="text-right text-sm font-semibold text-black">
                {booking.centre?.name}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 py-3">
              <span className="text-sm text-black">
                {t("crop")}
              </span>

              <span className="text-sm font-semibold text-black">
                {booking.crop?.name}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 py-3">
              <span className="text-sm text-black">
                {t("quantity")}
              </span>

              <span className="text-sm font-semibold text-black">
                {formatQuantity(quantityQuintal, locale)}{" "}
                {t("quintal")}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 py-3">
              <span className="text-sm text-black">
                {t("date")}
              </span>

              <span className="text-sm font-semibold text-black">
                {formatDate(
                  booking.serviceDate,
                  zone,
                  locale,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-black">
                {t("arriveBy")}
              </span>

              <span className="text-right text-sm font-semibold text-black">
                {formatTimeRange(
                  booking.scheduledStartAt,
                  booking.processingEndAt,
                  zone,
                  locale,
                )}
              </span>
            </div>

            <DataTypeNote dataType={booking.centre?.dataType} />
          </div>

          <p className="mt-4 text-xs text-black">
            {t("statusLabel")}:{" "}
            {translateDisplayStatus(
              t,
              booking.displayStatus,
            )}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/dashboard", { replace: true })
            }
            className="mt-6 min-h-12 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            {t("goToDashboard")}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/my-booking", { replace: true })
            }
            className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-black"
          >
            {t("myBooking")}
          </button>
        </div>
      </main>
    </div>
  );
}

export default BookingConfirmation;