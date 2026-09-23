import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function DistrictSearchInput({
  districts = [],
  selectedDistrictId = "",
  onSelectDistrict,
  disabled = false,
}) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedDistrict = (districts || []).find(
    (d) => d.id === selectedDistrictId
  );

  const handleSearch = () => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const matches = (districts || []).filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        (d.state && d.state.toLowerCase().includes(q))
    );

    setSearchResults(matches);
    setHasSearched(true);

    // If exactly one match, auto-select it
    if (matches.length === 1) {
      onSelectDistrict?.(matches[0].id);
    }
  };

  const handlePick = (district) => {
    onSelectDistrict?.(district.id);
    setSearchTerm("");
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <div className="space-y-2">
      {/* Quick Search Bar with explicit Search Button */}
      <div className="flex gap-2">
        <input
          type="text"
          disabled={disabled}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setHasSearched(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder={t("searchDistrictPlaceholder", "Type to search district...")}
          className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-black outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
        />
        <button
          type="button"
          disabled={disabled || !searchTerm.trim()}
          onClick={handleSearch}
          className="flex items-center gap-1 rounded-xl bg-[#0e8a48] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0c763e] active:scale-95 disabled:opacity-40"
        >
          <span>{t("search", "Search")}</span>
          <span>🔍</span>
        </button>
      </div>

      {/* Search Results Popup/Dropdown */}
      {hasSearched && (
        <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-lg">
          {searchResults.length === 0 ? (
            <div className="p-3 text-center text-xs font-semibold text-slate-500">
              {t("noDistrictsFound", "No matching districts found.")}
            </div>
          ) : (
            <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100 p-1">
              {searchResults.map((d) => (
                <li
                  key={d.id}
                  onClick={() => handlePick(d)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-emerald-50 ${
                    d.id === selectedDistrictId
                      ? "bg-emerald-100 font-bold text-emerald-900"
                      : "text-black"
                  }`}
                >
                  <span>{d.name}</span>
                  {d.state && (
                    <span className="text-xs text-slate-500">{d.state}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Selected Indicator */}
      {selectedDistrict && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900">
          <span>✓ {t("selected", "Selected")}: {selectedDistrict.name}</span>
        </div>
      )}
    </div>
  );
}
