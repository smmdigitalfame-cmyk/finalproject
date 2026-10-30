import type { ReelInsights } from "./mockData";

// Pure, client-safe organic estimates. Every value is seeded by the video id so a
// video keeps the same numbers across reloads, re-fetches and repeated Push.

export const TOTAL_PLAY_MIN = 50 * 60 + 10; // 0h:50m:10s
export const TOTAL_PLAY_MAX = 60 * 60 + 50 * 60 + 30; // 1h:50m:30s
export const AVG_WATCH_MIN = 5.1;
export const AVG_WATCH_MAX = 15.1;
export const FULL_WATCH_MIN = 5.1;
export const FULL_WATCH_MAX = 15.1;
export const TOP_COUNTRY_MIN = 30;

export const organicCountryPool = [
  "Singapore", "Australia", "France", "Canada", "Sweden", "India", "Pakistan", "Sri Lanka",
  "Bangladesh", "Germany", "Spain", "Saudi Arabia", "Netherlands", "Philippines", "United Arab Emirates", "Ireland",
];

function hash(text: string): number {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
  seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
  seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
  return (seed ^ (seed >>> 16)) >>> 0;
}

/** Deterministic fraction in [0, 1] for a video and purpose. */
export const organicFraction = (id: string, key: string) => hash(`${id}:organic:${key}`) / 4294967295;

export const organicTotalPlayTime = (id: string) =>
  Math.round(TOTAL_PLAY_MIN + organicFraction(id, "total-play") * (TOTAL_PLAY_MAX - TOTAL_PLAY_MIN));

export const organicAvgWatchTime = (id: string) =>
  Number((AVG_WATCH_MIN + organicFraction(id, "avg-watch") * (AVG_WATCH_MAX - AVG_WATCH_MIN)).toFixed(1));

export const organicWatchedFull = (id: string) =>
  Number((FULL_WATCH_MIN + organicFraction(id, "watched-full") * (FULL_WATCH_MAX - FULL_WATCH_MIN)).toFixed(2));

/** Split `total` integer units across weights so the parts sum exactly to `total`. */
function splitUnits(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map(w => (w / sum) * total);
  const parts = raw.map(Math.floor);
  let rest = total - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; rest > 0 && order.length; k = (k + 1) % order.length, rest--) {
    const index = order[k]?.i ?? 0;
    parts[index] = (parts[index] ?? 0) + 1;
  }
  return parts;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Seven points with an early peak, natural ups and downs, and a slow tail. */
export function organicViewsByDay(id: string, views: number): ReelInsights["viewsByDay"] {
  const peak = Math.floor(organicFraction(id, "graph-peak") * 3); // day 0-2
  const spread = 1.1 + organicFraction(id, "graph-spread") * 1.8;
  const floor = 0.08 + organicFraction(id, "graph-floor") * 0.22;
  const weights = DAYS.map((_, i) => {
    const distance = i < peak ? (peak - i) * 1.6 : i - peak;
    const curve = Math.exp(-((distance / spread) ** 2));
    const noise = 0.65 + organicFraction(id, `graph-noise-${i}`) * 0.7;
    const bump = organicFraction(id, `graph-bump-${i}`) > 0.78 ? 1.35 : 1;
    return (floor + curve) * noise * bump;
  });
  const parts = splitUnits(weights, Math.max(0, Math.floor(views)));
  return DAYS.map((day, i) => ({ day, views: parts[i] ?? 0 }));
}

const AGE_RANGES = ["13-17", "18-24", "25-34", "35-44", "45+"];
const AGE_BASE = [15, 42, 26, 11, 6];

/** Age groups vary per video; one decimal each and an exact 100% total. */
export function organicAgeGroups(id: string): ReelInsights["ageGroups"] {
  const weights = AGE_BASE.map((base, i) => base * (0.6 + organicFraction(id, `age-${i}`) * 0.8));
  const tenths = splitUnits(weights, 1000);
  return AGE_RANGES.map((range, i) => ({ range, percentage: (tenths[i] ?? 0) / 10 }));
}

/**
 * US or UK leads (US most of the time) above the minimum, the other one is second,
 * then a random set of countries from the pool. One decimal, descending, total 100.
 */
export function organicAudienceRegions(id: string, topMinPercent = TOP_COUNTRY_MIN): ReelInsights["audienceRegions"] {
  const topMin = Math.min(90, Math.max(TOP_COUNTRY_MIN, topMinPercent));
  const usFirst = organicFraction(id, "top-country") < 0.8;
  const leaders = usFirst ? ["United States", "United Kingdom"] : ["United Kingdom", "United States"];
  const others = organicCountryPool
    .map(name => ({ name, seed: organicFraction(id, `country-pick:${name}`) }))
    .sort((a, b) => a.seed - b.seed)
    .slice(0, 4 + Math.floor(organicFraction(id, "country-count") * 3))
    .map(item => item.name);
  const names = [...leaders, ...others];

  const tail = [1];
  for (let i = 1; i < names.length - 1; i++) {
    tail.push((tail[i - 1] ?? 1) * (0.5 + organicFraction(id, `country-decay-${i}`) * 0.35));
  }
  // The second country's share of the remainder; keep the leader clearly above it.
  const secondShare = 1 / tail.reduce((a, b) => a + b, 0);
  const minTop = (100 * secondShare) / (1 + secondShare) + 1.5;
  const top = Math.max(minTop, topMin + 0.1 + organicFraction(id, "top-share") * Math.min(20, 95 - topMin));
  const topTenths = Math.round(top * 10);
  const tailTenths = splitUnits(tail, 1000 - topTenths);
  return names
    .map((name, i) => ({ name, percentage: (i === 0 ? topTenths : tailTenths[i - 1] ?? 0) / 10 }))
    .sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name));
}

const LEGACY_VIEW_SHARES = [0.15, 0.2, 0.18, 0.15, 0.12, 0.1, 0.1];
const LEGACY_AGES = [15, 45, 25, 10, 5];

/** Replace only the old identical generated graph; never touch edited graphs. */
export function refreshLegacyViewsByDay(id: string, views: number, days: ReelInsights["viewsByDay"]): ReelInsights["viewsByDay"] {
  const legacy = days.length === 7 && days.every((d, i) => !d.manual && d.xPct === undefined && d.day === DAYS[i]
    && d.views === Math.floor(views * (LEGACY_VIEW_SHARES[i] ?? 0)));
  return !days.length || legacy ? organicViewsByDay(id, views) : days;
}

/** Replace only the old identical generated age split; never touch edited ages. */
export function refreshLegacyAgeGroups(id: string, groups: ReelInsights["ageGroups"]): ReelInsights["ageGroups"] {
  const legacy = groups.length === 5 && groups.every((g, i) => g.range === AGE_RANGES[i] && g.percentage === LEGACY_AGES[i]);
  return !groups.length || legacy ? organicAgeGroups(id) : groups;
}
