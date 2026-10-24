import { scrapeTikTok } from "@/lib/tiktok.functions";
import { apiPostToReel } from "@/lib/tiktokPosts";
import { useState, useRef } from "react";
import { z } from "zod";
import { ReelData, formatNumber, generateRandomReel } from "@/lib/mockData";
import { parseInputNumber } from "@/lib/utils";
import { UserPlus, Grid3X3, Menu, Plus, Bookmark, Heart, Lock, Repeat2, Footprints, Share, ChevronDown, BadgeCheck, Sun, Moon } from "lucide-react";
import { TTAddFriendIcon, TTFootprintsIcon, TTShareArrowIcon, TTMenuIcon, CountBadge } from "@/components/TikTokIcons";
import avatar from "@/assets/avatar.jpg";
import TikTokStudioPanel from "./TikTokStudioPanel";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// TikTok username rules: 2-24 chars, letters/digits/./_, no leading/trailing dot, no consecutive dots.
const tiktokUsernameSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ""))
  .pipe(
    z
      .string()
      .min(2, "Username must be at least 2 characters")
      .max(24, "Username must be 24 characters or fewer")
      .regex(/^[A-Za-z0-9._]+$/, "Only letters, numbers, '.' and '_' are allowed")
      .refine((v) => !v.startsWith(".") && !v.endsWith("."), "Username can't start or end with a dot")
      .refine((v) => !v.includes(".."), "Username can't contain consecutive dots")
  );

const validateTikTokUsername = (raw: string): { ok: true; value: string } | { ok: false; error: string } => {
  const result = tiktokUsernameSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message || "Invalid username" };
};

interface ProfileData {
  username: string;
  displayName: string;
  bio: string;
  statusText: string;
  followers: string;
  following: string;
  verified?: boolean;
  bioLink?: string;
  region?: string;
}

interface ProfileHeaderProps {
  reels: ReelData[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSetReels?: (reels: ReelData[]) => void;
  onOpenBulkSettings?: () => void;
}

const ProfileHeader = ({ reels, activeTab, onTabChange, onSetReels, onOpenBulkSettings }: ProfileHeaderProps) => {
  const totalLikes = reels.reduce((sum, r) => sum + r.insights.likes, 0);
  const [profile, setProfile] = useState<ProfileData>(() => {
    const defaults = {
      username: "extipsinghtpro.store",
      displayName: "Larp Insight",
      bio: "Powerful tools by Larp Insight to customize, manage, and transform your social media insights.",
    };
    const saved = typeof window === "undefined" ? null : localStorage.getItem("user_profile");
    if (saved) {
      const parsed = JSON.parse(saved) as ProfileData;
      // Drop the old built-in fixed store link from previously saved profiles
      if (parsed.bioLink?.replace(/^https?:\/\//i, "").replace(/\/$/, "") === "extipsinghtpro.store") delete parsed.bioLink;
      // Replace the old built-in sample profile with the new default one
      if (parsed.username === "officialzyrozo") return { ...parsed, ...defaults };
      return parsed;
    }
    return {
      ...defaults,
      statusText: "On your mind...",
      followers: "59",
      following: reels.length.toString(),
    };
  });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProfileData>(profile);
  const [postCount, setPostCount] = useState(reels.length.toString());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isFetchingTikTok, setIsFetchingTikTok] = useState(false);
  const lastFetchedUsernameRef = useRef<string>("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(() => {
    return localStorage.getItem("user_avatar") || null;
  });
  const savingProfileRef = useRef(false);

  const handleFetchTikTok = async () => {
    const validation = validateTikTokUsername(editForm.username || "");
    if (validation.ok === false) {
      setFetchError(validation.error);
      return;
    }
    const uname = validation.value;
    setFetchError(null);
    setIsFetchingTikTok(true);
    try {
      let scraped: Awaited<ReturnType<typeof scrapeTikTok>> | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          scraped = await scrapeTikTok({ data: { username: uname, count: 30 } });
          break;
        } catch (netErr) {
          // Flaky Wi-Fi / mobile data: retry the request before showing an error
          if (attempt === 2) throw netErr;
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
      if (!scraped) throw new Error("Network problem. Check your connection and try again.");
      if (scraped.error) throw new Error(scraped.error);
      const result = scraped.profile;

      // Bind data into existing form fields (only set fields the API returned)
      const merged = (prev: ProfileData): ProfileData => ({
        ...prev,
        username: result.username || prev.username,
        displayName: result.displayName || prev.displayName,
        bio: result.bio || prev.bio,
        followers: String(result.followers ?? prev.followers),
        following: String(result.following ?? prev.following),
        verified: typeof result.verified === "boolean" ? result.verified : prev.verified,
        bioLink: result.bioLink || prev.bioLink,
        region: result.region || prev.region,
      });
      setEditForm(merged);

      // Persist fetched stats + flags immediately so they survive refresh without needing Save
      setProfile((prev) => {
        const next = merged(prev);
        try {
          localStorage.setItem("user_profile", JSON.stringify(next));
        } catch (e) {
          console.warn("Failed to persist profile:", e);
        }
        return next;
      });

      try { localStorage.setItem("user_has_story", (result as { hasStory?: boolean }).hasStory ? "1" : "0"); } catch { /* ignore */ }
      if (result.avatar) {
        setAvatarPreview(result.avatar);
        try {
          localStorage.setItem("user_avatar", result.avatar);
        } catch (e) {
          console.warn("Failed to persist avatar:", e);
        }
      }
      lastFetchedUsernameRef.current = uname.toLowerCase();

      // Also fetch this user's posts and replace the grid so the videos shown
      // belong to the fetched account, not mock data.
      try {
        const posts = Array.from(
          new Map(scraped.posts.map((p) => {
            const reel = apiPostToReel(p, uname);
            return [reel.id, reel] as const;
          })).values(),
        );
        if (onSetReels) {
          onSetReels(posts);
          setPostCount(posts.length.toString());
        }
      } catch (postErr) {
        console.warn("TikTok posts fetch failed:", postErr);
        // Non-fatal — profile already updated above.
      }
    } catch (err: any) {
      console.error("TikTok fetch failed:", err);
      const msg = err?.message?.includes("Failed to fetch") || err?.name === "TypeError"
        ? "Network problem. Check your connection and try again."
        : err?.message || "Something went wrong. Please try again.";
      setFetchError(msg);
    } finally {
      setIsFetchingTikTok(false);
    }
  };

  const handleUsernameBlur = () => {
    if (savingProfileRef.current) return;
    const validation = validateTikTokUsername(editForm.username || "");
    if (validation.ok !== true) return; // invalid -> live error already shown
    const normalized = validation.value.toLowerCase();
    if (normalized === lastFetchedUsernameRef.current) return; // already fetched
    if (isFetchingTikTok) return;
    handleFetchTikTok();
  };

  const handleSaveProfile = () => {
    const updatedProfile = {
      ...editForm,
      following: parseInputNumber(editForm.following).toString(),
      followers: parseInputNumber(editForm.followers).toString(),
    };
    setProfile(updatedProfile);
    try {
      localStorage.setItem("user_profile", JSON.stringify(updatedProfile));
    } catch (e) {
      console.warn("Failed to persist profile:", e);
    }

    // Handle post count change - generate random reels if count increased
    const targetCount = parseInt(postCount) || reels.length;
    if (targetCount !== reels.length && onSetReels) {
      let newReels: ReelData[];
      if (targetCount > reels.length) {
        // Add more random reels
        const toAdd = targetCount - reels.length;
        const additionalReels = Array.from({ length: toAdd }, (_, i) =>
          generateRandomReel(reels.length + i + 1)
        );
        newReels = [...reels, ...additionalReels];
      } else {
        // Remove reels from end
        newReels = reels.slice(0, targetCount);
      }
      onSetReels(newReels);
    }

    setEditing(false);
    savingProfileRef.current = false;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Local preview immediately
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      setIsUploadingAvatar(true);
      try {
        const res = await uploadToCloudinary(file);
        setAvatarPreview(res.secure_url);
        localStorage.setItem("user_avatar", res.secure_url);
      } catch (err) {
        setAvatarPreview(localStorage.getItem("user_avatar"));
        console.error("Avatar upload failed:", err);
        alert("Avatar upload failed. Please try again.");
      } finally {
        URL.revokeObjectURL(previewUrl);
      }
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  return (
    <div className="pb-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-11 mt-2">


        <div className="relative text-foreground">
          <TTAddFriendIcon className="w-[28px] h-[28px]" />
          <CountBadge count={2} className="-top-[9px] left-[14px]" />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-5 text-foreground">
          <TTFootprintsIcon className="w-[27px] h-[27px]" />
          <TTShareArrowIcon className="w-[27px] h-[27px]" />
          <Button variant="ghost" size="icon" aria-label="Video settings" title="Video settings" onClick={onOpenBulkSettings} className="h-7 w-7 p-0 [&_svg]:size-7">
            <TTMenuIcon />
          </Button>
        </div>
      </div>

      {/* Avatar + Speech bubble */}
      <div className="flex justify-center mt-1">
        <div className="relative">
          <div className="absolute -top-5 -left-6 z-10">
            <div className="bg-card border border-border rounded-xl px-3 py-1.5 shadow-md">
              <span className="text-foreground text-[12px] font-medium">{profile.statusText}</span>
            </div>
            <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-card border-r border-b border-border rotate-45" />
          </div>
          <div className="w-[96px] h-[96px] rounded-full overflow-hidden border-[2px] border-border">
            <img src={avatarPreview || avatar} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 w-[22px] h-[22px] rounded-full bg-[hsl(var(--tiktok-cyan))] flex items-center justify-center border-2 border-background">
            <Plus className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Display Name + Edit button */}
      <div className="flex flex-col items-center justify-center mt-2 px-4">
        <div className="flex flex-col items-center">
          <div className="relative flex items-center">
            <div className="flex items-center gap-0">
              <h1 className="text-foreground font-black text-[17.5px] tracking-tight">{profile.displayName}</h1>
              {profile.verified && (
                <BadgeCheck className="w-[16px] h-[16px] ml-1 text-[hsl(var(--tiktok-cyan))] fill-[hsl(var(--tiktok-cyan))/0.15]" strokeWidth={2.5} aria-label="Verified" />
              )}
              <ChevronDown className="w-4 h-4 text-foreground translate-y-[1px]" strokeWidth={3.5} />
            </div>
            
            <button
              onClick={() => {
                setEditForm(profile);
                setPostCount(reels.length.toString());
                setEditing(true);
              }}
              className="absolute left-[calc(100%+4px)] bg-secondary text-foreground text-[14px] font-bold px-3 py-1 rounded-full whitespace-nowrap"
            >
              Edit
            </button>
          </div>
          <p className="text-muted-foreground/60 text-[13px] font-bold mt-1">@{profile.username}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <StatColumn value={formatNumber(parseInputNumber(profile.following))} label="Following" />
        <div className="w-[1px] h-3 bg-border/60" />
        <StatColumn value={formatNumber(parseInputNumber(profile.followers))} label="Followers" />
        <div className="w-[1px] h-3 bg-border/60" />
        <StatColumn value={formatNumber(totalLikes)} label="Likes" />
      </div>

      {/* Bio / Links / TikTok Studio */}
      <div className="flex flex-col items-center text-center mt-1.5 px-8 mb-1">
        {profile.bio && <p className="text-foreground text-[14px] whitespace-pre-line font-medium leading-[1.3] mb-2">{profile.bio}</p>}
        {profile.bioLink && (
          <a
            href={/^https?:\/\//i.test(profile.bioLink) ? profile.bioLink : `https://${profile.bioLink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[14px] font-semibold text-[hsl(210_100%_60%)] mb-2 break-all"
          >
            <svg className="w-[14px] h-[14px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" /></svg>
            {profile.bioLink.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
          </a>
        )}
        <button className="flex items-center gap-1.5" onClick={() => setShowAnalytics(true)}>
          <svg className="w-[16px] h-[16px] text-[#fe2c55]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C9.243 2 7 4.243 7 7C7 9.757 9.243 12 12 12C14.757 12 17 9.757 17 7C17 4.243 14.757 2 12 2Z"/>
            <path d="M15.968 12.956C14.782 12.348 13.434 12 12 12C7.038 12 3 16.037 3 21H14.12C14.65 19.34 15.82 18.06 17.65 17.6L15.968 12.956Z" />
            <path d="M22 13l-1.5 2.5L18 16l2.5 1.5L21 21l1.5-2.5L25 17l-2.5-1.5z" fill="#fe2c55" />
          </svg>
          <span className="text-[14px] font-semibold text-foreground">TikTok Studio</span>
        </button>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && <TikTokStudioPanel onClose={() => setShowAnalytics(false)} />}

      {/* Tabs */}
      <div className="flex mt-1.5 border-b border-border">
        <TabBtn active={activeTab === "grid"} onClick={() => onTabChange("grid")} icon={Grid3X3} />
        <TabBtn active={activeTab === "locked"} onClick={() => onTabChange("locked")} icon={Lock} />
        <TabBtn active={activeTab === "reposts"} onClick={() => onTabChange("reposts")} icon={Repeat2} />
        <TabBtn active={activeTab === "saved"} onClick={() => onTabChange("saved")} icon={Bookmark} />
        <TabBtn active={activeTab === "liked"} onClick={() => onTabChange("liked")} icon={Heart} />
      </div>

      {/* Edit Profile Modal */}
      {editing && (
        <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setEditing(false)}>
          <div
            className="w-full max-w-lg bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-foreground font-bold text-lg">Edit Profile</h2>
              <button
                onPointerDown={() => { savingProfileRef.current = true; }}
                onClick={handleSaveProfile}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold"
              >
                Save
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Avatar change */}
              <div className="flex flex-col items-center">
                <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-border mb-2 relative">
                  <img src={avatarPreview || avatar} alt="Profile" className="w-full h-full object-cover" />
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className={`text-primary text-[13px] font-semibold cursor-pointer ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isUploadingAvatar ? 'Uploading...' : 'Change photo'}
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Display Name</label>
                <input type="text" value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" />
              </div>
              {(() => {
                const liveValidation = validateTikTokUsername(editForm.username || "");
                const isValid = liveValidation.ok === true;
                const liveError = !isValid && (editForm.username || "").trim().length > 0 ? liveValidation.error : null;
                return (
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1 block">Username</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        onBlur={handleUsernameBlur}
                        maxLength={25}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="username (without @)"
                        aria-invalid={!isValid}
                        className={`flex-1 bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border focus:outline-none ${
                          liveError ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleFetchTikTok}
                        disabled={isFetchingTikTok || !isValid}
                        className="bg-primary text-primary-foreground text-xs font-semibold px-3 rounded-lg disabled:opacity-50"
                      >
                        {isFetchingTikTok ? "..." : "Fetch"}
                      </button>
                    </div>
                    {liveError && !fetchError && (
                      <p className="text-[11px] text-destructive mt-1">{liveError}</p>
                    )}
                    {fetchError && (
                      <div className="mt-1.5 flex items-start justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5">
                        <p className="text-[11px] text-destructive leading-snug flex-1">{fetchError}</p>
                        <button
                          type="button"
                          onClick={handleFetchTikTok}
                          disabled={isFetchingTikTok || !isValid}
                          className="text-[11px] font-semibold text-destructive underline underline-offset-2 disabled:opacity-50 shrink-0"
                        >
                          {isFetchingTikTok ? "Retrying..." : "Retry"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Status (On your mind...)</label>
                <input type="text" value={editForm.statusText} onChange={(e) => setEditForm({ ...editForm, statusText: e.target.value })}
                  className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Bio</label>
                <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3}
                  className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none resize-none" />
              </div>

              {/* Appearance / Theme toggle */}
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-primary font-semibold uppercase tracking-wider">Appearance</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <ThemeToggleRow />


              {/* Stats Section */}
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-primary font-semibold uppercase tracking-wider">Stats</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Following</label>
                  <input type="text" value={editForm.following} onChange={(e) => setEditForm({ ...editForm, following: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Followers</label>
                  <input type="text" value={editForm.followers} onChange={(e) => setEditForm({ ...editForm, followers: e.target.value })}
                    className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" />
                </div>
              </div>

              {/* Posts Section */}
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-primary font-semibold uppercase tracking-wider">Posts</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Total Posts</label>
                <input type="number" value={postCount} onChange={(e) => setPostCount(e.target.value)}
                  min={0} max={200}
                  className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Current: {reels.length} posts. Change number to auto-generate or remove posts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ThemeToggleRow = () => {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true
  );
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="w-full flex items-center justify-between bg-secondary border border-border rounded-lg px-3 py-2.5"
    >
      <div className="flex items-center gap-2">
        {isDark ? <Moon className="w-4 h-4 text-foreground" /> : <Sun className="w-4 h-4 text-foreground" />}
        <span className="text-sm text-foreground font-medium">{isDark ? "Dark mode" : "Light mode"}</span>
      </div>
      <span
        className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-muted"}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            isDark ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
};

const StatColumn = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center justify-center min-w-[70px]">
    <p className="text-foreground font-black text-[17px] leading-tight">{value}</p>
    <p className="text-muted-foreground/80 text-[13px] font-medium tracking-tight mt-0.5">{label}</p>
  </div>
);

const TabBtn = ({
  active,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <button
    onClick={onClick}
    className="flex-1 py-2.5 flex flex-col items-center gap-1.5 transition-colors relative"
  >
    <Icon className={`w-[26px] h-[26px] ${active ? "text-foreground" : "text-muted-foreground"}`} />
    {active && <div className="absolute bottom-0 w-12 h-[2px] bg-foreground" />}
  </button>
);

export default ProfileHeader;