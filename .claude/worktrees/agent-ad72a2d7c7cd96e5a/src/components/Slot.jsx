import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { translateOfficerStatus } from "../lib/officerStatus";

export const Slot = ({ farmer, onMarkArrived, isHighlighted = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cardClass = isHighlighted
    ? "border-emerald-400 bg-emerald-50 shadow-emerald-200/60"
    : "border-emerald-200 bg-white";

  const isLate =
    farmer.status === "Queued" &&
    farmer.scheduledStartAt &&
    Date.now() > new Date(farmer.scheduledStartAt).getTime();

  const getActionLabel = () => {
    switch (farmer.status) {
      case "Queued":
        return `🚶 ${t("arrived")}`;
      case "Arrived":
      case "Weighing":
      case "Quality check":
      case "Recorded":
        return `⚖️ ${t("actionWeigh")}`;
      case "Awaiting payment":
        return `💸 ${t("actionPay")}`;
      case "Cleared":
        return `✅ ${t("actionDone")}`;
      default:
        return `🚶 ${t("arrived")}`;
    }
  };

  const handlePrimaryAction = () => {
    switch (farmer.status) {
      case "Queued":
        onMarkArrived?.(farmer.id);
        return;
      case "Arrived":
      case "Weighing":
      case "Quality check":
      case "Recorded":
        navigate("/officer/weighment");
        return;
      case "Awaiting payment":
        navigate("/officer/payments");
        return;
      default:
        return;
    }
  };

  return (
    <div
      className={[
        "mb-3 min-w-0 rounded-2xl border p-3 shadow-sm transition sm:p-4",
        cardClass,
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-black text-black">{farmer.name}</p>
          <p className="text-sm text-black">
            {farmer.token}
            {farmer.laneNo ? ` • ${t("lane")} ${farmer.laneNo}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-black">
            {farmer.crop}
          </span>
          <span className="rounded-full border border-lime-200 bg-lime-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-lime-800">
            {translateOfficerStatus(t, farmer.status)}
          </span>
          {isLate && (
            <span className="rounded-full border border-red-300 bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black">
              ⏰ {t("late")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
          {t("slotTime")}
          <div
            className={[
              "mt-1 w-full rounded-xl border px-2 py-2 text-sm font-semibold",
              isLate
                ? "border-red-300 bg-red-50 text-black"
                : "border-emerald-200 bg-emerald-50 text-black",
            ].join(" ")}
          >
            {farmer.slot || t("notAvailableShort")}
          </div>
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
          {t("quantityInQuintal")}
          <div className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black">
            {farmer.quantity || t("notAvailableShort")}
          </div>
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-black">
          {t("phone")}
          <div className="mt-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm font-semibold text-black">
            {farmer.phone || t("notAvailableShort")}
          </div>
        </label>

        <div className="flex items-end justify-center">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="w-full rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
          >
            {getActionLabel()}
          </button>
        </div>
      </div>
    </div>
  );
};
