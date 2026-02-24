import type { ProcessedTrain, RidershipEntry } from "@/lib/types";

// TODO: Initialize DuckDB WASM and load parquet files.
// For now this is a stub — the frontend uses JSON files via
// train-data-service and ridership-data-service instead.

let initialized = false;

export async function initDuckDB(): Promise<void> {
  // TODO: Instantiate DuckDB WASM, register parquet files
  initialized = true;
  console.info("[duckdb-service] stub initialized — no-op");
}

export async function queryTrains(
  _date: string,
  _startTime: number,
  _endTime: number
): Promise<ProcessedTrain[]> {
  if (!initialized) await initDuckDB();
  // TODO: SELECT from parquet
  console.warn("[duckdb-service] queryTrains is a stub");
  return [];
}

export async function queryRidership(
  _date: string,
  _hour: number
): Promise<RidershipEntry[]> {
  if (!initialized) await initDuckDB();
  // TODO: SELECT from parquet
  console.warn("[duckdb-service] queryRidership is a stub");
  return [];
}
