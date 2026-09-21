import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { translateOfficerStatus } from "../../lib/officerStatus";

const defaultCropChoices = ["Wheat", "Rice", "Mustard", "Gram"];


const DashboardPage = ({
  farmers = [],
  morningSetup,
  onSaveMorningSetup,
  storage = [],
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    weighbridgeWorking: true,
    slotsOpen: 6,
    shiftStart: "08:00",
    shiftEnd: "18:00",
    acceptedCrops: ["Wheat", "Rice", "Mustard"],
    mspRates: {
      Wheat: 2275,
      Rice: 2225,
      Mustard: 5650,
      Gram: 5230,
    },
  });
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [dashboardFarmer, setDashboardFarmer] = useState(null);

  // Re-seed the form when a different setup arrives. Done during render
  // rather than in an effect so the fields never paint one frame stale.
  const [syncedSetup, setSyncedSetup] = useState(morningSetup);

  if (morningSetup && morningSetup !== syncedSetup) {
    setSyncedSetup(morningSetup);
    setForm({
      weighbridgeWorking: Boolean(morningSetup.weighbridgeWorking),
      slotsOpen: Number(morningSetup.slotsOpen ?? 6),
      shiftStart: morningSetup.shiftStart ?? "08:00",
      shiftEnd: morningSetup.shiftEnd ?? "18:00",
      acceptedCrops: Array.isArray(morningSetup.acceptedCrops)
        ? morningSetup.acceptedCrops
        : ["Wheat", "Rice", "Mustard"],
      mspRates: {
        ...defaultCropChoices.reduce((acc, crop) => {
          acc[crop] = Number(morningSetup.mspRates?.[crop] ?? 0);
          return acc;
        }, {}),
      },
    });
  }


  const matchingDashboardFarmer = useMemo(() => {
    const query = dashboardSearch.trim();
    if (!query) return null;

    const normalizeValue = (value = "") =>
      String(value)
        .replace(/[^a-z0-9]/gi, "")
        .toLowerCase();

    const normalizedQuery = normalizeValue(query);
    if (!normalizedQuery) return null;

    // Exact matches first, so a short token like "2" never gets shadowed by
    // some other farmer's phone number happening to contain a "2".
    const exactMatch = farmers.find((entry) => {
      const tokenValue = normalizeValue(entry.token);
      const phoneValue = normalizeValue(entry.phone);
      return tokenValue === normalizedQuery || phoneValue === normalizedQuery;
    });
    if (exactMatch) return exactMatch;

    // Partial matching only kicks in once the query is specific enough
    // (4+ digits/letters) to avoid matching against almost every phone number.
    if (normalizedQuery.length < 4) return null;

    return (
      farmers.find((entry) => {
        const tokenValue = normalizeValue(entry.token);
        const phoneValue = normalizeValue(entry.phone);
        return (
          tokenValue.includes(normalizedQuery) ||
          phoneValue.includes(normalizedQuery)
        );
      }) ?? null
    );
  }, [dashboardSearch, farmers]);

  const handleDashboardSearch = () => {
    setDashboardFarmer(matchingDashboardFarmer ?? null);
  };

  const activeFarmers = useMemo(
    () => farmers.filter((farmer) => farmer.status !== "Cleared"),
    [farmers],
  );

  const availableSlots = Math.max(
    (form.slotsOpen ?? 0) - activeFarmers.length,
    0,
  );

  const dashboardStorage = useMemo(() => {
    const purchasedByCrop = farmers.reduce((totals, farmer) => {
      if (!farmer.reportSaved && farmer.status !== "Cleared") return totals;

      const crop = farmer.crop || "Other";
      totals[crop] = (totals[crop] || 0) +
        Number(farmer.actualWeight || farmer.quantity || 0);
      return totals;
    }, {});

    return storage.map((crop) => ({
      ...crop,
      stock: Number(crop.stock || 0) + (purchasedByCrop[crop.crop] || 0),
    }));
  }, [farmers, storage]);

  const summary = [
    {
      key: "weighbridge",
      label: t("weighbridge"),
      value: form.weighbridgeWorking ? t("operational") : t("closed"),
      tone: form.weighbridgeWorking
        ? "bg-emerald-100 text-black"
        : "bg-red-100 text-black",
    },
    {
      key: "totalSlots",
      label: t("totalSlotsLabel"),
      value: t("slotsCount", { count: form.slotsOpen }),
      tone: "bg-emerald-50 text-black",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black">
            {t("dashboard")}
          </p>
          <h2 className="text-2xl font-black text-black sm:text-3xl">
            {t("procurementCenterOverview")}
          </h2>
        </div>
        <button
          type="button"
          onClick={() =>
            onSaveMorningSetup?.({
              ...form,
              acceptedCrops: form.acceptedCrops,
              shiftStart: form.shiftStart,
              shiftEnd: form.shiftEnd,
            })
          }
          className="rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
        >
          🔄 {t("refreshDashboard")}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {summary.map((item) => (
          <div
            key={item.key}
            className={`rounded-2xl border border-emerald-200 p-4 ${item.tone}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
              {item.label}
            </p>
            {item.key === "weighbridge" ? (
              <select
                value={form.weighbridgeWorking ? "working" : "closed"}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    weighbridgeWorking: event.target.value === "working",
                  }))
                }
                className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-lg font-black text-black outline-none"
              >
                <option value="working">{t("operational")}</option>
                <option value="closed">{t("closed")}</option>
              </select>
            ) : (
              <p className="mt-2 text-2xl font-black">{item.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-[26px] border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black">
              {t("todaysShift")}
            </p>
            <h3 className="mt-2 text-lg font-bold text-black">
              {t("shiftTiming")}
            </h3>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-black">
            {t("shiftStartLabel")}
            <input
              type="time"
              value={form.shiftStart}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  shiftStart: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-black outline-none"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-black">
            {t("shiftEndLabel")}
            <input
              type="time"
              value={form.shiftEnd}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  shiftEnd: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-black outline-none"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[26px] border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black">
              {t("slotAvailability")}
            </p>
            <h3 className="mt-2 text-lg font-bold text-black">
              {t("liveCapacityOverview")}
            </h3>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black">
              {t("available")}
            </p>
            <p className="mt-2 text-3xl font-black text-black">
              {availableSlots}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black">
              {t("booked")}
            </p>
            <p className="mt-2 text-3xl font-black text-black">
              {activeFarmers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black">
              {t("totalCapacity")}
            </p>
            <p className="mt-2 text-3xl font-black text-black">
              {form.slotsOpen}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black">
              {t("farmerLookup")}
            </p>
            <h3 className="mt-2 text-lg font-bold text-black">
              {t("quickSearch")}
            </h3>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            value={dashboardSearch}
            onChange={(event) => setDashboardSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleDashboardSearch();
            }}
            placeholder={t("enterTokenOrPhone")}
            className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-black outline-none"
          />
          <button
            type="button"
            onClick={handleDashboardSearch}
            className="rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            🔍 {t("search")}
          </button>
        </div>

        {dashboardFarmer ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                  {t("farmerFound")}
                </p>
                <p className="mt-1 text-lg font-black text-black">
                  {dashboardFarmer.name}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
                {dashboardFarmer.token}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                  {t("crop")}
                </p>
                <p className="mt-1 font-bold text-black">
                  {dashboardFarmer.crop}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                  {t("statusLabel")}
                </p>
                <p className="mt-1 font-bold text-black">
                  {translateOfficerStatus(t, dashboardFarmer.status)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                  {t("phone")}
                </p>
                <p className="mt-1 font-bold text-black">
                  {dashboardFarmer.phone || t("notAvailableShort")}
                </p>
              </div>
            </div>
          </div>
        ) : dashboardSearch ? (
          <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-white p-4 text-sm text-black">
            {t("noFarmerFoundTokenPhone")}
          </div>
        ) : null}
      </div>

      <div className="rounded-[26px] border border-emerald-200 bg-white p-5 shadow-sm shadow-emerald-200/30">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black">
              {t("storageOverview")}
            </p>
            <h3 className="mt-2 text-lg font-bold text-black">
              {t("cropWiseStorageSummary")}
            </h3>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-emerald-200">
          <table className="min-w-full divide-y divide-emerald-200 text-left text-sm">
            <thead className="bg-emerald-50 text-black">
              <tr>
                <th className="px-3 py-2 font-bold">{t("crop")}</th>
                <th className="px-3 py-2 font-bold">{t("msp")}</th>
                <th className="px-3 py-2 font-bold">{t("totalCapacity")}</th>
                <th className="px-3 py-2 font-bold">{t("availableSpace")}</th>
                <th className="px-3 py-2 font-bold">{t("filled")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 bg-white">
              {dashboardStorage.map((crop) => {
                const capacity = Number(crop.capacity || 0);
                const available = Math.max(
                  capacity - Number(crop.stock || 0),
                  0,
                );
                const filledPercent =
                  capacity > 0
                    ? Math.min(100, ((capacity - available) / capacity) * 100)
                    : 0;
                const msp = Number(form.mspRates?.[crop.crop] ?? 0);

                return (
                  <tr key={crop.crop}>
                    <td className="px-3 py-2 font-semibold text-black">
                      {crop.crop}
                    </td>
                    <td className="px-3 py-2 text-black">
                      ₹{msp.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 text-black">
                      {capacity.toLocaleString("en-IN")} {t("quintal")}
                    </td>
                    <td className="px-3 py-2 font-semibold text-black">
                      {available.toLocaleString("en-IN")} {t("quintal")}
                    </td>
                    <td className="px-3 py-2 font-semibold text-black">
                      {filledPercent.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
