import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isApifyMediaUrl } from "@/lib/videoUrls";

export const Route = createFileRoute("/api/public/apify-media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const parsed = z.string().url().max(2048).safeParse(requestUrl.searchParams.get("src"));
        const source = parsed.success ? parsed.data : "";
        if (!isApifyMediaUrl(source)) return new Response("Invalid video URL", { status: 400 });

        const apiKey = process.env.APIFY_API_KEY;
        if (!apiKey) return new Response("Video service is not configured", { status: 503 });

        const upstreamUrl = new URL(source);
        upstreamUrl.searchParams.delete("token");
        const headers = new Headers({
          Authorization: `Bearer ${apiKey}`,
        });
        const range = request.headers.get("range");
        if (range) headers.set("Range", range);

        const upstream = await fetch(upstreamUrl, { headers, redirect: "error" });
        if (!upstream.ok || !upstream.body) {
          return new Response("Video could not be loaded", { status: upstream.status || 502 });
        }

        const responseHeaders = new Headers();
        for (const name of ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
          const value = upstream.headers.get(name);
          if (value) responseHeaders.set(name, value);
        }
        responseHeaders.set("Cache-Control", "public, max-age=3600");
        responseHeaders.set("Cross-Origin-Resource-Policy", "same-origin");
        responseHeaders.set("X-Content-Type-Options", "nosniff");
        if (!responseHeaders.has("accept-ranges")) responseHeaders.set("Accept-Ranges", "bytes");

        return new Response(upstream.body, {
          status: upstream.status,
          headers: responseHeaders,
        });
      },
    },
  },
});