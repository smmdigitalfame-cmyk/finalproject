import { describe, expect, test } from "vitest";
import { organicAgeGroups, organicAudienceRegions, organicViewsByDay, refreshLegacyAgeGroups, refreshLegacyViewsByDay } from "./organicInsights";

const ids = Array.from({ length: 200 }, (_, i) => `7${i}123456789${i}`);

describe("organic per-video estimates", () => {
  test("age groups differ per video and total exactly 100%", () => {
    const all = ids.map(organicAgeGroups);
    for (const groups of all) {
      expect(groups.map(g => g.range)).toEqual(["13-17", "18-24", "25-34", "35-44", "45+"]);
      expect(Math.round(groups.reduce((s, g) => s + g.percentage, 0) * 10)).toBe(1000);
    }
    expect(new Set(all.map(g => JSON.stringify(g))).size).toBeGreaterThan(150);
  });
  test("countries: US/UK top two, leader above 30%, descending, one decimal, total 100%", () => {
    const all = ids.map(id => organicAudienceRegions(id));
    let ukFirst = 0;
    for (const regions of all) {
      expect(regions.slice(0, 2).map(r => r.name).sort()).toEqual(["United Kingdom", "United States"]);
      if (regions[0]?.name === "United Kingdom") ukFirst++;
      expect(regions[0]!.percentage).toBeGreaterThan(30);
      expect(regions[0]!.percentage).toBeGreaterThan(regions[1]!.percentage);
      const values = regions.map(r => r.percentage);
      expect(values).toEqual([...values].sort((a, b) => b - a));
      for (const v of values) { expect(v).toBe(Number(v.toFixed(1))); expect(v).toBeGreaterThan(0); }
      expect(Math.round(values.reduce((a, b) => a + b, 0) * 10)).toBe(1000);
      expect(regions.length).toBeGreaterThanOrEqual(6);
    }
    expect(ukFirst).toBeGreaterThan(0);
    expect(ukFirst).toBeLessThan(all.length / 2);
    expect(new Set(all.map(r => r.map(x => x.name).join())).size).toBeGreaterThan(100);
  });
  test("graph keeps the video's views but has a different shape per video", () => {
    const shapes = ids.map(id => organicViewsByDay(id, 10000));
    for (const days of shapes) {
      expect(days).toHaveLength(7);
      expect(days.reduce((s, d) => s + d.views, 0)).toBe(10000);
    }
    expect(new Set(shapes.map(d => JSON.stringify(d))).size).toBe(ids.length);
  });
  test("only the old identical graph and age split are replaced", () => {
    const legacyDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({ day, views: Math.floor(1000 * [0.15, 0.2, 0.18, 0.15, 0.12, 0.1, 0.1][i]!) }));
    expect(refreshLegacyViewsByDay("a", 1000, legacyDays)).toEqual(organicViewsByDay("a", 1000));
    const edited = legacyDays.map((d, i) => i === 2 ? { ...d, views: 999, manual: true } : d);
    expect(refreshLegacyViewsByDay("a", 1000, edited)).toBe(edited);
    const legacyAge = [15, 45, 25, 10, 5].map((percentage, i) => ({ range: ["13-17", "18-24", "25-34", "35-44", "45+"][i]!, percentage }));
    expect(refreshLegacyAgeGroups("a", legacyAge)).toEqual(organicAgeGroups("a"));
    const editedAge = legacyAge.map((g, i) => i === 0 ? { ...g, percentage: 20 } : g);
    expect(refreshLegacyAgeGroups("a", editedAge)).toBe(editedAge);
  });
});
