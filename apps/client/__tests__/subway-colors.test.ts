import { describe, it, expect } from "vitest";
import { getSubwayColor, getStationColor, SUBWAY_COLORS } from "@/lib/subway-colors";

describe("subway-colors", () => {
  it("returns correct color for 1 train (red)", () => {
    expect(getSubwayColor("1")).toEqual([238, 53, 46]);
  });

  it("returns correct color for A train (blue)", () => {
    expect(getSubwayColor("A")).toEqual([0, 57, 166]);
  });

  it("returns correct color for 7 train (purple)", () => {
    expect(getSubwayColor("7")).toEqual([185, 51, 173]);
  });

  it("returns correct color for G train (lime)", () => {
    expect(getSubwayColor("G")).toEqual([108, 190, 69]);
  });

  it("returns correct color for L train (gray)", () => {
    expect(getSubwayColor("L")).toEqual([167, 169, 172]);
  });

  it("returns correct color for N train (yellow)", () => {
    expect(getSubwayColor("N")).toEqual([252, 204, 10]);
  });

  it("handles lowercase input", () => {
    expect(getSubwayColor("a")).toEqual([0, 57, 166]);
  });

  it("returns fallback gray for unknown route", () => {
    expect(getSubwayColor("X")).toEqual([200, 200, 200]);
  });

  it("groups 1/2/3 as same color", () => {
    expect(getSubwayColor("1")).toEqual(getSubwayColor("2"));
    expect(getSubwayColor("2")).toEqual(getSubwayColor("3"));
  });

  it("groups A/C/E as same color", () => {
    expect(getSubwayColor("A")).toEqual(getSubwayColor("C"));
    expect(getSubwayColor("C")).toEqual(getSubwayColor("E"));
  });

  it("groups N/Q/R/W as same color", () => {
    expect(getSubwayColor("N")).toEqual(getSubwayColor("Q"));
    expect(getSubwayColor("Q")).toEqual(getSubwayColor("R"));
    expect(getSubwayColor("R")).toEqual(getSubwayColor("W"));
  });

  it("has entries for all standard subway lines", () => {
    const standardLines = [
      "1", "2", "3", "4", "5", "6", "7",
      "A", "C", "E", "B", "D", "F", "M",
      "G", "J", "Z", "L",
      "N", "Q", "R", "W", "S",
    ];
    for (const line of standardLines) {
      expect(SUBWAY_COLORS[line]).toBeDefined();
      expect(SUBWAY_COLORS[line]).toHaveLength(3);
    }
  });

  it("getStationColor returns first line color", () => {
    expect(getStationColor(["A", "C", "E"])).toEqual(getSubwayColor("A"));
  });

  it("getStationColor returns gray for empty lines", () => {
    expect(getStationColor([])).toEqual([200, 200, 200]);
  });

  it("all colors are valid RGB values (0-255)", () => {
    for (const [line, color] of Object.entries(SUBWAY_COLORS)) {
      for (const channel of color) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });
});
