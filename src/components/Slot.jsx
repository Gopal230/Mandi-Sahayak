export const Slot = ({
  farmer,
  isHighlighted = false,
  onUpdateFarmer,
  onClearFarmer,
}) => {
  const cardClass = isHighlighted
    ? "border-[#bd764d] bg-[#fff1df] shadow-[#d9b07e]/40"
    : "border-[#DFC18C] bg-[#f9e7cc]";

  return (
    <div
      className={[
        "mb-3 min-w-0 rounded-2xl border p-3 shadow-sm transition sm:p-4",
        cardClass,
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-black text-[#3d281b]">{farmer.name}</p>
          <p className="text-sm text-[#65513b]">{farmer.token}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#d7b17a] bg-[#f8e9d2] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#7a5640]">
            {farmer.crop}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
          Slot time
          <input
            type="time"
            value={farmer.slot}
            onChange={(event) =>
              onUpdateFarmer(farmer.id, "slot", event.target.value)
            }
            className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#fffaf3] px-2 py-2 text-sm font-medium text-[#3d281b]"
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
          Qty (kg)
          <input
            type="number"
            value={farmer.quantity}
            readOnly
            className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#f7efe5] px-2 py-2 text-sm font-medium text-[#3d281b]"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onClearFarmer(farmer.id)}
          className="ml-auto rounded-full border border-[#c48f61] bg-[#f4d9b7] px-4 py-2 text-xs font-semibold text-[#3d281b] hover:bg-[#efc88e]"
        >
          Clear slot
        </button>
      </div>
    </div>
  );
};
