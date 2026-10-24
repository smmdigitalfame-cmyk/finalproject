import { describe, expect, it } from "vitest";
import { generateRandomReel, normalizeReelData } from "./mockData";

describe("per-reel insight persistence", () => {
  it("preserves customized insight moments and curves through saved reel normalization", () => {
    const reel = generateRandomReel(1);
    reel.insights.likesAtSec = 84;
    reel.insights.retentionStopSec = 104;
    reel.insights.retentionWatchedPct = 490;
    reel.insights.likesCurve = [80, 45, 20];
    reel.insights.retentionCurve = [100, 70, 37];
    const restored = normalizeReelData(JSON.parse(JSON.stringify(reel)));
    expect(restored.insights.likesAtSec).toBe(84);
    expect(restored.insights.retentionStopSec).toBe(104);
    expect(restored.insights.retentionWatchedPct).toBe(490);
    expect(restored.insights.likesCurve).toEqual([80, 45, 20]);
    expect(restored.insights.retentionCurve).toEqual([100, 70, 37]);
  });
});