import { describe, expect, it } from "vitest";

import { filterDistricts } from "./allDistricts";

const districts = [
  { id: "aligarh", name: "Aligarh", state: "Uttar Pradesh" },
  { id: "pune", name: "Pune", state: "Maharashtra" },
];

describe("filterDistricts", () => {
  it("matches district and state names without case sensitivity", () => {
    expect(filterDistricts("ALIG", districts)).toEqual([districts[0]]);
    expect(filterDistricts("maharashtra", districts)).toEqual([districts[1]]);
  });

  it("returns no results for a blank query", () => {
    expect(filterDistricts("  ", districts)).toEqual([]);
  });
});
