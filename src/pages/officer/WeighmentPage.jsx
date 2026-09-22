import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * The accepted / rejected / moisture inputs for the quality-check step. A
 * component of its own, keyed by `${bookingCode}:${apiStatus}` from the
 * parent, so switching farmers (or a booking moving into QUALITY_CHECK)
 * remounts it with fresh initial state instead of needing an effect to
 * re-seed values pulled from props.
 */
function QualityCheckFields({ farmer, netWeight, onValuesChange, t }) {
  const initial = useMemo(
    () => ({
      accepted: farmer.actualWeight || (netWeight > 0 ? String(netWeight) : ""),
      rejected: farmer.quality?.brokenGrain ?? "",
      moisture: farmer.quality?.moisture ?? "",
      rejectionReason: farmer.rejectionReason ?? "",
    }),
    // Computed once per mount (this component is remounted via `key` when the
    // farmer or stage changes), so it intentionally ignores later prop churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [accepted, setAccepted] = useState(initial.accepted);
  const [rejected, setRejected] = useState(initial.rejected);
  const [moisture, setMoisture] = useState(initial.moisture);
  const [rejectionReason, setRejectionReason] = useState(
    initial.rejectionReason,
  );

  const emit = (next) => onValuesChange({ ...next });

  return (
    <div className="mt-6 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
        {t("qualityCheckRequired")}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-black">
          {t("acceptedQuantity")} ({t("quintal")})
          <input
            type="number"
            value={accepted}
            onChange={(event) => {
              setAccepted(event.target.value);
              emit({ accepted: event.target.value, rejected, moisture, rejectionReason });
            }}
            className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-black outline-none"
          />
        </label>

        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-black">
          {t("rejectedQuantity")} ({t("quintal")})
          <input
            type="number"
            value={rejected}
            onChange={(event) => {
              setRejected(event.target.value);
              emit({ accepted, rejected: event.target.value, moisture, rejectionReason });
            }}
            className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-black outline-none"
          />
        </label>

        <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-black">
          {t("moisture")} (%)
          <input
            type="number"
            value={moisture}
            onChange={(event) => {
              setMoisture(event.target.value);
              emit({ accepted, rejected, moisture: event.target.value, rejectionReason });
            }}
            className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-black outline-none"
          />
        </label>

        {Number(rejected || 0) > 0 && (
          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-black md:col-span-2 xl:col-span-2">
            {t("rejectionReason")}
            <input
              value={rejectionReason}
              onChange={(event) => {
                setRejectionReason(event.target.value);
                emit({ accepted, rejected, moisture, rejectionReason: event.target.value });
              }}
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-black outline-none"
            />
          </label>
        )}
      </div>
    </div>
  );
}

const WeighmentPage = ({ farmers = [], onUpdateFarmer, onSaveReport }) => {
  const { t } = useTranslation();
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);

  // Mirrors QualityCheckFields' latest values, lifted up via its onChange
  // handlers so handleSave can read them without owning the inputs itself.
  const [qualityValues, setQualityValues] = useState({
    accepted: "",
    rejected: "",
    moisture: "",
    rejectionReason: "",
  });

  const activeFarmers = useMemo(
    () =>
      farmers.filter(
        (farmer) =>
          ["Arrived", "Weighing", "Quality check", "Recorded"].includes(
            farmer.status,
          ) && !farmer.reportSaved,
      ),
    [farmers],
  );

  const savedFarmers = useMemo(
    () =>
      farmers.filter(
        (farmer) => farmer.reportSaved || farmer.status === "Cleared",
      ),
    [farmers],
  );

  const selectedFarmer = useMemo(() => {
    if (!activeFarmers.length) return null;
    return (
      activeFarmers.find((farmer) => farmer.id === selectedFarmerId) ??
      activeFarmers[0]
    );
  }, [activeFarmers, selectedFarmerId]);

  const gross = Number(selectedFarmer?.grossWeight ?? 0);
  const tare = Number(selectedFarmer?.tareWeight ?? 0);
  const bagWeight = Number(selectedFarmer?.bagWeight ?? 0);
  const netWeight = Number.isFinite(gross - tare - bagWeight)
    ? gross - tare - bagWeight
    : 0;

  const declared = Number(selectedFarmer?.quantity ?? 0);
  const variance = declared > 0 ? netWeight - declared : 0;
  const isAlert = Math.abs(variance) > 50;

  const isQualityStage = selectedFarmer?.apiStatus === "QUALITY_CHECK";

  const updateField = (field, value) => {
    if (!selectedFarmer) return;
    onUpdateFarmer?.(selectedFarmer.id, field, value);
  };

  const handleSave = async () => {
    if (!selectedFarmer) return;

    if (isQualityStage) {
      const { accepted, rejected, moisture, rejectionReason } = qualityValues;

      await onSaveReport?.(selectedFarmer.id, {
        actualWeight: accepted || String(netWeight || 0),
        rejectedWeight: rejected || "0",
        moisture,
        rejectionReason,
      });
      return;
    }

    await onSaveReport?.(selectedFarmer.id, {
      grossWeight: selectedFarmer.grossWeight ?? "",
      lateMinutes: selectedFarmer.lateMinutes ?? "",
      paymentStatus: "Pending",
    });
  };

  if (!selectedFarmer) {
    return (
      <div className="space-y-4">
        <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-6 text-black">
          {t("noFarmerRecordsWeighment")}
        </div>

        {savedFarmers.length > 0 && (
          <div className="rounded-[26px] border border-emerald-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-black">
              {t("savedWeighmentRecords")}
            </h3>
            <div className="mt-4 space-y-2">
              {savedFarmers.map((farmer) => (
                <div
                  key={`saved-weighment-${farmer.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"
                >
                  <div>
                    <p className="font-bold text-black">{farmer.name}</p>
                    <p className="text-xs text-black">
                      {farmer.crop} •{" "}
                      {farmer.actualWeight || farmer.quantity || 0}{" "}
                      {t("quintal")}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black">
                    {t("saved")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black">
            {t("weighment")}
          </p>
          <h2 className="text-2xl font-black text-black sm:text-3xl">
            {t("officialProcurementMeasurement")}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeFarmers.map((farmer) => (
            <button
              key={farmer.id}
              type="button"
              onClick={() => setSelectedFarmerId(farmer.id)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                selectedFarmer.id === farmer.id
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-emerald-200 bg-emerald-50 text-black",
              ].join(" ")}
            >
              {farmer.token || farmer.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[26px] border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black">
              {t("activeFarmer")}
            </p>
            <h3 className="mt-2 text-2xl font-black text-black">
              {selectedFarmer.name}
            </h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-black">
            {isQualityStage
              ? t("qualityCheckRequired")
              : selectedFarmer.token}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-black">
            {t("grossWeightQuintal")}
            <input
              type="number"
              value={selectedFarmer.grossWeight ?? ""}
              disabled={isQualityStage}
              onChange={(event) =>
                updateField("grossWeight", event.target.value)
              }
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-black outline-none disabled:bg-slate-100 disabled:text-black/60"
            />
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-black">
            {t("tareWeightQuintal")}
            <input
              type="number"
              value={selectedFarmer.tareWeight ?? ""}
              disabled={isQualityStage}
              onChange={(event) =>
                updateField("tareWeight", event.target.value)
              }
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-black outline-none disabled:bg-slate-100 disabled:text-black/60"
            />
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-black">
            {t("bagWeightQuintal")}
            <input
              type="number"
              value={selectedFarmer.bagWeight ?? ""}
              disabled={isQualityStage}
              onChange={(event) => updateField("bagWeight", event.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-black outline-none disabled:bg-slate-100 disabled:text-black/60"
            />
          </label>

          <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-black md:col-span-2 xl:col-span-1">
            {t("weighbridgeSlipNo")}
            <input
              value={selectedFarmer.slipNumber ?? ""}
              disabled={isQualityStage}
              onChange={(event) =>
                updateField("slipNumber", event.target.value)
              }
              className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-black outline-none disabled:bg-slate-100 disabled:text-black/60"
            />
          </label>
        </div>

        {isQualityStage && (
          <QualityCheckFields
            key={`${selectedFarmer.id}:${selectedFarmer.apiStatus}`}
            farmer={selectedFarmer}
            netWeight={netWeight}
            onValuesChange={setQualityValues}
            t={t}
          />
        )}

        <div className="mt-6 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black">
                {t("officialNetWeight")}
              </p>
              <p className="mt-1 text-4xl font-black text-black">
                {netWeight.toFixed(1)} {t("quintal")}
              </p>
            </div>
            <div className="text-sm font-semibold text-black">
              {t("declaredQuintal", { value: declared })}
            </div>
          </div>

          {isAlert && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-black">
              {t("weightVarianceAlert", {
                diff: Math.abs(variance).toFixed(1),
              })}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-30">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-green-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-green-800"
        >
          {isQualityStage
            ? `✅ ${t("saveQualityAndWeight")}`
            : `⚖️ ${t("saveGrossWeight")}`}
        </button>
      </div>

      {savedFarmers.length > 0 && (
        <div className="rounded-[26px] border border-emerald-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-black">
            {t("savedWeighmentRecords")}
          </h3>
          <div className="mt-4 space-y-2">
            {savedFarmers.map((farmer) => (
              <div
                key={`saved-weighment-${farmer.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"
              >
                <div>
                  <p className="font-bold text-black">{farmer.name}</p>
                  <p className="text-xs text-black">
                    {farmer.crop} •{" "}
                    {farmer.actualWeight || farmer.quantity || 0}{" "}
                    {t("quintal")}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black">
                  {t("saved")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeighmentPage;
