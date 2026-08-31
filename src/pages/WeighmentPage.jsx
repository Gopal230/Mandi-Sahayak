const WeighmentPage = ({ farmers, onUpdateActualWeight }) => {
  const readyForWeighment = farmers.filter(
    (farmer) => farmer.status !== "Cleared",
  );

  return (
    <div className="rounded-3xl border border-[#e7d0a7] bg-[#fffaf2] p-4 shadow-sm shadow-[#d3b07a]/30 sm:p-6">
      <h2 className="text-xl font-bold text-[#3b291e] sm:text-2xl">
        Weighment board
      </h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {readyForWeighment.map((farmer) => (
          <div
            key={farmer.id}
            className="rounded-2xl border border-[#ecd5a7] bg-[#f9ecd3] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#7a5640]">
                {farmer.token}
              </p>
              <span className="rounded-full bg-[#ebf6ed] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#2f6c44]">
                {farmer.status}
              </span>
            </div>

            <h3 className="mt-3 text-xl font-bold text-[#3d281b]">
              {farmer.name}
            </h3>
            <p className="mt-2 text-sm text-[#6d4d38]">
              {farmer.crop} / {farmer.quantity} kg / Slot {farmer.slot}
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-[#71523a]">
              Actual weight (kg)
              <input
                type="number"
                value={farmer.actualWeight}
                onChange={(event) =>
                  onUpdateActualWeight(farmer.id, event.target.value)
                }
                placeholder="Enter actual kg"
                className="mt-1 w-full rounded-xl border border-[#d8b57d] bg-[#fffaf3] px-2 py-2 text-sm font-medium text-[#3d281b]"
              />
            </label>

            <button className="mt-4 rounded-full bg-[#9e5e36] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8d522f]">
              Confirm weight
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeighmentPage;
