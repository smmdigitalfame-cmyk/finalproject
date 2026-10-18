import { createFileRoute } from "@tanstack/react-router";
import KeyGuard from "@/components/KeyGuard";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Videos & Insights — Reels Lab" },
      {
        name: "description",
        content:
          "Browse cloned short videos, edit reel details, and review watch-time, retention and audience insights in one workspace.",
      },
      { property: "og:title", content: "Videos & Insights — Reels Lab" },
      {
        property: "og:description",
        content: "Your cloned short videos with editable details and per-reel watch-time, retention and audience breakdowns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <KeyGuard>
      <Index />
    </KeyGuard>
  );
}
