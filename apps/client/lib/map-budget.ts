/**
 * Hard cap on Mapbox map loads to stay within free tier.
 * Tracks loads per calendar month in localStorage.
 * Free tier = 50,000 loads/month. We cap at 45,000 for safety margin.
 */

const STORAGE_KEY = "mapbox_load_count";
const HARD_CAP = 45_000; // 5K buffer below the 50K free limit

interface LoadRecord {
  month: string; // "YYYY-MM"
  count: number;
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getRecord(): LoadRecord {
  if (typeof window === "undefined") return { month: getCurrentMonth(), count: 0 };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { month: getCurrentMonth(), count: 0 };
    const record: LoadRecord = JSON.parse(raw);
    // Reset if month changed
    if (record.month !== getCurrentMonth()) {
      return { month: getCurrentMonth(), count: 0 };
    }
    return record;
  } catch {
    return { month: getCurrentMonth(), count: 0 };
  }
}

function saveRecord(record: LoadRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

/** Check if we can load the map. Returns true if under budget. */
export function canLoadMap(): boolean {
  return getRecord().count < HARD_CAP;
}

/** Increment the load counter. Call once when the map mounts. */
export function recordMapLoad(): void {
  const record = getRecord();
  record.count += 1;
  saveRecord(record);
}

/** Get remaining loads this month. */
export function getRemainingLoads(): number {
  return Math.max(0, HARD_CAP - getRecord().count);
}

/** Get current month's load count. */
export function getLoadCount(): number {
  return getRecord().count;
}
