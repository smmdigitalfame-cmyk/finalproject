import { createFileRoute } from "@tanstack/react-router";
import AdminGuard from "@/components/AdminGuard";
import TelegramTest from "@/pages/TelegramTest";

export const Route = createFileRoute("/admin/telegram-test")({
  head: () => ({
    meta: [
      { title: "Telegram Notifications — Student Reels Lab" },
      { name: "description", content: "Test project administrator notifications for Student Reels Lab." },
      { property: "og:title", content: "Telegram Notifications — Student Reels Lab" },
      {
        property: "og:description",
        content: "Administrator notification checks for the independent student learning project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TelegramTestPage,
});

function TelegramTestPage() {
  return (
    <AdminGuard>
      <TelegramTest />
    </AdminGuard>
  );
}
