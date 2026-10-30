import { describe, expect, it } from "vitest";
import { formatViewsDisplay } from "./mockData";
import { applyBulkInsights, defaultBulkSettings } from "./bulkInsights";
import type { ReelData } from "./mockData";

describe("formatViewsDisplay", () => {
  it("rounds to nearest 50 in 0.1K steps", () => {
    expect(formatViewsDisplay(1132)).toBe("1.1K");
    expect(formatViewsDisplay(1157)).toBe("1.2K");
    expect(formatViewsDisplay(1447)).toBe("1.4K");
    expect(formatViewsDisplay(1451)).toBe("1.5K");
    expect(formatViewsDisplay(1957)).toBe("2.0K");
    expect(formatViewsDisplay(1024)).toBe("1.0K");
  });
  it("keeps small and million counts sensible", () => {
    expect(formatViewsDisplay(437)).toBe("437");
    expect(formatViewsDisplay(1240000)).toBe("1.2M");
  });
});

const reel = (id: string, views: number): ReelData => ({
  id, title: "t", description: "", tags: [], thumbnail: "", videoUrl: "", duration: "0:18",
  createdAt: "2026-10-16", music: "", username: "@u",
  insights: {
    views, likes: 0, comments: 0, shares: 0, saves: 0, avgWatchTime: 0, totalPlayTime: 0,
    reachedAudience: 0, profileVisits: 0, followsFromPost: 0, watchedFull: 0,
    trafficSources: { forYouPage: 0, following: 0, profile: 0, search: 0, sounds: 0, hashtags: 0 },
    audienceRegions: [], viewsByDay: [], genderSplit: { male: 0, female: 0, other: 0 }, ageGroups: [],
  },
});

describe("bulk watch metrics tables", () => {
  const settings = { ...defaultBulkSettings, enabled: true };
  const reels = [reel("a", 1074), reel("b", 1074), reel("c", 1957)];
  const out = applyBulkInsights(reels, settings);

  it("custom total play time keeps the per-1,000-views formula", () => {
    const custom = applyBulkInsights(reels, { ...settings, customTotalPlayTime: true });
    expect(custom[0]!.insights.totalPlayTime).toBe(Math.round(1074 / 1000 * settings.secondsPer1000Views));
  });
  it("automatic average watch time stays between 5.1 and 15.1 seconds", () => {
    for (const r of out) {
      expect(r.insights.avgWatchTime).toBeGreaterThanOrEqual(5.1);
      expect(r.insights.avgWatchTime).toBeLessThanOrEqual(15.1);
    }
  });
  it("automatic watched full stays between 5.10 and 15.10%", () => {
    for (const r of out) {
      expect(r.insights.watchedFull).toBeGreaterThanOrEqual(5.1);
      expect(r.insights.watchedFull).toBeLessThanOrEqual(15.1);
    }
  });
  it("is deterministic per reel", () => {
    const again = applyBulkInsights(reels, settings);
    expect(again.map(r => r.insights.watchedFull)).toEqual(out.map(r => r.insights.watchedFull));
    expect(again.map(r => r.insights.avgWatchTime)).toEqual(out.map(r => r.insights.avgWatchTime));
  });
});
