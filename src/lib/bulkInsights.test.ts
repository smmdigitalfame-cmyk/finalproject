import { describe, expect, test } from "vitest";
import { applyBulkInsights, applyBulkInsightsBatched, persistBulkResult, loadBulkSettings, BULK_SETTINGS_KEY, defaultBulkSettings, validateBulkSettings, orderedAudienceRegions } from "./bulkInsights";
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
  test("custom full watch percentage applies to every video including zero", async () => {
    const input = [reel(1000), reel(1950)];
    expect(applyBulkInsights(input, { ...settings, watchedFullOverridePercent: 14.84 }).map(video => video.insights.watchedFull)).toEqual([14.84, 14.84]);
    expect((await applyBulkInsightsBatched(input, { ...settings, watchedFullOverridePercent: 0 })).map(video => video.insights.watchedFull)).toEqual([0, 0]);
  });
  test("custom full watch percentage accepts 0 to 100 and rejects invalid values", () => {
    for (const value of [-1, 101, NaN, Infinity]) expect(validateBulkSettings({ ...settings, watchedFullOverridePercent: value })).not.toBeNull();
    expect(validateBulkSettings({ ...settings, watchedFullOverridePercent: 100 })).toBeNull();
  });
  test("USA stays first even with a lower percentage and other countries vary by reel", () => {
    const regions = [{ name: "India", percentage: 50 }, { name: "United States", percentage: 5 }, { name: "Brazil", percentage: 15 }, { name: "France", percentage: 10 }, { name: "Nigeria", percentage: 10 }, { name: "Other", percentage: 10 }];
    const orders = Array.from({ length: 30 }, (_, i) => orderedAudienceRegions(regions, String(i)));
    for (const order of orders) {
      expect(order[0]?.region.name).toBe("United States");
      expect(order[0]?.i).toBe(1);
      expect(order.map(item => item.region).sort((a,b) => a.name.localeCompare(b.name))).toEqual([...regions].sort((a,b) => a.name.localeCompare(b.name)));
    }
    expect(new Set(orders.map(order => order.map(item => item.region.name).join(","))).size).toBeGreaterThan(3);
    expect(orderedAudienceRegions([...regions].reverse(), "a").map(item => item.region)).toEqual(orderedAudienceRegions(regions, "a").map(item => item.region));
  });
  test("base eight varies per video within three seconds either side including decimals", () => {
    const input = Array.from({ length: 100 }, (_, i) => reel(1000 + i, "0:22"));
    const values = applyBulkInsights(input, { ...settings, averageWatchSeconds: 8 }).map(video => video.insights.avgWatchTime);
    expect(new Set(values).size).toBeGreaterThan(20);
    expect(values.some(value => value < 8)).toBe(true);
    expect(values.some(value => value > 8)).toBe(true);
    expect(values.some(value => !Number.isInteger(value))).toBe(true);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(11);
    }
  });
  test("custom variation stays stable through repeated Push, reordering and batches", async () => {
    const input = [reel(1000), reel(2000)];
    const custom = { ...settings, averageWatchSeconds: 8 };
    const output = applyBulkInsights(input, custom);
    expect(applyBulkInsights(output, custom)).toEqual(output);
    expect(applyBulkInsights([...input].reverse(), custom).reverse()).toEqual(output);
    expect(await applyBulkInsightsBatched(input, custom)).toEqual(output);
  });
  test("custom variation with a base under three stays nonnegative", () => {
    const values = applyBulkInsights(Array.from({ length: 50 }, (_, i) => reel(i)), { ...settings, averageWatchSeconds: 1 }).map(video => video.insights.avgWatchTime);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(4);
    }
  });
  test("custom average seconds are capped at each video's duration", async () => {
    const output = await applyBulkInsightsBatched([reel(1000, "0:04"), reel(2000, "0:00")], { ...settings, averageWatchSeconds: 12 });
    expect(output.map(video => video.insights.avgWatchTime)).toEqual([4, 0]);
  });
  test("custom average rejects negative and nonfinite seconds but accepts zero", () => {
    for (const averageWatchSeconds of [-1, NaN, Infinity]) expect(validateBulkSettings({ ...settings, averageWatchSeconds })).not.toBeNull();
    expect(applyBulkInsights([reel(1000)], { ...settings, averageWatchSeconds: 0 })[0]?.insights.avgWatchTime).toBe(0);
  });
  test("one hour per 1000 views scales with each video's exact views", () => {
    expect(applyBulkInsights([reel(1000), reel(2000), reel(1500)], settings).map(r => r.insights.totalPlayTime)).toEqual([3600, 7200, 5400]);
  });
  test("hours minutes and seconds are preserved", () => {
    expect(applyBulkInsights([reel(1000)], { ...settings, secondsPer1000Views: 3662 })[0]?.insights.totalPlayTime).toBe(3662);
  });
  test("average watch time stays random between 5.8 and 7.4 seconds per video", () => {
    const values = applyBulkInsights(Array.from({ length: 100 }, (_, i) => reel(1000 + i, "0:30")), settings).map(video => video.insights.avgWatchTime);
    expect(new Set(values).size).toBeGreaterThan(10);
    expect(values.some(value => !Number.isInteger(value))).toBe(true);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(5.8);
      expect(value).toBeLessThanOrEqual(7.4);
    }
  });
  test("average watch time never exceeds the video's own length", () => {
    const value = applyBulkInsights([reel(1000, "0:04")], settings)[0]?.insights.avgWatchTime ?? 0;
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(4);
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
    expect(output[0]?.insights.audienceRegions.map(region => region.name).sort()).toEqual(settings.audienceRegions.map(region => region.name).sort());
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
    const values = output.map(video => video.insights.audienceRegions.find(region => region.name === "India")?.percentage);
    expect(new Set(values).size).toBeGreaterThan(1);
    for (const video of output) {
      expect(video.insights.audienceRegions.find(region => region.name === "India")?.percentage).toBeGreaterThanOrEqual(41);
      expect(video.insights.audienceRegions.find(region => region.name === "India")?.percentage).toBeLessThanOrEqual(49);
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
    expect(applyBulkInsights([reel(1000)], { ...settings, countryVariation: 0 })[0]?.insights.audienceRegions).toEqual(orderedAudienceRegions(settings.audienceRegions, "1000").map(item => item.region));
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
      const custom = { ...settings, averageWatchSeconds: 12, watchedFullOverridePercent: 14.84 };
      const output = applyBulkInsights([reel(1000)], custom);
      persistBulkResult(storage, output, custom);
      expect(JSON.parse(storage.getItem("user_reels") ?? "[]")).toEqual(output);
      expect(applyBulkInsights([reel(2000)], loadBulkSettings())[0]?.insights.totalPlayTime).toBe(7200);
      expect(loadBulkSettings().averageWatchSeconds).toBe(12);
      expect(loadBulkSettings().watchedFullOverridePercent).toBe(14.84);
      expect(applyBulkInsights([reel(2000)], loadBulkSettings())[0]?.insights.watchedFull).toBe(14.84);
      expect(applyBulkInsights([reel(2000, "0:22")], loadBulkSettings())).toEqual(applyBulkInsights([reel(2000, "0:22")], custom));
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