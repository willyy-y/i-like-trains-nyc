/**
 * build-train-trips.ts
 *
 * The core script: turns GTFS schedule data into smooth per-trip trajectories
 * that the frontend can animate.
 *
 * For each active trip on a given date:
 *   1. Look up the trip's shape geometry
 *   2. Map each stop to a position along that shape
 *   3. Between consecutive stops, sample ~15 interpolated waypoints with
 *      linearly interpolated timestamps
 *
 * Output:  ../../data/trips/YYYY-MM-DD.json
 *
 * Usage:
 *   bun run packages/processing/build-train-trips.ts
 *   bun run packages/processing/build-train-trips.ts --date 2025-03-15
 */

import { mkdirSync } from "fs";
import path from "path";
import {
  loadStops,
  loadRoutes,
  loadTrips,
  loadStopTimes,
  loadShapes,
  loadCalendar,
  loadCalendarDates,
  type GtfsShape,
  type GtfsStopTime,
} from "./download-gtfs";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dir, "../..");
const TRIPS_DIR = path.join(ROOT, "data", "trips");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function getTargetDate(): string {
  const idx = process.argv.indexOf("--date");
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  // Default: today in YYYY-MM-DD
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/** Parse GTFS time "HH:MM:SS" (can be >23) to seconds since midnight. */
function parseGtfsTime(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
}

// ---------------------------------------------------------------------------
// Geo helpers
// ---------------------------------------------------------------------------

function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Find the index of the nearest point in `coords` to the given lat/lon. */
function nearestPointIndex(
  coords: { lat: number; lon: number }[],
  lat: number,
  lon: number
): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = haversine(lat, lon, coords[i].lat, coords[i].lon);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ---------------------------------------------------------------------------
// Service calendar
// ---------------------------------------------------------------------------

async function getActiveServiceIds(dateStr: string): Promise<Set<string>> {
  const calendar = await loadCalendar();
  const calendarDates = await loadCalendarDates();

  const date = new Date(dateStr + "T12:00:00"); // noon to avoid TZ issues
  const dayOfWeek = date.getDay(); // 0=Sun
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  const dayName = dayNames[dayOfWeek];
  const dateCompact = dateStr.replace(/-/g, ""); // YYYYMMDD

  const active = new Set<string>();

  // calendar.txt: check date range and day-of-week flag
  for (const entry of calendar) {
    if (dateCompact >= entry.start_date && dateCompact <= entry.end_date) {
      if ((entry as any)[dayName] === 1) {
        active.add(entry.service_id);
      }
    }
  }

  // calendar_dates.txt: add/remove exceptions
  for (const ex of calendarDates) {
    if (ex.date === dateCompact) {
      if (ex.exception_type === 1) active.add(ex.service_id);
      if (ex.exception_type === 2) active.delete(ex.service_id);
    }
  }

  return active;
}

// ---------------------------------------------------------------------------
// Shape processing
// ---------------------------------------------------------------------------

interface ShapePoint {
  lat: number;
  lon: number;
  cumDist: number; // cumulative distance in metres from shape start
}

function buildShapeIndex(
  shapePoints: GtfsShape[]
): Map<string, ShapePoint[]> {
  // Group by shape_id
  const groups = new Map<string, GtfsShape[]>();
  for (const pt of shapePoints) {
    let arr = groups.get(pt.shape_id);
    if (!arr) {
      arr = [];
      groups.set(pt.shape_id, arr);
    }
    arr.push(pt);
  }

  const index = new Map<string, ShapePoint[]>();

  for (const [shapeId, pts] of groups) {
    pts.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);

    const hasDistField =
      pts[0].shape_dist_traveled != null &&
      pts[pts.length - 1].shape_dist_traveled != null;

    const processed: ShapePoint[] = [];
    let cumDist = 0;

    for (let i = 0; i < pts.length; i++) {
      if (hasDistField && pts[i].shape_dist_traveled != null) {
        cumDist = pts[i].shape_dist_traveled!;
      } else if (i > 0) {
        cumDist += haversine(
          pts[i - 1].shape_pt_lat,
          pts[i - 1].shape_pt_lon,
          pts[i].shape_pt_lat,
          pts[i].shape_pt_lon
        );
      }
      processed.push({
        lat: pts[i].shape_pt_lat,
        lon: pts[i].shape_pt_lon,
        cumDist,
      });
    }
    index.set(shapeId, processed);
  }

  return index;
}

// ---------------------------------------------------------------------------
// Interpolation along a shape between two cumulative-distance positions
// ---------------------------------------------------------------------------

function interpolateAlongShape(
  shape: ShapePoint[],
  fromDist: number,
  toDist: number,
  fromTime: number,
  toTime: number,
  numSamples: number
): { path: [number, number][]; timestamps: number[] } {
  const path: [number, number][] = [];
  const timestamps: number[] = [];

  for (let s = 0; s <= numSamples; s++) {
    const t = s / numSamples;
    const dist = fromDist + t * (toDist - fromDist);
    const time = fromTime + t * (toTime - fromTime);

    // Find the two shape points that bracket `dist`
    let lo = 0;
    let hi = shape.length - 1;
    for (let i = 0; i < shape.length - 1; i++) {
      if (shape[i].cumDist <= dist && shape[i + 1].cumDist >= dist) {
        lo = i;
        hi = i + 1;
        break;
      }
    }

    // Linear interpolation between lo and hi
    const segLen = shape[hi].cumDist - shape[lo].cumDist;
    const frac = segLen > 0 ? (dist - shape[lo].cumDist) / segLen : 0;
    const lat = shape[lo].lat + frac * (shape[hi].lat - shape[lo].lat);
    const lon = shape[lo].lon + frac * (shape[hi].lon - shape[lo].lon);

    path.push([lon, lat]); // [lng, lat]
    timestamps.push(Math.round(time));
  }

  return { path, timestamps };
}

// ---------------------------------------------------------------------------
// Map a stop to a cumulative distance along a shape
// ---------------------------------------------------------------------------

function stopDistOnShape(
  stopLat: number,
  stopLon: number,
  shape: ShapePoint[],
  hintDistTraveled: number | null,
  minSearchIdx: number
): { dist: number; idx: number } {
  // If we have shape_dist_traveled from stop_times, use it directly
  if (hintDistTraveled != null && hintDistTraveled > 0) {
    // Find closest shape point to that distance for the index
    let bestIdx = minSearchIdx;
    let bestDelta = Infinity;
    for (let i = minSearchIdx; i < shape.length; i++) {
      const delta = Math.abs(shape[i].cumDist - hintDistTraveled);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    return { dist: hintDistTraveled, idx: bestIdx };
  }

  // Otherwise snap to nearest point on shape (only searching forward)
  let bestIdx = minSearchIdx;
  let bestDist = Infinity;
  const searchEnd = Math.min(shape.length, minSearchIdx + shape.length);
  for (let i = minSearchIdx; i < searchEnd && i < shape.length; i++) {
    const d = haversine(stopLat, stopLon, shape[i].lat, shape[i].lon);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return { dist: shape[bestIdx].cumDist, idx: bestIdx };
}

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

interface TripOutput {
  tripId: string;
  routeShortName: string;
  directionId: number;
  path: [number, number][];
  timestamps: number[];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** Adaptive waypoint count based on segment distance in meters. */
function waypointsForSegment(distMeters: number): number {
  if (distMeters < 300) return 3;
  if (distMeters <= 800) return 6;
  return 12;
}

/** Round coordinate to 5 decimal places (~1.1m precision) — plenty for visual rendering. */
function q5(n: number): number {
  return Math.round(n * 100000) / 100000;
}

async function main() {
  const start = performance.now();
  const targetDate = getTargetDate();
  console.log(`Building trip trajectories for ${targetDate} ...`);

  console.log("Loading GTFS data ...");
  const [stops, routes, trips, stopTimes, shapes] = await Promise.all([
    loadStops(),
    loadRoutes(),
    loadTrips(),
    loadStopTimes(),
    loadShapes(),
  ]);

  // --- Active services for date --------------------------------------------
  console.log("Determining active services ...");
  const activeServices = await getActiveServiceIds(targetDate);
  console.log(`  Active service IDs: ${activeServices.size}`);

  if (activeServices.size === 0) {
    console.warn(
      "WARNING: No active services found for this date. Output will be empty."
    );
  }

  // --- Lookups -------------------------------------------------------------
  const routeMap = new Map(routes.map((r) => [r.route_id, r]));
  const stopMap = new Map(stops.map((s) => [s.stop_id, s]));

  // Shape index
  console.log("Building shape index ...");
  const shapeIndex = buildShapeIndex(shapes);
  console.log(`  ${shapeIndex.size} shapes indexed`);

  // Group stop_times by trip_id
  console.log("Grouping stop_times by trip ...");
  const stopTimesByTrip = new Map<string, GtfsStopTime[]>();
  for (const st of stopTimes) {
    let arr = stopTimesByTrip.get(st.trip_id);
    if (!arr) {
      arr = [];
      stopTimesByTrip.set(st.trip_id, arr);
    }
    arr.push(st);
  }

  // Filter to active trips
  const activeTrips = trips.filter((t) => activeServices.has(t.service_id));
  console.log(`  Active trips: ${activeTrips.length} / ${trips.length}`);

  // --- Process each trip ---------------------------------------------------
  console.log("Processing trips ...");
  const output: TripOutput[] = [];
  let skipped = 0;

  for (const trip of activeTrips) {
    const route = routeMap.get(trip.route_id);
    if (!route) {
      skipped++;
      continue;
    }

    const shape = shapeIndex.get(trip.shape_id);
    if (!shape || shape.length < 2) {
      skipped++;
      continue;
    }

    const times = stopTimesByTrip.get(trip.trip_id);
    if (!times || times.length < 2) {
      skipped++;
      continue;
    }

    // Sort by stop_sequence
    times.sort((a, b) => a.stop_sequence - b.stop_sequence);

    // Map each stop to a distance along the shape
    const stopDistances: { dist: number; time: number; idx: number }[] = [];
    let lastIdx = 0;

    for (const st of times) {
      const stop = stopMap.get(st.stop_id);
      if (!stop) continue;

      const timeSec = parseGtfsTime(st.arrival_time || st.departure_time);
      const { dist, idx } = stopDistOnShape(
        stop.stop_lat,
        stop.stop_lon,
        shape,
        st.shape_dist_traveled,
        lastIdx
      );
      stopDistances.push({ dist, time: timeSec, idx });
      lastIdx = idx;
    }

    if (stopDistances.length < 2) {
      skipped++;
      continue;
    }

    // Ensure distances are monotonically increasing
    for (let i = 1; i < stopDistances.length; i++) {
      if (stopDistances[i].dist <= stopDistances[i - 1].dist) {
        stopDistances[i].dist = stopDistances[i - 1].dist + 1;
      }
    }

    // Interpolate between consecutive stops
    const fullPath: [number, number][] = [];
    const fullTimestamps: number[] = [];

    for (let i = 0; i < stopDistances.length - 1; i++) {
      const from = stopDistances[i];
      const to = stopDistances[i + 1];
      const segDist = to.dist - from.dist;
      const numWaypoints = waypointsForSegment(segDist);

      const { path: segPath, timestamps: segTs } = interpolateAlongShape(
        shape,
        from.dist,
        to.dist,
        from.time,
        to.time,
        numWaypoints
      );

      // Avoid duplicate points at segment boundaries
      const startIdx = i === 0 ? 0 : 1;
      for (let j = startIdx; j < segPath.length; j++) {
        fullPath.push([q5(segPath[j][0]), q5(segPath[j][1])]);
        fullTimestamps.push(segTs[j]);
      }
    }

    output.push({
      tripId: trip.trip_id,
      routeShortName: route.route_short_name,
      directionId: trip.direction_id,
      path: fullPath,
      timestamps: fullTimestamps,
    });
  }

  // --- Write output --------------------------------------------------------
  mkdirSync(TRIPS_DIR, { recursive: true });

  const outPath = path.join(TRIPS_DIR, `${targetDate}.json`);
  const json = JSON.stringify(output);
  await Bun.write(outPath, json);

  // Copy to public dir for frontend
  const publicTripsDir = path.join(ROOT, "apps", "client", "public", "data", "trips");
  mkdirSync(publicTripsDir, { recursive: true });
  await Bun.write(path.join(publicTripsDir, `${targetDate}.json`), json);

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`\nTrip Trajectory Summary (${targetDate}):`);
  console.log(`  Active trips processed: ${output.length}`);
  console.log(`  Skipped (missing data): ${skipped}`);
  console.log(
    `  Avg waypoints per trip: ${output.length > 0 ? Math.round(output.reduce((s, t) => s + t.path.length, 0) / output.length) : 0}`
  );
  console.log(`  Output size:            ${(json.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Written to: ${outPath}`);
  console.log(`\nDone in ${elapsed}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
