/**
 * build-stations.ts
 *
 * Reads GTFS stops, stop_times, trips, and routes to produce a station list
 * with the subway lines that serve each station.  Parent stations
 * (location_type=1) are used where available; otherwise child stops are
 * grouped by parent_station.
 *
 * Includes a Fuse.js index export so downstream ridership scripts can fuzzy-
 * match MTA station names to GTFS station names.
 *
 * Output:
 *   ../../data/stations.json
 *   ../../apps/client/public/stations.json
 *
 * Usage:  bun run packages/processing/build-stations.ts
 */

import Fuse from "fuse.js";
import { mkdirSync } from "fs";
import path from "path";
import {
  loadStops,
  loadStopTimes,
  loadTrips,
  loadRoutes,
} from "./download-gtfs";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dir, "../..");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "apps", "client", "public");
const OUT_PATH = path.join(DATA_DIR, "stations.json");
const PUBLIC_PATH = path.join(PUBLIC_DIR, "stations.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Station {
  id: string;
  complexId: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const start = performance.now();

  console.log("Loading GTFS data ...");
  const [stops, stopTimes, trips, routes] = await Promise.all([
    loadStops(),
    loadStopTimes(),
    loadTrips(),
    loadRoutes(),
  ]);

  // --- Build lookup maps ---------------------------------------------------

  const routeMap = new Map(routes.map((r) => [r.route_id, r]));

  // trip_id -> route_short_name
  const tripRouteMap = new Map<string, string>();
  for (const trip of trips) {
    const route = routeMap.get(trip.route_id);
    if (route) tripRouteMap.set(trip.trip_id, route.route_short_name);
  }

  // stop_id -> Set<route_short_name>  (via stop_times -> trips -> routes)
  console.log("Mapping stops to lines via stop_times ...");
  const stopLineMap = new Map<string, Set<string>>();
  for (const st of stopTimes) {
    const routeName = tripRouteMap.get(st.trip_id);
    if (!routeName) continue;
    let lineSet = stopLineMap.get(st.stop_id);
    if (!lineSet) {
      lineSet = new Set();
      stopLineMap.set(st.stop_id, lineSet);
    }
    lineSet.add(routeName);
  }

  // --- Identify parent stations --------------------------------------------

  // Parent stations are location_type=1.  Child stops reference them via
  // parent_station.  We want one entry per parent station (or per stand-alone
  // stop if there is no parent).

  const parentStops = stops.filter((s) => s.location_type === 1);
  const childStops = stops.filter(
    (s) => s.location_type !== 1 && s.parent_station
  );
  const orphanStops = stops.filter(
    (s) => s.location_type !== 1 && !s.parent_station
  );

  // parent_station id -> child stop_ids
  const parentChildMap = new Map<string, string[]>();
  for (const child of childStops) {
    let arr = parentChildMap.get(child.parent_station);
    if (!arr) {
      arr = [];
      parentChildMap.set(child.parent_station, arr);
    }
    arr.push(child.stop_id);
  }

  // Collect lines for a station by merging all its child stop lines
  function getLinesForStation(parentId: string): string[] {
    const lines = new Set<string>();
    // Lines from the parent stop itself (unlikely but check)
    const parentLines = stopLineMap.get(parentId);
    if (parentLines) parentLines.forEach((l) => lines.add(l));
    // Lines from children
    const children = parentChildMap.get(parentId) || [];
    for (const childId of children) {
      const childLines = stopLineMap.get(childId);
      if (childLines) childLines.forEach((l) => lines.add(l));
    }
    return Array.from(lines).sort();
  }

  // --- Build station objects -----------------------------------------------

  console.log("Building station list ...");
  const stations: Station[] = [];

  // From parent stations
  for (const ps of parentStops) {
    const lines = getLinesForStation(ps.stop_id);
    if (lines.length === 0) continue; // skip stations with no subway service
    stations.push({
      id: ps.stop_id,
      complexId: ps.stop_id, // default to self; can be overridden by complex data
      name: ps.stop_name,
      lat: ps.stop_lat,
      lng: ps.stop_lon,
      lines,
    });
  }

  // Orphan stops that have no parent — treat each as its own station
  for (const os of orphanStops) {
    const lines = Array.from(stopLineMap.get(os.stop_id) || []).sort();
    if (lines.length === 0) continue;
    stations.push({
      id: os.stop_id,
      complexId: os.stop_id,
      name: os.stop_name,
      lat: os.stop_lat,
      lng: os.stop_lon,
      lines,
    });
  }

  // Sort by name for deterministic output
  stations.sort((a, b) => a.name.localeCompare(b.name));

  // --- Group into complexes ------------------------------------------------
  // Simple heuristic: stations within ~200m and sharing the same name are a
  // complex.  Assign the same complexId (first station's id).

  console.log("Grouping into complexes ...");
  const complexAssignment = new Map<string, string>();

  for (let i = 0; i < stations.length; i++) {
    if (complexAssignment.has(stations[i].id)) continue;
    const group = [stations[i]];
    complexAssignment.set(stations[i].id, stations[i].id);

    for (let j = i + 1; j < stations.length; j++) {
      if (complexAssignment.has(stations[j].id)) continue;
      // Same name check (case-insensitive)
      if (
        stations[i].name.toLowerCase() !== stations[j].name.toLowerCase()
      )
        continue;
      // Distance check
      const dlat = stations[i].lat - stations[j].lat;
      const dlng = stations[i].lng - stations[j].lng;
      const approxDist = Math.sqrt(dlat * dlat + dlng * dlng) * 111_000;
      if (approxDist > 300) continue;
      group.push(stations[j]);
      complexAssignment.set(stations[j].id, stations[i].id);
    }

    // Merge lines from the complex into each member
    if (group.length > 1) {
      const allLines = new Set<string>();
      for (const s of group) s.lines.forEach((l) => allLines.add(l));
      const merged = Array.from(allLines).sort();
      for (const s of group) {
        s.complexId = stations[i].id;
        s.lines = merged;
      }
    }
  }

  // --- Fuse.js index for downstream fuzzy matching -------------------------

  const fuse = new Fuse(stations, {
    keys: ["name"],
    threshold: 0.4,
    includeScore: true,
  });

  // Quick self-test
  const testResult = fuse.search("Times Sq");
  if (testResult.length > 0) {
    console.log(
      `  Fuse.js test: "Times Sq" -> "${testResult[0].item.name}" (score ${testResult[0].score?.toFixed(3)})`
    );
  }

  // --- Write output --------------------------------------------------------

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  const json = JSON.stringify(stations);
  await Bun.write(OUT_PATH, json);
  await Bun.write(PUBLIC_PATH, json);

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  const uniqueLines = new Set(stations.flatMap((s) => s.lines));
  const complexCount = new Set(stations.map((s) => s.complexId)).size;

  console.log(`\nStation Summary:`);
  console.log(`  Total stations:    ${stations.length}`);
  console.log(`  Station complexes: ${complexCount}`);
  console.log(`  Unique lines:      ${uniqueLines.size} (${Array.from(uniqueLines).sort().join(", ")})`);
  console.log(`  Output size:       ${(json.length / 1024).toFixed(1)} KB`);
  console.log(`  Written to: ${OUT_PATH}`);
  console.log(`  Copied to:  ${PUBLIC_PATH}`);
  console.log(`\nDone in ${elapsed}s`);
}

// Export the fuse builder for use by build-ridership
export async function buildStationFuse(): Promise<{
  stations: Station[];
  fuse: Fuse<Station>;
}> {
  const [stops, stopTimes, trips, routes] = await Promise.all([
    loadStops(),
    loadStopTimes(),
    loadTrips(),
    loadRoutes(),
  ]);

  const routeMap = new Map(routes.map((r) => [r.route_id, r]));
  const tripRouteMap = new Map<string, string>();
  for (const t of trips) {
    const r = routeMap.get(t.route_id);
    if (r) tripRouteMap.set(t.trip_id, r.route_short_name);
  }
  const stopLineMap = new Map<string, Set<string>>();
  for (const st of stopTimes) {
    const rn = tripRouteMap.get(st.trip_id);
    if (!rn) continue;
    let s = stopLineMap.get(st.stop_id);
    if (!s) { s = new Set(); stopLineMap.set(st.stop_id, s); }
    s.add(rn);
  }

  const parentStops = stops.filter((s) => s.location_type === 1);
  const parentChildMap = new Map<string, string[]>();
  for (const c of stops.filter((s) => s.location_type !== 1 && s.parent_station)) {
    let arr = parentChildMap.get(c.parent_station);
    if (!arr) { arr = []; parentChildMap.set(c.parent_station, arr); }
    arr.push(c.stop_id);
  }

  const stations: Station[] = [];
  for (const ps of parentStops) {
    const lines = new Set<string>();
    (stopLineMap.get(ps.stop_id) || new Set()).forEach((l) => lines.add(l));
    for (const cid of parentChildMap.get(ps.stop_id) || []) {
      (stopLineMap.get(cid) || new Set()).forEach((l) => lines.add(l));
    }
    if (lines.size === 0) continue;
    stations.push({
      id: ps.stop_id,
      complexId: ps.stop_id,
      name: ps.stop_name,
      lat: ps.stop_lat,
      lng: ps.stop_lon,
      lines: Array.from(lines).sort(),
    });
  }

  const fuse = new Fuse(stations, {
    keys: ["name"],
    threshold: 0.4,
    includeScore: true,
  });

  return { stations, fuse };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
