import { createFileRoute } from "@tanstack/react-router";
import AdminGuard from "@/components/AdminGuard";
import TelegramTest from "@/pages/TelegramTest";

export const Route = createFileRoute("/admin/telegram-test")({
  head: () => ({
    meta: [
      { title: "Telegram Notifications — Reels Lab" },
      { name: "description", content: "Check administrator notifications for Reels Lab access keys and logins." },
      { property: "og:title", content: "Telegram Notifications — Reels Lab" },
      {
        property: "og:description",
        content: "Verify that key creation, revocation and login alerts reach project administrators.",
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
