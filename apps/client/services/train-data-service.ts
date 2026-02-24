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

export async function loadTrainsForDate(
  date: string
): Promise<ProcessedTrain[]> {
  if (cache.has(date)) return cache.get(date)!;

  const url = `${CONFIG.DATA_BASE_URL}/trips/${date}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Failed to load trains for ${date}: ${res.status}`);
    return [];
  }

  const raw: RawTrip[] = await res.json();
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
