import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getAllDistrictsFlat, searchDistricts } from "../data/allDistricts.js";

export default function DistrictSearchInput({
  districts = [],
  selectedDistrictId = "",
  onSelectDistrict,
  disabled = false,
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // All districts across India with backend IDs mapped for demonstration districts
  const allDistricts = useMemo(() => {
    return getAllDistrictsFlat(districts);
  }, [districts]);

  // Current selected district name
  const selectedDistrict = useMemo(() => {
    if (!selectedDistrictId) return null;
    return (
      allDistricts.find(
        (d) =>
          d.id.toLowerCase() === selectedDistrictId.toLowerCase() ||
          d.name.toLowerCase() === selectedDistrictId.toLowerCase()
      ) || null
    );
  }, [selectedDistrictId, allDistricts]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search logic
  const performSearch = (term) => {
    const q = (term ?? searchTerm).trim();
    if (!q) {
      setSearchResults([]);
      setIsOpen(false);
      return;
    }
    const matches = searchDistricts(q, districts);
    setSearchResults(matches);
    setIsOpen(true);
  };

  const handlePick = (item) => {
    onSelectDistrict?.(item.id, item.name);
    setSearchTerm("");
    setSearchResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelectDistrict?.("", "");
    setSearchTerm("");
    setSearchResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Search Input and Search Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            disabled={disabled}
            value={searchTerm}
            onChange={(e) => {
              const val = e.target.value;
              setSearchTerm(val);
              if (val.trim().length >= 2) {
                performSearch(val);
              } else if (!val.trim()) {
                setSearchResults([]);
                setIsOpen(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                performSearch();
              }
            }}
            placeholder={t(
              "searchDistrictPlaceholder",
              "Type district or state (e.g. Varanasi, Patna, Pune)..."
            )}
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-4 pr-10 py-2.5 text-sm font-medium text-black outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
                setIsOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-sm"
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={disabled || !searchTerm.trim()}
          onClick={() => performSearch()}
          className="flex items-center gap-1.5 rounded-xl bg-[#0e8a48] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0c763e] active:scale-95 disabled:opacity-40 shadow-sm"
        >
          <span>{t("search", "Search")}</span>
          <span>🔍</span>
        </button>
      </div>

      {/* Instant Search Results Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-xl border border-emerald-300 bg-white shadow-xl ring-1 ring-black/5 divide-y divide-slate-100">
          {searchResults.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 font-medium">
              {t("noDistrictsFound", "No districts found matching")} &quot;{searchTerm}&quot;
            </div>
          ) : (
            <div>
              <div className="bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                Found {searchResults.length} matching districts in India
              </div>
              <ul className="p-1">
                {searchResults.slice(0, 50).map((d) => (
                  <li
                    key={`${d.state}-${d.name}`}
                    onClick={() => handlePick(d)}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-3.5 py-2.5 text-sm text-black transition hover:bg-emerald-50 hover:text-emerald-950 font-medium"
                  >
                    <span className="font-bold">{d.name}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {d.state}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Selected District Badge */}
      {selectedDistrict && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 border border-emerald-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
              ✓
            </span>
            <span>
              {t("selectedDistrict", "Selected District")}:{" "}
              <strong className="text-emerald-950 font-extrabold">{selectedDistrict.name}</strong>{" "}
              <span className="text-emerald-700">({selectedDistrict.state})</span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-bold text-emerald-800 hover:text-red-600 hover:underline"
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
}
