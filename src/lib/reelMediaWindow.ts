/** Retain only the active reel and its immediate neighbours as media elements. */
export function reelMediaWindow(ids: readonly string[], activeId: string): Set<string> {
  const index = ids.indexOf(activeId);
  if (index < 0) return new Set();
  return new Set(ids.slice(Math.max(0, index - 1), index + 2));
}