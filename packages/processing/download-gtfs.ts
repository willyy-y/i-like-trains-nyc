/**
 * download-gtfs.ts
 *
 * Downloads the MTA GTFS static feed zip, extracts it with fflate,
 * and parses the key CSV files into typed arrays that other scripts import.
 *
 * Usage:  bun run packages/processing/download-gtfs.ts
 */

import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";
import { existsSync, mkdirSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dir, "../..");
const GTFS_DIR = path.join(ROOT, "data", "gtfs");
const GTFS_URL =
  "http://web.mta.info/developers/data/nyct/subway/google_transit.zip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GtfsStop {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_desc: string;
  stop_lat: number;
  stop_lon: number;
  zone_id: string;
  stop_url: string;
  location_type: number;
  parent_station: string;
}

export interface GtfsRoute {
  route_id: string;
  agency_id: string;
  route_short_name: string;
  route_long_name: string;
  route_desc: string;
  route_type: number;
  route_url: string;
  route_color: string;
  route_text_color: string;
}

export interface GtfsTrip {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign: string;
  direction_id: number;
  block_id: string;
  shape_id: string;
}

export interface GtfsStopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: number;
  stop_headsign: string;
  pickup_type: number;
  drop_off_type: number;
  shape_dist_traveled: number | null;
}

export interface GtfsShape {
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
  shape_dist_traveled: number | null;
}

export interface GtfsCalendar {
  service_id: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  start_date: string;
  end_date: string;
}

export interface GtfsCalendarDate {
  service_id: string;
  date: string;
  exception_type: number;
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function parseCsv<T>(raw: string): T[] {
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: (value: string, context: { column: string | number }) => {
      const col = context.column as string;
      if (
        [
          "stop_lat",
          "stop_lon",
          "shape_pt_lat",
          "shape_pt_lon",
          "shape_dist_traveled",
        ].includes(col)
      ) {
        const n = parseFloat(value);
        return isNaN(n) ? null : n;
      }
      if (
        [
          "location_type",
          "route_type",
          "direction_id",
          "stop_sequence",
          "pickup_type",
          "drop_off_type",
          "exception_type",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
          "shape_pt_sequence",
        ].includes(col)
      ) {
        return parseInt(value, 10) || 0;
      }
      return value;
    },
  }) as T[];
}

// ---------------------------------------------------------------------------
// Download & extract
// ---------------------------------------------------------------------------

async function downloadAndExtract(): Promise<void> {
  mkdirSync(GTFS_DIR, { recursive: true });

  console.log(`Downloading GTFS from ${GTFS_URL} ...`);
  const res = await fetch(GTFS_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const zipBuffer = new Uint8Array(await res.arrayBuffer());
  console.log(`Downloaded ${(zipBuffer.byteLength / 1024 / 1024).toFixed(1)} MB`);

  console.log("Extracting zip ...");
  const files = unzipSync(zipBuffer);

  let count = 0;
  for (const [name, data] of Object.entries(files)) {
    const outPath = path.join(GTFS_DIR, name);
    // Ensure subdirectories exist (some zips nest files)
    mkdirSync(path.dirname(outPath), { recursive: true });
    await Bun.write(outPath, data);
    count++;
  }
  console.log(`Extracted ${count} files to ${GTFS_DIR}`);
}

// ---------------------------------------------------------------------------
// Loaders (lazy, cached)
// ---------------------------------------------------------------------------

async function readGtfsFile(name: string): Promise<string> {
  const filePath = path.join(GTFS_DIR, name);
  if (!existsSync(filePath)) {
    throw new Error(
      `${filePath} not found. Run download-gtfs.ts first.`
    );
  }
  return await Bun.file(filePath).text();
}

let _stops: GtfsStop[] | null = null;
export async function loadStops(): Promise<GtfsStop[]> {
  if (!_stops) _stops = parseCsv<GtfsStop>(await readGtfsFile("stops.txt"));
  return _stops;
}

let _routes: GtfsRoute[] | null = null;
export async function loadRoutes(): Promise<GtfsRoute[]> {
  if (!_routes) _routes = parseCsv<GtfsRoute>(await readGtfsFile("routes.txt"));
  return _routes;
}

let _trips: GtfsTrip[] | null = null;
export async function loadTrips(): Promise<GtfsTrip[]> {
  if (!_trips) _trips = parseCsv<GtfsTrip>(await readGtfsFile("trips.txt"));
  return _trips;
}

let _stopTimes: GtfsStopTime[] | null = null;
export async function loadStopTimes(): Promise<GtfsStopTime[]> {
  if (!_stopTimes)
    _stopTimes = parseCsv<GtfsStopTime>(await readGtfsFile("stop_times.txt"));
  return _stopTimes;
}

let _shapes: GtfsShape[] | null = null;
export async function loadShapes(): Promise<GtfsShape[]> {
  if (!_shapes) _shapes = parseCsv<GtfsShape>(await readGtfsFile("shapes.txt"));
  return _shapes;
}

let _calendar: GtfsCalendar[] | null = null;
export async function loadCalendar(): Promise<GtfsCalendar[]> {
  if (!_calendar)
    _calendar = parseCsv<GtfsCalendar>(await readGtfsFile("calendar.txt"));
  return _calendar;
}

let _calendarDates: GtfsCalendarDate[] | null = null;
export async function loadCalendarDates(): Promise<GtfsCalendarDate[]> {
  if (!_calendarDates)
    _calendarDates = parseCsv<GtfsCalendarDate>(
      await readGtfsFile("calendar_dates.txt")
    );
  return _calendarDates;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (import.meta.main) {
  const start = performance.now();
  await downloadAndExtract();

  // Verify key files parse correctly
  const [stops, routes, trips, stopTimes, shapes, calendar, calendarDates] =
    await Promise.all([
      loadStops(),
      loadRoutes(),
      loadTrips(),
      loadStopTimes(),
      loadShapes(),
      loadCalendar(),
      loadCalendarDates(),
    ]);

  console.log("\nGTFS Summary:");
  console.log(`  stops.txt          ${stops.length.toLocaleString()} rows`);
  console.log(`  routes.txt         ${routes.length.toLocaleString()} rows`);
  console.log(`  trips.txt          ${trips.length.toLocaleString()} rows`);
  console.log(`  stop_times.txt     ${stopTimes.length.toLocaleString()} rows`);
  console.log(`  shapes.txt         ${shapes.length.toLocaleString()} rows`);
  console.log(`  calendar.txt       ${calendar.length.toLocaleString()} rows`);
  console.log(`  calendar_dates.txt ${calendarDates.length.toLocaleString()} rows`);

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s`);
}
