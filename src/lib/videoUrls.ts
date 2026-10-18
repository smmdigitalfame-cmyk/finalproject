const APIFY_MEDIA_HOST = "api.apify.com";
const APIFY_RECORD_PATH = /^\/v2\/key-value-stores\/[^/]+\/records\/[^/]+$/;

export const isApifyMediaUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === APIFY_MEDIA_HOST && APIFY_RECORD_PATH.test(url.pathname);
  } catch {
    return false;
  }
};

export const playableVideoUrl = (value: string) => {
  if (value.startsWith("/api/public/apify-video?")) {
    return value.replace("/api/public/apify-video?", "/api/public/apify-media?");
  }
  if (!value || !isApifyMediaUrl(value)) return value;
  return `/api/public/apify-media?src=${encodeURIComponent(value)}`;
};