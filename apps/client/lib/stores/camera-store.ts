import { create } from "zustand";

interface CameraKeyframe {
  time: number; // seconds into the tour
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
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

const FLYTHROUGH_DURATION = 45; // seconds

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
  startTour: () => void;
  stopTour: () => void;
  getViewState: () => Omit<CameraKeyframe, "time"> | null;
  tick: (deltaSec: number) => void;
}

export const useCameraStore = create<CameraStore>((set, get) => ({
  isTouring: false,
  tourProgress: 0,

  startTour: () => set({ isTouring: true, tourProgress: 0 }),

  stopTour: () => set({ isTouring: false, tourProgress: 0 }),

  getViewState: () => {
    const { isTouring, tourProgress } = get();
    if (!isTouring) return null;
    return lerpKeyframes(FLYTHROUGH_KEYFRAMES, tourProgress * FLYTHROUGH_DURATION);
  },

  tick: (deltaSec: number) => {
    const { isTouring, tourProgress } = get();
    if (!isTouring) return;
    const newProgress = tourProgress + deltaSec / FLYTHROUGH_DURATION;
    if (newProgress >= 1) {
      set({ isTouring: false, tourProgress: 0 });
    } else {
      set({ tourProgress: newProgress });
    }
  },
}));
