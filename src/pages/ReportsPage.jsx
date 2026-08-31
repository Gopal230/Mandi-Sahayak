import { useEffect, useMemo, useState } from "react";

const ReportsPage = ({
  farmers = [],
  selectedDate,
  selectedFarmerId = null,
  onUpdateFarmer,
  onSaveReport,
}) => {
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

  useEffect(() => {
    setActiveFarmerId(selectedFarmerId);
  }, [selectedFarmerId]);

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
    lateMinutes: "",
    paymentStatus: "Pending",
  });

  useEffect(() => {
    if (!selectedFarmer) return;

    setForm({
      name: selectedFarmer.name ?? "",
      token: selectedFarmer.token ?? "",
      crop: selectedFarmer.crop ?? "",
      quantity: selectedFarmer.quantity ?? "",
      slot: selectedFarmer.slot ?? "",
      actualWeight: selectedFarmer.actualWeight ?? "",
      money: selectedFarmer.paidAmount ?? "",
      lateMinutes: selectedFarmer.lateMinutes ?? "",
      paymentStatus: selectedFarmer.paymentStatus ?? "Pending",
    });
  }, [selectedFarmer]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveReport = () => {
    if (!selectedFarmer || !onSaveReport) return;

    onSaveReport(selectedFarmer.id, {
      actualWeight: form.actualWeight,
      money: form.money,
      lateMinutes: form.lateMinutes,
      paymentStatus: form.paymentStatus,
    });
  };

  const reports = [
    {
      title: "Daily collection",
      value: `${clearedFarmers.length || 0} slots cleared`,
      detail: "Today’s cleared queue",
    },
    {
      title: "Farmers served",
      value: String(clearedFarmers.length || 0),
      detail: "Across active procurement",
    },
    {
      title: "Net due",
      value: `₹${clearedFarmers
        .reduce((sum, farmer) => sum + Number(farmer.paidAmount || 0), 0)
        .toLocaleString("en-IN")}`,
      detail: "Payments entered today",
    },
  ];

  return (
    <div className="space-y-5 rounded-3xl border border-[#e7d0a7] bg-[#fffaf2] p-4 shadow-sm shadow-[#d3b07a]/30 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a5640]">
            Cleared slot
          </p>
          <h2 className="text-xl font-bold text-[#3b291e] sm:text-2xl">
            Operational reports
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5640]">
            {selectedDate ?? "Today"}
          </p>
        </div>
        <button className="rounded-full border border-[#d9b37c] bg-[#f4dab8] px-4 py-2 text-sm font-semibold text-[#3d281b] hover:bg-[#efcd9d]">
          Export PDF
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((report) => (
          <div
            key={report.title}
            className="rounded-2xl border border-[#ecd5a7] bg-[#f6e4c8] p-5"
          >
            <p className="text-sm font-medium text-[#7a5640]">{report.title}</p>
            <h3 className="mt-2 text-3xl font-black text-[#3d281b]">
              {report.value}
            </h3>
            <p className="mt-2 text-sm text-[#6d4d38]">{report.detail}</p>
          </div>
        ))}
      </div>

      {clearedFarmers.length > 0 && (
        <div className="rounded-[22px] border border-[#e7cf9f] bg-[#fffaf2] p-4 shadow-sm shadow-[#d2b17a]/30">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5640]">
            Cleared records
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
                      ? "border-[#9e5e36] bg-[#9e5e36] text-white"
                      : "border-[#dcc299] bg-[#f7e9d0] text-[#5a3c2d] hover:bg-[#f2d7a2]",
                  ].join(" ")}
                >
                  {farmer.name} • {farmer.slot}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedFarmer ? (
        <div className="rounded-[26px] border border-[#e7cf9f] bg-[#fffaf2] p-4 shadow-sm shadow-[#d2b17a]/30">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5640]">
                Active entry
              </p>
              <h3 className="text-xl font-black text-[#3d281b]">
                {selectedFarmer.name}
              </h3>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Farmer name
              <input
                value={form.name}
                readOnly
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#f7efe5] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Token
              <input
                value={form.token}
                readOnly
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#f7efe5] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Crop
              <input
                value={form.crop}
                readOnly
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#f7efe5] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Qty (kg)
              <input
                value={form.quantity}
                readOnly
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#f7efe5] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Slot time
              <input
                value={form.slot}
                readOnly
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#f7efe5] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Date
              <input
                value={selectedFarmer.date ?? selectedDate ?? ""}
                readOnly
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#f7efe5] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Actual weight (kg)
              <input
                type="number"
                value={form.actualWeight}
                onChange={(event) =>
                  handleFieldChange("actualWeight", event.target.value)
                }
                placeholder="Enter actual weight"
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#fffaf3] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Money (₹)
              <input
                type="number"
                value={form.money}
                onChange={(event) =>
                  handleFieldChange("money", event.target.value)
                }
                placeholder="Enter amount"
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#fffaf3] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Time late (min)
              <input
                type="number"
                value={form.lateMinutes}
                onChange={(event) =>
                  handleFieldChange("lateMinutes", event.target.value)
                }
                placeholder="Minutes late"
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#fffaf3] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Payment status
              <select
                value={form.paymentStatus}
                disabled={selectedFarmer.paymentStatus === "Cleared"}
                onChange={(event) =>
                  handleFieldChange("paymentStatus", event.target.value)
                }
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#fffaf3] px-2 py-2 text-sm font-medium text-[#3d281b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="Pending">Pending</option>
                <option value="Cleared">Cleared</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={handleSaveReport}
              className="rounded-full bg-[#9e5e36] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8c502a]"
            >
              Save report
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-[26px] border border-[#ead4a7] bg-[#f5ebd7] p-5 text-[#5c402f]">
          No cleared slots yet for today.
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
