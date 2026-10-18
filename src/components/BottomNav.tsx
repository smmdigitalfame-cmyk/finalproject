import { Home, Users, Plus, User } from "lucide-react";

const InboxIcon = ({ className, fill, strokeWidth }: { className?: string; fill?: string; strokeWidth?: number }) => {
  const isFilled = fill && fill !== "none";
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={isFilled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-2 3-2-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <line x1="8" y1="11" x2="16" y2="11" stroke={isFilled ? "hsl(var(--background))" : "currentColor"} />
    </svg>
  );
};




interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pl-safe pr-safe pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">

        <NavItem icon={Home} label="Home" active={activeTab === "home"} onClick={() => onTabChange("home")} />
        <NavItem icon={Users} label="Friends" active={activeTab === "friends"} onClick={() => onTabChange("friends")} />
        
        {/* Create button */}
        <button
          onClick={() => onTabChange("create")}
          onContextMenu={e => e.preventDefault()}
          className="relative flex items-center justify-center -mt-2 select-none"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-[hsl(var(--tiktok-cyan))] translate-x-[3px]" style={{ width: 44, height: 30 }} />
            <div className="absolute inset-0 rounded-lg bg-primary -translate-x-[3px]" style={{ width: 44, height: 30 }} />
            <div className="relative bg-foreground rounded-lg flex items-center justify-center" style={{ width: 44, height: 30 }}>
              <Plus className="w-5 h-5 text-background" strokeWidth={2.5} />
            </div>
          </div>
        </button>

        <NavItem icon={InboxIcon} label="Inbox" active={activeTab === "inbox"} onClick={() => onTabChange("inbox")} badge={6} />
        <NavItem icon={User} label="Profile" active={activeTab === "profile"} onClick={() => onTabChange("profile")} />
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
  <button onClick={onClick} className="flex flex-col items-center gap-0.5 min-w-[56px]">
    <div className="relative">
      <Icon
        className={`w-[26px] h-[26px] ${active ? "text-foreground" : "text-muted-foreground"}`}
        fill={active ? "currentColor" : "none"}
        strokeWidth={active ? 2 : 1.5}
      />
      {badge && badge > 0 && (
        <div className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[hsl(var(--tiktok-red))] flex items-center justify-center border-[1.5px] border-background">
          <span className="text-white text-[10px] font-bold leading-none">{badge}</span>
        </div>
      )}
    </div>
    <span className={`text-[11px] ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
      {label}
    </span>
  </button>
);

export default BottomNav;
