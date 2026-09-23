import { useEffect, useId, useRef, useState } from "react";

/**
 * A checkbox-backed multi-select dropdown. Unlike a native <select multiple>,
 * items toggle on a plain click — no Ctrl/Cmd required — and the trigger
 * summarizes the current selection instead of showing a scroll box.
 */
function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  error = false,
  id,
  labelledBy,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const generatedId = useId();
  const triggerId = id ?? generatedId;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggle(optionId) {
    onChange(
      value.includes(optionId)
        ? value.filter((entry) => entry !== optionId)
        : [...value, optionId],
    );
  }

  const selectedLabels = options
    .filter((option) => value.includes(option.id))
    .map((option) => option.label);

  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} crops selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={triggerId}
        aria-labelledby={labelledBy}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        className={`flex min-h-13 w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 text-left text-sm text-black outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-black ${
          error ? "border-red-400" : "border-slate-200"
        }`}
      >
        <span className="truncate">{summary}</span>

        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 flex-none text-black transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {options.map((option) => {
            const checked = value.includes(option.id);
            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-black hover:bg-emerald-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.id)}
                  className="h-4 w-4 accent-[#0e8a48]"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
