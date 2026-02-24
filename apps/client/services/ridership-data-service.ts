import type { RidershipEntry } from "@/lib/types";
import { CONFIG } from "@/lib/config";

const cache = new Map<string, RidershipEntry[]>();
const failedDates = new Set<string>();

export async function loadRidershipForDate(
  date: string
): Promise<RidershipEntry[]> {
  if (cache.has(date)) return cache.get(date)!;
  if (failedDates.has(date)) return [];

  const url = `${CONFIG.DATA_BASE_URL}/ridership/${date}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    failedDates.add(date);
    return [];
  }

  const entries: RidershipEntry[] = await res.json();
  cache.set(date, entries);
  return entries;
}

export function getRidershipForHour(
  entries: RidershipEntry[],
  hour: number
): Map<string, RidershipEntry> {
  const map = new Map<string, RidershipEntry>();
  for (const e of entries) {
    if (e.hour === hour) {
      map.set(e.stationComplexId, e);
    }
  }
  return map;
}
