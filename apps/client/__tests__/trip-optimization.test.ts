import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const TRIPS_PATH = path.resolve(__dirname, "../public/data/trips/2026-02-24.json");

describe("trip file optimization (Step 1)", () => {
  it("trip file exists", () => {
    expect(existsSync(TRIPS_PATH)).toBe(true);
  });

  it("file is valid JSON array", () => {
    const raw = readFileSync(TRIPS_PATH, "utf-8");
    const data = JSON.parse(raw);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("raw file size is under 60MB", () => {
    const stat = require("fs").statSync(TRIPS_PATH);
    const sizeMB = stat.size / 1024 / 1024;
    expect(sizeMB).toBeLessThan(60);
  });

  it("coordinates are quantized to 5 decimal places", () => {
    const raw = readFileSync(TRIPS_PATH, "utf-8");
    const data = JSON.parse(raw);
    const trip = data[0];
    for (const [lng, lat] of trip.path.slice(0, 20)) {
      const lngStr = String(lng);
      const latStr = String(lat);
      // After decimal point, should have at most 5 digits
      const lngDecimals = lngStr.includes(".") ? lngStr.split(".")[1].length : 0;
      const latDecimals = latStr.includes(".") ? latStr.split(".")[1].length : 0;
      expect(lngDecimals).toBeLessThanOrEqual(5);
      expect(latDecimals).toBeLessThanOrEqual(5);
    }
  });

  it("timestamps are integers", () => {
    const raw = readFileSync(TRIPS_PATH, "utf-8");
    const data = JSON.parse(raw);
    const trip = data[0];
    for (const ts of trip.timestamps) {
      expect(Number.isInteger(ts)).toBe(true);
    }
  });

  it("each trip has fewer average waypoints than original (was ~407)", () => {
    const raw = readFileSync(TRIPS_PATH, "utf-8");
    const data = JSON.parse(raw);
    const totalWaypoints = data.reduce(
      (sum: number, t: { path: unknown[] }) => sum + t.path.length,
      0
    );
    const avg = totalWaypoints / data.length;
    // Should be significantly less than 407 (original)
    expect(avg).toBeLessThan(300);
    // But still enough for smooth animation
    expect(avg).toBeGreaterThan(50);
  });

  it("trips have valid structure", () => {
    const raw = readFileSync(TRIPS_PATH, "utf-8");
    const data = JSON.parse(raw);
    for (const trip of data.slice(0, 10)) {
      expect(trip.tripId).toBeTruthy();
      expect(trip.routeShortName).toBeTruthy();
      expect(trip.path.length).toBeGreaterThan(1);
      expect(trip.timestamps.length).toBe(trip.path.length);
      // Timestamps should be monotonically non-decreasing
      for (let i = 1; i < trip.timestamps.length; i++) {
        expect(trip.timestamps[i]).toBeGreaterThanOrEqual(trip.timestamps[i - 1]);
      }
    }
  });
});
