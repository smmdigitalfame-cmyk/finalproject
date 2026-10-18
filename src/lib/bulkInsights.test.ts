import { describe, expect, test } from "vitest";
import { applyBulkInsights, applyBulkInsightsBatched, persistBulkResult, loadBulkSettings, BULK_SETTINGS_KEY, defaultBulkSettings, validateBulkSettings } from "./bulkInsights";
import type { ReelData } from "./mockData";

const settings = { ...defaultBulkSettings, enabled: true };
const reel = (views: number, duration = "0:30"): ReelData => ({
  id: String(views), title: "Video", description: "", tags: [], thumbnail: "", duration,
  createdAt: "2026-10-18", music: "sound", username: "creator",
  insights: { views, likes: 4, comments: 2, shares: 1, saves: 3, avgWatchTime: 0, totalPlayTime: 0,
    watchedFull: 0, reachedAudience: 0, profileVisits: 0, followsFromPost: 0,
    trafficSources: { ...settings.trafficSources }, audienceRegions: [], viewsByDay: [], genderSplit: { male: 0, female: 0, other: 0 }, ageGroups: [] },
});

describe("bulk video estimator", () => {
  test("one hour per 1000 views scales with each video's exact views", () => {
    expect(applyBulkInsights([reel(1000), reel(2000), reel(1500)], settings).map(r => r.insights.totalPlayTime)).toEqual([3600, 7200, 5400]);
  });
  test("hours minutes and seconds are preserved", () => {
    expect(applyBulkInsights([reel(1000)], { ...settings, secondsPer1000Views: 3662 })[0]?.insights.totalPlayTime).toBe(3662);
  });
  test("average watch time comes from the views bucket table", () => {
    const value = applyBulkInsights([reel(1000, "0:30")], settings)[0]?.insights.avgWatchTime ?? 0;
    expect(value).toBeGreaterThanOrEqual(5.5);
    expect(value).toBeLessThanOrEqual(6.0);
  });
  test("average watch time never exceeds the video's own length", () => {
    expect(applyBulkInsights([reel(1000, "0:04")], settings)[0]?.insights.avgWatchTime).toBe(4);
  });
  test("watched full percentage comes from the views bucket table", () => {
    const [low, high] = applyBulkInsights([reel(1000), reel(1950)], settings).map(r => r.insights.watchedFull);
    expect(low).toBeGreaterThanOrEqual(7.5);
    expect(low).toBeLessThanOrEqual(8.0);
    expect(high).toBeGreaterThanOrEqual(14.1);
    expect(high).toBeLessThanOrEqual(14.91);
  });
  test("country and traffic settings apply without sharing mutable objects", () => {
    const output = applyBulkInsights([reel(1000), reel(2000)], settings);
    expect(output[0]?.insights.audienceRegions.map(region => region.name)).toEqual(settings.audienceRegions.map(region => region.name));
    expect(output[1]?.insights.trafficSources).toEqual(settings.trafficSources);
    expect(output[0]?.insights.audienceRegions).not.toBe(output[1]?.insights.audienceRegions);
  });
  test("source stats and other editor fields are unchanged", () => {
    const input = reel(1248);
    expect(applyBulkInsights([input], settings)[0]?.insights.views).toBe(1248);
    expect(applyBulkInsights([input], settings)[0]?.insights.likes).toBe(4);
    expect(input.insights.totalPlayTime).toBe(0);
  });
  test("disabled rules leave future fetched videos unchanged", () => {
    const input = [reel(1000)];
    expect(applyBulkInsights(input, defaultBulkSettings)).toBe(input);
  });
  test("rejects percentages above 100 and incomplete distributions", () => {
    expect(validateBulkSettings({ ...settings, averageWatchPercent: 101 })).not.toBeNull();
    expect(validateBulkSettings({ ...settings, audienceRegions: [{ name: "India", percentage: 90 }] })).not.toBeNull();
    expect(validateBulkSettings({ ...settings, trafficSources: { ...settings.trafficSources, search: 10 } })).not.toBeNull();
  });
  test("45 percent country base varies by at most four points with total 100", () => {
    const custom = { ...settings, audienceRegions: [{ name: "India", percentage: 45 }, { name: "US", percentage: 55 }] };
    const output = applyBulkInsights(Array.from({ length: 100 }, (_, i) => reel(1000 + i)), custom);
    const values = output.map(video => video.insights.audienceRegions[0]?.percentage);
    expect(new Set(values).size).toBeGreaterThan(1);
    for (const video of output) {
      expect(video.insights.audienceRegions[0]?.percentage).toBeGreaterThanOrEqual(41);
      expect(video.insights.audienceRegions[0]?.percentage).toBeLessThanOrEqual(49);
      expect(video.insights.audienceRegions.reduce((sum, region) => sum + region.percentage, 0)).toBeCloseTo(100, 8);
    }
  });
  test("repeat application and reordered videos keep the same estimates", () => {
    const input = [reel(1000), reel(2000)];
    const result = applyBulkInsights(input, settings);
    expect(applyBulkInsights(result, settings)).toEqual(result);
    expect(applyBulkInsights([...input].reverse(), settings).reverse()).toEqual(result);
  });
  test("zero variation retains exact base percentages", () => {
    expect(applyBulkInsights([reel(1000)], { ...settings, countryVariation: 0 })[0]?.insights.audienceRegions).toEqual(settings.audienceRegions);
  });
  test("boundary countries never exceed 0 to 100", () => {
    const custom = { ...settings, audienceRegions: [{ name: "India", percentage: 100 }, { name: "US", percentage: 0 }] };
    for (const video of applyBulkInsights(Array.from({ length: 40 }, (_, i) => reel(i)), custom)) {
      for (const region of video.insights.audienceRegions) {
        expect(region.percentage).toBeGreaterThanOrEqual(0);
        expect(region.percentage).toBeLessThanOrEqual(100);
      }
    }
  });
  test("invalid settings shapes and variation over four fail closed", () => {
    for (const value of [null, {}, { ...settings, audienceRegions: [null] }, { ...settings, countryVariation: 4.1 }]) expect(validateBulkSettings(value)).not.toBeNull();
  });
  test("invalid view counts and overflowing estimates are rejected", () => {
    for (const views of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) expect(() => applyBulkInsights([reel(views)], settings)).toThrow();
  });
  test("10,000 videos are processed in yielding batches with exact view scaling", async () => {
    const input = Array.from({ length: 10000 }, (_, i) => reel(i));
    const output = await applyBulkInsightsBatched(input, settings);
    expect(output).toHaveLength(10000);
    expect(output[9999]?.insights.totalPlayTime).toBe(35996);
    expect(output[5000]).toEqual(applyBulkInsights([input[5000]], settings)[0]);
  });
  test("saved rules load and apply automatically to newly fetched views", () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    try {
      const output = applyBulkInsights([reel(1000)], settings);
      persistBulkResult(storage, output, settings);
      expect(JSON.parse(storage.getItem("user_reels") ?? "[]")).toEqual(output);
      expect(applyBulkInsights([reel(2000)], loadBulkSettings())[0]?.insights.totalPlayTime).toBe(7200);
    } finally {
      if (previous) Object.defineProperty(globalThis, "localStorage", previous); else Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
  test("a failed second write restores old reels and settings", () => {
    const data = new Map([["user_reels", "old reels"], [BULK_SETTINGS_KEY, "old settings"]]);
    let fail = true;
    const storage = { getItem: (key: string) => data.get(key) ?? null, removeItem: (key: string) => { data.delete(key); }, setItem: (key: string, value: string) => {
      if (key === BULK_SETTINGS_KEY && fail) { fail = false; throw new Error("Storage full"); }
      data.set(key, value);
    } };
    expect(() => persistBulkResult(storage, [reel(1000)], settings)).toThrow("Storage full");
    expect(storage.getItem("user_reels")).toBe("old reels");
    expect(storage.getItem(BULK_SETTINGS_KEY)).toBe("old settings");
  });
});