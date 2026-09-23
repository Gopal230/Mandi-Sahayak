import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/context";
import LanguageToggle from "../../components/LanguageToggle";
import api from "../../lib/api";
import { useFaramqueueState } from "../../hooks/useFaramqueueState";
import useApiResource from "../../hooks/useApiResource";
import useOfficerQueue from "../../hooks/useOfficerQueue";
import CentrePicker from "../../components/CentrePicker";
import { ErrorState, Loading } from "../../components/StateViews";
import { translateError } from "../../lib/codes";
import { translateOfficerStatus } from "../../lib/officerStatus";
import DashboardPage from "./DashboardPage";
import QueuePage from "./QueuePage";
import WeighmentPage from "./WeighmentPage";
import PaymentsPage from "./PaymentsPage";
import ReportsPage from "./ReportsPage";

const navClass = ({ isActive }) =>
  [
    "flex shrink-0 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition sm:px-4",
    isActive
      ? "border-white/50 bg-white text-black shadow-lg shadow-emerald-950/10"
      : "border-white/25 bg-white/10 text-white hover:bg-white/20",
  ].join(" ");

/**
 * The officer portal.
 *
 * The screens are the Mandi Sahayak prototype's, kept whole: one local state
 * hook backs every page and persists to localStorage. Only the shell is shared
 * with the rest of the app, so the signed-in officer's name and sign-out come
 * from the real session and the portal still sits behind staff login.
 */
function OfficerPortal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { farmer, signOut } = useAuth();

  const NAV_ITEMS = [
    { label: t("dashboard"), symbol: "▦", to: "/officer", end: true },
    { label: t("queue"), symbol: "☰", to: "/officer/queue" },
    { label: t("weighment"), symbol: "⚖", to: "/officer/weighment" },
    { label: t("payments"), symbol: "₹", to: "/officer/payments" },
    { label: t("reports"), symbol: "▤", to: "/officer/reports" },
  ];

  // The operational screens read and write the server.
  const {
    centre,
    farmers,
    queueStats,
    paymentAlert,
    selectedDate,
    selectedDateEntries,
    selectedReportFarmerId,
    savedReportFarmerId,
    acknowledgeSavedReport,
    loading,
    error,
    reload,
    saveFarmerReport,
    savingBookings,
    handleDateChange,
    handlePaymentStatusChange,
    updateFarmer,
    markFarmerArrived,
  } = useOfficerQueue();

  // Centre configuration (weighbridge status, slot count, shift hours) has no
  // officer endpoint — that screen stays on the prototype's local state.
  const { morningSetup, setMorningSetup } = useFaramqueueState();

  // Crop-wise storage: capacity recorded at officer registration, against
  // grain actually on hand (server-computed from COMPLETED bookings).
  const storageSummary = useApiResource(
    (signal) => api.officerCentreStorage(centre.centreId, signal),
    [centre.centreId],
    { enabled: Boolean(centre.centreId) },
  );

  async function handleSignOut() {
    await signOut();
    navigate("/staff-login", { replace: true });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f5f3] p-0 text-black">
      <div className="mx-auto max-w-[1280px] min-w-0">
        <div className="bg-[#0e8a48] px-4 py-4 text-white sm:px-6">
          <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 w-full sm:w-auto">
              <p className="flex items-center gap-2 text-lg font-black uppercase tracking-[0.18em] text-white">
                <span aria-hidden="true">🌾</span>
                {t("appName")}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white/85">
                {t("namasteOfficer", {
                  name: farmer?.fullName ?? t("officer"),
                })}
              </p>
              {centre.centre && (
                <p className="mt-1 truncate text-sm font-semibold text-white/85">
                  🏪 {centre.centre.name}
                </p>
              )}
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:flex-nowrap">
              <label className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                <span className="text-xs uppercase tracking-[0.14em] text-white/70">
                  {t("dateLabel")}
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => handleDateChange?.(event.target.value)}
                  className="scheme-dark bg-transparent text-sm font-semibold text-white outline-none"
                />
              </label>
              <LanguageToggle />
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                ⏻ {t("signOut")}
              </button>
            </div>
          </div>

          <nav className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:pb-0">
            {NAV_ITEMS.map(({ label, symbol, to, end }) => (
              <NavLink key={label} to={to} end={end} className={navClass}>
                <span aria-hidden="true" className="mr-1.5">
                  {symbol}
                </span>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {paymentAlert && (
          <div
            className={[
              "mx-4 mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm sm:mx-6",
              paymentAlert.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-black"
                : "border-red-200 bg-red-50 text-black",
            ].join(" ")}
          >
            {paymentAlert.message.error
              ? translateError(t, paymentAlert.message.error)
              : t(paymentAlert.message.key, {
                  ...paymentAlert.message.params,
                  status: paymentAlert.message.params?.status
                    ? translateOfficerStatus(
                        t,
                        paymentAlert.message.params.status,
                      )
                    : undefined,
                })}
          </div>
        )}

        <div className="mt-4 grid min-w-0 gap-4 px-4 pb-6 lg:mt-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5 lg:px-6">
          <aside className="rounded-[28px] border border-emerald-200 bg-white/90 p-3 shadow-[0_8px_24px_rgba(16,64,42,0.08)] sm:p-4">
            <div className="grid grid-cols-2 gap-3 lg:block lg:space-y-3">
              {queueStats.map((stat) => (
                <div
                  key={stat.labelKey}
                  className={`rounded-2xl border border-emerald-100 ${stat.tone} p-4`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/80">
                    {t(stat.labelKey)}
                  </p>
                  <p className="mt-2 text-3xl font-black text-black">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </aside>

          <main className="min-w-0 rounded-[30px] border border-[#e7e7e7] bg-[#fafafa] p-3 shadow-[0_8px_18px_rgba(15,25,20,0.04)] sm:p-4 lg:p-6">
            {centre.centres.length > 1 && (
              <div className="mb-4">
                <CentrePicker centre={centre} />
              </div>
            )}

            {error && <ErrorState error={error} onRetry={reload} />}

            {loading && <Loading />}

            <Routes>
              <Route
                index
                element={
                  <DashboardPage
                    farmers={farmers}
                    morningSetup={morningSetup}
                    storageSummary={storageSummary.data?.crops ?? []}
                    onSaveMorningSetup={setMorningSetup}
                  />
                }
              />
              <Route
                path="gate"
                element={<Navigate to="/officer/queue" replace />}
              />
              <Route
                path="queue"
                element={
                  <QueuePage
                    farmers={farmers}
                    morningSetup={morningSetup}
                    onUpdateFarmer={updateFarmer}
                    onMarkArrived={markFarmerArrived}
                  />
                }
              />
              <Route
                path="weighment"
                element={
                  <WeighmentPage
                    farmers={farmers}
                    onUpdateFarmer={updateFarmer}
                    onSaveReport={saveFarmerReport}
                    savingBookings={savingBookings}
                  />
                }
              />
              <Route
                path="payments"
                element={
                  <PaymentsPage
                    farmers={selectedDateEntries}
                    onPaymentStatusChange={handlePaymentStatusChange}
                    selectedDate={selectedDate}
                  />
                }
              />
              <Route
                path="reports"
                element={
                  <ReportsPage
                    farmers={selectedDateEntries}
                    selectedDate={selectedDate}
                    selectedFarmerId={selectedReportFarmerId}
                    savedFarmerId={savedReportFarmerId}
                    onAcknowledgeSavedReport={acknowledgeSavedReport}
                    onUpdateFarmer={updateFarmer}
                    onSaveReport={saveFarmerReport}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/officer" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default OfficerPortal;
