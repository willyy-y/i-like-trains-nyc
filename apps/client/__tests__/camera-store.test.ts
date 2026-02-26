import { describe, it, expect, beforeEach } from "vitest";
import { useCameraStore } from "@/lib/stores/camera-store";
import { useAnimationStore } from "@/lib/stores/animation-store";

describe("camera-store", () => {
  beforeEach(() => {
    useCameraStore.getState().stopTour();
  });

  it("starts not touring", () => {
    expect(useCameraStore.getState().isTouring).toBe(false);
    expect(useCameraStore.getState().activeTourType).toBeNull();
  });

  it("startTour('flythrough') sets isTouring and activeTourType", () => {
    useCameraStore.getState().startTour("flythrough");
    const state = useCameraStore.getState();
    expect(state.isTouring).toBe(true);
    expect(state.tourProgress).toBe(0);
    expect(state.activeTourType).toBe("flythrough");
    expect(state.isBreathingEnabled).toBe(false);
    expect(state.isDynamicStations).toBe(false);
  });

  it("startTour('rush-hour') enables breathing and dynamic stations", () => {
    useCameraStore.getState().startTour("rush-hour");
    const state = useCameraStore.getState();
    expect(state.isTouring).toBe(true);
    expect(state.activeTourType).toBe("rush-hour");
    expect(state.isBreathingEnabled).toBe(true);
    expect(state.isDynamicStations).toBe(true);
  });

  it("stopTour resets all state", () => {
    useCameraStore.getState().startTour("rush-hour");
    useCameraStore.getState().tick(10);
    useCameraStore.getState().stopTour();
    const state = useCameraStore.getState();
    expect(state.isTouring).toBe(false);
    expect(state.tourProgress).toBe(0);
    expect(state.activeTourType).toBeNull();
    expect(state.isBreathingEnabled).toBe(false);
    expect(state.isDynamicStations).toBe(false);
    expect(state.preRushSpeed).toBeNull();
  });

  it("tick advances progress for flythrough", () => {
    useCameraStore.getState().startTour("flythrough");
    useCameraStore.getState().tick(9); // 9 seconds of 45 total = 0.2
    expect(useCameraStore.getState().tourProgress).toBeCloseTo(0.2);
    expect(useCameraStore.getState().isTouring).toBe(true);
  });

  it("tick advances progress for rush-hour", () => {
    useCameraStore.getState().startTour("rush-hour");
    useCameraStore.getState().tick(12); // 12 seconds of 60 total = 0.2
    expect(useCameraStore.getState().tourProgress).toBeCloseTo(0.2);
    expect(useCameraStore.getState().isTouring).toBe(true);
  });

  it("flythrough tour ends when progress reaches 1", () => {
    useCameraStore.getState().startTour("flythrough");
    useCameraStore.getState().tick(46); // past the 45s duration
    expect(useCameraStore.getState().isTouring).toBe(false);
    expect(useCameraStore.getState().activeTourType).toBeNull();
  });

  it("rush-hour tour ends when progress reaches 1", () => {
    useCameraStore.getState().startTour("rush-hour");
    useCameraStore.getState().tick(61); // past the 60s duration
    expect(useCameraStore.getState().isTouring).toBe(false);
    expect(useCameraStore.getState().activeTourType).toBeNull();
  });

  it("getViewState returns null when not touring", () => {
    expect(useCameraStore.getState().getViewState()).toBeNull();
  });

  it("getViewState returns interpolated position during flythrough", () => {
    useCameraStore.getState().startTour("flythrough");
    useCameraStore.getState().tick(0.01);
    const vs = useCameraStore.getState().getViewState();
    expect(vs).not.toBeNull();
    expect(vs!.longitude).toBeDefined();
    expect(vs!.latitude).toBeDefined();
    expect(vs!.zoom).toBeDefined();
    expect(vs!.pitch).toBeDefined();
    expect(vs!.bearing).toBeDefined();
  });

  it("getViewState returns interpolated position during rush-hour", () => {
    useCameraStore.getState().startTour("rush-hour");
    useCameraStore.getState().tick(0.01);
    const vs = useCameraStore.getState().getViewState();
    expect(vs).not.toBeNull();
    expect(vs!.longitude).toBeDefined();
    expect(vs!.latitude).toBeDefined();
  });

  it("flythrough tour ends at default view position", () => {
    useCameraStore.getState().startTour("flythrough");
    useCameraStore.getState().tick(44.9);
    const vs = useCameraStore.getState().getViewState();
    expect(vs).not.toBeNull();
    expect(vs!.zoom).toBeCloseTo(11.5, 0);
    expect(vs!.pitch).toBeCloseTo(0, 0);
  });

  it("rush-hour tour ends at default view position", () => {
    useCameraStore.getState().startTour("rush-hour");
    useCameraStore.getState().tick(59.9);
    const vs = useCameraStore.getState().getViewState();
    expect(vs).not.toBeNull();
    expect(vs!.zoom).toBeCloseTo(11.5, 0);
    expect(vs!.pitch).toBeCloseTo(0, 0);
  });

  describe("speed lock/restore", () => {
    it("rush-hour locks speed and saves previous", () => {
      const originalSpeed = useAnimationStore.getState().speedup;
      useCameraStore.getState().startTour("rush-hour");
      expect(useAnimationStore.getState().speedup).toBe(60); // locked to 1min/s
      expect(useCameraStore.getState().preRushSpeed).toBe(originalSpeed);
    });

    it("stopTour restores original speed after rush-hour", () => {
      useAnimationStore.getState().setSpeedup(300); // 5min/s
      useCameraStore.getState().startTour("rush-hour");
      expect(useAnimationStore.getState().speedup).toBe(60); // locked
      useCameraStore.getState().stopTour();
      expect(useAnimationStore.getState().speedup).toBe(300); // restored
    });

    it("flythrough does not lock speed", () => {
      useAnimationStore.getState().setSpeedup(300);
      useCameraStore.getState().startTour("flythrough");
      expect(useAnimationStore.getState().speedup).toBe(300); // unchanged
    });
  });

  describe("tour type switching", () => {
    it("can switch from flythrough to rush-hour", () => {
      useCameraStore.getState().startTour("flythrough");
      expect(useCameraStore.getState().activeTourType).toBe("flythrough");
      useCameraStore.getState().stopTour();
      useCameraStore.getState().startTour("rush-hour");
      expect(useCameraStore.getState().activeTourType).toBe("rush-hour");
      expect(useCameraStore.getState().isBreathingEnabled).toBe(true);
    });
  });
});
