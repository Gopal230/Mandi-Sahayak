const StoragePage = ({ storage, onUpdateCropStorage }) => {
  const renderCropCard = (crop) => {
    const totalCapacity = Number(crop.capacity || 0);
    const currentStored = Number(crop.stock || 0);
    const availableSpace = Math.max(0, totalCapacity - currentStored);
    const fillPercent = Math.min(
      100,
      (currentStored / totalCapacity) * 100 || 0,
    );

    return (
      <div key={crop.crop} className="rounded-2xl bg-[#f4dab8] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-bold text-[#3c2b21]">{crop.crop}</p>
          <span className="text-sm font-semibold text-[#6d4d38]">
            {fillPercent.toFixed(0)}% full
          </span>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#f8e9d2]">
          <div
            className="h-full rounded-full bg-[#9e5e36]"
            style={{ width: `${fillPercent}%` }}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e1ba7b] bg-[#f9e7cc] p-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a5640]">
              Total capacity
            </p>
            <p className="mt-1 text-lg font-black text-[#3c2b21]">
              {totalCapacity} kg
            </p>
          </div>

          <div className="rounded-xl border border-[#e1ba7b] bg-[#f9e7cc] p-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a5640]">
              Current stored
            </p>
            <p className="mt-1 text-lg font-black text-[#3c2b21]">
              {currentStored} kg
            </p>
          </div>

          <div className="rounded-xl border border-[#e1ba7b] bg-[#f9e7cc] p-2 sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a5640]">
              Available space
            </p>
            <p className="mt-1 text-lg font-black text-[#3c2b21]">
              {availableSpace} kg
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#e7d0a7] bg-[#fff7eb] p-6 shadow-sm shadow-[#d3b07a]/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[#3b291e] sm:text-2xl">
            Storage status
          </h2>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {storage.map(renderCropCard)}
        </div>
      </div>
    </div>
  );
};

export default StoragePage;
