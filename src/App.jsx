import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { useFaramqueueState } from "./hooks/useFaramqueueState";
import MorningSetupPage from "./pages/MorningSetupPage";
import QueuePage from "./pages/queue";
import ReportsPage from "./pages/ReportsPage";
import StoragePage from "./pages/StoragePage";
import PaymentsPage from "./pages/PaymentsPage";
import WeighmentPage from "./pages/WeighmentPage";
import GateEntryPage from "./pages/GateEntryPage";

const App = () => {
  const {
    farmers,
    storage,
    queueStats,
    paymentAlert,
    selectedDate,
    selectedDateEntries,
    selectedReportFarmerId,
    morningSetup,
    setMorningSetup,
    slotOptions,
    addFarmer,
    clearFarmer,
    saveFarmerReport,
    handleDateChange,
    handlePaymentStatusChange,
    updateFarmer,
    verifyFarmer,
    markFarmerArrived,
    updateCropStorage,
  } = useFaramqueueState();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f5f3] p-0 text-slate-900">
      <div className="mx-auto max-w-[1280px] min-w-0">
        <div className="bg-[#11a255] px-4 py-4 text-white sm:px-6">
          <Navbar />
        </div>

        {paymentAlert && (
          <div
            className={[
              "mx-4 mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm sm:mx-6",
              paymentAlert.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
          >
            {paymentAlert.message}
          </div>
        )}

        <div className="mt-4 grid min-w-0 gap-4 px-4 pb-6 lg:mt-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5 lg:px-6">
          <aside className="rounded-[28px] border border-emerald-200 bg-white/90 p-3 shadow-[0_8px_24px_rgba(16,64,42,0.08)] sm:p-4">
            <div className="grid grid-cols-2 gap-3 lg:block lg:space-y-3">
              {queueStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl border border-emerald-100 ${stat.tone} p-4`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-800/80">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </aside>

          <main className="min-w-0 rounded-[30px] border border-[#e7e7e7] bg-[#fafafa] p-3 shadow-[0_8px_18px_rgba(15,25,20,0.04)] sm:p-4 lg:p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/setup" replace />} />
              <Route
                path="/setup"
                element={
                  <MorningSetupPage
                    farmers={farmers}
                    morningSetup={morningSetup}
                    storage={storage}
                    selectedDate={selectedDate}
                    onSaveMorningSetup={setMorningSetup}
                    onUpdateCropStorage={updateCropStorage}
                  />
                }
              />
              <Route
                path="/farmers"
                element={
                  <GateEntryPage
                    farmers={farmers}
                    onVerifyFarmer={verifyFarmer}
                    onMarkArrived={markFarmerArrived}
                  />
                }
              />
              <Route
                path="/gate-entry"
                element={<Navigate to="/farmers" replace />}
              />
              <Route
                path="/queue"
                element={
                  <QueuePage
                    farmers={farmers}
                    selectedDate={selectedDate}
                    morningSetup={morningSetup}
                    slotOptions={slotOptions}
                    onDateChange={handleDateChange}
                    onAddFarmer={addFarmer}
                    onUpdateFarmer={updateFarmer}
                    onVerifyFarmer={verifyFarmer}
                    onClearFarmer={clearFarmer}
                  />
                }
              />
              <Route
                path="/weighment"
                element={
                  <WeighmentPage
                    farmers={farmers}
                    onUpdateFarmer={updateFarmer}
                    onSaveReport={saveFarmerReport}
                  />
                }
              />
              <Route
                path="/storage"
                element={
                  <StoragePage
                    storage={storage}
                    onUpdateCropStorage={updateCropStorage}
                  />
                }
              />
              <Route
                path="/payments"
                element={
                  <PaymentsPage
                    farmers={selectedDateEntries}
                    onPaymentStatusChange={handlePaymentStatusChange}
                    selectedDate={selectedDate}
                  />
                }
              />
              <Route
                path="/reports"
                element={
                  <ReportsPage
                    farmers={selectedDateEntries}
                    storage={storage}
                    selectedDate={selectedDate}
                    selectedFarmerId={selectedReportFarmerId}
                    onUpdateFarmer={updateFarmer}
                    onSaveReport={saveFarmerReport}
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
