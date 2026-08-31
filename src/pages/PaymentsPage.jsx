const PaymentsPage = ({
  farmers = [],
  onPaymentStatusChange,
  selectedDate,
}) => {
  const payments = farmers
    .filter(
      (farmer) =>
        farmer.paidAmount ||
        farmer.paymentStatus ||
        farmer.status === "Cleared",
    )
    .sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        Number(a.id) - Number(b.id),
    );

  return (
    <div className="rounded-3xl border border-[#e7d0a7] bg-[#fffaf2] p-4 shadow-sm shadow-[#d3b07a]/30 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#3b291e] sm:text-2xl">
            Payments overview
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5640]">
            {selectedDate ?? "Today"}
          </p>
        </div>
        <span className="rounded-full bg-[#f5e6cf] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7a5640]">
          {payments.length} settlement{payments.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {payments.length === 0 ? (
          <div className="rounded-2xl border border-[#ecd5a7] bg-[#fdf0d9] p-5 text-[#5c402f]">
            No payment entries yet for this date.
          </div>
        ) : (
          payments.map((entry) => (
            <div
              key={`${entry.date || selectedDate}-${entry.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-[#ecd5a7] bg-[#fdf0d9] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-lg font-bold text-[#3d281b]">{entry.name}</p>
                <p className="text-sm text-[#745842]">
                  {entry.date || selectedDate} • {entry.crop} • {entry.slot}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-bold text-[#3d281b]">
                  ₹{Number(entry.paidAmount || 0).toLocaleString("en-IN")}
                </span>
                <select
                  value={entry.paymentStatus ?? "Pending"}
                  disabled={entry.paymentStatus === "Cleared"}
                  onChange={(event) =>
                    onPaymentStatusChange?.(entry.id, event.target.value)
                  }
                  className="rounded-full border border-[#d8b57d] bg-[#fffaf3] px-3 py-1.5 text-xs font-semibold text-[#3d281b] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="Pending">Pending</option>
                  <option value="Cleared">Cleared</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
