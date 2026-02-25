import { describe, it, expect } from "vitest";
import { STORY_PRESETS } from "@/lib/stories";

describe("stories", () => {
  it("has at least 3 presets", () => {
    expect(STORY_PRESETS.length).toBeGreaterThanOrEqual(3);
  });

  it("all presets have required fields", () => {
    for (const story of STORY_PRESETS) {
      expect(story.id).toBeTruthy();
      expect(story.title).toBeTruthy();
      expect(story.description).toBeTruthy();
      expect(story.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(story.startTimeSec).toBeGreaterThanOrEqual(0);
      expect(story.startTimeSec).toBeLessThan(86400);
      expect(story.speed).toBeGreaterThan(0);
    }
  });

  it("all presets have unique ids", () => {
    const ids = STORY_PRESETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes a weekday, weekend, and special event", () => {
    const titles = STORY_PRESETS.map((s) => s.title.toLowerCase());
    expect(titles.some((t) => t.includes("tuesday") || t.includes("weekday") || t.includes("normal"))).toBe(true);
    expect(titles.some((t) => t.includes("saturday") || t.includes("weekend"))).toBe(true);
    expect(titles.some((t) => t.includes("eve") || t.includes("nye") || t.includes("year"))).toBe(true);
  });

  it("all presets use 2min/s speed (120)", () => {
    for (const story of STORY_PRESETS) {
      expect(story.speed).toBe(120);
    }
  });
});
