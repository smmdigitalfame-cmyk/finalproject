import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { playableVideoUrl } from "@/lib/videoUrls";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/apify";
const ACTOR_ID = "clockworks~tiktok-scraper";
const RAPID_HOST = "tiktok-scraper7.p.rapidapi.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const emptyProfile = (username: string) => ({
  username,
  displayName: "",
  bio: "",
  followers: 0,
  following: 0,
  verified: false,
  bioLink: "",
  region: "",
  avatar: "",
});

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

const formatPostedDate = (timestampMs: number) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestampMs));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

// TikTok embeds the original publish timestamp in the upper 32 bits of every
// video ID. Prefer it over scraper metadata, which can occasionally report the
// scrape date instead of the video's real publish date.
const getPostedDate = (videoId: unknown, scraperTimestamp: unknown) => {
  try {
    const seconds = Number(BigInt(String(videoId)) >> 32n);
    const earliestTikTokMs = Date.UTC(2016, 0, 1);
    const latestReasonableMs = Date.now() + 24 * 60 * 60 * 1000;
    const timestampMs = seconds * 1000;
    if (timestampMs >= earliestTikTokMs && timestampMs <= latestReasonableMs) {
      return formatPostedDate(timestampMs);
    }
  } catch {
    // Fall through to the scraper timestamp for non-standard IDs.
  }

  const numeric = Number(scraperTimestamp);
  const parsedMs = Number.isFinite(numeric)
    ? numeric * (numeric < 10_000_000_000 ? 1000 : 1)
    : Date.parse(String(scraperTimestamp || ""));
  return Number.isFinite(parsedMs) ? formatPostedDate(parsedMs) : formatPostedDate(Date.now());
};

const extractTags = (text: string) =>
  (text.match(/#[\w\u00C0-\u024F]+/g) || []).map((t) => t.slice(1));

const firstUrl = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.find((item) => typeof item === "string") || "";
  return "";
};

const cleanUsername = (value: string) => {
  const trimmed = value.trim();
  const profileMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([^/?#]+)/i);
  return decodeURIComponent(profileMatch?.[1] || trimmed).replace(/^@+/, "").replace(/\/+$/, "").trim();
};

// ---------- Zyla Labs (TikTok Data Extractor) — primary: fast, direct video URLs ----------
const ZYLA_BASE = "https://zylalabs.com/api/9892/tiktok+data+extractor+api";

const scrapeViaZyla = async (username: string, count: number) => {
  const key = process.env.ZYLA_API_KEY?.split(/[\n,]/).map((item) => item.trim()).find(Boolean);
  if (!key) throw new Error("no-key");
  const headers = { Authorization: `Bearer ${key}` };

  const [infoRes, postsRes] = await Promise.all([
    fetch(`${ZYLA_BASE}/18616/user+details?username=${encodeURIComponent(username)}`, { headers }),
    fetch(`${ZYLA_BASE}/18615/user+videos?username=${encodeURIComponent(username)}`, { headers }),
  ]);
  if (!infoRes.ok) throw new Error(`info-${infoRes.status}`);
  const user = await infoRes.json();
  const resolvedUsername = user?.username;
  if (!resolvedUsername) throw new Error("user-not-found");

  if (!postsRes.ok) throw new Error(`posts-${postsRes.status}`);
  const postsData = await postsRes.json();
  const videos: any[] = Array.isArray(postsData?.videos) ? postsData.videos : [];
  const valid = videos
    .map((v) => ({
      ...v,
      resolvedPlay: firstUrl(v?.unwatermarked_download_url) || firstUrl(v?.download_url),
    }))
    .filter((v) => v?.video_id && v?.resolvedPlay)
    .slice(0, count);
  // A resolved account with an explicit zero video count is a valid empty
  // profile, not a scraping outage. Keep fallbacks for missing/incomplete feeds.
  if (!valid.length && !(videos.length === 0 && user.total_videos === 0)) {
    throw new Error("no-videos");
  }

  const profile = {
    username: resolvedUsername,
    displayName: user.nickname || "",
    bio: user.description || "",
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    verified: !!user.verified,
    bioLink: user.bio_link || "",
    region: user.region || "",
    avatar: user.profile_image || "",
  };
  const posts = valid.map((v) => ({
    id: String(v.video_id),
    title: v.description || "",
    description: v.description || "",
    thumbnail: playableVideoUrl(firstUrl(v.cover)),
    videoUrl: playableVideoUrl(v.resolvedPlay),
    duration: formatDuration(v.duration ?? 0),
    createdAt: getPostedDate(v.video_id, v.create_time),
    music: v.music?.title || "original sound",
    musicCover: playableVideoUrl(firstUrl(v.music?.cover) || firstUrl(v.avatar_thumb)),
    tags: extractTags(v.description || ""),
    stats: {
      views: v.statistics?.number_of_plays || 0,
      likes: v.statistics?.number_of_hearts || 0,
      comments: v.statistics?.number_of_comments || 0,
      shares: v.statistics?.number_of_reposts || 0,
      saves: v.statistics?.number_of_saves || 0,
      downloads: 0,
    },
  }));
  return { profile, posts, error: null as string | null };
};

// ---------- RapidAPI (tiktok-scraper7) — fallback: fast, direct video URLs ----------
const scrapeViaRapid = async (username: string, count: number) => {
  const key = process.env.RAPIDAPI_KEY?.split(/[\n,]/).map((item) => item.trim()).find(Boolean);
  if (!key) throw new Error("no-key");
  const headers = { "X-RapidAPI-Key": key, "X-RapidAPI-Host": RAPID_HOST };

  const infoRes = await fetch(
    `https://${RAPID_HOST}/user/info?unique_id=${encodeURIComponent(username)}`,
    { headers },
  );
  if (!infoRes.ok) throw new Error(`info-${infoRes.status}`);
  const info = await infoRes.json();
  const user = info?.data?.user || info?.data?.userInfo?.user || info?.data?.user_info?.user || info?.user;
  const resolvedUsername = user?.uniqueId || user?.unique_id || user?.unique_id_str;
  if (!user || !resolvedUsername) throw new Error("user-not-found");
  const stats = info?.data?.stats || info?.data?.userInfo?.stats || info?.data?.user_info?.stats || info?.stats || {};

  const postsRes = await fetch(
    `https://${RAPID_HOST}/user/posts?unique_id=${encodeURIComponent(username)}&count=${count}&cursor=0`,
    { headers },
  );
  if (!postsRes.ok) throw new Error(`posts-${postsRes.status}`);
  const postsData = await postsRes.json();
  const videos: any[] = Array.isArray(postsData?.data)
    ? postsData.data
    : postsData?.data?.videos || postsData?.data?.aweme_list || postsData?.videos || postsData?.aweme_list || [];
  const valid = videos
    .map((v) => ({
      ...v,
      aweme_id: v?.video_id || v?.aweme_id || v?.id,
      resolvedPlay: firstUrl(v?.play) || firstUrl(v?.wmplay) || firstUrl(v?.video?.play_addr?.url_list) || firstUrl(v?.video?.download_addr?.url_list),
    }))
    .filter((v) => v?.aweme_id && v?.resolvedPlay);
  if (!valid.length) throw new Error("no-videos");

  const profile = {
    username: resolvedUsername,
    displayName: user.nickname || "",
    bio: user.signature || "",
    followers: stats.followerCount ?? 0,
    following: stats.followingCount ?? 0,
    verified: !!user.verified,
    bioLink: user.bioLink || "",
    region: user.region || "",
    avatar: user.avatarLarger || user.avatarMedium || user.avatarThumb || "",
  };
  const posts = valid.map((v) => ({
    id: String(v.aweme_id),
    title: v.title || "",
    description: v.title || "",
    thumbnail: playableVideoUrl(firstUrl(v.cover) || firstUrl(v.origin_cover) || firstUrl(v?.video?.cover?.url_list)),
    videoUrl: playableVideoUrl(v.resolvedPlay),
    duration: formatDuration(v.duration ?? v?.video?.duration ?? 0),
    createdAt: getPostedDate(v.aweme_id, v.create_time),
    music: v.music_info?.title || v.music?.title || "original sound",
    musicCover: playableVideoUrl(firstUrl(v.music_info?.cover) || firstUrl(v?.music?.cover_large?.url_list) || firstUrl(v?.music?.cover_medium?.url_list)),
    tags: extractTags(v.title || ""),
    stats: {
      views: v.play_count || 0,
      likes: v.digg_count || 0,
      comments: v.comment_count || 0,
      shares: v.share_count || 0,
      saves: v.collect_count || 0,
      downloads: v.download_count || 0,
    },
  }));
  return { profile, posts, error: null as string | null };
};

// ---------- Apify fallback — async run + poll (slow but reliable) ----------
const scrapeViaApify = async (username: string, count: number) => {
  const lov = process.env.LOVABLE_API_KEY;
  const key = process.env.APIFY_API_KEY;
  if (!lov || !key) throw new Error("Scraping key is not configured");
  const headers = {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": key,
    "Content-Type": "application/json",
  };

  // Start an async Actor run — sync mode times out (502) when downloading many videos.
  const startRes = await fetch(`${GATEWAY_URL}/acts/${ACTOR_ID}/runs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      profiles: [username],
      resultsPerPage: count,
      shouldDownloadVideos: true,
      shouldDownloadCovers: true,
    }),
  });
  if (!startRes.ok) {
    const t = await startRes.text();
    console.error(`Apify run start failed [${startRes.status}]: ${t}`);
    return {
      error: startRes.status === 429 ? "Rate limited, try again shortly." : "TikTok is temporarily unavailable. Please retry.",
      profile: emptyProfile(username),
      posts: [],
    };
  }
  const runData = (await startRes.json())?.data;
  const runId: string | undefined = runData?.id;
  const datasetId: string | undefined = runData?.defaultDatasetId;
  if (!runId || !datasetId) {
    return { error: "Scraper could not be started. Please retry.", profile: emptyProfile(username), posts: [] };
  }

  // Poll run status until terminal (slow interval; stop on 4xx or failure).
  let status = runData.status as string;
  for (let i = 0; i < 28 && !["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status); i++) {
    await sleep(3000);
    const stRes = await fetch(`${GATEWAY_URL}/actor-runs/${runId}`, { headers });
    if (!stRes.ok) {
      if (stRes.status >= 400 && stRes.status < 500) break; // won't recover
      continue; // transient 5xx — keep polling
    }
    status = (await stRes.json())?.data?.status || status;
  }
  if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
    return { error: "Scraping failed. Please retry.", profile: emptyProfile(username), posts: [] };
  }

  // Read whatever the dataset has (full set if SUCCEEDED, partial if still running).
  const itemsRes = await fetch(`${GATEWAY_URL}/datasets/${datasetId}/items?limit=${count}`, { headers });
  if (!itemsRes.ok) {
    const t = await itemsRes.text();
    console.error(`Apify dataset read failed [${itemsRes.status}]: ${t}`);
    return { error: "TikTok is temporarily unavailable. Please retry.", profile: emptyProfile(username), posts: [] };
  }
  const items: any[] = await itemsRes.json();
  const valid = items.filter((i) => i?.authorMeta && i?.id);
  if (!valid.length) {
    return { error: "User not found. Double-check the username.", profile: emptyProfile(username), posts: [] };
  }
  const a = valid[0].authorMeta;
  const profile = {
    username: a.name || username,
    displayName: a.nickName || "",
    bio: a.signature || "",
    followers: a.fans ?? 0,
    following: a.following ?? 0,
    verified: !!a.verified,
    bioLink: a.bioLink || "",
    region: a.region || "",
    avatar: a.avatar || "",
  };
  const posts = valid.map((p) => {
    const d = p.videoMeta?.duration ?? 0;
    const directVideoUrl =
      p.mediaUrls?.[0] ||
      p.videoMeta?.downloadAddr ||
      p.videoMeta?.playAddr ||
      p.videoUrl ||
      "";
    return {
      id: String(p.id),
      title: p.text || "",
      description: p.text || "",
      thumbnail: playableVideoUrl(p.videoMeta?.coverUrl || p.videoMeta?.originalCoverUrl || ""),
      videoUrl: playableVideoUrl(directVideoUrl),
      duration: `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`,
      createdAt: getPostedDate(p.id, p.createTimeISO || p.createTime),
      music: p.musicMeta?.musicName || "original sound",
      musicCover: playableVideoUrl(p.musicMeta?.coverLargeUrl || p.musicMeta?.coverMediumUrl || p.musicMeta?.coverThumbUrl || p.musicMeta?.coverUrl || ""),
      tags: (p.hashtags || []).map((h: any) => h?.name).filter(Boolean),
      stats: {
        views: p.playCount || 0,
        likes: p.diggCount || 0,
        comments: p.commentCount || 0,
        shares: p.shareCount || 0,
        saves: p.collectCount || 0,
        downloads: 0,
      },
    };
  });
  return { profile, posts, error: null };
};

export const scrapeTikTok = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ username: z.string().min(1).max(60), count: z.number().int().min(1).max(35).default(30) }).parse(d),
  )
  .handler(async ({ data }) => {
    const username = cleanUsername(data.username);
    if (!username) {
      return { error: "Enter a valid TikTok username.", profile: emptyProfile(""), posts: [] };
    }

    // Primary: Zyla Labs — seconds instead of minutes, direct playable URLs.
    let primaryFailure = "";
    let zylaFailure = "";
    try {
      return await scrapeViaZyla(username, data.count);
    } catch (e: any) {
      zylaFailure = String(e?.message || e);
      primaryFailure = zylaFailure;
      console.error(`Zyla scrape failed, falling back to RapidAPI: ${zylaFailure}`);
    }

    // Fallback 1: RapidAPI
    try {
      return await scrapeViaRapid(username, data.count);
    } catch (e: any) {
      primaryFailure = String(e?.message || e);
      console.error(`RapidAPI scrape failed, falling back to Apify: ${primaryFailure}`);
    }

    // Both fast sources answered and agree the account does not exist.
    const notFound = (f: string) => f === "user-not-found";
    const userMissing = notFound(zylaFailure) && notFound(primaryFailure);

    // Fallback: Apify
    try {
      const res = await scrapeViaApify(username, data.count);
      if (res.error && userMissing) {
        return { error: "User not found. Double-check the username.", profile: emptyProfile(username), posts: [] };
      }
      return res;
    } catch (e: any) {
      const apifyFailure = String(e?.message || e);
      console.error(`Apify scrape failed: ${apifyFailure}`);
      if (userMissing) {
        return { error: "User not found. Double-check the username.", profile: emptyProfile(username), posts: [] };
      }
      if (primaryFailure.includes("429") && apifyFailure === "Scraping key is not configured") {
        return {
          error: "TikTok scraping limit reached. Please retry later.",
          profile: emptyProfile(username),
          posts: [],
        };
      }
      return { error: "TikTok is temporarily unavailable. Please retry.", profile: emptyProfile(username), posts: [] };
    }
  });
