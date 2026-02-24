/**
 * build-ridership.ts
 *
 * Downloads MTA hourly ridership data from the NYC Open Data Socrata API,
 * aggregates by station complex + hour, normalises 0-1, and writes daily
 * JSON files.
 *
 * API: https://data.ny.gov/resource/wujg-7c2s.json
 *
 * Output:  ../../data/ridership/YYYY-MM-DD.json  (one per day in dataset)
 *
 * Usage:
 *   bun run packages/processing/build-ridership.ts
 *   bun run packages/processing/build-ridership.ts --days 7     # last N days
 *   bun run packages/processing/build-ridership.ts --date 2024-12-01
 */

import { mkdirSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dir, "../..");
const RIDERSHIP_DIR = path.join(ROOT, "data", "ridership");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function getQueryParams(): { where: string; label: string } {
  const dateIdx = process.argv.indexOf("--date");
  if (dateIdx !== -1 && process.argv[dateIdx + 1]) {
    const d = process.argv[dateIdx + 1];
    return {
      where: `transit_timestamp >= '${d}T00:00:00' AND transit_timestamp < '${d}T23:59:59'`,
      label: d,
    };
  }

  const daysIdx = process.argv.indexOf("--days");
  const days = daysIdx !== -1 ? parseInt(process.argv[daysIdx + 1]) || 7 : 7;

  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  return {
    where: `transit_timestamp >= '${startStr}T00:00:00' AND transit_timestamp < '${endStr}T23:59:59'`,
    label: `${startStr} to ${endStr}`,
  };
}

// ---------------------------------------------------------------------------
// Socrata API types
// ---------------------------------------------------------------------------

interface SocrataRow {
  transit_timestamp: string;
  station_complex_id: string;
  station_complex: string;
  latitude: string;
  longitude: string;
  ridership: string;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

interface RidershipEntry {
  stationComplexId: string;
  stationName: string;
  lat: number;
  lng: number;
  hour: number;
  ridership: number;
  ridershipNormalized: number;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50_000;
const API_BASE = "https://data.ny.gov/resource/wujg-7c2s.json";

async function fetchAllRows(where: string): Promise<SocrataRow[]> {
  const rows: SocrataRow[] = [];
  let offset = 0;
  let page = 0;

  while (true) {
    const params = new URLSearchParams({
      $where: where,
      $limit: String(PAGE_SIZE),
      $offset: String(offset),
      $order: "transit_timestamp ASC",
    });

    const url = `${API_BASE}?${params}`;
    page++;
    console.log(`  Fetching page ${page} (offset ${offset}) ...`);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Socrata API error: HTTP ${res.status} ${res.statusText}`);
    }

    const batch: SocrataRow[] = await res.json();
    if (batch.length === 0) break;

    rows.push(...batch);
    offset += PAGE_SIZE;

    // If fewer than PAGE_SIZE rows returned, we've reached the end
    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const start = performance.now();
  const { where, label } = getQueryParams();

  console.log(`Fetching MTA ridership data for ${label} ...`);
  const rows = await fetchAllRows(where);
  console.log(`  Total rows fetched: ${rows.length.toLocaleString()}`);

  if (rows.length === 0) {
    console.log("No data returned. The date range may not have data yet.");
    return;
  }

  // --- Aggregate by day + station_complex_id + hour ------------------------

  // Group rows by date string
  const byDate = new Map<string, SocrataRow[]>();
  for (const row of rows) {
    const dateStr = row.transit_timestamp.slice(0, 10);
    let arr = byDate.get(dateStr);
    if (!arr) {
      arr = [];
      byDate.set(dateStr, arr);
    }
    arr.push(row);
  }

  console.log(`  Days with data: ${byDate.size}`);

  // --- Find global max ridership for normalisation -------------------------

  let globalMax = 0;
  for (const row of rows) {
    const r = parseFloat(row.ridership);
    if (r > globalMax) globalMax = r;
  }
  console.log(`  Global max ridership value: ${globalMax}`);

  // --- Process each day ----------------------------------------------------

  mkdirSync(RIDERSHIP_DIR, { recursive: true });
  let filesWritten = 0;

  for (const [dateStr, dayRows] of byDate) {
    // Aggregate: key = complexId|hour -> sum ridership, keep station meta
    const agg = new Map<
      string,
      {
        stationComplexId: string;
        stationName: string;
        lat: number;
        lng: number;
        hour: number;
        ridership: number;
      }
    >();

    for (const row of dayRows) {
      const hour = new Date(row.transit_timestamp).getHours();
      const key = `${row.station_complex_id}|${hour}`;

      let entry = agg.get(key);
      if (!entry) {
        entry = {
          stationComplexId: row.station_complex_id,
          stationName: row.station_complex,
          lat: parseFloat(row.latitude) || 0,
          lng: parseFloat(row.longitude) || 0,
          hour,
          ridership: 0,
        };
        agg.set(key, entry);
      }
      entry.ridership += parseFloat(row.ridership) || 0;
    }

    // Build output with normalisation
    const entries: RidershipEntry[] = [];
    for (const entry of agg.values()) {
      entries.push({
        ...entry,
        ridership: Math.round(entry.ridership),
        ridershipNormalized:
          globalMax > 0
            ? Math.round((entry.ridership / globalMax) * 10000) / 10000
            : 0,
      });
    }

    // Sort for deterministic output
    entries.sort((a, b) => {
      const cmp = a.stationComplexId.localeCompare(b.stationComplexId);
      return cmp !== 0 ? cmp : a.hour - b.hour;
    });

    const outPath = path.join(RIDERSHIP_DIR, `${dateStr}.json`);
    await Bun.write(outPath, JSON.stringify(entries));
    filesWritten++;
  }

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`\nRidership Summary:`);
  console.log(`  Date range:     ${label}`);
  console.log(`  Rows fetched:   ${rows.length.toLocaleString()}`);
  console.log(`  Days processed: ${byDate.size}`);
  console.log(`  Files written:  ${filesWritten}`);
  console.log(`  Output dir:     ${RIDERSHIP_DIR}`);
  console.log(`\nDone in ${elapsed}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
