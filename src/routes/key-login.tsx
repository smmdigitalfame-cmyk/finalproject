import { createFileRoute } from "@tanstack/react-router";
import KeyLogin from "@/pages/KeyLogin";

export const Route = createFileRoute("/key-login")({
  head: () => ({
    meta: [
      { title: "Project Access — Reels Lab" },
      {
        name: "description",
        content: "Sign in to Reels Lab with a project access key.",
      },
      { property: "og:title", content: "Project Access — Reels Lab" },
      {
        property: "og:description",
        content: "Enter your project access key to open the Reels Lab workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KeyLogin,
});
