import { Search, Link2, Users, Heart, MessageSquare, Music, User } from "lucide-react";
import avatar from "@/assets/avatar.jpg";

const stories = [
  { id: "create", label: "Create", isCreate: true },
  { id: "music", label: "Music clips" },
  { id: "syckotclip", label: "syckotclip" },
  { id: "ryan", label: "Ryan Walker" },
];

const notifications = [
  {
    id: "followers",
    icon: <Users className="w-5 h-5 text-white" />,
    iconBg: "bg-[hsl(210,80%,55%)]",
    title: "New followers",
    subtitle: "See your new followers here.",
    time: "",
    dot: false,
  },
  {
    id: "activity",
    icon: <Heart className="w-5 h-5 text-white" />,
    iconBg: "bg-[hsl(350,80%,55%)]",
    title: "Activity",
    subtitle: "nonethv, McRoger Jnr II and 2 others like...",
    time: "",
    dot: false,
  },
  {
    id: "system",
    icon: <MessageSquare className="w-5 h-5 text-white" />,
    iconBg: "bg-muted-foreground/60",
    title: "System notifications",
    subtitle: "Account updates: Inauthentic vi...",
    time: "7 Feb",
    dot: true,
  },
];

const chatAvatars = [
  "https://i.pravatar.cc/100?img=1",
  "https://i.pravatar.cc/100?img=3",
  "https://i.pravatar.cc/100?img=5",
  "https://i.pravatar.cc/100?img=8",
  "https://i.pravatar.cc/100?img=9",
  "https://i.pravatar.cc/100?img=12",
];

const chats = [
  { id: "1", name: "Music clips", subtitle: "Say hi to Music clips", avatar: chatAvatars[0], unseen: 2 },
  { id: "2", name: "Ryan Walker", subtitle: "Say hi to Ryan Walker", avatar: chatAvatars[1], unseen: 0 },
  { id: "3", name: "Saikal", subtitle: "Sent", avatar: chatAvatars[2], unseen: 1 },
  { id: "4", name: "Whop editz", subtitle: "Sent", avatar: chatAvatars[3], unseen: 0 },
  { id: "5", name: "Dad's gal😊😘", subtitle: "Sent", avatar: chatAvatars[4], unseen: 3 },
  { id: "6", name: "Kiki#😘", subtitle: "Sent", avatar: chatAvatars[5], unseen: 0 },
];

const InboxPage = () => {
  return (
    <div className="flex-1 overflow-y-auto pb-16">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-12 mt-2">
        <Link2 className="w-6 h-6 text-foreground" />
        <div className="flex items-center gap-1.5">
          <h1 className="text-foreground font-bold text-[18px]">Inbox</h1>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--tiktok-cyan))]" />
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--tiktok-cyan))]" />
          </div>
        </div>
        <Search className="w-6 h-6 text-foreground" />
      </div>

      {/* Stories row */}
      <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
        {stories.map((story) => (
          <div key={story.id} className="flex flex-col items-center gap-1.5 min-w-[60px]">
            <div className="w-[56px] h-[56px] rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">
              {story.isCreate ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img src={avatar} alt="" className="w-full h-full object-cover opacity-70" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[hsl(var(--tiktok-cyan))] flex items-center justify-center border-2 border-background">
                    <span className="text-white text-[12px] font-bold leading-none">+</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
            </div>
            <span className="text-foreground text-[11px] text-center leading-tight truncate w-[64px]">
              {story.label}
            </span>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div className="px-0">
        {notifications.map((notif) => (
          <button
            key={notif.id}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${notif.iconBg}`}>
              {notif.icon}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-foreground text-[15px] font-semibold">{notif.title}</p>
              <p className="text-muted-foreground text-[13px] truncate">
                {notif.subtitle}
                {notif.time && <span className="text-muted-foreground"> · {notif.time}</span>}
              </p>
            </div>
            {notif.dot && (
              <div className="w-2.5 h-2.5 rounded-full bg-[hsl(350,80%,55%)] flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-4 my-1" />

      {/* Chat list */}
      <div className="px-0">
        {chats.map((chat) => (
          <button
            key={chat.id}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
          >
            <div className="relative w-11 h-11 rounded-full bg-muted flex-shrink-0 overflow-hidden">
              {chat.avatar ? (
                <img src={chat.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className={`text-[15px] ${chat.unseen > 0 ? "text-foreground font-bold" : "text-foreground font-medium"}`}>{chat.name}</p>
              <p className={`text-[13px] ${chat.unseen > 0 ? "text-foreground/80" : "text-muted-foreground"}`}>{chat.subtitle}</p>
            </div>
            {chat.unseen > 0 && (
              <div className="w-5 h-5 rounded-full bg-[hsl(var(--tiktok-red))] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-bold">{chat.unseen}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Music row at bottom */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <Music className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-foreground text-[15px] font-medium">Music clips</p>
          <p className="text-muted-foreground text-[13px]">Say hi to Music clips</p>
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
