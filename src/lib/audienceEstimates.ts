import type { ReelInsights } from "./mockData";

type Regions = ReelInsights["audienceRegions"];

export const defaultAudienceRegions: Regions = [
  { name: "United States", percentage: 48 },
  { name: "United Kingdom", percentage: 19 },
  { name: "Singapore", percentage: 12 },
  { name: "Saudi Arabia", percentage: 9 },
  { name: "Canada", percentage: 6 },
  { name: "Australia", percentage: 4 },
  { name: "France", percentage: 2 },
];

function seedFor(text: string): number {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
  seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
  seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
  return (seed ^ (seed >>> 16)) >>> 0;
}

// Transfers involve every country, including the final country in odd-sized lists.
// Bounds refer to the customer's base, not the previous transfer's result.
export function estimateAudienceRegions(id: string, views: number, base: Regions = defaultAudienceRegions, variation = 4): Regions {
  const regions = base.map(region => ({ name: region.name.trim(), percentage: region.percentage }));
  if (variation === 0 || regions.length < 2) return regions;
  const units = 1000000;
  const original = regions.map(region => Math.round(region.percentage * units));
  const values = [...original];
  const range = Math.round(variation * units);
  const order = regions.map((region, index) => ({ index, seed: seedFor(`${id}:${views}:country-order:${region.name}`) }))
    .sort((a, b) => a.seed - b.seed).map(item => item.index);
  for (let step = 0; step < order.length; step++) {
    const i = order[step], j = order[(step + 1) % order.length];
    if (i === undefined || j === undefined || i === j) continue;
    const first = values[i] ?? 0, second = values[j] ?? 0;
    const firstBase = original[i] ?? 0, secondBase = original[j] ?? 0;
    const low = Math.ceil(Math.max(0 - first, firstBase - range - first, second - 100 * units, second - secondBase - range) / (units / 10));
    const high = Math.floor(Math.min(100 * units - first, firstBase + range - first, second, second - secondBase + range) / (units / 10));
    if (low > high) continue;
    const seed = seedFor(`${id}:${views}:country-transfer:${regions[i]?.name}:${regions[j]?.name}`);
    const delta = (low + seed % (high - low + 1)) * (units / 10);
    values[i] = first + delta;
    values[j] = second - delta;
  }
  return regions.map((region, index) => ({ ...region, percentage: (values[index] ?? 0) / units }));
}

const legacyNames = ["United States", "Nigeria", "Indonesia", "France", "South Africa", "Brazil", "Ghana", "Egypt", "Côte d'Ivoire", "Colombia", "India"];
const legacyPercentages = [9.1, 8.2, 4.4, 3.5, 3.2, 3.1, 3, 2.9, 1.9, 1.9, 1.8];

// Replace only an exact obsolete generated default; never overwrite edited countries.
export function refreshLegacyAudienceRegions(id: string, views: number, regions: Regions): Regions {
  const legacy = (regions.length === 11 || regions.length === 12)
    && legacyNames.every((name, index) => regions[index]?.name === name && regions[index]?.percentage === legacyPercentages[index])
    && (regions.length === 11 || (regions[11]?.name === "Other" && regions[11]?.percentage === 57));
  return !regions.length || legacy ? estimateAudienceRegions(id, views) : regions;
}