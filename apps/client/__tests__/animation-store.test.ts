import { describe, it, expect, beforeEach } from "vitest";
import { useAnimationStore } from "@/lib/stores/animation-store";

describe("animation-store", () => {
  beforeEach(() => {
    // Reset store to defaults
    const store = useAnimationStore.getState();
    store.pause();
    store.setSpeedup(60);
    store.setActiveTrainCount(0);
  });

  it("starts paused", () => {
    expect(useAnimationStore.getState().isPlaying).toBe(false);
  });

  it("play sets isPlaying to true", () => {
    useAnimationStore.getState().play();
    expect(useAnimationStore.getState().isPlaying).toBe(true);
  });

  it("pause sets isPlaying to false", () => {
    useAnimationStore.getState().play();
    useAnimationStore.getState().pause();
    expect(useAnimationStore.getState().isPlaying).toBe(false);
  });

  it("togglePlay flips state", () => {
    useAnimationStore.getState().togglePlay();
    expect(useAnimationStore.getState().isPlaying).toBe(true);
    useAnimationStore.getState().togglePlay();
    expect(useAnimationStore.getState().isPlaying).toBe(false);
  });

  it("setSpeedup updates speedup", () => {
    useAnimationStore.getState().setSpeedup(300);
    expect(useAnimationStore.getState().speedup).toBe(300);
  });

  it("advanceTime respects speedup", () => {
    const before = useAnimationStore.getState().simTimeMs;
    useAnimationStore.getState().setSpeedup(60);
    useAnimationStore.getState().advanceTime(16); // 16ms real = 960ms sim at 60x
    const after = useAnimationStore.getState().simTimeMs;
    expect(after - before).toBe(16 * 60);
  });

  it("advanceTime caps delta at 100ms", () => {
    const before = useAnimationStore.getState().simTimeMs;
    useAnimationStore.getState().setSpeedup(1);
    useAnimationStore.getState().advanceTime(5000); // 5 seconds real, capped to 100ms
    const after = useAnimationStore.getState().simTimeMs;
    expect(after - before).toBe(100); // capped at 100ms * 1x
  });

  it("jumpToDate sets correct date and time (6am)", () => {
    useAnimationStore.getState().jumpToDate("2023-07-04");
    const state = useAnimationStore.getState();
    expect(state.activeDate).toBe("2023-07-04");
    const d = new Date(state.simTimeMs);
    expect(d.getFullYear()).toBe(2023);
    expect(d.getMonth()).toBe(6); // July is 6
    expect(d.getDate()).toBe(4);
    expect(d.getHours()).toBe(6);
  });

  it("activeDate updates when time crosses midnight", () => {
    // Set to 11:59:50 PM
    const late = new Date("2023-03-15T23:59:50");
    useAnimationStore.getState().setSimTimeMs(late.getTime());
    expect(useAnimationStore.getState().activeDate).toBe("2023-03-15");

    // advanceTime caps delta at 100ms, so use high speedup to cross midnight
    // 100ms capped * 300x speedup = 30,000ms sim = 30 seconds
    useAnimationStore.getState().setSpeedup(300);
    useAnimationStore.getState().advanceTime(16); // 16ms real * 300x = 4800ms sim
    useAnimationStore.getState().advanceTime(16); // another 4800ms
    useAnimationStore.getState().advanceTime(16); // another 4800ms = ~14.4s total sim
    // Need to push past the remaining 10s
    useAnimationStore.getState().advanceTime(50); // 50ms * 300x = 15000ms sim
    // Should have crossed midnight (10s + 14.4s + 15s > 10s remaining)
    const newDate = useAnimationStore.getState().activeDate;
    expect(newDate).toBe("2023-03-16");
  });

  it("setActiveTrainCount updates count", () => {
    useAnimationStore.getState().setActiveTrainCount(42);
    expect(useAnimationStore.getState().activeTrainCount).toBe(42);
  });
});
