import { describe, expect, test } from "vitest";
import { defaultAudienceRegions, estimateAudienceRegions, refreshLegacyAudienceRegions } from "./audienceEstimates";
import { orderedAudienceRegions } from "./bulkInsights";

describe("natural country estimates", () => {
  test("every default country varies across videos with decimal percentages and a total of 100", () => {
    const results = Array.from({ length: 100 }, (_, i) => estimateAudienceRegions(`video-${i}`, 1000));
    for (const regions of results) {
      expect(regions.reduce((sum, region) => sum + region.percentage, 0)).toBeCloseTo(100, 8);
      expect(regions.some(region => !Number.isInteger(region.percentage))).toBe(true);
      for (const [index, region] of regions.entries()) {
        expect(Math.abs(region.percentage - (defaultAudienceRegions[index]?.percentage ?? 0))).toBeLessThanOrEqual(4);
        expect(region.percentage).toBeGreaterThanOrEqual(0);
        expect(region.percentage).toBeLessThanOrEqual(100);
      }
      expect(orderedAudienceRegions(regions, "any")[0]?.region.name).toBe("United States");
    }
    for (let i = 0; i < defaultAudienceRegions.length; i++) {
      expect(new Set(results.map(regions => regions[i]?.percentage)).size).toBeGreaterThan(10);
    }
  });
  test("custom odd-sized lists vary the last country while preserving names and base bounds", () => {
    const base = [{ name: "US", percentage: 50 }, { name: "UK", percentage: 30.7 }, { name: "Other", percentage: 19.3 }];
    const results = Array.from({ length: 100 }, (_, i) => estimateAudienceRegions(String(i), 1000, base));
    expect(new Set(results.map(regions => regions[2]?.percentage)).size).toBeGreaterThan(10);
    for (const regions of results) {
      expect(regions.map(region => region.name)).toEqual(["US", "UK", "Other"]);
      expect(regions.reduce((sum, region) => sum + region.percentage, 0)).toBeCloseTo(100, 8);
      regions.forEach((region, i) => expect(Math.round(Math.abs(region.percentage - (base[i]?.percentage ?? 0)) * 1000000)).toBeLessThanOrEqual(4000000));
    }
    expect(estimateAudienceRegions("a", 1000, base, 0)).toEqual(base);
  });
  test("reopening preserves custom countries and only upgrades exact obsolete generated defaults", () => {
    const legacy = [9.1, 8.2, 4.4, 3.5, 3.2, 3.1, 3, 2.9, 1.9, 1.9, 1.8].map((percentage, i) => ({
      name: ["United States", "Nigeria", "Indonesia", "France", "South Africa", "Brazil", "Ghana", "Egypt", "Côte d'Ivoire", "Colombia", "India"][i] ?? "", percentage,
    }));
    expect(refreshLegacyAudienceRegions("a", 1000, legacy)).toEqual(estimateAudienceRegions("a", 1000));
    const edited = legacy.map((region, i) => i === 0 ? { ...region, percentage: 47.5 } : region);
    expect(refreshLegacyAudienceRegions("a", 1000, edited)).toBe(edited);
    const generated = estimateAudienceRegions("a", 1000);
    expect(refreshLegacyAudienceRegions("a", 1000, generated)).toBe(generated);
    expect(estimateAudienceRegions("a", 1000)).toEqual(estimateAudienceRegions("a", 1000));
  });
});