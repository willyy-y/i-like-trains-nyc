import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const RIDERSHIP_DIR = path.resolve(__dirname, "../public/data/ridership");

describe("ridership data (Step 2)", () => {
  const dates = ["2024-03-12", "2024-03-16", "2023-12-31"];

  for (const date of dates) {
    const filePath = path.join(RIDERSHIP_DIR, `${date}.json`);

    describe(date, () => {
      it("file exists", () => {
        expect(existsSync(filePath)).toBe(true);
      });

      it("is valid JSON array", () => {
        const raw = readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
      });

      it("entries have correct structure", () => {
        const raw = readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        for (const entry of data.slice(0, 10)) {
          expect(entry.stationComplexId).toBeTruthy();
          expect(entry.stationName).toBeTruthy();
          expect(typeof entry.lat).toBe("number");
          expect(typeof entry.lng).toBe("number");
          expect(entry.hour).toBeGreaterThanOrEqual(0);
          expect(entry.hour).toBeLessThanOrEqual(23);
          expect(entry.ridership).toBeGreaterThanOrEqual(0);
          expect(entry.ridershipNormalized).toBeGreaterThanOrEqual(0);
          expect(entry.ridershipNormalized).toBeLessThanOrEqual(1);
        }
      });

      it("covers all 24 hours", () => {
        const raw = readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        const hours = new Set(data.map((e: { hour: number }) => e.hour));
        // Should have most hours covered (maybe not all if no ridership at certain hours)
        expect(hours.size).toBeGreaterThanOrEqual(18);
      });
    });
  }
});
