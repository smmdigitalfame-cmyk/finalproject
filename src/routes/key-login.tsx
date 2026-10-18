import { createFileRoute } from "@tanstack/react-router";
import KeyLogin from "@/pages/KeyLogin";

export const Route = createFileRoute("/key-login")({
  head: () => ({
    meta: [
      { title: "Project Access — Student Reels Lab" },
      {
        name: "description",
        content: "Access the independent student learning project using a project key, never a TikTok password. No fees charged.",
      },
      { property: "og:title", content: "Project Access — Student Reels Lab" },
      {
        property: "og:description",
        content: "Independent educational demo with project-key access. Not an official TikTok login.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KeyLogin,
});
