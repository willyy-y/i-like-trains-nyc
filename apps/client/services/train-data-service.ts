import type { ProcessedTrain } from "@/lib/types";
import { getSubwayColor } from "@/lib/subway-colors";
import { CONFIG } from "@/lib/config";

interface RawTrip {
  tripId: string;
  routeShortName: string;
  directionId: number;
  path: [number, number][];
  timestamps: number[];
}

const cache = new Map<string, ProcessedTrain[]>();

// The GTFS schedule repeats by service type (weekday/sat/sun).
// We only have one sample trip file built from the pipeline.
// Try the requested date first, then fall back to the sample file.
const FALLBACK_DATE = "2026-02-24";

async function fetchTrips(date: string): Promise<RawTrip[] | null> {
  const url = `${CONFIG.DATA_BASE_URL}/trips/${date}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export async function loadTrainsForDate(
  date: string
): Promise<ProcessedTrain[]> {
  if (cache.has(date)) return cache.get(date)!;

  // Try requested date, then fallback to sample data
  let raw = await fetchTrips(date);
  if (!raw && date !== FALLBACK_DATE) {
    raw = await fetchTrips(FALLBACK_DATE);
  }
  if (!raw) {
    console.warn(`No train data available for ${date}`);
    return [];
  }

  const trains: ProcessedTrain[] = raw.map((t) => ({
    tripId: t.tripId,
    routeShortName: t.routeShortName,
    path: t.path,
    timestamps: t.timestamps,
    color: getSubwayColor(t.routeShortName),
  }));

  cache.set(date, trains);
  return trains;
}

export function getCurrentTrains(
  trains: ProcessedTrain[],
  timeSeconds: number,
  windowSeconds: number = 120
): ProcessedTrain[] {
  return trains.filter((t) => {
    if (t.timestamps.length === 0) return false;
    const start = t.timestamps[0];
    const end = t.timestamps[t.timestamps.length - 1];
    return end >= timeSeconds - windowSeconds && start <= timeSeconds + windowSeconds;
  });
}
