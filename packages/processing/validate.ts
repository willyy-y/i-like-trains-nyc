/**
 * validate.ts
 *
 * Quick sanity check that the data pipeline outputs exist and look reasonable.
 *
 * Usage:  bun run packages/processing/validate.ts
 */

import { existsSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dir, "../..");
const DATA_DIR = path.join(ROOT, "data");

let errors = 0;
let warnings = 0;

function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  OK   ${label}${detail ? " — " + detail : ""}`);
  } else {
    console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`);
    errors++;
  }
}

function warn(label: string, detail?: string) {
  console.log(`  WARN ${label}${detail ? " — " + detail : ""}`);
  warnings++;
}

async function main() {
  console.log("Validating pipeline outputs ...\n");

  // --- track-geometry.json -------------------------------------------------
  console.log("[Track Geometry]");
  const trackPath = path.join(DATA_DIR, "track-geometry.json");
  const trackPublicPath = path.join(ROOT, "apps", "client", "public", "track-geometry.json");
  const trackExists = existsSync(trackPath);
  check("track-geometry.json exists", trackExists);

  if (trackExists) {
    const data = await Bun.file(trackPath).json();
    check("Is an array", Array.isArray(data));
    check("Has routes", data.length > 0, `${data.length} route shapes`);
    if (data.length > 0) {
      const sample = data[0];
      check("Has routeId field", !!sample.routeId);
      check("Has coordinates array", Array.isArray(sample.coordinates) && sample.coordinates.length > 0,
        `first shape has ${sample.coordinates?.length} points`);
      const uniqueRoutes = new Set(data.map((d: any) => d.routeShortName));
      console.log(`         Unique route names: ${Array.from(uniqueRoutes).sort().join(", ")}`);
    }
    check("Public copy exists", existsSync(trackPublicPath));
  }

  // --- stations.json -------------------------------------------------------
  console.log("\n[Stations]");
  const stationsPath = path.join(DATA_DIR, "stations.json");
  const stationsPublicPath = path.join(ROOT, "apps", "client", "public", "stations.json");
  const stationsExist = existsSync(stationsPath);
  check("stations.json exists", stationsExist);

  if (stationsExist) {
    const data = await Bun.file(stationsPath).json();
    check("Is an array", Array.isArray(data));
    check("Has stations", data.length > 0, `${data.length} stations`);
    if (data.length > 0) {
      const sample = data[0];
      check("Has id field", !!sample.id);
      check("Has name field", !!sample.name);
      check("Has lat/lng", typeof sample.lat === "number" && typeof sample.lng === "number");
      check("Has lines array", Array.isArray(sample.lines) && sample.lines.length > 0);
      const uniqueLines = new Set(data.flatMap((d: any) => d.lines));
      console.log(`         Unique lines: ${Array.from(uniqueLines).sort().join(", ")}`);
    }
    check("Public copy exists", existsSync(stationsPublicPath));
  }

  // --- trips ---------------------------------------------------------------
  console.log("\n[Trip Trajectories]");
  const tripsDir = path.join(DATA_DIR, "trips");
  const tripsDirExists = existsSync(tripsDir);
  check("trips/ directory exists", tripsDirExists);

  if (tripsDirExists) {
    const tripFiles = readdirSync(tripsDir).filter((f) => f.endsWith(".json"));
    check("Has at least one trip file", tripFiles.length > 0, `${tripFiles.length} file(s)`);

    if (tripFiles.length > 0) {
      // Check the most recent file
      tripFiles.sort();
      const latest = tripFiles[tripFiles.length - 1];
      const data = await Bun.file(path.join(tripsDir, latest)).json();
      check(`${latest} is an array`, Array.isArray(data));
      check(`${latest} has trips`, data.length > 0, `${data.length} trips`);
      if (data.length > 0) {
        const sample = data[0];
        check("Has tripId", !!sample.tripId);
        check("Has routeShortName", !!sample.routeShortName);
        check("Has path array", Array.isArray(sample.path) && sample.path.length > 0,
          `${sample.path?.length} waypoints`);
        check("Has timestamps array", Array.isArray(sample.timestamps) && sample.timestamps.length > 0);
        check("path and timestamps same length",
          sample.path?.length === sample.timestamps?.length);

        // Timestamp sanity: should be seconds since midnight (0..~100000 for late-night service)
        const minTs = Math.min(...sample.timestamps);
        const maxTs = Math.max(...sample.timestamps);
        check("Timestamps in reasonable range",
          minTs >= 0 && maxTs < 200_000,
          `range: ${minTs}–${maxTs} seconds`);
      }
      console.log(`         Trip files: ${tripFiles.join(", ")}`);
    }
  }

  // --- ridership -----------------------------------------------------------
  console.log("\n[Ridership]");
  const ridershipDir = path.join(DATA_DIR, "ridership");
  const ridershipDirExists = existsSync(ridershipDir);

  if (!ridershipDirExists) {
    warn("ridership/ directory does not exist", "Run build-ridership.ts if needed");
  } else {
    const rFiles = readdirSync(ridershipDir).filter((f) => f.endsWith(".json"));
    if (rFiles.length === 0) {
      warn("No ridership files found");
    } else {
      check("Has ridership files", true, `${rFiles.length} file(s)`);
      rFiles.sort();
      const latest = rFiles[rFiles.length - 1];
      const data = await Bun.file(path.join(ridershipDir, latest)).json();
      check(`${latest} is an array`, Array.isArray(data));
      if (data.length > 0) {
        const sample = data[0];
        check("Has stationComplexId", !!sample.stationComplexId);
        check("Has ridershipNormalized", typeof sample.ridershipNormalized === "number");
        check("Normalized in 0-1 range",
          sample.ridershipNormalized >= 0 && sample.ridershipNormalized <= 1);
      }
      console.log(`         Date range: ${rFiles[0].replace(".json", "")} to ${latest.replace(".json", "")}`);
    }
  }

  // --- GTFS raw files ------------------------------------------------------
  console.log("\n[GTFS Raw Data]");
  const gtfsDir = path.join(DATA_DIR, "gtfs");
  const gtfsFiles = [
    "stops.txt",
    "routes.txt",
    "trips.txt",
    "stop_times.txt",
    "shapes.txt",
    "calendar.txt",
  ];
  for (const f of gtfsFiles) {
    const exists = existsSync(path.join(gtfsDir, f));
    check(f, exists, exists ? "present" : "MISSING — run download-gtfs.ts");
  }

  // --- Summary -------------------------------------------------------------
  console.log("\n" + "=".repeat(50));
  if (errors === 0 && warnings === 0) {
    console.log("All checks passed.");
  } else {
    if (errors > 0) console.log(`${errors} check(s) FAILED.`);
    if (warnings > 0) console.log(`${warnings} warning(s).`);
  }

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
