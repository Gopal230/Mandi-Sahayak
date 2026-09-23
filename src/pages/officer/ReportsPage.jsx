import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { translateOfficerStatus } from "../../lib/officerStatus";

const ReportsPage = ({
  farmers = [],
  selectedDate,
  selectedFarmerId = null,
  savedFarmerId = null,
  onAcknowledgeSavedReport,
}) => {
  const { t } = useTranslation();
  const clearedFarmers = useMemo(
    () =>
      farmers
        .filter(
          (farmer) =>
            farmer.status === "Cleared" || farmer.paymentStatus === "Cleared",
        )
        .sort(
          (a, b) =>
            (a.date || "").localeCompare(b.date || "") ||
            Number(b.id) - Number(a.id),
        ),
    [farmers],
  );

  const [activeFarmerId, setActiveFarmerId] = useState(selectedFarmerId);
  const [syncedFarmerId, setSyncedFarmerId] = useState(selectedFarmerId);

  // A save picks the record to show; clicking the cleared list overrides it.
  if (selectedFarmerId !== syncedFarmerId) {
    setSyncedFarmerId(selectedFarmerId);
    setActiveFarmerId(selectedFarmerId);
  }

  const selectedFarmer = useMemo(() => {
    if (!clearedFarmers.length) return null;
    const chosenId = activeFarmerId ?? selectedFarmerId ?? clearedFarmers[0].id;
    return (
      clearedFarmers.find((farmer) => farmer.id === chosenId) ??
      clearedFarmers[0]
    );
  }, [activeFarmerId, clearedFarmers, selectedFarmerId]);

  const [form, setForm] = useState({
    name: "",
    token: "",
    crop: "",
    quantity: "",
    slot: "",
    actualWeight: "",
    money: "",
    paymentStatus: "Pending",
  });

  const [formFarmer, setFormFarmer] = useState(null);

  if (selectedFarmer && selectedFarmer !== formFarmer) {
    setFormFarmer(selectedFarmer);
    setForm({
      name: selectedFarmer.name ?? "",
      token: selectedFarmer.token ?? "",
      crop: selectedFarmer.crop ?? "",
      quantity: selectedFarmer.quantity ?? "",
      slot: selectedFarmer.slot ?? "",
      actualWeight: selectedFarmer.actualWeight ?? "",
      money: selectedFarmer.paidAmount ?? "",
      paymentStatus: selectedFarmer.paymentStatus ?? "Pending",
    });
  }

  // The summary is derived, not stored: it shows for the one booking a save
  // just signalled, and disappears the moment that signal is acknowledged.
  const savedSummary = useMemo(() => {
    if (savedFarmerId == null) return null;

    const savedFarmer = clearedFarmers.find(
      (farmer) => farmer.id === savedFarmerId,
    );
    if (!savedFarmer) return null;

    return {
      name: savedFarmer.name,
      token: savedFarmer.token,
      crop: savedFarmer.crop,
      actualWeight: savedFarmer.actualWeight || savedFarmer.quantity || "0",
      money: savedFarmer.paidAmount || "0",
      paymentStatus: savedFarmer.paymentStatus || "Cleared",
    };
  }, [clearedFarmers, savedFarmerId]);

  const cropTotals = useMemo(() => {
    const summary = {};

    clearedFarmers.forEach((farmer) => {
      const cropName = farmer.crop || "Other";
      const quantity = Number(farmer.actualWeight || farmer.quantity || 0);
      const amount = Number(farmer.paidAmount || 0);

      if (!summary[cropName]) {
        summary[cropName] = {
          crop: cropName,
          totalQuantity: 0,
          totalAmount: 0,
          farmers: 0,
        };
      }

      summary[cropName].totalQuantity += quantity;
      summary[cropName].totalAmount += amount;
      summary[cropName].farmers += 1;
    });

    return Object.values(summary).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [clearedFarmers]);

  const totalQuantity = cropTotals.reduce(
    (sum, crop) => sum + Number(crop.totalQuantity || 0),
    0,
  );
  const totalAmount = cropTotals.reduce(
    (sum, crop) => sum + Number(crop.totalAmount || 0),
    0,
  );

  const reports = [
    {
      key: "dailyCollection",
      title: t("todaysClearedQueue"),
      value: t("slotsClearedCount", { count: clearedFarmers.length || 0 }),
    },
    {
      key: "farmersServed",
      title: t("farmersServed"),
      value: String(clearedFarmers.length || 0),
      detail: t("acrossActiveProcurement"),
    },
    {
      key: "netDue",
      title: t("paymentsEnteredToday"),
      value: `₹${totalAmount.toLocaleString("en-IN")}`,
    },
  ];

  return (
    <>
      {savedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-emerald-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-black">
                ✓
              </div>
            </div>

            <h3 className="mt-4 text-center text-2xl font-black text-black">
              {t("reportSavedTitle")}
            </h3>

            <div className="mt-4 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-black">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{t("farmer")}</span>
                <span className="text-right font-bold text-black">
                  {savedSummary.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{t("tokenLabel")}</span>
                <span className="text-right font-bold text-black">
                  {savedSummary.token}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{t("crop")}</span>
                <span className="text-right font-bold text-black">
                  {savedSummary.crop}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{t("actualWeightLabel")}</span>
                <span className="text-right font-bold text-black">
                  {savedSummary.actualWeight} {t("quintal")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{t("amountLabel")}</span>
                <span className="text-right font-bold text-black">
                  ₹{Number(savedSummary.money || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{t("statusLabel")}</span>
                <span className="text-right font-bold text-black">
                  {translateOfficerStatus(t, savedSummary.paymentStatus)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAcknowledgeSavedReport?.()}
              className="mt-4 w-full rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
            >
              ✅ {t("ok")}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5 rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm shadow-emerald-200/30 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black">
              {t("clearedSlotLabel")}
            </p>
            <h2 className="text-xl font-bold text-black sm:text-2xl">
              {t("operationalReports")}
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-black">
              {selectedDate ?? t("officerToday")}
            </p>
          </div>
          <button className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-100">
            📄 {t("exportPdf")}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {reports.map((report) => (
            <div
              key={report.key}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
            >
              <p className="text-sm font-semibold text-black">
                {report.title}
              </p>
              <h3 className="mt-2 text-3xl font-black text-black">
                {report.value}
              </h3>
              {report.detail && (
                <p className="mt-2 text-sm text-black">{report.detail}</p>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-[26px] border border-emerald-200 bg-white p-4 shadow-sm shadow-emerald-200/30">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-black text-black">
              {t("todaysReport")}
            </h3>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
              {t("quintalTotal", { count: totalQuantity })}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-emerald-200">
            <table className="min-w-full divide-y divide-emerald-200 text-left text-sm">
              <thead className="bg-emerald-50 text-black">
                <tr>
                  <th className="px-3 py-2 font-bold">{t("crop")}</th>
                  <th className="px-3 py-2 font-bold">{t("farmersLabel")}</th>
                  <th className="px-3 py-2 font-bold">{t("qtyBought")}</th>
                  <th className="px-3 py-2 font-bold">{t("amountPaid")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100 bg-white">
                {cropTotals.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-3 py-4 text-black">
                      {t("noClearedRecordsYet")}
                    </td>
                  </tr>
                ) : (
                  cropTotals.map((crop) => (
                    <tr key={crop.crop}>
                      <td className="px-3 py-2 font-semibold text-black">
                        {crop.crop}
                      </td>
                      <td className="px-3 py-2 text-black">
                        {crop.farmers}
                      </td>
                      <td className="px-3 py-2 text-black">
                        {Number(crop.totalQuantity || 0).toLocaleString(
                          "en-IN",
                        )}{" "}
                        {t("quintal")}
                      </td>
                      <td className="px-3 py-2 font-semibold text-black">
                        ₹{Number(crop.totalAmount || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {clearedFarmers.length > 0 && (
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 shadow-sm shadow-emerald-200/30">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-black">
              {t("clearedRecordsLabel")}
            </p>
            <div className="flex flex-wrap gap-2">
              {clearedFarmers.map((farmer) => {
                const isSelected = selectedFarmer?.id === farmer.id;

                return (
                  <button
                    key={farmer.id}
                    type="button"
                    onClick={() => setActiveFarmerId(farmer.id)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      isSelected
                        ? "border-green-700 bg-green-700 text-white"
                        : "border-emerald-200 bg-emerald-50 text-black hover:bg-emerald-100",
                    ].join(" ")}
                  >
                    {farmer.token} • {farmer.slot}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedFarmer ? (
          <div className="rounded-[26px] border border-emerald-200 bg-white p-4 shadow-sm shadow-emerald-200/30">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black">
                  {t("activeEntry")}
                </p>
                <h3 className="text-xl font-black text-black">
                  {selectedFarmer.token}
                </h3>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
                {t("farmerNameLabel")}
                <input
                  value={form.name}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
                {t("tokenLabel")}
                <input
                  value={form.token}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
                {t("crop")}
                <input
                  value={form.crop}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
                {t("qtyQuintalLabel")}
                <input
                  value={form.quantity}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
                {t("slotTime")}
                <input
                  value={form.slot}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
                {t("dateLabel")}
                <input
                  value={selectedFarmer.date ?? selectedDate ?? ""}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
                {t("actualWeightQuintalLabel")}
                <input
                  value={form.actualWeight}
                  readOnly
                  className="mt-1 w-full cursor-default rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
                {t("moneyRupeeLabel")}
                <input
                  value={form.money}
                  readOnly
                  className="mt-1 w-full cursor-default rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
                {t("paymentStatusLabel")}
                <input
                  value={translateOfficerStatus(t, form.paymentStatus)}
                  readOnly
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black"
                />
              </label>
            </div>

          </div>
        ) : (
          <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 text-black">
            {t("noClearedSlotsToday")}
          </div>
        )}
      </div>
    </>
  );
};

export default ReportsPage;
