import { describe, expect, test } from "vitest";
import { createUploadQueue, isTransientUploadError } from "./uploadControl";

describe("shared upload control", () => {
  test("keeps concurrent uploads at two across a burst and releases failed slots", async () => {
    const run = createUploadQueue(2);
    let active = 0, peak = 0;
    const results = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => run(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active--;
      if (i === 0) throw new Error("network");
      return i;
    })));
    expect(peak).toBe(2);
    expect(active).toBe(0);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(29);
  });
  test("never retries permanent storage permission or missing bucket errors", () => {
    for (const status of [400, 401, 403, 404, 409, 413]) expect(isTransientUploadError({ statusCode: status })).toBe(false);
  });
  test("recognizes rate limits, temporary errors and network failures", () => {
    for (const status of [429, 500, 502, 503]) expect(isTransientUploadError({ statusCode: String(status) })).toBe(true);
    expect(isTransientUploadError({ message: "Failed to fetch" })).toBe(true);
  });
});