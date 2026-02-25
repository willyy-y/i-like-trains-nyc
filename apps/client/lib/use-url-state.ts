"use client";

import { useEffect, useRef } from "react";
import { useAnimationStore } from "@/lib/stores/animation-store";

interface URLState {
  lat?: number;
  lng?: number;
  z?: number;
  date?: string;
  t?: number; // seconds since midnight
  speed?: number;
  lines?: string[]; // multi-select lines (empty = all)
}

export function parseURLState(): URLState {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const state: URLState = {};

  const lat = params.get("lat");
  const lng = params.get("lng");
  const z = params.get("z");
  const date = params.get("date");
  const t = params.get("t");
  const speed = params.get("speed");
  const line = params.get("line");

  if (lat) state.lat = parseFloat(lat);
  if (lng) state.lng = parseFloat(lng);
  if (z) state.z = parseFloat(z);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) state.date = date;
  if (t) state.t = parseInt(t);
  if (speed) state.speed = parseInt(speed);
  if (line) state.lines = line.split(",").filter(Boolean);

  return state;
}

export function useURLStateSync(
  viewState: { latitude?: number; longitude?: number; zoom?: number },
  selectedLines: Set<string>
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const store = useAnimationStore.getState();
      const params = new URLSearchParams();

      if (viewState.latitude) params.set("lat", viewState.latitude.toFixed(4));
      if (viewState.longitude) params.set("lng", viewState.longitude.toFixed(4));
      if (viewState.zoom) params.set("z", viewState.zoom.toFixed(1));
      params.set("date", store.activeDate);

      const d = new Date(store.simTimeMs);
      const secs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
      params.set("t", String(secs));
      params.set("speed", String(store.speedup));

      if (selectedLines.size > 0) {
        params.set("line", [...selectedLines].join(","));
      }

      const url = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", url);
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [viewState.latitude, viewState.longitude, viewState.zoom, selectedLines]);
}
