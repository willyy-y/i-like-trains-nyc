import { describe, it, expect, beforeEach } from "vitest";
import { useCameraStore } from "@/lib/stores/camera-store";

describe("camera-store", () => {
  beforeEach(() => {
    useCameraStore.getState().stopTour();
  });

  it("starts not touring", () => {
    expect(useCameraStore.getState().isTouring).toBe(false);
  });

  it("startTour sets isTouring to true", () => {
    useCameraStore.getState().startTour();
    expect(useCameraStore.getState().isTouring).toBe(true);
    expect(useCameraStore.getState().tourProgress).toBe(0);
  });

  it("stopTour resets state", () => {
    useCameraStore.getState().startTour();
    useCameraStore.getState().tick(10);
    useCameraStore.getState().stopTour();
    expect(useCameraStore.getState().isTouring).toBe(false);
    expect(useCameraStore.getState().tourProgress).toBe(0);
  });

  it("tick advances progress", () => {
    useCameraStore.getState().startTour();
    useCameraStore.getState().tick(9); // 9 seconds of 45 total = 0.2
    expect(useCameraStore.getState().tourProgress).toBeCloseTo(0.2);
    expect(useCameraStore.getState().isTouring).toBe(true);
  });

  it("tour ends when progress reaches 1", () => {
    useCameraStore.getState().startTour();
    useCameraStore.getState().tick(46); // past the 45s duration
    expect(useCameraStore.getState().isTouring).toBe(false);
  });

  it("getViewState returns null when not touring", () => {
    expect(useCameraStore.getState().getViewState()).toBeNull();
  });

  it("getViewState returns interpolated position during tour", () => {
    useCameraStore.getState().startTour();
    useCameraStore.getState().tick(0.01); // just started
    const vs = useCameraStore.getState().getViewState();
    expect(vs).not.toBeNull();
    expect(vs!.longitude).toBeDefined();
    expect(vs!.latitude).toBeDefined();
    expect(vs!.zoom).toBeDefined();
    expect(vs!.pitch).toBeDefined();
    expect(vs!.bearing).toBeDefined();
  });

  it("tour ends at default view position", () => {
    useCameraStore.getState().startTour();
    // Advance to just before end
    useCameraStore.getState().tick(44.9);
    const vs = useCameraStore.getState().getViewState();
    expect(vs).not.toBeNull();
    // Should be near the final keyframe (default view)
    expect(vs!.zoom).toBeCloseTo(11.5, 0);
    expect(vs!.pitch).toBeCloseTo(0, 0);
  });
});
