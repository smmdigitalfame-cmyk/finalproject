import { createFileRoute } from "@tanstack/react-router";
import AdminGuard from "@/components/AdminGuard";
import AdminSettings from "@/pages/AdminSettings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Admin Settings — Student Reels Lab" },
      { name: "description", content: "Manage the independent Student Reels Lab educational project." },
      { property: "og:title", content: "Admin Settings — Student Reels Lab" },
      { property: "og:description", content: "Administration for the independent student learning project, not an official TikTok service." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <AdminGuard>
      <AdminSettings />
    </AdminGuard>
  );
}
