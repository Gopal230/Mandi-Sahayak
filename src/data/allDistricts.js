import { statesData } from "./indianDistricts.js";

// Map a string deterministically to a valid RFC4122-compliant UUID string
function deterministicUuid(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  // Format as 32 hex chars
  const hex1 = ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0"));
  const hex2 = (((h1 ^ h2) >>> 0).toString(16).padStart(8, "0") + ((h1 + h2) >>> 0).toString(16).padStart(8, "0"));
  const hex = (hex1 + hex2).toLowerCase();

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    "a" + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

export const INDIAN_STATES = statesData || [];

/**
 * Returns all ~750 Indian districts, mapping IDs to backend UUIDs where available.
 * Grouped structure: Array of { state: string, districts: Array<{ id: string, name: string, state: string }> }
 */
export function getDistrictsGroupedByState(backendDistricts = []) {
  const backendMap = new Map();
  (backendDistricts || []).forEach((d) => {
    if (d && d.name) {
      backendMap.set(d.name.toLowerCase().trim(), d.id);
    }
  });

  return INDIAN_STATES.map((s) => ({
    state: s.state,
    districts: (s.districts || []).map((distName) => {
      const trimmed = distName.trim();
      const existingId = backendMap.get(trimmed.toLowerCase());
      const id = existingId || deterministicUuid(`${s.state}:${trimmed}`);
      return {
        id,
        name: trimmed,
        state: s.state,
      };
    }),
  }));
}

/**
 * Flat list of all ~750 Indian districts.
 */
export function getAllDistrictsFlat(backendDistricts = []) {
  const grouped = getDistrictsGroupedByState(backendDistricts);
  const flat = [];
  grouped.forEach((g) => {
    g.districts.forEach((d) => flat.push(d));
  });
  return flat;
}

/**
 * Search across all districts and states in India.
 */
export function searchDistricts(query, backendDistricts = []) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const all = getAllDistrictsFlat(backendDistricts);
  return all.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.state.toLowerCase().includes(q)
  );
}
