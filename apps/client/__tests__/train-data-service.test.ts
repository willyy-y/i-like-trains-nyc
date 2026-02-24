import { describe, it, expect } from "vitest";
import { getCurrentTrains } from "@/services/train-data-service";
import type { ProcessedTrain } from "@/lib/types";

function makeTrain(start: number, end: number, id = "test"): ProcessedTrain {
  return {
    tripId: id,
    routeShortName: "A",
    path: [[0, 0], [1, 1]],
    timestamps: [start, end],
    color: [0, 57, 166],
  };
}

describe("getCurrentTrains", () => {
  it("returns empty for empty input", () => {
    expect(getCurrentTrains([], 3600)).toEqual([]);
  });

  it("returns train that is currently active", () => {
    const trains = [makeTrain(3500, 3700, "active")];
    const result = getCurrentTrains(trains, 3600);
    expect(result).toHaveLength(1);
    expect(result[0].tripId).toBe("active");
  });

  it("excludes trains that ended long ago", () => {
    const trains = [makeTrain(1000, 2000, "old")];
    const result = getCurrentTrains(trains, 3600);
    expect(result).toHaveLength(0);
  });

  it("excludes trains that start in the future", () => {
    const trains = [makeTrain(5000, 6000, "future")];
    const result = getCurrentTrains(trains, 3600);
    expect(result).toHaveLength(0);
  });

  it("includes trains within the window buffer", () => {
    // Train ends at 3500, current time is 3600, window is 120s
    // 3500 >= 3600 - 120 = 3480 → included
    const trains = [makeTrain(3000, 3500, "recent")];
    const result = getCurrentTrains(trains, 3600, 120);
    expect(result).toHaveLength(1);
  });

  it("excludes trains just outside the window", () => {
    // Train ends at 3400, current time is 3600, window is 120s
    // 3400 >= 3600 - 120 = 3480 → false → excluded
    const trains = [makeTrain(3000, 3400, "too-old")];
    const result = getCurrentTrains(trains, 3600, 120);
    expect(result).toHaveLength(0);
  });

  it("filters correctly with multiple trains", () => {
    const trains = [
      makeTrain(1000, 2000, "old"),
      makeTrain(3500, 3700, "active1"),
      makeTrain(3550, 3650, "active2"),
      makeTrain(5000, 6000, "future"),
    ];
    const result = getCurrentTrains(trains, 3600);
    expect(result).toHaveLength(2);
    expect(result.map(t => t.tripId).sort()).toEqual(["active1", "active2"]);
  });

  it("handles trains with empty timestamps", () => {
    const train: ProcessedTrain = {
      tripId: "empty",
      routeShortName: "A",
      path: [],
      timestamps: [],
      color: [0, 57, 166],
    };
    const result = getCurrentTrains([train], 3600);
    expect(result).toHaveLength(0);
  });

  it("handles rush hour with many trains", () => {
    // Simulate 500 trains during rush hour (7-9am = 25200-32400)
    const trains: ProcessedTrain[] = [];
    for (let i = 0; i < 500; i++) {
      const start = 25200 + Math.random() * 3600;
      trains.push(makeTrain(start, start + 1800, `rush-${i}`));
    }
    const result = getCurrentTrains(trains, 27000); // 7:30am
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(500);
  });
});
