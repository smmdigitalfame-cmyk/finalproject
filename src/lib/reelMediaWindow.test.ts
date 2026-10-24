import { describe, expect, test } from "vitest";
import { reelMediaWindow } from "./reelMediaWindow";

describe("bounded reel media loading", () => {
  test("keeps only the selected video and its immediate neighbours in a 35-video library", () => {
    const ids = Array.from({ length: 35 }, (_, i) => String(i));
    expect([...reelMediaWindow(ids, "17")]).toEqual(["16", "17", "18"]);
    expect([...reelMediaWindow(ids, "0")]).toEqual(["0", "1"]);
    expect([...reelMediaWindow(ids, "34")]).toEqual(["33", "34"]);
  });
  test("releases old videos after jumping to another reel", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    expect(reelMediaWindow(ids, "e").has("b")).toBe(false);
    expect([...reelMediaWindow(ids, "e")]).toEqual(["d", "e", "f"]);
    expect(reelMediaWindow(ids, "missing").size).toBe(0);
  });
});