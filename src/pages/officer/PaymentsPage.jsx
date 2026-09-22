import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { translateOfficerStatus } from "../../lib/officerStatus";

const paymentStatusButtons = ["Pending", "Processing", "Cleared"];

const CROP_GRADE_OPTIONS = {
  paddy: [
    { label: "Common (₹2,441/qtl)", value: "Common", rate: 2441 },
    { label: "Grade A (₹2,461/qtl)", value: "Grade A", rate: 2461 },
  ],
  jowar: [
    { label: "Hybrid (₹4,023/qtl)", value: "Hybrid", rate: 4023 },
    { label: "Maldandi (₹4,073/qtl)", value: "Maldandi", rate: 4073 },
  ],
  cotton: [
    { label: "Medium Staple (₹7,721/qtl)", value: "Medium Staple", rate: 7721 },
    { label: "Long Staple (₹8,210/qtl)", value: "Long Staple", rate: 8210 },
  ],
};

const getAvailableGrades = (cropName) => {
  if (!cropName) return null;
  if (/paddy|धान/i.test(cropName)) return CROP_GRADE_OPTIONS.paddy;
  if (/jowar|ज्वार/i.test(cropName)) return CROP_GRADE_OPTIONS.jowar;
  if (/cotton|कपास/i.test(cropName)) return CROP_GRADE_OPTIONS.cotton;
  return null;
};

const PaymentsPage = ({
  farmers = [],
  onPaymentStatusChange,
  selectedDate,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [selectedGrades, setSelectedGrades] = useState({});
  const [paymentReferences, setPaymentReferences] = useState({});
  const [referenceErrors, setReferenceErrors] = useState({});
  const [transitionErrors, setTransitionErrors] = useState({});

  // Only a booking the server has actually priced and moved to
  // "Awaiting payment" can be paid — anything earlier (Weighing, Quality
  // check, Recorded) has no payment row yet, so marking it "Cleared" here
  // fails with INVALID_STATE_TRANSITION on the server.
  const activePayments = useMemo(
    () =>
      farmers
        .filter((farmer) => farmer.apiStatus === "PAYMENT_PENDING")
        .sort(
          (a, b) =>
            (a.date || "").localeCompare(b.date || "") ||
            String(a.id).localeCompare(String(b.id)),
        ),
    [farmers],
  );

  const clearedPayments = useMemo(
    () =>
      farmers
        .filter(
          (farmer) =>
            farmer.paymentStatus === "Cleared" ||
            farmer.apiStatus === "COMPLETED",
        )
        .sort(
          (a, b) =>
            (a.date || "").localeCompare(b.date || "") ||
            String(a.id).localeCompare(String(b.id)),
        ),
    [farmers],
  );

  /**
   * The price is the server's, never this screen's.
   *
   * `complete` resolves the MSP rate by crop, season and marketing year and
   * prices the procurement in the same transaction (officer.md §5). If the
   * rate was ambiguous because grade was not recorded, selecting a grade
   * previews the official rate before submitting.
   */
  const getPriceBreakdown = (entry, chosenGrade) => {
    const actualWeight = Number(entry.actualWeight || 0);
    let rate = Number(entry.mspRate || 0);
    let payable = Number(entry.paidAmount || 0);

    if (rate === 0 && chosenGrade) {
      const available = getAvailableGrades(entry.crop);
      const matched = available?.find(
        (g) => g.value.toLowerCase() === chosenGrade.toLowerCase(),
      );
      if (matched) {
        rate = matched.rate;
        payable = Math.round(actualWeight * rate);
      }
    }

    return {
      actualWeight,
      rate,
      payable,
    };
  };

  const handlePaymentStatusChange = async (id, status) => {
    const entry = farmers.find((farmer) => farmer.id === id);
    const currentStatus = entry?.paymentStatus ?? "Pending";

    if (status === "Cleared" && currentStatus !== "Processing") {
      setTransitionErrors((current) => ({
        ...current,
        [id]: t("moveToProcessingFirst", {
          status: translateOfficerStatus(t, "Processing"),
        }),
      }));
      return;
    }

    const paymentReference = paymentReferences[id]?.trim() ?? "";

    if (status === "Cleared" && !paymentReference) {
      setReferenceErrors((current) => ({
        ...current,
        [id]: t("enterTransferReferenceFirst"),
      }));
      return;
    }

    const available = getAvailableGrades(entry?.crop);
    const defaultGrade = available?.[0]?.value ?? "";
    const chosenGrade = selectedGrades[id] || entry?.grade || defaultGrade;

    const result = await onPaymentStatusChange?.(
      id,
      status,
      paymentReference,
      chosenGrade,
    );

    setTransitionErrors((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });

    if (result && status === "Cleared") {
      navigate("/officer/reports");
    }
  };

  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm shadow-emerald-200/30 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-black sm:text-2xl">
            {t("paymentsOverview")}
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-black">
            {selectedDate ?? t("officerToday")}
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-black">
          {t("settlementCount", { count: activePayments.length })}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {activePayments.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-black">
            {t("noPaymentEntriesDate")}
          </div>
        ) : (
          activePayments.map((entry) => {
            const availableGrades = getAvailableGrades(entry.crop);
            const defaultGrade = availableGrades?.[0]?.value ?? "";
            const currentGrade =
              selectedGrades[entry.id] || entry.grade || defaultGrade;
            const isAmbiguous =
              entry.paymentBlockedReason === "MSP_AMBIGUOUS" ||
              !entry.mspRate ||
              Number(entry.mspRate) === 0;
            const { actualWeight, rate, payable } = getPriceBreakdown(
              entry,
              currentGrade,
            );
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={`${entry.date || selectedDate}-${entry.id}`}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((current) =>
                      current === entry.id ? null : entry.id,
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-3 text-left"
                >
                  <div>
                    <p className="text-lg font-bold text-black">
                      {entry.name}
                    </p>
                    <p className="text-sm text-black">
                      {entry.date || selectedDate} • {entry.crop} • {entry.slot}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-black">
                      ₹
                      {Number(entry.paidAmount || payable || 0).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                    <span className="text-lg text-black">
                      {isExpanded ? "▴" : "▾"}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                          {t("actualWeightLabel")}
                        </p>
                        <p className="mt-1 font-bold text-black">
                          {actualWeight} {t("quintal")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                          {t("mspRateLabel")}
                        </p>
                        <p className="mt-1 font-bold text-black">
                          ₹{rate.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black">
                          {t("payableAmount")}
                        </p>
                        <p className="mt-1 font-bold text-black">
                          ₹{payable.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    {isAmbiguous && availableGrades && (
                      <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">⚠️</span>
                          <p className="text-xs font-bold text-amber-900">
                            {t(
                              "gradeRequiredTitle",
                              "Crop Grade Required for MSP Calculation",
                            )}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-amber-800">
                          {t(
                            "selectGradePrompt",
                            "Select the crop grade to determine the support price and unblock this payment:",
                          )}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {availableGrades.map((option) => {
                            const isSelected =
                              (currentGrade || "").toLowerCase() ===
                              option.value.toLowerCase();
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  setSelectedGrades((current) => ({
                                    ...current,
                                    [entry.id]: option.value,
                                  }))
                                }
                                className={[
                                  "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                                  isSelected
                                    ? "border-amber-700 bg-amber-700 text-white shadow-sm"
                                    : "border-amber-300 bg-white text-amber-900 hover:bg-amber-100",
                                ].join(" ")}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      {paymentStatusButtons.map((status) => {
                        const isActive =
                          (entry.paymentStatus ?? "Pending") === status;

                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() =>
                              handlePaymentStatusChange(entry.id, status)
                            }
                            className={[
                              "min-w-27.5 rounded-full border px-5 py-2.5 text-sm font-semibold transition",
                              isActive
                                ? "border-green-700 bg-green-700 text-white"
                                : "border-emerald-200 bg-emerald-50 text-black hover:bg-emerald-100",
                            ].join(" ")}
                          >
                            {status === "Cleared" ? "✅" : "⏳"}{" "}
                            {translateOfficerStatus(t, status)}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor={`payment-reference-${entry.id}`}
                        className="block text-xs font-semibold uppercase tracking-[0.12em] text-black"
                      >
                        {t("paymentReferenceLabel")}
                      </label>
                      <input
                        id={`payment-reference-${entry.id}`}
                        type="text"
                        value={paymentReferences[entry.id] ?? ""}
                        onChange={(event) =>
                          (() => {
                            setPaymentReferences((current) => ({
                              ...current,
                              [entry.id]: event.target.value,
                            }));
                            setReferenceErrors((current) => {
                              if (!current[entry.id]) return current;
                              const next = { ...current };
                              delete next[entry.id];
                              return next;
                            });
                          })()
                        }
                        placeholder={t("enterUtrOrCashReceipt")}
                        className="mt-2 min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm text-black outline-none transition placeholder:text-black focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50"
                      />
                      <p
                        className={`mt-1 text-xs ${referenceErrors[entry.id] ? "font-semibold text-red-700" : "text-black"}`}
                      >
                        {referenceErrors[entry.id] ??
                          t("requiredBeforeClearing")}
                      </p>
                      {transitionErrors[entry.id] && (
                        <p className="mt-1 text-xs font-semibold text-red-700">
                          {transitionErrors[entry.id]}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {clearedPayments.length > 0 && (
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-black">
            {t("clearedPaymentsHeading")}
          </h3>
          <div className="mt-3 space-y-2">
            {clearedPayments.map((entry) => (
              <div
                key={`cleared-${entry.date || selectedDate}-${entry.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2"
              >
                <div>
                  <p className="font-bold text-black">{entry.name}</p>
                  <p className="text-xs text-black">
                    {entry.crop} • ₹
                    {Number(entry.paidAmount || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black">
                  {t("cleared")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
