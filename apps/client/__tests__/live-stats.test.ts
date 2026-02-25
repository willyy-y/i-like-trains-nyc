import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Helpers — replicate the speed/distance logic from SubwayMap for testability
// ---------------------------------------------------------------------------

interface TrainSegment {
  routeShortName: string;
  color: [number, number, number];
  path: [number, number][];
  timestamps: number[];
}

interface FastestTrain {
  routeShortName: string;
  color: [number, number, number];
  speedMph: number;
}

function haversineDistMiles(
  lng1: number, lat1: number, lng2: number, lat2: number
): number {
  const r1 = lat1 * Math.PI / 180;
  const r2 = lat2 * Math.PI / 180;
  const dLat = r2 - r1;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r1) * Math.cos(r2) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeTopFastestTrains(
  trains: TrainSegment[],
  currentTimeSec: number,
  count: number = 5
): FastestTrain[] {
  const top: FastestTrain[] = [];

  for (const train of trains) {
    const ts = train.timestamps;
    const path = train.path;
    if (ts.length < 2) continue;

    let lo = 0;
    let hi = ts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (ts[mid] <= currentTimeSec) lo = mid;
      else hi = mid;
    }

    const dt = ts[hi] - ts[lo];
    if (dt <= 0) continue;

    const distMiles = haversineDistMiles(
      path[lo][0], path[lo][1], path[hi][0], path[hi][1]
    );
    const speedMph = (distMiles / dt) * 3600;

    if (speedMph > 0.5 && speedMph < 120) {
      top.push({
        routeShortName: train.routeShortName,
        color: train.color,
        speedMph: Math.round(speedMph),
      });
    }
  }

  top.sort((a, b) => b.speedMph - a.speedMph);
  return top.slice(0, count);
}

// Keep the single-best helper for backward compat tests
function computeFastestTrain(
  trains: TrainSegment[],
  currentTimeSec: number
): FastestTrain | null {
  const top = computeTopFastestTrains(trains, currentTimeSec, 1);
  return top.length > 0 ? top[0] : null;
}

function computeDistanceIncrement(
  trains: TrainSegment[],
  currentTimeSec: number,
  dtSec: number
): number {
  let total = 0;
  for (const train of trains) {
    const ts = train.timestamps;
    const path = train.path;
    if (ts.length < 2) continue;

    let lo = 0;
    let hi = ts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (ts[mid] <= currentTimeSec) lo = mid;
      else hi = mid;
    }

    const segDt = ts[hi] - ts[lo];
    if (segDt <= 0) continue;

    const distMiles = haversineDistMiles(
      path[lo][0], path[lo][1], path[hi][0], path[hi][1]
    );
    const speedMph = (distMiles / segDt) * 3600;
    if (speedMph > 120) continue;

    total += (distMiles / segDt) * dtSec;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// A train going from Times Sq area to Grand Central area (~0.9 mi) in 120 sec
const SAMPLE_TRAIN: TrainSegment = {
  routeShortName: "7",
  color: [185, 51, 173],
  path: [
    [-73.9857, 40.7580], // Times Sq
    [-73.9772, 40.7527], // Grand Central
  ],
  timestamps: [28800, 28920], // 8:00 AM to 8:02 AM
};

// A stationary train (same coordinates)
const STATIONARY_TRAIN: TrainSegment = {
  routeShortName: "L",
  color: [167, 169, 172],
  path: [
    [-73.9857, 40.7580],
    [-73.9857, 40.7580],
  ],
  timestamps: [28800, 28920],
};

describe("computeFastestTrain", () => {
  it("returns null for no trains", () => {
    expect(computeFastestTrain([], 28860)).toBeNull();
  });

  it("returns null for trains with < 2 waypoints", () => {
    const train = { ...SAMPLE_TRAIN, path: [[-73.9857, 40.7580]] as [number, number][], timestamps: [28800] };
    expect(computeFastestTrain([train], 28860)).toBeNull();
  });

  it("computes speed for a moving train", () => {
    const result = computeFastestTrain([SAMPLE_TRAIN], 28860);
    expect(result).not.toBeNull();
    expect(result!.routeShortName).toBe("7");
    // ~0.55 miles in 120 sec = ~16.5 mph (subway speed)
    expect(result!.speedMph).toBeGreaterThan(10);
    expect(result!.speedMph).toBeLessThan(30);
  });

  it("filters out stationary trains (speed < 0.5 mph)", () => {
    expect(computeFastestTrain([STATIONARY_TRAIN], 28860)).toBeNull();
  });

  it("picks the faster of two trains", () => {
    const fastTrain: TrainSegment = {
      routeShortName: "A",
      color: [0, 57, 166],
      path: [
        [-73.9857, 40.7580],
        [-73.9200, 40.6900], // ~5.5 mi apart
      ],
      timestamps: [28800, 28860], // 60 sec → ~330 mph but we cap at 120 — need realistic
    };
    // Make it fast but under 120 mph: ~5.5 mi in 300 sec = ~66 mph
    fastTrain.timestamps = [28800, 29100];
    const result = computeFastestTrain([SAMPLE_TRAIN, fastTrain], 28900);
    expect(result!.routeShortName).toBe("A");
  });

  it("filters out unrealistic speeds (> 120 mph)", () => {
    const teleportTrain: TrainSegment = {
      routeShortName: "S",
      color: [128, 129, 131],
      path: [
        [-73.9857, 40.7580],
        [-74.5, 41.5], // way too far
      ],
      timestamps: [28800, 28801], // 1 second
    };
    expect(computeFastestTrain([teleportTrain], 28800)).toBeNull();
  });
});

describe("computeTopFastestTrains", () => {
  it("returns empty array for no trains", () => {
    expect(computeTopFastestTrains([], 28860)).toEqual([]);
  });

  it("returns up to 5 trains sorted by speed", () => {
    // Create 7 trains with different speeds
    const trains: TrainSegment[] = [];
    const speeds = [10, 30, 50, 20, 40, 60, 15]; // will be sorted: 60,50,40,30,20 (top 5)
    for (let i = 0; i < speeds.length; i++) {
      // Distance = speed * time / 3600, time = 120s
      // We use different endpoints to get different speeds
      const dist = (speeds[i] * 120) / 3600; // miles
      // Approximate: 1 degree lat ≈ 69 miles
      const dLat = dist / 69;
      trains.push({
        routeShortName: String.fromCharCode(65 + i),
        color: [100, 100, 100],
        path: [
          [-73.985, 40.758],
          [-73.985, 40.758 + dLat],
        ],
        timestamps: [28800, 28920],
      });
    }
    const result = computeTopFastestTrains(trains, 28860, 5);
    expect(result.length).toBe(5);
    // Should be sorted descending
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].speedMph).toBeGreaterThanOrEqual(result[i + 1].speedMph);
    }
  });

  it("returns fewer than 5 if not enough valid trains", () => {
    const result = computeTopFastestTrains([SAMPLE_TRAIN], 28860, 5);
    expect(result.length).toBe(1);
    expect(result[0].routeShortName).toBe("7");
  });

  it("excludes stationary trains", () => {
    const result = computeTopFastestTrains([STATIONARY_TRAIN], 28860, 5);
    expect(result.length).toBe(0);
  });
});

describe("computeDistanceIncrement", () => {
  it("returns 0 for no trains", () => {
    expect(computeDistanceIncrement([], 28860, 1)).toBe(0);
  });

  it("accumulates distance proportional to dt", () => {
    const d1 = computeDistanceIncrement([SAMPLE_TRAIN], 28860, 1);
    const d2 = computeDistanceIncrement([SAMPLE_TRAIN], 28860, 2);
    expect(d2).toBeCloseTo(d1 * 2, 5);
  });

  it("skips stationary trains", () => {
    const d = computeDistanceIncrement([STATIONARY_TRAIN], 28860, 1);
    expect(d).toBe(0);
  });

  it("sums distance from multiple trains", () => {
    const d1 = computeDistanceIncrement([SAMPLE_TRAIN], 28860, 1);
    const d2 = computeDistanceIncrement([SAMPLE_TRAIN, SAMPLE_TRAIN], 28860, 1);
    expect(d2).toBeCloseTo(d1 * 2, 5);
  });
});

describe("haversineDistMiles", () => {
  it("returns 0 for same point", () => {
    expect(haversineDistMiles(-73.98, 40.75, -73.98, 40.75)).toBe(0);
  });

  it("computes roughly correct NYC distance", () => {
    // Times Sq to Grand Central is ~0.5 miles
    const d = haversineDistMiles(-73.9857, 40.7580, -73.9772, 40.7527);
    expect(d).toBeGreaterThan(0.3);
    expect(d).toBeLessThan(0.8);
  });
});
