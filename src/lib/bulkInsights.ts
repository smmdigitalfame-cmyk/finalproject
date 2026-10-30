import type { ReelData, ReelInsights } from "./mockData";
import { parseDuration } from "./utils";
import { defaultAudienceRegions, estimateAudienceRegions } from "./audienceEstimates";
import { organicAudienceRegions, organicAvgWatchTime, organicTotalPlayTime, organicWatchedFull, refreshLegacyAgeGroups, refreshLegacyViewsByDay, TOP_COUNTRY_MIN } from "./organicInsights";

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
  /** true = use secondsPer1000Views; absent/false = automatic 0h50m10s-1h50m30s per video. */
  customTotalPlayTime?: boolean;
  /** true = vary the saved country list; absent/false = automatic US/UK-led organic countries. */
  customCountries?: boolean;
  /** Minimum leader percentage for automatic countries (30-90). */
  topCountryMinPercent?: number;
}

export const BULK_SETTINGS_KEY = "bulk_insight_settings";
export const defaultBulkSettings: BulkInsightSettings = {
  enabled: false,
  countryVariation: 4,
  secondsPer1000Views: 3600,
  averageWatchPercent: 90,
  watchedFullPercent: 10,
  trafficSources: { forYouPage: 70, following: 15, profile: 7, search: 4, sounds: 2, hashtags: 2 },
  audienceRegions: defaultAudienceRegions.map(region => ({ ...region })),
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
  if (settings.topCountryMinPercent !== undefined && (!Number.isFinite(settings.topCountryMinPercent) || settings.topCountryMinPercent < 30 || settings.topCountryMinPercent > 90)) return "Top country must be between 30 and 90%.";
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

// Sort complete country/value pairs, retaining source indexes for individual editors.
export function orderedAudienceRegions(regions: ReelInsights["audienceRegions"], _reelId: string) {
  return regions.map((region, i) => ({ region, i }))
    .sort((a, b) => b.region.percentage - a.region.percentage
      || a.region.name.localeCompare(b.region.name));
}

// Decimal transfers preserve the customer's total and each country's variation bounds.
function countryEstimates(reel: ReelData, settings: BulkInsightSettings) {
  if (!settings.customCountries) return organicAudienceRegions(reel.id, settings.topCountryMinPercent ?? TOP_COUNTRY_MIN);
  const regions = estimateAudienceRegions(reel.id, reel.insights.views, settings.audienceRegions, settings.countryVariation ?? 4);
  return orderedAudienceRegions(regions, reel.id).map(({ region }) => region);
}

function seededFraction(reel: ReelData, key: string): number {
  return hashSeed(`${reel.id}:${reel.insights.views}:${key}`) / 4294967295;
}

function customWatchedFullPercent(reel: ReelData, base: number): number {
  if (base === 0) return 0;
  const low = Math.max(0, base - 3);
  const high = Math.min(100, base + 4);
  const value = low + seededFraction(reel, "custom-full") * (high - low);
  return Math.min(high, Math.max(low, Number(value.toFixed(1))));
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
  const totalPlayTime = settings.customTotalPlayTime ? Math.round(views / 1000 * settings.secondsPer1000Views) : organicTotalPlayTime(reel.id);
  if (!Number.isSafeInteger(views) || views < 0 || !Number.isFinite(duration) || duration < 0 || !Number.isSafeInteger(totalPlayTime)) throw new Error("A video has invalid views or duration. Fetch it again before applying settings.");
  return {
    ...reel,
    insights: {
      ...reel.insights,
      totalPlayTime,
      avgWatchTime: settings.averageWatchSeconds === undefined ? organicAvgWatchTime(reel.id) : customAvgWatchSeconds(reel, duration, settings.averageWatchSeconds),
      watchedFull: settings.watchedFullOverridePercent === undefined ? organicWatchedFull(reel.id) : customWatchedFullPercent(reel, settings.watchedFullOverridePercent),
      viewsByDay: refreshLegacyViewsByDay(reel.id, views, reel.insights.viewsByDay),
      ageGroups: refreshLegacyAgeGroups(reel.id, reel.insights.ageGroups),
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

const sameRegions = (a: ReelInsights["audienceRegions"], b: ReelInsights["audienceRegions"]) =>
  a.length === b.length && a.every((region, i) => region.name === b[i]?.name && region.percentage === b[i]?.percentage);

// Settings saved before the automatic modes existed keep any customer edits as custom.
export function migrateBulkSettings(settings: BulkInsightSettings): BulkInsightSettings {
  const next = { ...settings };
  if (next.customTotalPlayTime === undefined && next.secondsPer1000Views !== defaultBulkSettings.secondsPer1000Views) next.customTotalPlayTime = true;
  if (next.customCountries === undefined && (!sameRegions(next.audienceRegions, defaultAudienceRegions) || (next.countryVariation ?? 4) !== 4)) next.customCountries = true;
  return next;
}

export function loadBulkSettings(): BulkInsightSettings {
  try {
    const saved = localStorage.getItem(BULK_SETTINGS_KEY);
    if (!saved) return structuredClone(defaultBulkSettings);
    const parsed = JSON.parse(saved) as BulkInsightSettings;
    if (typeof parsed.enabled !== "boolean" || validateBulkSettings(parsed)) return structuredClone(defaultBulkSettings);
    return migrateBulkSettings(parsed);
  } catch {
    return structuredClone(defaultBulkSettings);
  }
}