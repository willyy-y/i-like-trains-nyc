import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const PUBLIC_DIR = path.resolve(__dirname, "../public");

describe("data integrity — track-geometry.json", () => {
  const filePath = path.join(PUBLIC_DIR, "track-geometry.json");

  it("file exists", () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it("is valid JSON array", () => {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("each entry has required fields", () => {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    for (const entry of data) {
      expect(entry).toHaveProperty("routeId");
      expect(entry).toHaveProperty("routeShortName");
      expect(entry).toHaveProperty("coordinates");
      expect(Array.isArray(entry.coordinates)).toBe(true);
      expect(entry.coordinates.length).toBeGreaterThan(1);
    }
  });

  it("coordinates are valid [lng, lat] pairs in NYC area", () => {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    for (const entry of data) {
      for (const [lng, lat] of entry.coordinates) {
        expect(lng).toBeGreaterThan(-74.3);
        expect(lng).toBeLessThan(-73.7);
        expect(lat).toBeGreaterThan(40.4);
        expect(lat).toBeLessThan(40.95);
      }
    }
  });

  it("covers all major subway lines", () => {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    const routes = new Set(data.map((d: { routeShortName: string }) => d.routeShortName));
    const majorLines = ["1", "2", "3", "4", "5", "6", "7", "A", "C", "E", "B", "D", "F", "G", "J", "L", "N", "Q", "R"];
    for (const line of majorLines) {
      expect(routes.has(line)).toBe(true);
    }
  });
});

describe("data integrity — stations.json", () => {
  const filePath = path.join(PUBLIC_DIR, "stations.json");

  it("file exists", () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it("is valid JSON array with 400+ stations", () => {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(400);
  });

  it("each station has required fields", () => {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    for (const station of data) {
      expect(station).toHaveProperty("id");
      expect(station).toHaveProperty("name");
      expect(station).toHaveProperty("lat");
      expect(station).toHaveProperty("lng");
      expect(station).toHaveProperty("lines");
      expect(typeof station.lat).toBe("number");
      expect(typeof station.lng).toBe("number");
      expect(Array.isArray(station.lines)).toBe(true);
    }
  });

  it("station coordinates are in NYC area", () => {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    for (const station of data) {
      expect(station.lng).toBeGreaterThan(-74.3);
      expect(station.lng).toBeLessThan(-73.7);
      expect(station.lat).toBeGreaterThan(40.4);
      expect(station.lat).toBeLessThan(40.95);
    }
  });

  it("includes well-known stations", () => {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    const names = data.map((s: { name: string }) => s.name.toLowerCase());
    expect(names.some((n: string) => n.includes("times sq"))).toBe(true);
    expect(names.some((n: string) => n.includes("grand central"))).toBe(true);
    expect(names.some((n: string) => n.includes("union sq"))).toBe(true);
  });

  it("every station has at least one line", () => {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    for (const station of data) {
      expect(station.lines.length).toBeGreaterThan(0);
    }
  });
});
