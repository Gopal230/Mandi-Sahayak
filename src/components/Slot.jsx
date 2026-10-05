import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Icon from "./Icon";
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

  const getAction = () => {
    switch (farmer.status) {
      case "Queued":
        return { icon: "walker", label: t("arrived") };
      case "Arrived":
      case "Weighing":
      case "Quality check":
      case "Recorded":
        return { icon: "scale", label: t("actionWeigh") };
      case "Awaiting payment":
        return { icon: "creditCard", label: t("actionPay") };
      case "Cleared":
        return { icon: "check", label: t("actionDone") };
      default:
        return { icon: "walker", label: t("arrived") };
    }
  };
  const action = getAction();

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
              <Icon name="clock" className="mr-1 inline h-3.5 w-3.5" />
              {t("late")}
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
            <span className="inline-flex items-center justify-center gap-2">
              <Icon name={action.icon} className="h-4 w-4" />
              {action.label}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
