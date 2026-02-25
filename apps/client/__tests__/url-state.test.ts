import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseURLState } from "@/lib/use-url-state";

describe("parseURLState", () => {
  beforeEach(() => {
    // Reset URL
    Object.defineProperty(window, "location", {
      writable: true,
      value: { search: "", pathname: "/" },
    });
  });

  it("returns empty object for no params", () => {
    window.location.search = "";
    const state = parseURLState();
    expect(state).toEqual({});
  });

  it("parses lat/lng/z", () => {
    window.location.search = "?lat=40.748&lng=-73.985&z=11.5";
    const state = parseURLState();
    expect(state.lat).toBeCloseTo(40.748);
    expect(state.lng).toBeCloseTo(-73.985);
    expect(state.z).toBeCloseTo(11.5);
  });

  it("parses date in correct format", () => {
    window.location.search = "?date=2024-03-12";
    const state = parseURLState();
    expect(state.date).toBe("2024-03-12");
  });

  it("rejects invalid date format", () => {
    window.location.search = "?date=not-a-date";
    const state = parseURLState();
    expect(state.date).toBeUndefined();
  });

  it("parses time as integer seconds", () => {
    window.location.search = "?t=30600";
    const state = parseURLState();
    expect(state.t).toBe(30600); // 8:30 AM
  });

  it("parses speed", () => {
    window.location.search = "?speed=3600";
    const state = parseURLState();
    expect(state.speed).toBe(3600);
  });

  it("parses line", () => {
    window.location.search = "?line=A";
    const state = parseURLState();
    expect(state.line).toBe("A");
  });

  it("parses full URL with all params", () => {
    window.location.search = "?lat=40.748&lng=-73.985&z=11.5&date=2024-03-12&t=30600&speed=60&line=A";
    const state = parseURLState();
    expect(state.lat).toBeCloseTo(40.748);
    expect(state.lng).toBeCloseTo(-73.985);
    expect(state.z).toBeCloseTo(11.5);
    expect(state.date).toBe("2024-03-12");
    expect(state.t).toBe(30600);
    expect(state.speed).toBe(60);
    expect(state.line).toBe("A");
  });
});
