// Deterministic UUID for any Indian district based on state and name
function deterministicUuid(str: string): string {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

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

export interface KnownDistrict {
  id: string;
  name: string;
  state: string;
}

// Built-in demonstration districts from 0002_up_demonstration_geography.sql
const DEMO_DISTRICTS: Record<string, string> = {
  "aligarh": "44444444-0000-4000-a000-000000000011",
  "agra": "44444444-0000-4000-a000-000000000012",
  "hathras": "44444444-0000-4000-a000-000000000013",
  "mathura": "44444444-0000-4000-a000-000000000014",
  "bulandshahr": "44444444-0000-4000-a000-000000000015",
};

import { statesData } from "./indianDistricts.js";

const DISTRICTS_BY_ID = new Map<string, KnownDistrict>();
const DISTRICTS_BY_NAME = new Map<string, KnownDistrict>();

(statesData || []).forEach((st: { state: string; districts: string[] }) => {
  (st.districts || []).forEach((dist: string) => {
    const trimmed = dist.trim();
    const demoId = DEMO_DISTRICTS[trimmed.toLowerCase()];
    const id = demoId || deterministicUuid(`${st.state}:${trimmed}`);
    const entry: KnownDistrict = {
      id,
      name: trimmed,
      state: st.state,
    };
    DISTRICTS_BY_ID.set(id.toLowerCase(), entry);
    DISTRICTS_BY_NAME.set(`${st.state.toLowerCase()}:${trimmed.toLowerCase()}`, entry);
    if (!DISTRICTS_BY_NAME.has(trimmed.toLowerCase())) {
      DISTRICTS_BY_NAME.set(trimmed.toLowerCase(), entry);
    }
  });
});

export function findKnownDistrict(idOrName: string): KnownDistrict | undefined {
  if (!idOrName) return undefined;
  const lower = idOrName.trim().toLowerCase();
  return DISTRICTS_BY_ID.get(lower) || DISTRICTS_BY_NAME.get(lower);
}
