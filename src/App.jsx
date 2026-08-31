import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { useFaramqueueState } from "./hooks/useFaramqueueState";
import QueuePage from "./pages/queue";
import StoragePage from "./pages/StoragePage";
import PaymentsPage from "./pages/PaymentsPage";
import ReportsPage from "./pages/ReportsPage";

const App = () => {
  const {
    farmers,
    storage,
    queueStats,
    paymentAlert,
    selectedDate,
    selectedDateEntries,
    selectedReportFarmerId,
    addFarmer,
    clearFarmer,
    saveFarmerReport,
    handleDateChange,
    handlePaymentStatusChange,
    updateFarmer,
    verifyFarmer,
    updateCropStorage,
  } = useFaramqueueState();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#fdf6eb,_#f1d4a2_28%,_#dba86e_100%)] p-3 text-[#2f241d] sm:p-4 lg:p-6">
      <div className="mx-auto max-w-7xl min-w-0">
        <Navbar />

        {paymentAlert && (
          <div
            className={[
              "mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm",
              paymentAlert.tone === "success"
                ? "border-[#b8d7b2] bg-[#edf8ee] text-[#265b3d]"
                : "border-[#e6b7a5] bg-[#fef0eb] text-[#8a3d2f]",
            ].join(" ")}
          >
            {paymentAlert.message}
          </div>
        )}

        <div className="mt-4 grid min-w-0 gap-4 lg:mt-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5">
          <aside className="rounded-[28px] border border-[#d9b37c] bg-[#f7e8cf]/90 p-3 shadow-[0_18px_40px_rgba(121,79,45,0.12)] backdrop-blur-sm sm:p-4">
            <div className="grid grid-cols-2 gap-3 lg:block lg:space-y-3">
              {queueStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl border border-[#e4c999] ${stat.tone} p-4`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#37281d]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </aside>

          <main className="min-w-0 rounded-[30px] border border-[#d9b37c] bg-[#fffaf2]/90 p-3 shadow-[0_18px_40px_rgba(121,79,45,0.12)] backdrop-blur-sm sm:p-4 lg:p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/queue" replace />} />
              <Route
                path="/queue"
                element={
                  <QueuePage
                    farmers={farmers}
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    onAddFarmer={addFarmer}
                    onUpdateFarmer={updateFarmer}
                    onVerifyFarmer={verifyFarmer}
                    onClearFarmer={clearFarmer}
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
