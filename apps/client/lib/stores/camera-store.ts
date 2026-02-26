import { create } from "zustand";
import { useAnimationStore } from "./animation-store";

interface CameraKeyframe {
  time: number; // seconds into the tour
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export type TourType = "flythrough" | "rush-hour";

interface TourConfig {
  keyframes: CameraKeyframe[];
  duration: number;
  simTimeOverride?: number; // ms offset from midnight — jump sim time
  speedLock?: number; // lock animation speed during tour
  enableBreathing?: boolean; // re-enable station glow pulsing
  enableDynamicStations?: boolean; // stations switch to ridership-based sizing
}

// Pre-programmed camera path: Bronx → Manhattan → Brooklyn → settle
const FLYTHROUGH_KEYFRAMES: CameraKeyframe[] = [
  { time: 0, longitude: -73.895, latitude: 40.852, zoom: 13, pitch: 45, bearing: 180 },
  { time: 10, longitude: -73.971, latitude: 40.790, zoom: 12.5, pitch: 45, bearing: 200 },
  { time: 20, longitude: -73.985, latitude: 40.750, zoom: 12, pitch: 40, bearing: 220 },
  { time: 30, longitude: -73.970, latitude: 40.710, zoom: 12, pitch: 35, bearing: 240 },
  { time: 40, longitude: -73.960, latitude: 40.680, zoom: 12.5, pitch: 20, bearing: 260 },
  { time: 45, longitude: -73.985, latitude: 40.748, zoom: 11.5, pitch: 0, bearing: 0 },
];

// Rush hour: sweeps south→north through morning commute surge corridors
const RUSH_HOUR_KEYFRAMES: CameraKeyframe[] = [
  { time: 0, longitude: -73.985, latitude: 40.748, zoom: 11.5, pitch: 0, bearing: 0 },
  { time: 5, longitude: -73.978, latitude: 40.685, zoom: 13, pitch: 50, bearing: 20 },
  { time: 15, longitude: -73.983, latitude: 40.710, zoom: 13, pitch: 50, bearing: 340 },
  { time: 25, longitude: -74.007, latitude: 40.712, zoom: 13, pitch: 45, bearing: 300 },
  { time: 35, longitude: -73.970, latitude: 40.755, zoom: 13, pitch: 45, bearing: 260 },
  { time: 45, longitude: -73.945, latitude: 40.810, zoom: 13, pitch: 40, bearing: 220 },
  { time: 55, longitude: -73.965, latitude: 40.780, zoom: 12, pitch: 15, bearing: 180 },
  { time: 60, longitude: -73.985, latitude: 40.748, zoom: 11.5, pitch: 0, bearing: 0 },
];

const TOUR_CONFIGS: Record<TourType, TourConfig> = {
  flythrough: {
    keyframes: FLYTHROUGH_KEYFRAMES,
    duration: 45,
  },
  "rush-hour": {
    keyframes: RUSH_HOUR_KEYFRAMES,
    duration: 60,
    simTimeOverride: 8 * 3600 * 1000, // 8:00 AM
    speedLock: 60, // 1 min/s
    enableBreathing: true,
    enableDynamicStations: true,
  },
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpKeyframes(keyframes: CameraKeyframe[], timeSec: number): Omit<CameraKeyframe, "time"> {
  const clamped = Math.max(0, Math.min(timeSec, keyframes[keyframes.length - 1].time));

  let fromIdx = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (clamped >= keyframes[i].time) fromIdx = i;
  }
  const toIdx = Math.min(fromIdx + 1, keyframes.length - 1);

  const segStart = keyframes[fromIdx].time;
  const segEnd = keyframes[toIdx].time;
  const t = segEnd > segStart ? easeInOutCubic((clamped - segStart) / (segEnd - segStart)) : 1;

  const from = keyframes[fromIdx];
  const to = keyframes[toIdx];

  return {
    longitude: from.longitude + (to.longitude - from.longitude) * t,
    latitude: from.latitude + (to.latitude - from.latitude) * t,
    zoom: from.zoom + (to.zoom - from.zoom) * t,
    pitch: from.pitch + (to.pitch - from.pitch) * t,
    bearing: from.bearing + (to.bearing - from.bearing) * t,
  };
}

interface CameraStore {
  isTouring: boolean;
  tourProgress: number; // 0-1
  activeTourType: TourType | null;
  isBreathingEnabled: boolean;
  isDynamicStations: boolean;
  preRushSpeed: number | null;
  startTour: (type: TourType) => void;
  stopTour: () => void;
  getViewState: () => Omit<CameraKeyframe, "time"> | null;
  tick: (deltaSec: number) => void;
}

export const useCameraStore = create<CameraStore>((set, get) => ({
  isTouring: false,
  tourProgress: 0,
  activeTourType: null,
  isBreathingEnabled: false,
  isDynamicStations: false,
  preRushSpeed: null,

  startTour: (type: TourType) => {
    const config = TOUR_CONFIGS[type];
    const animStore = useAnimationStore.getState();
    const preSpeed = animStore.speedup;

    // Jump sim time if configured
    if (config.simTimeOverride != null) {
      const d = new Date(animStore.simTimeMs);
      d.setHours(0, 0, 0, 0);
      animStore.setSimTimeMs(d.getTime() + config.simTimeOverride);
    }

    // Lock speed if configured
    if (config.speedLock != null) {
      animStore.setSpeedup(config.speedLock);
    }

    // Ensure playing
    if (!animStore.isPlaying) {
      animStore.play();
    }

    set({
      isTouring: true,
      tourProgress: 0,
      activeTourType: type,
      isBreathingEnabled: config.enableBreathing ?? false,
      isDynamicStations: config.enableDynamicStations ?? false,
      preRushSpeed: preSpeed,
    });
  },

  stopTour: () => {
    const { preRushSpeed, activeTourType } = get();

    // Restore speed if it was locked
    if (preRushSpeed != null && activeTourType != null) {
      const config = TOUR_CONFIGS[activeTourType];
      if (config.speedLock != null) {
        useAnimationStore.getState().setSpeedup(preRushSpeed);
      }
    }

    set({
      isTouring: false,
      tourProgress: 0,
      activeTourType: null,
      isBreathingEnabled: false,
      isDynamicStations: false,
      preRushSpeed: null,
    });
  },

  getViewState: () => {
    const { isTouring, tourProgress, activeTourType } = get();
    if (!isTouring || !activeTourType) return null;
    const config = TOUR_CONFIGS[activeTourType];
    return lerpKeyframes(config.keyframes, tourProgress * config.duration);
  },

  tick: (deltaSec: number) => {
    const { isTouring, tourProgress, activeTourType } = get();
    if (!isTouring || !activeTourType) return;
    const config = TOUR_CONFIGS[activeTourType];
    const newProgress = tourProgress + deltaSec / config.duration;
    if (newProgress >= 1) {
      // Tour ended — restore state
      get().stopTour();
    } else {
      set({ tourProgress: newProgress });
    }
  },
}));
