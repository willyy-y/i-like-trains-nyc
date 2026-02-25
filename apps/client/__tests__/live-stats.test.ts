import { describe, it, expect } from "vitest";
import type { ProcessedTrain, StationWithRidership } from "@/lib/types";
import { SUBWAY_COLORS } from "@/lib/subway-colors";

// ---------------------------------------------------------------------------
// Helpers — replicate the logic from SubwayMap for testability
// ---------------------------------------------------------------------------

const LINE_GROUPS = [
  { group: "123", lines: ["1", "2", "3"] },
  { group: "456", lines: ["4", "5", "6"] },
  { group: "7", lines: ["7"] },
  { group: "ACE", lines: ["A", "C", "E"] },
  { group: "BDFM", lines: ["B", "D", "F", "M"] },
  { group: "G", lines: ["G"] },
  { group: "JZ", lines: ["J", "Z"] },
  { group: "L", lines: ["L"] },
  { group: "NQRW", lines: ["N", "Q", "R", "W"] },
  { group: "S", lines: ["S"] },
];

interface LineGroupStat {
  group: string;
  lines: string[];
  count: number;
  color: [number, number, number];
}

interface TopStation {
  name: string;
  ridership: number;
}

function computeLineStats(activeTrains: Pick<ProcessedTrain, "routeShortName">[]): LineGroupStat[] {
  const counts: Record<string, number> = {};
  for (const train of activeTrains) {
    const route = train.routeShortName;
    for (const g of LINE_GROUPS) {
      if (g.lines.includes(route)) {
        counts[g.group] = (counts[g.group] || 0) + 1;
        break;
      }
    }
  }
  return LINE_GROUPS
    .map((g) => ({
      group: g.group,
      lines: g.lines,
      count: counts[g.group] || 0,
      color: (SUBWAY_COLORS[g.lines[0]] || [200, 200, 200]) as [number, number, number],
    }))
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);
}

function computeTopStations(stations: Pick<StationWithRidership, "name" | "ridership">[]): TopStation[] {
  return [...stations]
    .sort((a, b) => b.ridership - a.ridership)
    .slice(0, 3)
    .map((s) => ({ name: s.name, ridership: s.ridership }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeLineStats", () => {
  it("returns empty array for no trains", () => {
    expect(computeLineStats([])).toEqual([]);
  });

  it("aggregates trains by line group", () => {
    const trains = [
      { routeShortName: "1" },
      { routeShortName: "2" },
      { routeShortName: "3" },
      { routeShortName: "A" },
      { routeShortName: "A" },
    ];
    const stats = computeLineStats(trains);
    expect(stats[0].group).toBe("123");
    expect(stats[0].count).toBe(3);
    expect(stats[1].group).toBe("ACE");
    expect(stats[1].count).toBe(2);
  });

  it("sorts by count descending", () => {
    const trains = [
      { routeShortName: "L" },
      { routeShortName: "L" },
      { routeShortName: "L" },
      { routeShortName: "7" },
    ];
    const stats = computeLineStats(trains);
    expect(stats[0].group).toBe("L");
    expect(stats[0].count).toBe(3);
    expect(stats[1].group).toBe("7");
    expect(stats[1].count).toBe(1);
  });

  it("filters out groups with zero trains", () => {
    const trains = [{ routeShortName: "G" }];
    const stats = computeLineStats(trains);
    expect(stats).toHaveLength(1);
    expect(stats[0].group).toBe("G");
  });

  it("assigns correct color from SUBWAY_COLORS", () => {
    const trains = [{ routeShortName: "N" }];
    const stats = computeLineStats(trains);
    expect(stats[0].color).toEqual(SUBWAY_COLORS["N"]);
  });

  it("handles unknown route gracefully", () => {
    const trains = [{ routeShortName: "X" }];
    const stats = computeLineStats(trains);
    // Unknown routes don't match any group → empty
    expect(stats).toHaveLength(0);
  });
});

describe("computeTopStations", () => {
  it("returns empty array for no stations", () => {
    expect(computeTopStations([])).toEqual([]);
  });

  it("returns top 3 stations by ridership", () => {
    const stations = [
      { name: "Times Sq", ridership: 5000 },
      { name: "Grand Central", ridership: 4000 },
      { name: "Union Sq", ridership: 3000 },
      { name: "Canal St", ridership: 2000 },
      { name: "City Hall", ridership: 1000 },
    ];
    const top = computeTopStations(stations);
    expect(top).toHaveLength(3);
    expect(top[0].name).toBe("Times Sq");
    expect(top[1].name).toBe("Grand Central");
    expect(top[2].name).toBe("Union Sq");
  });

  it("handles fewer than 3 stations", () => {
    const stations = [{ name: "Only One", ridership: 100 }];
    const top = computeTopStations(stations);
    expect(top).toHaveLength(1);
    expect(top[0].name).toBe("Only One");
  });

  it("sorts descending by ridership", () => {
    const stations = [
      { name: "Low", ridership: 10 },
      { name: "High", ridership: 9999 },
      { name: "Mid", ridership: 500 },
    ];
    const top = computeTopStations(stations);
    expect(top[0].ridership).toBe(9999);
    expect(top[1].ridership).toBe(500);
    expect(top[2].ridership).toBe(10);
  });
});
