import { expect, test } from "vitest";
import { MAX_CLONE_VIDEOS, scrapeInputSchema } from "./cloneLimits";

test("allows fetching up to 60 videos per account", () => {
  expect(MAX_CLONE_VIDEOS).toBe(60);
  expect(scrapeInputSchema.parse({ username: "abc", count: 60 }).count).toBe(60);
});

test("defaults to the full 60-video cap when no count is given", () => {
  expect(scrapeInputSchema.parse({ username: "abc" }).count).toBe(60);
});

test("rejects counts above the cap and non-positive counts", () => {
  expect(() => scrapeInputSchema.parse({ username: "abc", count: 61 })).toThrow();
  expect(() => scrapeInputSchema.parse({ username: "abc", count: 0 })).toThrow();
});
