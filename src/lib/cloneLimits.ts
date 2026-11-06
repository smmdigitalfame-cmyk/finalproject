import { z } from "zod";

/** Hard cap on how many videos one account fetch/clone may return. */
export const MAX_CLONE_VIDEOS = 60;

/** Input shape accepted by the TikTok scraper server function. */
export const scrapeInputSchema = z.object({
  username: z.string().min(1).max(60),
  count: z.number().int().min(1).max(MAX_CLONE_VIDEOS).default(MAX_CLONE_VIDEOS),
});
