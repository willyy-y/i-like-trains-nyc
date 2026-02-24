import { describe, it, expect, beforeEach } from "vitest";
import { canLoadMap, recordMapLoad, getRemainingLoads, getLoadCount } from "@/lib/map-budget";

describe("map-budget", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with full budget", () => {
    expect(canLoadMap()).toBe(true);
    expect(getRemainingLoads()).toBe(45000);
    expect(getLoadCount()).toBe(0);
  });

  it("recordMapLoad increments counter", () => {
    recordMapLoad();
    expect(getLoadCount()).toBe(1);
    expect(getRemainingLoads()).toBe(44999);
  });

  it("multiple loads accumulate", () => {
    for (let i = 0; i < 10; i++) recordMapLoad();
    expect(getLoadCount()).toBe(10);
    expect(getRemainingLoads()).toBe(44990);
  });

  it("canLoadMap returns false at cap", () => {
    // Simulate reaching the cap by writing directly
    const month = new Date();
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    localStorage.setItem("mapbox_load_count", JSON.stringify({ month: key, count: 45000 }));
    expect(canLoadMap()).toBe(false);
    expect(getRemainingLoads()).toBe(0);
  });

  it("resets on new month", () => {
    // Set a record for a past month
    localStorage.setItem("mapbox_load_count", JSON.stringify({ month: "2020-01", count: 50000 }));
    // Should reset because current month != 2020-01
    expect(canLoadMap()).toBe(true);
    expect(getLoadCount()).toBe(0);
  });
});
