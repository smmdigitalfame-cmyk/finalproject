import { describe, expect, it } from "vitest";
import { reelViewerTypes } from "./organicInsights";
import { generateRandomReel, normalizeReelData } from "./mockData";

const ids = Array.from({ length: 100 }, (_, i) => `real-video-${i}`);

describe("per-reel viewer types", () => {
  it("generates New viewers between 10 and 30 percent with a 100 percent pair", () => {
    for (const id of ids) {
      const { newViewerPct } = reelViewerTypes(id);
      expect(newViewerPct).toBeGreaterThanOrEqual(10);
      expect(newViewerPct).toBeLessThanOrEqual(30);
      expect(newViewerPct + Number((100 - newViewerPct).toFixed(1))).toBe(100);
    }
  });

  it("generates Non-followers between 75 and 99 percent with a 100 percent pair", () => {
    for (const id of ids) {
      const { nonFollowersPct } = reelViewerTypes(id);
      expect(nonFollowersPct).toBeGreaterThanOrEqual(75);
      expect(nonFollowersPct).toBeLessThanOrEqual(99);
      expect(nonFollowersPct + Number((100 - nonFollowersPct).toFixed(1))).toBe(100);
    }
  });

  it("varies each split independently across reel ids without refresh rerolls", () => {
    const splits = ids.map(id => reelViewerTypes(id));
    expect(new Set(splits.map(s => s.newViewerPct)).size).toBeGreaterThan(40);
    expect(new Set(splits.map(s => s.nonFollowersPct)).size).toBeGreaterThan(40);
    expect(new Set(splits.map(s => s.nonFollowersPct - s.newViewerPct)).size).toBeGreaterThan(40);
    expect(ids.map(id => reelViewerTypes(id))).toEqual(splits);
  });

  it("saves the two fields per reel and preserves all unrelated insights on refresh", () => {
    const original = generateRandomReel(1);
    const restored = normalizeReelData(JSON.parse(JSON.stringify(original)));
    const expected = reelViewerTypes(original.id);
    expect(restored.insights).toEqual({ ...original.insights, ...expected });
    const saved = JSON.parse(JSON.stringify(restored));
    expect(normalizeReelData(saved).insights).toEqual(restored.insights);
  });

  it("retains saved viewer edits within the requested ranges", () => {
    expect(reelViewerTypes("reel", { newViewerPct: 23.4, nonFollowersPct: 91.2 }))
      .toEqual({ newViewerPct: 23.4, nonFollowersPct: 91.2 });
  });
});