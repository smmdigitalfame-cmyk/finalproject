import type { ReelData } from "./mockData";
import { scrapeTikTok } from "./tiktok.functions";
import { parseDuration } from "./utils";
import { estimateAudienceRegions } from "./audienceEstimates";
import { orderedAudienceRegions } from "./bulkInsights";

export interface TikTokApiPost {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  createdAt: string;
  music: string;
  musicCover?: string;
  tags: string[];
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    downloads: number;
  };
}

/**
 * Convert a TikTok API post into the app's ReelData shape so it slots into the
 * existing UI/insights without changing component contracts.
 */
export const apiPostToReel = (p: TikTokApiPost, username: string): ReelData => {
  const views = p.stats.views || 0;
  const likes = p.stats.likes || 0;
  const comments = p.stats.comments || 0;
  const shares = p.stats.shares || 0;
  const saves = p.stats.saves || 0;
  // Average watch time is a random-looking value between 5.8 and 7.4 seconds,
  // seeded by the video id so repeat clones keep the same value.
  const durationSec = parseDuration(p.duration);
  const seed = p.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const watchSeconds = 5.8 + ((seed % 100) / 100) * 1.6;
  const avgWatchTime = views > 0 && durationSec > 0 ? Math.min(durationSec, Math.round(watchSeconds * 10) / 10) : 0;
  return {
    id: p.id,
    title: p.title || p.description || "",
    description: p.description || p.title || "",
    tags: p.tags || [],
    thumbnail: p.thumbnail,
    videoUrl: p.videoUrl,
    duration: p.duration,
    createdAt: p.createdAt,
    music: p.music || "original sound",
    musicCover: p.musicCover || undefined,
    username: `@${username.replace(/^@/, "")}`,
    insights: {
      views,
      likes,
      comments,
      shares,
      saves,
      avgWatchTime,
      totalPlayTime: Math.floor(views * 0.005),
      reachedAudience: Math.floor(views * 0.8),
      profileVisits: Math.floor(views * 0.03),
      followsFromPost: Math.floor(views * 0.003),
      watchedFull: 70,
      trafficSources: { forYouPage: 70, following: 15, profile: 7, search: 4, sounds: 2, hashtags: 2 },
      audienceRegions: orderedAudienceRegions(estimateAudienceRegions(p.id, views), p.id).map(({ region }) => region),
      viewsByDay: [
        { day: "Mon", views: Math.floor(views * 0.15) },
        { day: "Tue", views: Math.floor(views * 0.2) },
        { day: "Wed", views: Math.floor(views * 0.18) },
        { day: "Thu", views: Math.floor(views * 0.15) },
        { day: "Fri", views: Math.floor(views * 0.12) },
        { day: "Sat", views: Math.floor(views * 0.1) },
        { day: "Sun", views: Math.floor(views * 0.1) },
      ],
      genderSplit: { male: 40, female: 55, other: 5 },
      ageGroups: [
        { range: "13-17", percentage: 15 },
        { range: "18-24", percentage: 45 },
        { range: "25-34", percentage: 25 },
        { range: "35-44", percentage: 10 },
        { range: "45+", percentage: 5 },
      ],
    },
  };
};

export const fetchTikTokPosts = async (
  username: string,
  count = 30
): Promise<ReelData[]> => {
  const result = await scrapeTikTok({ data: { username, count } });
  if (result.error) throw new Error(result.error);
  const posts: TikTokApiPost[] = result.posts || [];
  return posts.map((p) => apiPostToReel(p, username));
};
