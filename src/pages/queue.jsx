import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Slot } from "../components/Slot";

const QueuePage = ({
  farmers,
  selectedDate,
  onDateChange,
  onUpdateFarmer,
  onClearFarmer,
}) => {
  const navigate = useNavigate();
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

  const handleClearFarmer = (id) => {
    const clearedFarmer = onClearFarmer(id);
    if (clearedFarmer) {
      navigate("/reports");
    }
  };

  const headerTitle =
    selectedStatus === "Active" ? "Queue list" : "Cleared today";

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a5640]">
            Live queue
          </p>
          <h2 className="text-2xl font-black leading-tight text-[#3d281b] sm:text-3xl">
            Today's procurement
          </h2>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-[#d8b57d] bg-[#fffaf3] px-3 py-2 text-sm font-semibold text-[#3d281b]">
          <span className="text-xs uppercase tracking-[0.14em] text-[#7a5640]">
            Date
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onDateChange?.(event.target.value)}
            className="bg-transparent text-sm font-semibold text-[#3d281b] outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Active", value: "Active" },
          { label: "Cleared today", value: "Cleared" },
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
                  ? "border-[#9e5e36] bg-[#9e5e36] text-white"
                  : "border-[#dcc299] bg-[#f7e9d0] text-[#5a3c2d] hover:bg-[#f2d7a2]",
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
                  ? "border-[#9e5e36] bg-[#9e5e36] text-white"
                  : "border-[#dcc299] bg-[#f7e9d0] text-[#5a3c2d] hover:bg-[#f2d7a2]",
              ].join(" ")}
            >
              {crop}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#e5c999] bg-[#f7d9b5] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7a5640]">
            Farmers
          </p>
          <p className="mt-2 text-3xl font-black text-[#3d281b]">
            {filteredFarmers.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#e5c999] bg-[#e8f0d9] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7a5640]">
            Next slot
          </p>
          <p className="mt-2 text-3xl font-black text-[#3d281b]">
            {filteredFarmers[0]?.slot ?? "N/A"}
          </p>
        </div>
      </div>

      <div className="rounded-[26px] border border-[#e7cf9f] bg-[#fffaf2] p-4 shadow-sm shadow-[#d2b17a]/30">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-[#3d281b]">{headerTitle}</h3>
        </div>

        {filteredFarmers.map((farmer, index) => (
          <Slot
            key={farmer.id}
            farmer={farmer}
            isHighlighted={index === 0 && selectedStatus === "Active"}
            onUpdateFarmer={onUpdateFarmer}
            onClearFarmer={handleClearFarmer}
          />
        ))}
      </div>
    </div>
  );
};

export default QueuePage;
