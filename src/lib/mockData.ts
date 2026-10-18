import thumb1 from "@/assets/thumb1.jpg";
import thumb2 from "@/assets/thumb2.jpg";
import thumb3 from "@/assets/thumb3.jpg";
import thumb4 from "@/assets/thumb4.jpg";
import thumb5 from "@/assets/thumb5.jpg";
import thumb6 from "@/assets/thumb6.jpg";
import { playableVideoUrl } from "@/lib/videoUrls";

export interface ReelData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  thumbnail: string;
  videoUrl?: string;
  duration: string;
  createdAt: string;
  music: string;
  musicCover?: string;
  musicHidden?: boolean;
  username: string;
  insights: ReelInsights;
}

export interface ReelInsights {
  views: number;
  newViewerPct?: number;
  nonFollowersPct?: number;
  retentionWatchedPct?: number;
  retentionStopSec?: number;
  retentionCurve?: number[];
  likesCurve?: number[];
  likesAxis?: string[];
  likesFooter?: string[];
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  avgWatchTime: number;
  totalPlayTime: number;
  reachedAudience: number;
  profileVisits: number;
  followsFromPost: number;
  watchedFull: number; // percentage
  trafficSources: {
    forYouPage: number;
    following: number;
    profile: number;
    search: number;
    sounds: number;
    hashtags: number;
  };
  searchQueries?: { query: string; percentage: number }[];
  audienceRegions: { name: string; percentage: number }[];
  viewsByDay: { day: string; views: number; manual?: boolean; xPct?: number }[];
  genderSplit: { male: number; female: number; other: number };
  ageGroups: { range: string; percentage: number }[];
}

const randomTitles = [
  "Morning vibes ☀️", "Night routine 🌙", "GRWM 💄", "Day in my life 📹", "Cooking hack 🍳",
  "Travel vlog ✈️", "Workout session 💪", "Thrift haul 🛍️", "Skincare routine 🧴", "Dance trend 💃",
  "Room makeover 🏠", "Study tips 📚", "Sunset views 🌅", "Coffee time ☕", "Pet moments 🐾",
  "Fashion inspo 👗", "Behind the scenes 🎬", "Quick recipe 🥗", "DIY project 🎨", "Street food 🍜",
  "Productivity tips 📋", "Book review 📖", "Unboxing 📦", "Challenge accepted 🔥", "Life update 💬",
];

const randomThumbs = [thumb1, thumb2, thumb3, thumb4, thumb5, thumb6];

const fallbackInsights = (views = 0): ReelInsights => ({
  views,
  likes: 0,
  comments: 0,
  shares: 0,
  saves: 0,
  avgWatchTime: 18,
  totalPlayTime: Math.floor(views * 0.005),
  reachedAudience: Math.floor(views * 0.8),
  profileVisits: Math.floor(views * 0.03),
  followsFromPost: Math.floor(views * 0.003),
  watchedFull: 70,
  trafficSources: { forYouPage: 70, following: 15, profile: 7, search: 4, sounds: 2, hashtags: 2 },
  searchQueries: [
    { query: "peaky motivation", percentage: 50 },
    { query: "peaky.motivation0", percentage: 25 },
    { query: "peaky moti", percentage: 25 },
  ],
  audienceRegions: [
    { name: "United States", percentage: 9.1 },
    { name: "Nigeria", percentage: 8.2 },
    { name: "Indonesia", percentage: 4.4 },
    { name: "France", percentage: 3.5 },
    { name: "South Africa", percentage: 3.2 },
    { name: "Brazil", percentage: 3.1 },
    { name: "Ghana", percentage: 3.0 },
    { name: "Egypt", percentage: 2.9 },
    { name: "Côte d'Ivoire", percentage: 1.9 },
    { name: "Colombia", percentage: 1.9 },
    { name: "India", percentage: 1.8 },
    { name: "Other", percentage: 57 },
  ],
  viewsByDay: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({
    day,
    views: Math.floor(views * ([0.15, 0.2, 0.18, 0.15, 0.12, 0.1, 0.1][i])),
  })),
  genderSplit: { male: 40, female: 55, other: 5 },
  ageGroups: [
    { range: "13-17", percentage: 15 },
    { range: "18-24", percentage: 45 },
    { range: "25-34", percentage: 25 },
    { range: "35-44", percentage: 10 },
    { range: "45+", percentage: 5 },
  ],
});

export const normalizeReelData = (raw: Partial<ReelData> | null | undefined, index = 0): ReelData => {
  const base = generateRandomReel(index + 1);
  const insights = raw?.insights || fallbackInsights();
  const safeInsights = fallbackInsights(insights.views || 0);
  return {
    ...base,
    ...raw,
    id: String(raw?.id || base.id),
    title: raw?.title || base.title,
    description: raw?.description || "",
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    thumbnail: raw?.thumbnail || base.thumbnail,
    videoUrl: raw?.videoUrl ? playableVideoUrl(raw.videoUrl) : undefined,
    duration: raw?.duration || base.duration,
    createdAt: raw?.createdAt || base.createdAt,
    music: raw?.music || "original sound",
    username: raw?.username || "@priya_creates",
    insights: {
      ...safeInsights,
      ...insights,
      trafficSources: { ...safeInsights.trafficSources, ...insights.trafficSources },
      searchQueries: Array.isArray(insights.searchQueries) && insights.searchQueries.length ? insights.searchQueries : safeInsights.searchQueries,
      audienceRegions: Array.isArray(insights.audienceRegions) && insights.audienceRegions.length ? insights.audienceRegions : safeInsights.audienceRegions,
      viewsByDay: Array.isArray(insights.viewsByDay) && insights.viewsByDay.length ? insights.viewsByDay : safeInsights.viewsByDay,
      genderSplit: { ...safeInsights.genderSplit, ...insights.genderSplit },
      ageGroups: Array.isArray(insights.ageGroups) && insights.ageGroups.length ? insights.ageGroups : safeInsights.ageGroups,
    },
  };
};

export const generateRandomReel = (index: number): ReelData => {
  const id = Date.now().toString() + "_" + index;
  const title = randomTitles[Math.floor(Math.random() * randomTitles.length)];
  const thumbnail = randomThumbs[Math.floor(Math.random() * randomThumbs.length)];
  const views = Math.floor(Math.random() * 5000000) + 10000;
  const likes = Math.floor(views * (Math.random() * 0.15 + 0.02));
  const comments = Math.floor(likes * (Math.random() * 0.1 + 0.01));
  const shares = Math.floor(likes * (Math.random() * 0.2 + 0.05));
  const saves = Math.floor(likes * (Math.random() * 0.5 + 0.1));

  return {
    id,
    title,
    description: `${title} - Check this out! #viral #fyp`,
    tags: ["viral", "fyp", "trending"],
    thumbnail,
    duration: `0:${Math.floor(Math.random() * 50 + 10)}`,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000).toISOString().split("T")[0],
    music: "original sound",
    username: "@priya_creates",
    insights: {
      views, likes, comments, shares, saves,
      avgWatchTime: Math.floor(Math.random() * 40 + 5),
      totalPlayTime: Math.floor(views * 0.005),
      reachedAudience: Math.floor(views * 0.8),
      profileVisits: Math.floor(views * 0.03),
      followsFromPost: Math.floor(views * 0.003),
      watchedFull: 80,
      trafficSources: {
        forYouPage: Math.floor(Math.random() * 40 + 40),
        following: Math.floor(Math.random() * 20 + 5),
        profile: Math.floor(Math.random() * 10 + 2),
        search: Math.floor(Math.random() * 8 + 1),
        sounds: Math.floor(Math.random() * 5),
        hashtags: Math.floor(Math.random() * 5),
      },
      searchQueries: [
        { query: "peaky motivation", percentage: 50 },
        { query: "peaky.motivation0", percentage: 25 },
        { query: "peaky moti", percentage: 25 },
      ],
      audienceRegions: [
        { name: "India", percentage: 35 }, { name: "United States", percentage: 22 }, { name: "United Kingdom", percentage: 12 }, { name: "Pakistan", percentage: 8 }, { name: "Canada", percentage: 5 }, { name: "Australia", percentage: 5 }, { name: "Others", percentage: 13 },
      ],
      viewsByDay: [
        { day: "Mon", views: Math.floor(views * 0.15) }, { day: "Tue", views: Math.floor(views * 0.2) },
        { day: "Wed", views: Math.floor(views * 0.18) }, { day: "Thu", views: Math.floor(views * 0.15) },
        { day: "Fri", views: Math.floor(views * 0.12) }, { day: "Sat", views: Math.floor(views * 0.1) },
        { day: "Sun", views: Math.floor(views * 0.1) },
      ],
      genderSplit: { male: 40, female: 55, other: 5 },
      ageGroups: [
        { range: "13-17", percentage: 15 }, { range: "18-24", percentage: 45 },
        { range: "25-34", percentage: 25 }, { range: "35-44", percentage: 10 }, { range: "45+", percentage: 5 },
      ],
    },
  };
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

// Views display: actual views stay exact in storage; display steps up by 0.1K
// every 50 views past the thousand mark (1050-1149→1.1K, 1150-1249→1.2K, 1950+→2.0K).
export const formatViewsDisplay = (num: number): string => {
  if (num >= 1000000) return (Math.floor((num + 50000) / 100000) / 10).toFixed(1) + "M";
  if (num >= 1000) return (Math.floor((num + 50) / 100) / 10).toFixed(1) + "K";
  return num.toString();
};

export const generateMockReels = (): ReelData[] => [
  {
    id: "1",
    title: "Morning routine 2024 ✨",
    description: "My productive morning routine that changed my life! Follow for more tips 🌅",
    tags: ["morningroutine", "productivity", "lifestyle", "viral"],
    thumbnail: thumb1,
    duration: "0:32",
    createdAt: "2024-12-15",
    music: "original sound - priya_creates",
    username: "@priya_creates",
    insights: {
      views: 1240000, likes: 89400, comments: 3200, shares: 12500, saves: 45000,
      avgWatchTime: 24, totalPlayTime: 8267, reachedAudience: 980000,
      profileVisits: 34000, followsFromPost: 2800,
      watchedFull: 80,
      trafficSources: { forYouPage: 72, following: 12, profile: 8, search: 4, sounds: 2, hashtags: 2 },
      audienceRegions: [
        { name: "India", percentage: 35 }, { name: "United States", percentage: 22 }, { name: "United Kingdom", percentage: 12 }, { name: "Canada", percentage: 8 }, { name: "Australia", percentage: 5 }, { name: "Germany", percentage: 5 }, { name: "Others", percentage: 13 },
      ],
      viewsByDay: [
        { day: "Mon", views: 180000 }, { day: "Tue", views: 320000 }, { day: "Wed", views: 280000 },
        { day: "Thu", views: 190000 }, { day: "Fri", views: 120000 }, { day: "Sat", views: 90000 }, { day: "Sun", views: 60000 },
      ],
      genderSplit: { male: 38, female: 58, other: 4 },
      ageGroups: [
        { range: "13-17", percentage: 12 }, { range: "18-24", percentage: 42 },
        { range: "25-34", percentage: 28 }, { range: "35-44", percentage: 12 }, { range: "45+", percentage: 6 },
      ],
    },
  },
  {
    id: "2",
    title: "Recipe: 5 min pasta 🍝",
    description: "The easiest pasta recipe you'll ever make! Save this for later 😋",
    tags: ["recipe", "pasta", "cooking", "food"],
    thumbnail: thumb2,
    duration: "0:45",
    createdAt: "2024-12-18",
    music: "Cupid - Twin Ver.",
    username: "@priya_creates",
    insights: {
      views: 560000, likes: 42000, comments: 1800, shares: 8900, saves: 67000,
      avgWatchTime: 38, totalPlayTime: 5911, reachedAudience: 420000,
      profileVisits: 12000, followsFromPost: 1500, watchedFull: 75,
      trafficSources: { forYouPage: 65, following: 18, profile: 5, search: 7, sounds: 3, hashtags: 2 },
      audienceRegions: [
        { name: "India", percentage: 28 }, { name: "United States", percentage: 25 }, { name: "Brazil", percentage: 15 }, { name: "Germany", percentage: 10 }, { name: "Canada", percentage: 5 }, { name: "Australia", percentage: 5 }, { name: "Others", percentage: 12 },
      ],
      viewsByDay: [
        { day: "Mon", views: 80000 }, { day: "Tue", views: 95000 }, { day: "Wed", views: 120000 },
        { day: "Thu", views: 100000 }, { day: "Fri", views: 75000 }, { day: "Sat", views: 50000 }, { day: "Sun", views: 40000 },
      ],
      genderSplit: { male: 32, female: 64, other: 4 },
      ageGroups: [
        { range: "13-17", percentage: 8 }, { range: "18-24", percentage: 35 },
        { range: "25-34", percentage: 38 }, { range: "35-44", percentage: 14 }, { range: "45+", percentage: 5 },
      ],
    },
  },
  {
    id: "3",
    title: "Dance challenge 💃🔥",
    description: "Tried this trending dance! How did I do? 😂 #dancechallenge",
    tags: ["dance", "challenge", "trending", "fyp"],
    thumbnail: thumb3,
    duration: "0:18",
    createdAt: "2024-12-20",
    music: "Espresso - Sabrina Carpenter",
    username: "@priya_creates",
    insights: {
      views: 3200000, likes: 245000, comments: 8900, shares: 34000, saves: 12000,
      avgWatchTime: 15, totalPlayTime: 13333, reachedAudience: 2800000,
      profileVisits: 89000, followsFromPost: 7800, watchedFull: 65,
      trafficSources: { forYouPage: 82, following: 8, profile: 3, search: 2, sounds: 4, hashtags: 1 },
      audienceRegions: [
        { name: "United States", percentage: 30 }, { name: "India", percentage: 25 }, { name: "Philippines", percentage: 12 }, { name: "Indonesia", percentage: 10 }, { name: "Canada", percentage: 5 }, { name: "Australia", percentage: 5 }, { name: "Others", percentage: 13 },
      ],
      viewsByDay: [
        { day: "Mon", views: 500000 }, { day: "Tue", views: 800000 }, { day: "Wed", views: 650000 },
        { day: "Thu", views: 480000 }, { day: "Fri", views: 380000 }, { day: "Sat", views: 240000 }, { day: "Sun", views: 150000 },
      ],
      genderSplit: { male: 45, female: 50, other: 5 },
      ageGroups: [
        { range: "13-17", percentage: 25 }, { range: "18-24", percentage: 45 },
        { range: "25-34", percentage: 20 }, { range: "35-44", percentage: 7 }, { range: "45+", percentage: 3 },
      ],
    },
  },
  {
    id: "4",
    title: "Outfit of the day 👗",
    description: "Winter outfit inspo! Everything linked in bio ❄️✨",
    tags: ["ootd", "fashion", "winter", "style"],
    thumbnail: thumb4,
    duration: "0:22",
    createdAt: "2024-12-22",
    music: "original sound - fashionista",
    username: "@priya_creates",
    insights: {
      views: 780000, likes: 56000, comments: 2400, shares: 15000, saves: 89000,
      avgWatchTime: 19, totalPlayTime: 4117, reachedAudience: 620000,
      profileVisits: 28000, followsFromPost: 3200, watchedFull: 82,
      trafficSources: { forYouPage: 58, following: 22, profile: 10, search: 5, sounds: 1, hashtags: 4 },
      audienceRegions: [
        { name: "United States", percentage: 32 }, { name: "United Kingdom", percentage: 18 }, { name: "India", percentage: 15 }, { name: "Australia", percentage: 10 }, { name: "Canada", percentage: 5 }, { name: "Germany", percentage: 5 }, { name: "Others", percentage: 15 },
      ],
      viewsByDay: [
        { day: "Mon", views: 110000 }, { day: "Tue", views: 140000 }, { day: "Wed", views: 160000 },
        { day: "Thu", views: 130000 }, { day: "Fri", views: 100000 }, { day: "Sat", views: 80000 }, { day: "Sun", views: 60000 },
      ],
      genderSplit: { male: 22, female: 74, other: 4 },
      ageGroups: [
        { range: "13-17", percentage: 15 }, { range: "18-24", percentage: 48 },
        { range: "25-34", percentage: 25 }, { range: "35-44", percentage: 9 }, { range: "45+", percentage: 3 },
      ],
    },
  },
  {
    id: "5",
    title: "Study with me 📚",
    description: "3 hour study session condensed! Let's ace those exams 💪",
    tags: ["studywithme", "study", "motivation"],
    thumbnail: thumb5,
    duration: "0:55",
    createdAt: "2024-12-25",
    music: "Lo-fi beats - ChillHop",
    username: "@priya_creates",
    insights: {
      views: 420000, likes: 31000, comments: 1200, shares: 5600, saves: 52000,
      avgWatchTime: 42, totalPlayTime: 4900, reachedAudience: 350000,
      profileVisits: 9800, followsFromPost: 1100, watchedFull: 88,
      trafficSources: { forYouPage: 55, following: 25, profile: 8, search: 8, sounds: 1, hashtags: 3 },
      audienceRegions: [
        { name: "India", percentage: 40 }, { name: "United States", percentage: 18 }, { name: "United Kingdom", percentage: 10 }, { name: "South Korea", percentage: 8 }, { name: "Canada", percentage: 5 }, { name: "Australia", percentage: 5 }, { name: "Others", percentage: 14 },
      ],
      viewsByDay: [
        { day: "Mon", views: 70000 }, { day: "Tue", views: 65000 }, { day: "Wed", views: 75000 },
        { day: "Thu", views: 60000 }, { day: "Fri", views: 55000 }, { day: "Sat", views: 50000 }, { day: "Sun", views: 45000 },
      ],
      genderSplit: { male: 40, female: 55, other: 5 },
      ageGroups: [
        { range: "13-17", percentage: 22 }, { range: "18-24", percentage: 50 },
        { range: "25-34", percentage: 18 }, { range: "35-44", percentage: 7 }, { range: "45+", percentage: 3 },
      ],
    },
  },
  {
    id: "6",
    title: "My puppy 🐶❤️",
    description: "My dog being the cutest ever! Part 47 🥰",
    tags: ["pets", "dog", "cute", "animals"],
    thumbnail: thumb6,
    duration: "0:28",
    createdAt: "2024-12-28",
    music: "Happy - Pharrell Williams",
    username: "@priya_creates",
    insights: {
      views: 2100000, likes: 198000, comments: 7200, shares: 45000, saves: 32000,
      avgWatchTime: 26, totalPlayTime: 15167, reachedAudience: 1800000,
      profileVisits: 56000, followsFromPost: 5400, watchedFull: 78,
      trafficSources: { forYouPage: 78, following: 10, profile: 4, search: 3, sounds: 2, hashtags: 3 },
      audienceRegions: [
        { name: "United States", percentage: 35 }, { name: "India", percentage: 20 }, { name: "Japan", percentage: 12 }, { name: "Brazil", percentage: 10 }, { name: "Canada", percentage: 5 }, { name: "Australia", percentage: 5 }, { name: "Others", percentage: 13 },
      ],
      viewsByDay: [
        { day: "Mon", views: 300000 }, { day: "Tue", views: 450000 }, { day: "Wed", views: 380000 },
        { day: "Thu", views: 350000 }, { day: "Fri", views: 280000 }, { day: "Sat", views: 200000 }, { day: "Sun", views: 140000 },
      ],
      genderSplit: { male: 35, female: 60, other: 5 },
      ageGroups: [
        { range: "13-17", percentage: 18 }, { range: "18-24", percentage: 38 },
        { range: "25-34", percentage: 25 }, { range: "35-44", percentage: 12 }, { range: "45+", percentage: 7 },
      ],
    },
  },
];
