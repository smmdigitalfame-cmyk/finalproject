import { createFileRoute } from "@tanstack/react-router";
import AdminGuard from "@/components/AdminGuard";
import AdminSettings from "@/pages/AdminSettings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Admin Settings — Reels Lab" },
      { name: "description", content: "Manage Reels Lab access keys, project settings and notifications." },
      { property: "og:title", content: "Admin Settings — Reels Lab" },
      { property: "og:description", content: "Access key management and project settings for the Reels Lab workspace." },
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
