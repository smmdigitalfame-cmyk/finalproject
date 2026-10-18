import type { ReelData } from "./mockData";

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
      avgWatchTime: Math.max(5, Math.floor((views > 0 ? 18 : 0))),
      totalPlayTime: Math.floor(views * 0.005),
      reachedAudience: Math.floor(views * 0.8),
      profileVisits: Math.floor(views * 0.03),
      followsFromPost: Math.floor(views * 0.003),
      watchedFull: 70,
      trafficSources: { forYouPage: 70, following: 15, profile: 7, search: 4, sounds: 2, hashtags: 2 },
      audienceRegions: [
        { name: "United States", percentage: 9.1 }, { name: "Nigeria", percentage: 8.2 }, { name: "Indonesia", percentage: 4.4 }, { name: "France", percentage: 3.5 }, { name: "South Africa", percentage: 3.2 }, { name: "Brazil", percentage: 3.1 }, { name: "Ghana", percentage: 3.0 }, { name: "Egypt", percentage: 2.9 }, { name: "Côte d'Ivoire", percentage: 1.9 }, { name: "Colombia", percentage: 1.9 }, { name: "India", percentage: 1.8 },
      ],
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
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-user-posts?username=${encodeURIComponent(
    username.replace(/^@/, "")
  )}&count=${count}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });
  if (!res.ok) {
    let msg = "Failed to fetch posts";
    try {
      const j = await res.json();
      msg = j?.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const json = await res.json();
  const posts: TikTokApiPost[] = json?.posts || [];
  return posts.map((p) => apiPostToReel(p, username));
};
