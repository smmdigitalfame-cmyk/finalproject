import type { ReelData } from "./mockData";
import { scrapeTikTok } from "./tiktok.functions";
import { organicAgeGroups, organicAudienceRegions, organicAvgWatchTime, organicTotalPlayTime, organicViewsByDay, organicWatchedFull } from "./organicInsights";

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
      avgWatchTime: organicAvgWatchTime(p.id),
      totalPlayTime: organicTotalPlayTime(p.id),
      reachedAudience: Math.floor(views * 0.8),
      profileVisits: Math.floor(views * 0.03),
      followsFromPost: Math.floor(views * 0.003),
      watchedFull: organicWatchedFull(p.id),
      trafficSources: { forYouPage: 70, following: 15, profile: 7, search: 4, sounds: 2, hashtags: 2 },
      audienceRegions: organicAudienceRegions(p.id),
      viewsByDay: organicViewsByDay(p.id, views),
      genderSplit: { male: 40, female: 55, other: 5 },
      ageGroups: organicAgeGroups(p.id),
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
