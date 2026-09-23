import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Slot } from "../../components/Slot";

const QueuePage = ({ farmers, morningSetup, onMarkArrived }) => {
  const { t } = useTranslation();
  const [selectedCrop, setSelectedCrop] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("Active");

  const visibleFarmers = useMemo(
    () =>
      farmers.filter((farmer) =>
        selectedStatus === "Active"
          ? farmer.status !== "Cleared"
          : farmer.status === "Cleared",
      ),
    [farmers, selectedStatus],
  );

  const cropFilters = [
    "All",
    ...new Set(visibleFarmers.map((farmer) => farmer.crop)),
  ];

  const filteredFarmers = useMemo(() => {
    if (selectedCrop === "All") return visibleFarmers;
    return visibleFarmers.filter((farmer) => farmer.crop === selectedCrop);
  }, [selectedCrop, visibleFarmers]);

  const headerTitle =
    selectedStatus === "Active" ? t("queueList") : t("clearedToday");

  const nextSlotFarmer = useMemo(
    () => filteredFarmers.find((farmer) => farmer.status === "Queued"),
    [filteredFarmers],
  );

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black">
            {t("liveQueue")}
          </p>
          <h2 className="text-2xl font-black leading-tight text-black sm:text-3xl">
            {t("procurementQueue")}
          </h2>
        </div>
      </div>

      <div className="rounded-[26px] border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-black">{t("queueOverview")}</h3>
          <span className="rounded-full bg-green-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
            {t("totalSlotsToday", { count: morningSetup?.slotsOpen ?? 0 })}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: t("activeLabel"), value: "Active" },
          { label: t("clearedToday"), value: "Cleared" },
        ].map((tab) => {
          const active = selectedStatus === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedStatus(tab.value)}
              className={[
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                active
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-emerald-200 bg-emerald-50 text-black hover:bg-emerald-100",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {cropFilters.map((crop) => {
          const active = crop === selectedCrop;

          return (
            <button
              key={crop}
              type="button"
              onClick={() => setSelectedCrop(crop)}
              className={[
                "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                active
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-emerald-200 bg-emerald-50 text-black hover:bg-emerald-100",
              ].join(" ")}
            >
              {crop === "All" ? t("allCrops") : crop}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-black">
            {t("farmersLabel")}
          </p>
          <p className="mt-2 text-3xl font-black text-black">
            {filteredFarmers.length}
          </p>
        </div>

        <div className="rounded-2xl border border-lime-200 bg-lime-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-lime-800">
            {t("nextSlot")}
          </p>
          <p className="mt-2 text-3xl font-black text-black">
            {nextSlotFarmer?.slot ?? t("notAvailableShort")}
          </p>
        </div>
      </div>

      <div className="rounded-[26px] border border-emerald-200 bg-white p-4 shadow-sm shadow-emerald-200/30">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-black">{headerTitle}</h3>
        </div>

        {filteredFarmers.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-black">
            {selectedStatus === "Active"
              ? t("noActiveSlots")
              : t("noClearedSlots")}
          </div>
        ) : (
          filteredFarmers.map((farmer, index) => (
            <Slot
              key={farmer.id}
              farmer={farmer}
              isHighlighted={index === 0 && selectedStatus === "Active"}
              onMarkArrived={onMarkArrived}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default QueuePage;
