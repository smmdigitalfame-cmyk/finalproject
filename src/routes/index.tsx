import { createFileRoute } from "@tanstack/react-router";
import KeyGuard from "@/components/KeyGuard";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Reels Lab — Videos & Educational Insights" },
      {
        name: "description",
        content:
          "Independent student demo for short videos and locally edited or estimated insights, not official TikTok analytics. No fees charged.",
      },
      { property: "og:title", content: "Student Reels Lab — Videos & Educational Insights" },
      {
        property: "og:description",
        content: "Student learning project with edited and estimated analytics. Not affiliated with TikTok.",
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
