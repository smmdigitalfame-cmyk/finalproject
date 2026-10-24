import { Plus } from "lucide-react";
import { TTHomeIcon, TTFriendsIcon, TTInboxIcon, TTProfileIcon, CountBadge } from "./TikTokIcons";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pl-safe pr-safe pt-1.5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        <NavItem icon={TTHomeIcon} label="Home" active={activeTab === "home"} onClick={() => onTabChange("home")} />
        <NavItem icon={TTFriendsIcon} label="Friends" active={activeTab === "friends"} onClick={() => onTabChange("friends")} />

        {/* Create button */}
        <button
          onClick={() => onTabChange("create")}
          onContextMenu={e => e.preventDefault()}
          aria-label="Create"
          className="relative flex items-center justify-center select-none min-w-[56px]"
        >
          <div className="relative" style={{ width: 50, height: 34 }}>
            <div className="absolute inset-0 rounded-[11px] bg-[hsl(var(--tiktok-cyan))] -translate-x-[3.5px]" />
            <div className="absolute inset-0 rounded-[11px] bg-[hsl(var(--tiktok-red))] translate-x-[3.5px]" />
            <div className="absolute inset-0 rounded-[10px] bg-foreground flex items-center justify-center">
              <Plus className="w-[22px] h-[22px] text-background" strokeWidth={3} />
            </div>
          </div>
        </button>

        <NavItem icon={TTInboxIcon} label="Inbox" active={activeTab === "inbox"} onClick={() => onTabChange("inbox")} badge={3} />
        <NavItem icon={TTProfileIcon} label="Profile" active={activeTab === "profile"} onClick={() => onTabChange("profile")} />
      </div>
    </div>
  );
};

const NavItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) => (
  <button onClick={onClick} className="flex flex-col items-center gap-[3px] min-w-[56px] text-foreground">
    <div className="relative">
      <Icon className="w-[28px] h-[28px]" fill={active ? "currentColor" : "none"} />
      {!!badge && <CountBadge count={badge} className="-top-[7px] -right-[11px]" />}
    </div>
    <span className={`text-[11.5px] leading-none ${active ? "font-bold" : "font-semibold"}`}>{label}</span>
  </button>
);

export default BottomNav;
