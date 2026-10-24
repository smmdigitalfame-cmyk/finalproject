import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { generateMockReels, normalizeReelData, ReelData } from "@/lib/mockData";
import ProfileHeader from "@/components/ProfileHeader";
import PullToRefresh from "@/components/PullToRefresh";
import VideoGrid from "@/components/VideoGrid";
import BottomNav from "@/components/BottomNav";
import { applyBulkInsights, applyBulkInsightsBatched, persistBulkResult, loadBulkSettings, type BulkInsightSettings } from "@/lib/bulkInsights";
import { toast } from "sonner";
import { refreshLegacyAudienceRegions } from "@/lib/audienceEstimates";


// Code-split heavy overlays/panels — they only mount when needed
const VideoDetail = lazy(() => import("@/components/VideoDetail"));
const EditModal = lazy(() => import("@/components/EditModal"));
const InsightsPanel = lazy(() => import("@/components/InsightsPanel"));
const HomeFeed = lazy(() => import("@/components/HomeFeed"));
const InboxPage = lazy(() => import("@/components/InboxPage"));
const BulkInsightsPanel = lazy(() => import("@/components/BulkInsightsPanel"));

const persistReels = (reels: ReelData[]) => {
  try {
    localStorage.setItem("user_reels", JSON.stringify(reels));
  } catch (e) {
    console.warn("Failed to persist reels:", e);
  }
};

const cloneReel = (reel: ReelData): ReelData => ({
  ...reel,
  tags: [...reel.tags],
  insights: {
    ...reel.insights,
    trafficSources: { ...reel.insights.trafficSources },
    searchQueries: reel.insights.searchQueries?.map((item) => ({ ...item })),
    audienceRegions: reel.insights.audienceRegions.map((item) => ({ ...item })),
    viewsByDay: reel.insights.viewsByDay.map((item) => ({ ...item })),
    genderSplit: { ...reel.insights.genderSplit },
    ageGroups: reel.insights.ageGroups.map((item) => ({ ...item })),
  },
});

const uniqueReelsById = (reels: ReelData[]) =>
  Array.from(new Map(reels.map((reel) => [reel.id, reel] as const)).values());

const Index = () => {
  const [reels, setReels] = useState<ReelData[]>(() => {
    const padRegions = (rs: ReelData[]): ReelData[] => {
      return rs.map((raw, index) => {
        const r = normalizeReelData(raw, index);
        const regions = refreshLegacyAudienceRegions(r.id, r.insights.views, r.insights.audienceRegions);
        return { ...r, insights: { ...r.insights, audienceRegions: regions } };
      });
    };
    if (typeof window === "undefined") return generateMockReels();
    try {
      const saved = localStorage.getItem("user_reels");
      const parsed = saved ? JSON.parse(saved) : generateMockReels();
      return uniqueReelsById(padRegions(parsed));
    } catch {
      return generateMockReels();
    }
  });

  const [selectedReel, setSelectedReel] = useState<ReelData | null>(null);
  const [editingReel, setEditingReel] = useState<ReelData | null>(null);
  const [insightsReel, setInsightsReel] = useState<ReelData | null>(null);
  const [showBulkSettings, setShowBulkSettings] = useState(false);
  const [profileTab, setProfileTab] = useState("grid");
  const [navTab, setNavTab] = useState(() =>
    typeof window === "undefined" ? "profile" : localStorage.getItem("last_nav_tab") || "profile"
  );
  const navHistory = useRef<string[]>([
    typeof window === "undefined" ? "profile" : localStorage.getItem("last_nav_tab") || "profile",
  ]);

  // Lookup map for O(1) reel resolution instead of linear find on every render
  const reelsById = useMemo(() => {
    const m = new Map<string, ReelData>();
    for (const r of reels) m.set(r.id, r);
    return m;
  }, [reels]);

  const handleNavTab = useCallback((tab: string) => {
    if (tab === navTab) return;
    navHistory.current.push(tab);
    localStorage.setItem("last_nav_tab", tab);
    window.history.pushState({ tab }, "", "");
    setNavTab(tab);
  }, [navTab]);

  // Theme init — runs once
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    if (!localStorage.getItem("theme")) localStorage.setItem("theme", "dark");
    if (!window.history.state || !window.history.state.tab) {
      window.history.replaceState({ tab: navTab }, "", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // popstate — use refs so we don't rebind on every state change
  const overlayRefs = useRef({ insightsReel, editingReel, selectedReel });
  overlayRefs.current = { insightsReel, editingReel, selectedReel };

  useEffect(() => {
    const handlePopState = () => {
      const { insightsReel, editingReel, selectedReel } = overlayRefs.current;
      if (insightsReel) { setInsightsReel(null); window.history.pushState({}, "", ""); return; }
      if (editingReel) { setEditingReel(null); window.history.pushState({}, "", ""); return; }
      if (selectedReel) { setSelectedReel(null); window.history.pushState({}, "", ""); return; }
      if (navHistory.current.length > 1) {
        navHistory.current.pop();
        const prevTab = navHistory.current[navHistory.current.length - 1];
        setNavTab(prevTab);
        window.history.pushState({ tab: prevTab }, "", "");
      } else {
        window.history.back();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const saveReels = useCallback((newReels: ReelData[]) => {
    const uniqueReels = uniqueReelsById(applyBulkInsights(newReels, loadBulkSettings()));
    setReels(uniqueReels);
    persistReels(uniqueReels);
  }, []);

  const latestReels = useRef(reels);
  latestReels.current = reels;
  const bulkPushPending = useRef(false);
  const handleBulkPush = useCallback(async (settings: BulkInsightSettings) => {
    if (bulkPushPending.current) throw new Error("An update is already running.");
    bulkPushPending.current = true;
    const source = latestReels.current;
    try {
      const updated = await applyBulkInsightsBatched(source, { ...settings, enabled: true });
      if (latestReels.current !== source) throw new Error("Videos changed during the update. Push again.");
      persistBulkResult(localStorage, updated, settings);
      setReels(updated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Settings could not be saved. Please retry.");
      throw error;
    } finally {
      bulkPushPending.current = false;
    }
  }, []);

  const handleReelClick = useCallback((reel: ReelData) => {
    setSelectedReel(cloneReel(reel));
    window.history.pushState({ overlay: "detail" }, "", "");
  }, []);

  const handleSave = useCallback((updated: ReelData) => {
    const safeUpdated = cloneReel(updated);
    setReels((prev) => {
      const next = prev.map((r) => (r.id === safeUpdated.id ? safeUpdated : r));
      persistReels(next);
      return next;
    });
    setEditingReel(null);
    setSelectedReel((prev) => (prev?.id === safeUpdated.id ? cloneReel(safeUpdated) : prev));
    setInsightsReel((prev) => (prev?.id === safeUpdated.id ? cloneReel(safeUpdated) : prev));
  }, []);

  const handleAddReel = useCallback(() => {
    const newReel: ReelData = {
      id: Date.now().toString(),
      title: "New Reel",
      description: "",
      tags: [],
      thumbnail: "",
      duration: "0:00",
      createdAt: new Date().toISOString().split("T")[0],
      music: "original sound",
      username: "@priya_creates",
      insights: {
        views: 0, likes: 0, comments: 0, shares: 0, saves: 0,
        avgWatchTime: 0, totalPlayTime: 0, reachedAudience: 0,
        profileVisits: 0, followsFromPost: 0, watchedFull: 0,
        trafficSources: { forYouPage: 0, following: 0, profile: 0, search: 0, sounds: 0, hashtags: 0 },
        audienceRegions: [],
        viewsByDay: [],
        genderSplit: { male: 0, female: 0, other: 0 },
        ageGroups: [],
      },
    };
    setEditingReel(newReel);
    window.history.pushState({ overlay: "edit" }, "", "");
  }, []);

  const handleSaveNew = useCallback((updated: ReelData) => {
    const safeUpdated = cloneReel(updated);
    setReels((prev) => {
      const exists = prev.some((r) => r.id === safeUpdated.id);
      const next = exists ? prev.map((r) => (r.id === safeUpdated.id ? safeUpdated : r)) : [...prev, safeUpdated];
      persistReels(next);
      return next;
    });
    setEditingReel(null);
    setSelectedReel((prev) => (prev?.id === safeUpdated.id ? cloneReel(safeUpdated) : prev));
    setInsightsReel((prev) => (prev?.id === safeUpdated.id ? cloneReel(safeUpdated) : prev));
  }, []);

  const handleInsights = useCallback((activeReel: ReelData) => {
    if (activeReel) {
      const latest = reelsById.get(activeReel.id) || activeReel;
      setInsightsReel(latest);
      window.history.pushState({ overlay: "insights" }, "", "");
    }
  }, [reelsById]);

  const currentSelectedReel = useMemo(
    () => (selectedReel ? reelsById.get(selectedReel.id) || selectedReel : null),
    [selectedReel, reelsById]
  );
  const currentInsightsReel = useMemo(
    () => (insightsReel ? reelsById.get(insightsReel.id) || insightsReel : null),
    [insightsReel, reelsById]
  );

  return (
    <div className="flex min-h-0 h-full flex-col max-w-lg mx-auto relative bg-background">
      {/* Home Feed */}
      {(navTab === "home" || navTab === "friends") && (
        <Suspense fallback={null}>
          <HomeFeed reels={reels} onSave={handleSave} />
        </Suspense>
      )}

      {/* Inbox */}
      {navTab === "inbox" && (
        <Suspense fallback={null}>
          <InboxPage />
        </Suspense>
      )}

      {/* Profile page */}
      {navTab === "profile" && (
        <PullToRefresh
          className="flex-1 min-h-0 overflow-y-scroll scrollbar-hide"
          style={{
            paddingBottom: 'calc(3.5rem + 8px + max(env(safe-area-inset-bottom, 0px), 8px))',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
        >
          <ProfileHeader reels={reels} activeTab={profileTab} onTabChange={setProfileTab} onSetReels={saveReels} onOpenBulkSettings={() => setShowBulkSettings(true)} />
          <div className="pb-4">
            <VideoGrid reels={reels} onReelClick={handleReelClick} onAddReel={handleAddReel} />
          </div>
        </PullToRefresh>
      )}



      {/* Bottom Nav */}
      <BottomNav activeTab={navTab} onTabChange={handleNavTab} />

      {/* Overlays — lazy loaded */}
      <Suspense fallback={null}>
        {showBulkSettings && <BulkInsightsPanel reels={reels} onClose={() => setShowBulkSettings(false)} onPush={handleBulkPush} />}
        {currentSelectedReel && (
          <VideoDetail
            key={`detail:${currentSelectedReel.id}`}
            reel={currentSelectedReel}
            reels={reels}
            onBack={() => setSelectedReel(null)}
            onInsights={handleInsights}
            onSave={handleSave}
            suspended={!!currentInsightsReel || !!editingReel}
          />
        )}

        {editingReel && (
          <EditModal
            reel={reelsById.get(editingReel.id) || editingReel}
            onSave={handleSaveNew}
            onClose={() => setEditingReel(null)}
          />
        )}

        {currentInsightsReel && (
          <InsightsPanel key={`insights:${currentInsightsReel.id}`} reel={currentInsightsReel} onClose={() => setInsightsReel(null)} onSave={handleSave} />
        )}
      </Suspense>
    </div>
  );
};

export default Index;
