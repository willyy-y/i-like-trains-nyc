import { create } from "zustand";
import type { AnimationState } from "@/lib/types";
import { CONFIG } from "@/lib/config";

function getDefault6amMs(): number {
  const now = new Date();
  now.setHours(6, 0, 0, 0);
  return now.getTime();
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface AnimationStore extends AnimationState {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeedup: (n: number) => void;
  advanceTime: (deltaMsReal: number) => void;
  jumpToDate: (dateStr: string) => void;
  setActiveTrainCount: (n: number) => void;
  setSimTimeMs: (ms: number) => void;
}

const defaultSimTimeMs = getDefault6amMs();

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  isPlaying: false,
  speedup: CONFIG.DEFAULT_SPEED,
  simTimeMs: defaultSimTimeMs,
  activeDate: formatDate(defaultSimTimeMs),
  activeTrainCount: 0,
  lastFrameTime: 0,

  play: () =>
    set({ isPlaying: true, lastFrameTime: performance.now() }),

  pause: () => set({ isPlaying: false }),

  togglePlay: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      set({ isPlaying: false });
    } else {
      set({ isPlaying: true, lastFrameTime: performance.now() });
    }
  },

  setSpeedup: (n: number) => set({ speedup: n }),

  advanceTime: (deltaMsReal: number) => {
    const { speedup, simTimeMs } = get();
    const capped = Math.min(deltaMsReal, CONFIG.MAX_FRAME_DELTA_MS);
    const simDelta = capped * speedup;
    const newSimTimeMs = simTimeMs + simDelta;
    const newDate = formatDate(newSimTimeMs);
    set({
      simTimeMs: newSimTimeMs,
      activeDate: newDate,
      lastFrameTime: performance.now(),
    });
  },

  jumpToDate: (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d, 6, 0, 0, 0);
    set({
      simTimeMs: date.getTime(),
      activeDate: dateStr,
    });
  },

  setActiveTrainCount: (n: number) => set({ activeTrainCount: n }),

  setSimTimeMs: (ms: number) =>
    set({
      simTimeMs: ms,
      activeDate: formatDate(ms),
    }),
}));
