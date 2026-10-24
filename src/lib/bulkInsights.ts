import type { ReelData, ReelInsights } from "./mockData";
import { parseDuration } from "./utils";

export interface BulkInsightSettings {
  enabled: boolean;
  secondsPer1000Views: number;
  averageWatchPercent: number;
  averageWatchSeconds?: number;
  watchedFullPercent: number;
  watchedFullOverridePercent?: number;
  trafficSources: ReelInsights["trafficSources"];
  audienceRegions: ReelInsights["audienceRegions"];
  countryVariation?: number;
}

export const BULK_SETTINGS_KEY = "bulk_insight_settings";
export const defaultBulkSettings: BulkInsightSettings = {
  enabled: false,
  countryVariation: 4,
  secondsPer1000Views: 3600,
  averageWatchPercent: 90,
  watchedFullPercent: 10,
  trafficSources: { forYouPage: 70, following: 15, profile: 7, search: 4, sounds: 2, hashtags: 2 },
  audienceRegions: [{ name: "India", percentage: 50 }, { name: "United States", percentage: 30 }, { name: "Other", percentage: 20 }],
};

const validPercent = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;
export function validateBulkSettings(input: unknown): string | null {
  if (!input || typeof input !== "object") return "Invalid video settings.";
  const settings = input as BulkInsightSettings;
  if (typeof settings.enabled !== "boolean") return "Invalid auto-apply setting.";
  if (!Number.isSafeInteger(settings.secondsPer1000Views) || settings.secondsPer1000Views < 0) return "Enter a valid total play time.";
  if (settings.averageWatchSeconds !== undefined && (!Number.isFinite(settings.averageWatchSeconds) || settings.averageWatchSeconds < 0)) return "Enter a valid average watch time in seconds.";
  if (settings.watchedFullOverridePercent !== undefined && !validPercent(settings.watchedFullOverridePercent)) return "Watched full video must be between 0 and 100%.";
  if ((settings.averageWatchPercent !== undefined && !validPercent(settings.averageWatchPercent)) || (settings.watchedFullPercent !== undefined && !validPercent(settings.watchedFullPercent))) return "Watch percentages must be between 0 and 100.";
  if (settings.countryVariation !== undefined && (!Number.isFinite(settings.countryVariation) || settings.countryVariation < 0 || settings.countryVariation > 4)) return "Country variation must be between 0 and 4 percentage points.";
  if (!settings.trafficSources || typeof settings.trafficSources !== "object") return "Invalid traffic sources.";
  const traffic = Object.values(settings.trafficSources);
  if (traffic.length !== 6 || ["forYouPage", "following", "profile", "search", "sounds", "hashtags"].some(key => !Object.hasOwn(settings.trafficSources, key)) || traffic.some(value => !validPercent(value)) || Math.abs(traffic.reduce((a, b) => a + b, 0) - 100) > 0.000001) return "Traffic sources must total 100%.";
  const regions = settings.audienceRegions;
  if (!Array.isArray(regions) || !regions.length || regions.some(region => !region || typeof region.name !== "string" || !region.name.trim() || !validPercent(region.percentage))) return "Enter a country name and percentage for every location.";
  if (new Set(regions.map(region => region.name.trim().toLowerCase())).size !== regions.length) return "Audience locations must have unique names.";
  if (Math.abs(regions.reduce((sum, region) => sum + region.percentage, 0) - 100) > 0.000001) return "Audience locations must total 100%.";
  return null;
}

function hashSeed(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

// Pairwise transfers preserve 100% without multiplying or normalizing past the variation bounds.
function countryEstimates(reel: ReelData, settings: BulkInsightSettings) {
  const regions = settings.audienceRegions.map(region => ({ name: region.name.trim(), percentage: region.percentage }));
  const range = Math.round((settings.countryVariation ?? 4) * 100);
  for (let i = 0; i + 1 < regions.length; i += 2) {
    const first = regions[i], second = regions[i + 1];
    if (!first || !second || range === 0) continue;
    const seed = hashSeed(`${reel.id}:${reel.insights.views}:${first.name}:${second.name}`);
    const requested = seed % (2 * range + 1) - range;
    const low = Math.ceil(Math.max(-range, -first.percentage * 100, (second.percentage - 100) * 100));
    const high = Math.floor(Math.min(range, (100 - first.percentage) * 100, second.percentage * 100));
    const delta = Math.max(low, Math.min(high, requested)) / 100;
    first.percentage = Number((first.percentage + delta).toFixed(8));
    second.percentage = Number((second.percentage - delta).toFixed(8));
  }
  return regions;
}

// Default watch metrics come from views-based tables: every 50 views past 1000
// moves to the next bucket; the exact value is deterministic inside the range.
const AVG_WATCH_LOW = [5.5, 5.6, 5.7, 5.8, 5.9, 6.0, 6.2, 6.3, 6.4, 6.5, 6.6];
const AVG_WATCH_HIGH = [6.0, 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.8, 6.9, 7.0, 7.1];
const FULL_LOW = [7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.8, 11.6, 12.4, 13.2, 14.1];
const FULL_HIGH = [8.0, 8.5, 9.0, 9.5, 10.0, 10.8, 11.6, 12.4, 13.2, 14.1, 14.91];

function viewsBucket(views: number): number {
  return Math.min(10, Math.max(0, Math.floor((views - 1000) / 50)));
}

function seededFraction(reel: ReelData, key: string): number {
  return hashSeed(`${reel.id}:${reel.insights.views}:${key}`) / 4294967295;
}

function defaultAvgWatchSeconds(reel: ReelData, duration: number): number {
  const bucket = viewsBucket(reel.insights.views);
  const low = AVG_WATCH_LOW[bucket] ?? 5.5, high = AVG_WATCH_HIGH[bucket] ?? 6;
  const value = low + seededFraction(reel, "avg") * (high - low);
  return Math.min(duration, Math.round(value * 10) / 10);
}

function defaultWatchedFullPercent(reel: ReelData): number {
  const bucket = viewsBucket(reel.insights.views);
  const low = FULL_LOW[bucket] ?? 7.5, high = FULL_HIGH[bucket] ?? 8;
  return Number((low + seededFraction(reel, "full") * (high - low)).toFixed(2));
}

function customAvgWatchSeconds(reel: ReelData, duration: number, base: number): number {
  if (base === 0 || duration <= 0) return 0;
  const low = Math.max(0, base - 3);
  const high = Math.min(duration, base + 3);
  if (low >= high) return Math.min(duration, base);
  const value = low + seededFraction(reel, "custom-avg") * (high - low);
  return Math.min(high, Math.max(low, Math.round(value * 10) / 10));
}

function applyToReel(reel: ReelData, settings: BulkInsightSettings): ReelData {
  const views = reel.insights.views;
  const duration = parseDuration(reel.duration);
  const totalPlayTime = Math.round(views / 1000 * settings.secondsPer1000Views);
  if (!Number.isSafeInteger(views) || views < 0 || !Number.isFinite(duration) || duration < 0 || !Number.isSafeInteger(totalPlayTime)) throw new Error("A video has invalid views or duration. Fetch it again before applying settings.");
  return {
    ...reel,
    insights: {
      ...reel.insights,
      totalPlayTime,
      avgWatchTime: settings.averageWatchSeconds === undefined ? defaultAvgWatchSeconds(reel, duration) : customAvgWatchSeconds(reel, duration, settings.averageWatchSeconds),
      watchedFull: settings.watchedFullOverridePercent ?? defaultWatchedFullPercent(reel),
      trafficSources: { ...settings.trafficSources },
      audienceRegions: countryEstimates(reel, settings),
    },
  };
}

export function applyBulkInsights(reels: ReelData[], settings: BulkInsightSettings): ReelData[] {
  const error = validateBulkSettings(settings);
  if (error) throw new Error(error);
  if (!settings.enabled) return reels;
  return reels.map(reel => applyToReel(reel, settings));
}

export async function applyBulkInsightsBatched(reels: ReelData[], settings: BulkInsightSettings): Promise<ReelData[]> {
  const error = validateBulkSettings(settings);
  if (error) throw new Error(error);
  if (!settings.enabled) return reels;
  const output: ReelData[] = [];
  for (let offset = 0; offset < reels.length; offset += 25) {
    for (const reel of reels.slice(offset, offset + 25)) output.push(applyToReel(reel, settings));
    if (offset + 25 < reels.length) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return output;
}

export function persistBulkResult(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, reels: ReelData[], settings: BulkInsightSettings) {
  const previousSettings = storage.getItem(BULK_SETTINGS_KEY);
  const previousReels = storage.getItem("user_reels");
  // Serialize before writing so malformed data cannot leave a partially saved result.
  const nextSettings = JSON.stringify(settings), nextReels = JSON.stringify(reels);
  try {
    storage.setItem("user_reels", nextReels);
    storage.setItem(BULK_SETTINGS_KEY, nextSettings);
  } catch (error) {
    try {
      if (previousReels === null) storage.removeItem("user_reels"); else storage.setItem("user_reels", previousReels);
      if (previousSettings === null) storage.removeItem(BULK_SETTINGS_KEY); else storage.setItem(BULK_SETTINGS_KEY, previousSettings);
    } catch { /* Device storage may be unavailable; never report success. */ }
    throw error;
  }
}

export function loadBulkSettings(): BulkInsightSettings {
  try {
    const saved = localStorage.getItem(BULK_SETTINGS_KEY);
    if (!saved) return structuredClone(defaultBulkSettings);
    const parsed = JSON.parse(saved) as BulkInsightSettings;
    if (typeof parsed.enabled !== "boolean" || validateBulkSettings(parsed)) return structuredClone(defaultBulkSettings);
    return parsed;
  } catch {
    return structuredClone(defaultBulkSettings);
  }
}