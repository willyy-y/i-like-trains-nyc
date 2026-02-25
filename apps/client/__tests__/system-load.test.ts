import { describe, it, expect, beforeEach } from "vitest";
import { useAnimationStore } from "@/lib/stores/animation-store";

describe("systemLoad", () => {
  beforeEach(() => {
    const store = useAnimationStore.getState();
    store.pause();
    store.setActiveTrainCount(0);
  });

  it("starts at 0", () => {
    expect(useAnimationStore.getState().systemLoad).toBe(0);
  });

  it("scales linearly with train count", () => {
    useAnimationStore.getState().setActiveTrainCount(250);
    expect(useAnimationStore.getState().systemLoad).toBe(0.5);
  });

  it("caps at 1.0", () => {
    useAnimationStore.getState().setActiveTrainCount(1000);
    expect(useAnimationStore.getState().systemLoad).toBe(1);
  });

  it("500 trains = full load", () => {
    useAnimationStore.getState().setActiveTrainCount(500);
    expect(useAnimationStore.getState().systemLoad).toBe(1);
  });

  it("100 trains = 0.2 load", () => {
    useAnimationStore.getState().setActiveTrainCount(100);
    expect(useAnimationStore.getState().systemLoad).toBeCloseTo(0.2);
  });
});
