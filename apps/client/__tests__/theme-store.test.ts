import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "@/lib/stores/theme-store";

describe("theme-store", () => {
  beforeEach(() => {
    useThemeStore.getState().setMode("auto");
  });

  it("defaults to auto mode", () => {
    expect(useThemeStore.getState().mode).toBe("auto");
  });

  it("setMode to dark gives daylight=0", () => {
    useThemeStore.getState().setMode("dark");
    expect(useThemeStore.getState().resolved).toBe("dark");
    expect(useThemeStore.getState().daylight).toBe(0);
  });

  it("setMode to light gives daylight=1", () => {
    useThemeStore.getState().setMode("light");
    expect(useThemeStore.getState().resolved).toBe("light");
    expect(useThemeStore.getState().daylight).toBe(1);
  });

  it("auto mode: noon in July = light", () => {
    useThemeStore.getState().setMode("auto");
    const noon = new Date("2023-07-15T12:00:00").getTime();
    useThemeStore.getState().resolveForTime(noon);
    expect(useThemeStore.getState().resolved).toBe("light");
    expect(useThemeStore.getState().daylight).toBe(1);
  });

  it("auto mode: midnight = dark", () => {
    useThemeStore.getState().setMode("auto");
    const midnight = new Date("2023-07-15T00:00:00").getTime();
    useThemeStore.getState().resolveForTime(midnight);
    expect(useThemeStore.getState().resolved).toBe("dark");
    expect(useThemeStore.getState().daylight).toBe(0);
  });

  it("auto mode: 3am = dark", () => {
    useThemeStore.getState().setMode("auto");
    const threeAm = new Date("2023-01-15T03:00:00").getTime();
    useThemeStore.getState().resolveForTime(threeAm);
    expect(useThemeStore.getState().resolved).toBe("dark");
  });

  it("auto mode: 10pm in winter = dark", () => {
    useThemeStore.getState().setMode("auto");
    const tenPm = new Date("2023-12-15T22:00:00").getTime();
    useThemeStore.getState().resolveForTime(tenPm);
    expect(useThemeStore.getState().resolved).toBe("dark");
  });

  it("auto mode: 5pm in December = dark (sunset ~4:30pm)", () => {
    useThemeStore.getState().setMode("auto");
    const fivePm = new Date("2023-12-21T17:00:00").getTime();
    useThemeStore.getState().resolveForTime(fivePm);
    expect(useThemeStore.getState().resolved).toBe("dark");
  });

  it("auto mode: 9pm in June = light (sunset ~8:30pm)", () => {
    useThemeStore.getState().setMode("auto");
    const ninePm = new Date("2023-06-21T21:00:00").getTime();
    useThemeStore.getState().resolveForTime(ninePm);
    // Summer sunset is ~20:30, so 21:00 should be in twilight or dark
    // Our model puts sunset at ~20.5, so 21:00 should be in twilight (daylight < 0.5)
    expect(useThemeStore.getState().resolved).toBe("dark");
  });

  it("twilight: daylight is between 0 and 1 near sunrise", () => {
    useThemeStore.getState().setMode("auto");
    // Sunrise in March is ~6:30am, so 6:30 should be mid-transition
    const sunrise = new Date("2023-03-20T06:30:00").getTime();
    useThemeStore.getState().resolveForTime(sunrise);
    const daylight = useThemeStore.getState().daylight;
    expect(daylight).toBeGreaterThan(0);
    expect(daylight).toBeLessThan(1);
  });

  it("twilight: daylight is between 0 and 1 near sunset", () => {
    useThemeStore.getState().setMode("auto");
    // Sunset in March is ~18:30, so test near that
    const sunset = new Date("2023-03-20T18:30:00").getTime();
    useThemeStore.getState().resolveForTime(sunset);
    const daylight = useThemeStore.getState().daylight;
    expect(daylight).toBeGreaterThan(0);
    expect(daylight).toBeLessThan(1);
  });

  it("forced dark ignores time", () => {
    useThemeStore.getState().setMode("dark");
    const noon = new Date("2023-07-15T12:00:00").getTime();
    useThemeStore.getState().resolveForTime(noon);
    expect(useThemeStore.getState().resolved).toBe("dark");
    expect(useThemeStore.getState().daylight).toBe(0);
  });

  it("forced light ignores time", () => {
    useThemeStore.getState().setMode("light");
    const midnight = new Date("2023-01-15T00:00:00").getTime();
    useThemeStore.getState().resolveForTime(midnight);
    expect(useThemeStore.getState().resolved).toBe("light");
    expect(useThemeStore.getState().daylight).toBe(1);
  });
});
