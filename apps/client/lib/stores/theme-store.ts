import { create } from "zustand";
import { CONFIG } from "@/lib/config";

export type ThemeMode = "auto" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

// Twilight duration in hours (30 min before/after sunrise/sunset)
const TWILIGHT_DURATION = 0.5;

interface ThemeStore {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  /** 0.0 = full dark, 1.0 = full light. Smoothly interpolated during twilight. */
  daylight: number;
  setMode: (mode: ThemeMode) => void;
  resolveForTime: (simTimeMs: number) => void;
}

/**
 * Approximate sunrise/sunset for NYC based on day of year.
 * Returns { sunrise, sunset } in hours (e.g., 6.5 = 6:30 AM).
 * Uses a simple sinusoidal model — accurate to ~15 minutes.
 */
function getNYCSunTimes(date: Date): { sunrise: number; sunset: number } {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const angle = ((dayOfYear - 80) / 365) * 2 * Math.PI;
  const sunrise = 6.35 - 0.95 * Math.sin(angle);
  const sunset = 18.5 + 2.0 * Math.sin(angle);
  return { sunrise, sunset };
}

/**
 * Compute daylight factor (0.0 = dark, 1.0 = light) with smooth twilight transitions.
 * Uses a smoothstep function for natural-looking sunrise/sunset.
 */
function computeDaylight(mode: ThemeMode, simTimeMs: number): number {
  if (mode === "dark") return 0;
  if (mode === "light") return 1;

  const date = new Date(simTimeMs);
  const { sunrise, sunset } = getNYCSunTimes(date);
  const h = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

  // Smoothstep function for natural easing
  const smoothstep = (t: number) => {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  };

  // Sunrise: ramp from 0 to 1 over TWILIGHT_DURATION centered on sunrise
  const sunriseStart = sunrise - TWILIGHT_DURATION;
  const sunriseEnd = sunrise + TWILIGHT_DURATION;

  // Sunset: ramp from 1 to 0 over TWILIGHT_DURATION centered on sunset
  const sunsetStart = sunset - TWILIGHT_DURATION;
  const sunsetEnd = sunset + TWILIGHT_DURATION;

  if (h < sunriseStart || h > sunsetEnd) return 0; // full night
  if (h > sunriseEnd && h < sunsetStart) return 1; // full day

  // During sunrise transition
  if (h >= sunriseStart && h <= sunriseEnd) {
    return smoothstep((h - sunriseStart) / (sunriseEnd - sunriseStart));
  }

  // During sunset transition
  if (h >= sunsetStart && h <= sunsetEnd) {
    return 1 - smoothstep((h - sunsetStart) / (sunsetEnd - sunsetStart));
  }

  return 1;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: "auto",
  resolved: "dark",
  daylight: 0,

  setMode: (mode: ThemeMode) => {
    const daylight = computeDaylight(mode, Date.now());
    set({ mode, daylight, resolved: daylight >= 0.5 ? "light" : "dark" });
  },

  resolveForTime: (simTimeMs: number) => {
    const { mode } = get();
    const daylight = computeDaylight(mode, simTimeMs);
    const newResolved: ResolvedTheme = daylight >= 0.5 ? "light" : "dark";
    set({ daylight, resolved: newResolved });
  },
}));

export function getMapStyle(resolved: ResolvedTheme): string {
  return resolved === "dark"
    ? CONFIG.MAPBOX_STYLE_DARK
    : CONFIG.MAPBOX_STYLE_LIGHT;
}
