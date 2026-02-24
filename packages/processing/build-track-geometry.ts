/**
 * build-track-geometry.ts
 *
 * Reads GTFS shapes.txt and trips.txt/routes.txt to produce a single JSON
 * file of track polylines keyed by route.  For each route+direction we keep
 * the longest shape so the frontend has full-coverage geometry.
 *
 * Output:
 *   ../../data/track-geometry.json
 *   ../../apps/client/public/track-geometry.json   (copy)
 *
 * Usage:  bun run packages/processing/build-track-geometry.ts
 */

import { mkdirSync } from "fs";
import path from "path";
import {
  loadShapes,
  loadTrips,
  loadRoutes,
  type GtfsShape,
} from "./download-gtfs";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dir, "../..");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "apps", "client", "public");
const OUT_PATH = path.join(DATA_DIR, "track-geometry.json");
const PUBLIC_PATH = path.join(PUBLIC_DIR, "track-geometry.json");

// ---------------------------------------------------------------------------
// Haversine distance (metres)
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrackSegment {
  routeId: string;
  routeShortName: string;
  shapeId: string;
  directionId: number;
  coordinates: [number, number][]; // [lng, lat]
  totalDistance: number; // metres
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const start = performance.now();

  console.log("Loading GTFS data ...");
  const [shapes, trips, routes] = await Promise.all([
    loadShapes(),
    loadTrips(),
    loadRoutes(),
  ]);

  // Build route lookup
  const routeMap = new Map(routes.map((r) => [r.route_id, r]));

  // Map shape_id -> { route_id, route_short_name, direction_id } via trips
  // A shape can appear on multiple trips; we only need one mapping.
  const shapeRouteMap = new Map<
    string,
    { routeId: string; routeShortName: string; directionId: number }
  >();

  for (const trip of trips) {
    if (shapeRouteMap.has(trip.shape_id)) continue;
    const route = routeMap.get(trip.route_id);
    if (!route) continue;
    shapeRouteMap.set(trip.shape_id, {
      routeId: trip.route_id,
      routeShortName: route.route_short_name,
      directionId: trip.direction_id,
    });
  }

  // Group shape points by shape_id, sort by sequence
  console.log("Grouping shape points ...");
  const shapeGroups = new Map<string, GtfsShape[]>();
  for (const pt of shapes) {
    let arr = shapeGroups.get(pt.shape_id);
    if (!arr) {
      arr = [];
      shapeGroups.set(pt.shape_id, arr);
    }
    arr.push(pt);
  }

  // Build track segments
  console.log("Building track segments ...");
  const segments: TrackSegment[] = [];

  for (const [shapeId, points] of shapeGroups) {
    const meta = shapeRouteMap.get(shapeId);
    if (!meta) continue; // shape not used by any subway trip

    // Sort by sequence
    points.sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence);

    // Build coordinate array [lng, lat] and compute total distance
    const coordinates: [number, number][] = [];
    let totalDistance = 0;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      coordinates.push([pt.shape_pt_lon, pt.shape_pt_lat]);

      if (i > 0) {
        const prev = points[i - 1];
        // Use shape_dist_traveled if available for both points
        if (
          pt.shape_dist_traveled != null &&
          prev.shape_dist_traveled != null
        ) {
          totalDistance = pt.shape_dist_traveled; // cumulative
        } else {
          totalDistance += haversine(
            prev.shape_pt_lat,
            prev.shape_pt_lon,
            pt.shape_pt_lat,
            pt.shape_pt_lon
          );
        }
      }
    }

    segments.push({
      routeId: meta.routeId,
      routeShortName: meta.routeShortName,
      shapeId,
      directionId: meta.directionId,
      coordinates,
      totalDistance,
    });
  }

  // Deduplicate: keep the longest shape per route+direction
  console.log("Deduplicating shapes per route+direction ...");
  const bestMap = new Map<string, TrackSegment>();
  for (const seg of segments) {
    const key = `${seg.routeId}_${seg.directionId}`;
    const existing = bestMap.get(key);
    if (!existing || seg.totalDistance > existing.totalDistance) {
      bestMap.set(key, seg);
    }
  }

  const deduplicated = Array.from(bestMap.values());

  // Prepare output (strip totalDistance helper field)
  const output = deduplicated.map((s) => ({
    routeId: s.routeId,
    routeShortName: s.routeShortName,
    shapeId: s.shapeId,
    directionId: s.directionId,
    coordinates: s.coordinates,
  }));

  // Write files
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  const json = JSON.stringify(output);
  await Bun.write(OUT_PATH, json);
  await Bun.write(PUBLIC_PATH, json);

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`\nTrack Geometry Summary:`);
  console.log(`  Total shapes parsed:   ${shapeGroups.size}`);
  console.log(`  Segments with routes:  ${segments.length}`);
  console.log(`  After deduplication:   ${deduplicated.length}`);
  console.log(`  Unique routes:         ${new Set(deduplicated.map((s) => s.routeShortName)).size}`);
  console.log(`  Output size:           ${(json.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Written to: ${OUT_PATH}`);
  console.log(`  Copied to:  ${PUBLIC_PATH}`);
  console.log(`\nDone in ${elapsed}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
