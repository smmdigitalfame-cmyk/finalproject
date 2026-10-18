import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Info, ArrowUp, ArrowDown, ChevronRight, ChevronLeft, X, Upload, Edit3 } from "lucide-react";
import { parseInputNumber } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";

const TikTokDots = () => (
  <div className="tiktok-loader my-4">
    <div className="tiktok-dot tiktok-dot-cyan" />
    <div className="tiktok-dot tiktok-dot-red" />
  </div>
);

const SkeletonCard = () => (
  <div className="w-full space-y-8 mt-4">
    {/* Metric Grid */}
    <div className="grid grid-cols-2 gap-4 px-1">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-28 rounded-xl skeleton bg-muted/5" />
      ))}
    </div>

    {/* Main View Count Chart */}
    <div className="px-1">
      <div className="h-56 w-full rounded-2xl skeleton bg-muted/5" />
    </div>

    {/* Secondary Stats */}
    <div className="px-1 space-y-4">
      <div className="h-8 w-40 skeleton" />
      <div className="h-44 w-full rounded-2xl skeleton bg-muted/5" />
    </div>
  </div>
);

interface ProfileAnalyticsPanelProps {
  onClose: () => void;
}

export default function ProfileAnalyticsPanel({ onClose }: ProfileAnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [timeFilter, setTimeFilter] = useState("7 days");

  // Per-filter Data Persistence
  const [dataStore, setDataStore] = useState<Record<string, any>>(() => {
    const saved = typeof window === "undefined" ? null : localStorage.getItem("profile_analytics_data");
    if (saved) return JSON.parse(saved);
    
    return {
      "7 days": {
        overview: {
          selectedMetric: "post_views",
          metrics: {
            post_views: { val: "868", trend: "+868" },
            profile_views: { val: "6", trend: "+6" },
            likes: { val: "41", trend: "+41" },
            comments: { val: "0", trend: "0" },
            shares: { val: "1", trend: "+1" },
            rewards: { val: "$0.00", trend: "+$0.00" },
          },
          graphData: {
            post_views: [0, 0, 0, 155, 0, 310, 465],
            profile_views: [0, 1, 0, 2, 1, 4, 6],
            likes: [0, 10, 5, 20, 15, 30, 41],
            comments: [0, 0, 0, 0, 0, 0, 0],
            shares: [0, 0, 0, 0, 0, 1, 1],
            rewards: [0, 0, 0, 0, 0, 0, 0],
          },
          queries: [
            { label: "daniel allan concert", pct: "33.2%", active: true },
            { label: "daniel allan", pct: "16.7%", active: true },
            { label: "daniel allen colley", pct: "16.7%", active: true },
            { label: "Daniel allan", pct: "16.7%", active: true },
            { label: "death is no more motivation edit", pct: "16.7%", active: true },
          ],
          topPosts: [
            { id: 1, title: "The future of trading is almost here best Ai Of 2026 #viralityflooz", views: "1,020 views in the last 28 days", date: "Posted on Jan 28" },
            { id: 2, title: "The future of trading is almost here best Ai Of 2026 #viralityflooz", views: "1,020 views in the last 28 days", date: "Posted on Jan 28" },
            { id: 3, title: "The future of trading is almost here best Ai Of 2026 #viralityflooz", views: "1,020 views in the last 28 days", date: "Posted on Jan 27" },
            { id: 4, title: "#howtogoviral #tiktoktips #girlssupportgirls #growontiktok #ho...", views: "208 views in the last 28 days", date: "3d ago" },
            { id: 5, title: "what I learned about the algo as a TikTok intern #howtogoviral2025 #gir...", views: "172 views in the last 28 days", date: "5d ago" },
          ]
        },
        viewers: {
          selectedMetric: "total_viewers",
          insightTab: "gender",
          metrics: {
            total_viewers: { val: "3,224", trend: "-2,804 (-46.5%)" },
            new_viewers: { val: "3,213", trend: "-2,680 (-45.5%)" },
          },
          graphData: {
            total_viewers: [3224, 0, 0, 0, 0, 0, 200, 100],
            new_viewers: [3213, 0, 0, 0, 0, 0, 100, 50]
          },
          genderData: [
            { label: "Male", pct: "68%", color: "#00a1ff" },
            { label: "Female", pct: "30%", color: "#00a1ff66" },
            { label: "Other", pct: "2%", color: "#00a1ff1a" }
          ]
        },
        inspiration: {
          topics: [
            { id: 1, text: "Pemakaman Vidi Aliando Digelar Di Jakarta", count: "918.7M" },
            { id: 2, text: "Konten Sule Soroti Rumah Duka Vidi Aldiano", count: "858.9M" },
            { id: 3, text: "Sosok Vidi Aldiano Di Mata Agnez Mo", count: "833.7M" },
            { id: 4, text: "Kematian Vidi Dikaitkan Dengan Ramalan Gumay", count: "831.5M" },
            { id: 5, text: "Nadin Amizah Ungkap Detik Terakhir Vidi", count: "778.1M" },
            { id: 6, text: "Deddy Hadir Di Pemakaman Vidi", count: "724.7M" },
            { id: 7, text: "Sule Membuat Vlog Di Rumah Duka Vidi", count: "702.3M" },
          ]
        },
        followers: {
          selectedMetric: "total_followers",
          insightTab: "gender",
          metrics: {
            total_followers: { val: "18", trend: "All time" },
            net_followers: { val: "-1", trend: "-1" },
          },
          graphData: {
            total_followers: [18, 18, 18, 18, 18, 17, 17, 17],
            net_followers: [0, 0, 0, 0, 0, -1, 0, 0]
          },
          genderData: [
            { label: "Male", pct: "68%", color: "#00a1ff" },
            { label: "Female", pct: "30%", color: "#00a1ff66" },
            { label: "Other", pct: "2%", color: "#00a1ff1a" }
          ]
        },
        content: {
          videos: [
            { id: 1, date: "Mar 9", views: "1.2K", likes: "142", comments: "12" },
            { id: 2, date: "Mar 8", views: "904", likes: "91", comments: "4" },
            { id: 3, date: "Mar 7", views: "4.3K", likes: "330", comments: "35" },
          ]
        }
      }
    };
  });

  const handleSave = () => {
    localStorage.setItem("profile_analytics_data", JSON.stringify(dataStore));
    setIsEditing(false);
  };


  const getFilterData = (filter: string) => {
    return dataStore[filter] || dataStore["7 days"]; // Fallback to 7 days structure
  };

  const updateFilterData = (tab: string, newData: any) => {
    setDataStore(prev => {
      const currentFilterData = prev[timeFilter] || JSON.parse(JSON.stringify(prev["7 days"]));
      return {
        ...prev,
        [timeFilter]: {
          ...currentFilterData,
          [tab]: { ...currentFilterData[tab], ...newData }
        }
      };
    });
  };
  const [showLocationsDetail, setShowLocationsDetail] = useState(false);

  // Global Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return;
    setIsLoading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsLoading(false);
    }, 450);
  };

  const handleFilterChange = (f: string) => {
    if (f === timeFilter) return;
    setIsLoading(true);
    setTimeout(() => {
      setTimeFilter(f);
      setIsLoading(false);
    }, 350);
  };

  const triggerLoading = () => {
    // Disabled to prevent unwanted refresh behavior
  };

  const toggleEditMode = () => {
    setIsEditing(prev => !prev);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-background overflow-y-auto scroll-smooth scrollbar-hide text-foreground"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="max-w-lg mx-auto min-h-screen flex flex-col bg-background shadow-2xl relative border-x border-border/50">
        {/* Header */}
        <div className="sticky top-0 bg-background z-20 border-b border-border">
          <div className="flex items-center justify-between h-[52px] px-4">
            <button onClick={onClose} className="p-1 -ml-1">
              <ArrowLeft className="w-7 h-7 text-foreground" />
            </button>
            <h1
              className="flex-1 text-center font-black text-[17.5px] tracking-tight cursor-pointer select-none"
              onClick={toggleEditMode}
            >
              {isEditing ? <span className="text-primary animate-pulse">Edit Mode</span> : <span>Analytics</span>}
            </h1>

            {isEditing ? (
              <button
                onClick={handleSave}
                className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-[13px] font-black shadow-lg shadow-primary/20"
              >
                Done
              </button>
            ) : (
              <div className="w-7" />
            )}

          </div>

          {/* Tabs */}
          <div className="relative w-full overflow-hidden tab-shadow-right border-b border-border bg-background">
            <div className="flex w-full overflow-x-auto scrollbar-hide px-3 py-1 gap-6">
              <div className="relative flex whitespace-nowrap px-1 gap-6">
                <TabBtn label="Inspiration" active={activeTab === "inspiration"} onClick={() => handleTabChange("inspiration")} isEditing={isEditing} />
                <TabBtn label="Overview" active={activeTab === "overview"} onClick={() => handleTabChange("overview")} isEditing={isEditing} />
                <TabBtn label="Content" active={activeTab === "content"} onClick={() => handleTabChange("content")} isEditing={isEditing} />
                <TabBtn label="Viewers" active={activeTab === "viewers"} onClick={() => handleTabChange("viewers")} isEditing={isEditing} />
                <TabBtn label="Followers" active={activeTab === "followers"} onClick={() => handleTabChange("followers")} isEditing={isEditing} />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="relative w-full overflow-hidden tab-shadow-right bg-background">
            <div className="flex w-full overflow-x-auto scrollbar-hide px-4 py-3 gap-2">
              {["7 days", "28 days", "60 days", "365 days", "Custom"].map(f => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={`whitespace-nowrap px-[18px] py-[6px] rounded-full text-[14px] font-black transition-colors ${timeFilter === f ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                >
                  <EditableVal val={f} isEditing={isEditing} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pb-20 flex-1 bg-card">
          {isLoading && (
            <div className="loading-full-screen">
              <TikTokDots />
              <div className="w-full space-y-4 px-6 mt-16 max-w-lg">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          )}

          <div className={isLoading ? "opacity-0 invisible" : "opacity-100 visible transition-opacity duration-300"}>
            {activeTab === "overview" && (
              <OverviewContent
                isEditing={isEditing}
                data={getFilterData(timeFilter).overview}
                onUpdate={(d) => updateFilterData("overview", d)}
              />
            )}
            {activeTab === "viewers" && (
              <ViewersContent
                isEditing={isEditing}
                data={getFilterData(timeFilter).viewers}
                onUpdate={(d) => updateFilterData("viewers", d)}
                onSeeMore={() => setShowLocationsDetail(true)}
              />
            )}
            {activeTab === "inspiration" && (
              <InspirationContent
                isEditing={isEditing}
                data={getFilterData(timeFilter).inspiration}
                onUpdate={(d) => updateFilterData("inspiration", d)}
              />
            )}
            {activeTab === "content" && (
              <ContentTabContent
                isEditing={isEditing}
                data={getFilterData(timeFilter).content}
                onUpdate={(d) => updateFilterData("content", d)}
              />
            )}
            {activeTab === "followers" && (
              <FollowersContent
                isEditing={isEditing}
                data={getFilterData(timeFilter).followers}
                onUpdate={(d) => updateFilterData("followers", d)}
              />
            )}
          </div>
        </div>

        {/* Locations Detail Overlay */}
        {showLocationsDetail && (
          <div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm overflow-y-auto scrollbar-hide flex justify-center"
          >

            <div className="w-full max-w-lg bg-background min-h-screen">
              <div className="sticky top-0 bg-background z-10 border-b border-border flex items-center justify-between px-4 h-[52px]">
                <div className="w-8" />
                <h2 className="text-[17.5px] font-black"><EditableVal val="Locations" isEditing={isEditing} /></h2>
                <button onClick={() => setShowLocationsDetail(false)} className="p-1 text-foreground hover:bg-muted rounded-full transition-colors">
                  <X className="w-7 h-7" />
                </button>
              </div>
              <div className="p-5 space-y-[22px]">
                {[
                  { label: "Nepal", pct: "45.6%" },
                  { label: "United States", pct: "6.9%" },
                  { label: "Germany", pct: "3.3%" },
                  { label: "India", pct: "3.3%" },
                  { label: "United Arab Emirates", pct: "2.9%" },
                  { label: "Canada", pct: "2.6%" },
                  { label: "France", pct: "2.3%" },
                  { label: "United Kingdom", pct: "2.0%" },
                  { label: "Ukraine", pct: "2.0%" },
                  { label: "Philippines", pct: "1.6%" },
                  { label: "Other", pct: "27.5%" },
                ].map((loc, idx) => (
                  <LocationBar key={idx} label={loc.label} pct={loc.pct} width={loc.pct} active={idx === 0 || idx === 10} isEditing={isEditing} />
                ))}
                {isEditing && (
                  <button className="w-full mt-4 py-3 rounded-lg border border-dashed border-border text-muted-foreground font-bold text-[13px] hover:bg-muted/50">
                    + Add location
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------
// CONTENT VIEWS
// -----------------------------------------------------

const OverviewContent = ({ isEditing, data, onUpdate }: { isEditing: boolean, data: any, onUpdate: (d: any) => void }) => {
  const selectedMetric = data.selectedMetric;
  const graphData = data.graphData;
  const queries = data.queries;

  const getLimit = (id: string) => {
    const values = graphData[id] || [];
    const max = Math.max(...values, 1);
    // Return a nice rounded max or just the max
    return max;
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <h2 className="text-[17px] font-black leading-tight"><EditableVal val="Key metrics" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>
        <p className="text-muted-foreground text-[13.5px] mb-4 font-black uppercase tracking-tight"><EditableVal val="Mar 3 - Mar 9" isEditing={isEditing} /></p>

        <div className="grid grid-cols-2 gap-1 mb-4">
          {Object.entries(data.metrics).map(([key, m]: [string, any]) => (
            <MetricCard
              key={key}
              isEditing={isEditing}
              id={key}
              label={key.replace("_", " ")}
              selected={selectedMetric === key}
              val={m.val}
              trend={m.trend}
              onClick={() => onUpdate({ selectedMetric: key })}
              onUpdate={(nd) => {
                if (nd.val !== undefined) {
                  const newVal = parseInputNumber(nd.val);
                  const currentVal = parseInputNumber(m.val) || 1;
                  const ratio = newVal / currentVal;
                  const currentGraphData = graphData[key] || [];
                  const scaledGraphData = currentGraphData.map((v: number) => Math.round(v * ratio));
                  
                  onUpdate({ 
                    metrics: { ...data.metrics, [key]: { ...m, val: nd.val } },
                    graphData: { ...graphData, [key]: scaledGraphData }
                  });
                } else {
                  onUpdate({ metrics: { ...data.metrics, [key]: { ...m, ...nd } } });
                }
              }}
            />
          ))}
        </div>

        <div className="relative h-[160px] mt-4 select-none">
          {[getLimit(selectedMetric), Math.floor(getLimit(selectedMetric) * 2 / 3), Math.floor(getLimit(selectedMetric) / 3)].map((v, i) => (
            <div key={i} className="absolute right-0 text-[11px] text-muted-foreground/80 font-bold z-20" style={{ top: `${i * 33}%`, transform: 'translateY(-50%)' }}>
              <EditableVal val={v} isEditing={isEditing} id={`profile-y-label-${selectedMetric}-${i}`} />
            </div>
          ))}

          {[0, 33, 66, 100].map(pct => (
            <div key={pct} className="absolute left-0 right-8 border-t border-dashed border-muted-foreground/20" style={{ top: `${pct}%` }} />
          ))}

          <div className="absolute bottom-[-24px] left-0 text-[11px] text-muted-foreground/60 font-bold"><EditableVal val="Mar 3" isEditing={isEditing} /></div>
          <div className="absolute bottom-[-24px] right-8 text-[11px] text-muted-foreground/60 font-bold"><EditableVal val="Mar 9" isEditing={isEditing} /></div>

          <DrawablePolygonGraph
            data={graphData[selectedMetric]}
            onDataChange={(newData) => onUpdate({ graphData: { ...graphData, [selectedMetric]: newData } })}
            maxVal={getLimit(selectedMetric)}
            isEditing={isEditing}
            gradientId={`grad-${selectedMetric}`}
            showTooltip={selectedMetric === "post_views"}
          />
        </div>

        {selectedMetric === "rewards" && (
          <button className="w-full mt-10 py-3.5 rounded-xl bg-muted text-foreground font-bold text-[14.5px] hover:bg-muted/80 flex items-center justify-center border border-border">
            <EditableVal val="View rewards analytics" isEditing={isEditing} />
          </button>
        )}
      </div>

      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616]">
        <div className="flex items-center gap-1.5 mb-6">
          <h2 className="text-[17px] font-black"><EditableVal val="Traffic source" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>

        <div className="space-y-[18px]">
          <TrafficBar label="For You" pct="72%" active={true} isEditing={isEditing} />
          <TrafficBar label="Following" pct="12%" isEditing={isEditing} />
          <TrafficBar label="Personal profile" pct="8%" isEditing={isEditing} />
          <TrafficBar label="Search" pct="4%" isEditing={isEditing} />
          <TrafficBar label="Other" pct="2%" isEditing={isEditing} />
        </div>
      </div>

      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616]">
        <div className="flex items-center gap-1.5 mb-6">
          <h2 className="text-[17px] font-black"><EditableVal val="Search queries" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>
        <div className="space-y-[18px]">
          {queries.map((q: any, idx: number) => (
            <TrafficBar key={idx} label={q.label} pct={q.pct} active={q.active} isEditing={isEditing} />
          ))}
        </div>
        {isEditing && (
          <button
            onClick={() => onUpdate({ queries: [...queries, { label: "New query", pct: "0%", active: true }] })}
            className="w-full mt-6 py-3 rounded-lg border border-dashed border-border text-muted-foreground font-bold text-[13px] hover:bg-muted/50"
          >
            + Add query
          </button>
        )}
      </div>

      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616] text-left">
        <div className="flex items-center gap-1.5 mb-6">
          <h2 className="text-[18px] font-black leading-tight"><EditableVal val="Your top posts" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>
        <div className="space-y-6">
          {data.topPosts.map((post: any, idx: number) => (
            <div key={idx} className="flex gap-3">
              <span className="text-muted-foreground text-[13px] font-black mt-1 w-4 text-center leading-[1.3]"><EditableVal val={post.id} isEditing={isEditing} /></span>
              <div className="relative w-[72px] h-[96px] bg-muted rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img src={`https://picsum.photos/seed/studio-top-${post.id || idx + 1}/200/280`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <EditableImage id={`overview_top_post_${idx}`} isEditing={isEditing} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-[14.5px] font-bold text-foreground leading-[1.3] line-clamp-2 mb-1"><EditableVal val={post.title} isEditing={isEditing} /></h3>
                <p className="text-muted-foreground text-[12px] font-bold leading-tight mb-0.5"><EditableVal val={post.views} isEditing={isEditing} /></p>
                <p className="text-muted-foreground text-[12px] font-bold leading-tight"><EditableVal val={post.date} isEditing={isEditing} /></p>
              </div>
            </div>
          ))}
          {isEditing && (
            <button
              onClick={() => onUpdate({ topPosts: [...data.topPosts, { id: data.topPosts.length + 1, title: "New Top Post", views: "0 views", date: "Just now" }] })}
              className="w-full mt-4 py-3 rounded-lg border border-dashed border-border text-muted-foreground font-bold text-[13px] hover:bg-muted/50"
            >
              + Add post
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


const ViewersContent = ({ isEditing, data, onUpdate, onSeeMore }: { isEditing: boolean, data: any, onUpdate: (d: any) => void, onSeeMore: () => void }) => {
  const selectedMetric = data.selectedMetric;
  const insightTab = data.insightTab;
  const vGraphData = data.graphData;

  return (
    <div className="space-y-2.5">
      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <h2 className="text-[17px] font-black"><EditableVal val="Key metrics" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>
        <p className="text-muted-foreground text-[13px] mb-4 font-black uppercase tracking-tight"><EditableVal val="Feb 10 - Mar 9" isEditing={isEditing} /></p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(data.metrics).map(([key, m]: [string, any]) => (
            <MetricCard
              key={key}
              isEditing={isEditing}
              id={key}
              label={key.replace("_", " ")}
              selected={selectedMetric === key}
              val={m.val}
              trend={m.trend}
              onClick={() => onUpdate({ selectedMetric: key })}
              onUpdate={(nd) => onUpdate({ metrics: { ...data.metrics, [key]: { ...m, ...nd } } })}
            />
          ))}
        </div>

        <div className="relative h-[160px] mt-4 select-none">
          {[3501, 2334, 1167].map((v, i) => (
            <div key={i} className="absolute right-0 text-[11px] text-muted-foreground/50 font-bold" style={{ top: `${i * 33}%`, transform: 'translateY(-50%)' }}>
              <EditableVal val={v} isEditing={isEditing} />
            </div>
          ))}

          {[0, 33, 66, 100].map(pct => (
            <div key={pct} className="absolute left-0 right-8 border-t border-dashed border-muted-foreground/15" style={{ top: `${pct}%` }} />
          ))}

          <div className="absolute bottom-[-24px] left-0 text-[11px] text-muted-foreground/50 font-bold"><EditableVal val="Feb 10" isEditing={isEditing} /></div>
          <div className="absolute bottom-[-24px] right-8 text-[11px] text-muted-foreground/50 font-bold"><EditableVal val="Mar 9" isEditing={isEditing} /></div>

          <DrawablePolygonGraph
            data={vGraphData[selectedMetric]}
            onDataChange={(newData) => onUpdate({ graphData: { ...vGraphData, [selectedMetric]: newData } })}
            maxVal={3501}
            isEditing={isEditing}
            gradientId={`vgrad-${selectedMetric}`}
          />
        </div>
      </div>

      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616]">
        <div className="flex items-center gap-1.5 mb-4">
          <h2 className="text-[17px] font-black leading-tight"><EditableVal val="Viewer insights" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>

        <div className="flex gap-2 mb-4">
          <SubTabBtn label="Gender" active={insightTab === "gender"} onClick={() => onUpdate({ insightTab: "gender" })} isEditing={isEditing} />
          <SubTabBtn label="Age" active={insightTab === "age"} onClick={() => onUpdate({ insightTab: "age" })} isEditing={isEditing} />
          <SubTabBtn label="Locations" active={insightTab === "locations"} onClick={() => onUpdate({ insightTab: "locations" })} isEditing={isEditing} />
        </div>

        {insightTab === "gender" && (
          <div>
            <div className="relative w-full h-[180px] flex flex-col items-center justify-center mt-2 mb-2 select-none">
              <HalfDonutChart
                segments={(data.genderData || [
                  { label: "Male", pct: "68%", color: "#00a1ff" },
                  { label: "Female", pct: "30%", color: "#00a1ff66" },
                  { label: "Other", pct: "2%", color: "#00a1ff1a" }
                ]).map((g: any) => ({
                  value: parseFloat(g.pct.replace('%', '')) || 0,
                  color: g.color || "#00a1ff"
                }))}
              />
            </div>

            <div className="space-y-[1px] px-1">
              {(data.genderData || [
                { label: "Male", pct: "68%", color: "#00a1ff" },
                { label: "Female", pct: "30%", color: "#00a1ff66" },
                { label: "Other", pct: "2%", color: "#00a1ff1a" }
              ]).map((g: any, i: number, arr: any[]) => (
                <React.Fragment key={i}>
                  <GenderRow
                    color={g.color}
                    label={g.label}
                    pct={g.pct}
                    isEditing={isEditing}
                    onUpdate={(v) => {
                      const currentData = data.genderData || arr;
                      const next = [...currentData];
                      next[i] = { ...next[i], pct: v };
                      onUpdate({ genderData: next });
                    }}
                  />
                  {i < arr.length - 1 && <div className="h-[1px] bg-border w-full my-3" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {insightTab === "age" && (
          <div>
            <div className="space-y-[18px] px-1">
              <LocationBar label="18 - 24" pct="53.2%" width="53.2%" active={true} isEditing={isEditing} hideChevron />
              <LocationBar label="25 - 34" pct="37.1%" width="37.1%" active={true} isEditing={isEditing} hideChevron />
              <LocationBar label="35 - 44" pct="5.9%" width="5.9%" active={true} isEditing={isEditing} hideChevron />
              <LocationBar label="45 - 54" pct="2.7%" width="2.7%" active={true} isEditing={isEditing} hideChevron />
              <LocationBar label="55+" pct="1.1%" width="1.1%" active={true} isEditing={isEditing} hideChevron />
            </div>
          </div>
        )}

        {insightTab === "locations" && (
          <div>
            <div className="space-y-[18px] px-1">
              <LocationBar label="Nepal" pct="45.6%" width="45.6%" active={true} isEditing={isEditing} />
              <LocationBar label="United States" pct="6.9%" width="6.9%" active={true} isEditing={isEditing} />
              <LocationBar label="Germany" pct="3.3%" width="3.3%" active={true} isEditing={isEditing} />
              <LocationBar label="India" pct="3.3%" width="3.3%" active={true} isEditing={isEditing} />
              <LocationBar label="United Arab Emirates" pct="2.9%" width="2.9%" active={true} isEditing={isEditing} />
            </div>
            <button
              onClick={onSeeMore}
              className="w-full mt-6 py-3 rounded-xl bg-muted text-foreground font-bold text-[14.5px] hover:bg-muted/80 flex items-center justify-center border border-border"
            >
              <EditableVal val="See more" isEditing={isEditing} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616]">
        <div className="flex items-center gap-1.5 mb-4">
          <h2 className="text-[17px] font-black leading-tight"><EditableVal val="Most active times" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>

        <div className="flex gap-2 mb-6">
          <button className="px-4 py-2 rounded-lg text-[13px] font-bold bg-muted text-foreground">
            <EditableVal val="Hours" isEditing={isEditing} />
          </button>
          <button className="px-4 py-2 rounded-lg text-[13px] font-bold bg-transparent text-muted-foreground/30">
            <EditableVal val="Days" isEditing={isEditing} />
          </button>
        </div>

        <p className="text-foreground text-[14px] font-bold leading-[1.4] mb-8">
          <EditableVal val="In the last 7 days, your viewers were most active on Tuesday, between 4am to 5am." isEditing={isEditing} />
        </p>

        <div className="flex items-center justify-center gap-10 mb-8 font-bold">
          <ChevronLeft className="w-5 h-5 text-muted-foreground/30" />
          <span className="text-muted-foreground/30 text-[13px] uppercase tracking-wider"><EditableVal val="Mar 10" isEditing={isEditing} /></span>
          <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
        </div>

        <div className="relative h-[120px] select-none mt-2 px-2">
          {[24, 18, 12, 6, 0].map((v, i) => (
            <div key={i} className="absolute right-0 text-[11px] text-muted-foreground/60 font-bold" style={{ top: `${i * 25}%`, transform: 'translateY(-50%)' }}>
              <EditableVal val={v} isEditing={isEditing} />
            </div>
          ))}

          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} className="absolute left-0 right-8 border-t border-dashed border-muted-foreground/20" style={{ top: `${pct}%` }} />
          ))}

          <div className="absolute inset-0 right-8 flex items-end justify-between px-1">
            {[12, 11, 13, 10, 15, 18, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map((h, idx) => (
              <div key={idx} className={`w-[8px] rounded-t-[1px] transition-colors ${idx === 5 ? 'bg-accent-foreground/60' : 'bg-muted-foreground/20'}`} style={{ height: `${(h / 24) * 100}%` }}>
                {idx === 5 && (
                  <div className="absolute bottom-[80%] left-1/2 -translate-x-1/2 z-10 pointer-events-none mb-1">
                    <div className="bg-card rounded-lg border border-border p-2 shadow-xl flex flex-col items-start gap-0.5">
                      <span className="text-[10px] text-foreground font-bold"><EditableVal val="5pm" isEditing={isEditing} /></span>
                      <div className="w-full h-[1px] bg-border my-0.5" />
                      <span className="text-[13px] text-foreground font-black leading-none"><EditableVal val="0" isEditing={isEditing} /></span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="absolute bottom-[-24px] left-0 right-8 flex justify-between text-[11px] text-muted-foreground/60 font-bold">
            <EditableVal val="12a" isEditing={isEditing} />
            <EditableVal val="4a" isEditing={isEditing} />
            <EditableVal val="8a" isEditing={isEditing} />
            <EditableVal val="12p" isEditing={isEditing} />
            <EditableVal val="4p" isEditing={isEditing} />
            <EditableVal val="8p" isEditing={isEditing} />
          </div>
        </div>
      </div>

      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616]">
        <div className="flex items-center gap-1.5 mb-6">
          <h2 className="text-[17px] font-bold"><EditableVal val="Creators your viewers also watched" isEditing={isEditing} /></h2>
          <span className="text-muted-foreground"><Info className="w-4 h-4 px-[1px]" /></span>
        </div>
        <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-2">
          {[
            { name: "FallonTonight", followers: "28M followers" },
            { name: "Saturday Nig...", followers: "13M followers" },
            { name: "Blaseeeeeee...", followers: "5.2M followers" },
            { name: "Subway Sur...", followers: "11M followers" }
          ].map((c, i) => (
            <div key={i} className="flex flex-col items-center min-w-[100px] text-center">
              <div className="w-[82px] h-[82px] rounded-full overflow-hidden bg-muted mb-3 relative border border-border">
                <img src={`https://i.pravatar.cc/200?u=${encodeURIComponent(c.name)}`} alt={c.name} className="absolute inset-0 w-full h-full object-cover rounded-full" />
                <EditableImage id={`viewers_creator_${i}`} isEditing={isEditing} className="rounded-full" />
              </div>
              <h3 className="text-[14px] font-bold text-foreground mb-1 truncate w-full px-1"><EditableVal val={c.name} isEditing={isEditing} /></h3>
              <p className="text-[12px] text-muted-foreground font-bold"><EditableVal val={c.followers} isEditing={isEditing} /></p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616]">
        <div className="flex items-center gap-1.5 mb-6">
          <h2 className="text-[17px] font-bold"><EditableVal val="Posts your viewers also viewed" isEditing={isEditing} /></h2>
          <span className="text-muted-foreground"><Info className="w-4 h-4 px-[1px]" /></span>
        </div>
        <p className="text-muted-foreground text-[14px] font-medium leading-relaxed">
          <EditableVal val="You'll be able to see this information once there's enough data for analysis." isEditing={isEditing} />
        </p>
      </div>
    </div>
  );
}


const InspirationContent = ({ isEditing, data, onUpdate }: { isEditing: boolean, data: any, onUpdate: (d: any) => void }) => {
  const topics = data.topics;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-card px-4 py-5 relative overflow-hidden text-left border-t-[6px] border-[#f3f3f3] dark:border-[#161616]">
        <h2 className="text-[20px] font-bold mb-1.5 text-foreground"><EditableVal val="Creation Inspiration" isEditing={isEditing} /></h2>
        <p className="text-muted-foreground text-[14px] mb-6 font-medium"><EditableVal val="Discover your next big idea!" isEditing={isEditing} /></p>

        <div className="flex overflow-x-auto gap-2 mb-8 scrollbar-hide -mx-1 px-1">
          <button className="whitespace-nowrap px-[18px] py-[7.5px] rounded-full text-[14px] font-bold bg-foreground text-background shrink-0">
            <EditableVal val="Trending topics" isEditing={isEditing} />
          </button>
          <button className="whitespace-nowrap px-[18px] py-[7.5px] rounded-full text-[14px] font-bold bg-muted text-foreground shrink-0">
            <EditableVal val="Similar posts" isEditing={isEditing} />
          </button>
          <button className="whitespace-nowrap px-[18px] py-[7.5px] rounded-full text-[14px] font-bold bg-muted text-foreground shrink-0">
            <EditableVal val="Followers viewed" isEditing={isEditing} />
          </button>
        </div>

        <p className="text-muted-foreground text-[12.5px] mb-6 font-bold uppercase tracking-tight"><EditableVal val="Post on these topics for possible virality." isEditing={isEditing} /></p>

        <div className="space-y-[22px]">
          {topics.map((topic, i) => {
            const bgRank = i === 0 ? "bg-[#ffcc00]" : i === 1 ? "bg-[#e5e5ea]" : i === 2 ? "bg-[#ff9500]" : "bg-muted";
            const textRank = i < 3 ? "text-black" : "text-foreground";

            return (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-[20px] h-[20px] text-[11px] font-black rounded-[4px] flex shrink-0 items-center justify-center mt-1.5 ${bgRank} ${textRank}`}>
                  <EditableVal val={i + 1} isEditing={isEditing} />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-foreground font-bold text-[15.5px] leading-[1.3] mb-1.5"><EditableVal val={topic.text} isEditing={isEditing} /></h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-muted-foreground/30" />
                      <span className="text-muted-foreground text-[13px] font-bold"><EditableVal val={topic.count} isEditing={isEditing} /></span>
                    </div>
                    <div className="h-4 flex items-end gap-[1.5px]">
                      {[40, 70, 50, 90, 60].map((h, k) => (
                        <div key={k} className="w-[3px] bg-[#007aff]/30 rounded-full" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="w-[62px] h-[86px] rounded-lg bg-muted/30 flex-shrink-0 relative overflow-hidden border border-border/50">
                  {!topic.image && (
                    <img src={`https://picsum.photos/seed/studio-insp-${i + 1}/200/280`} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  )}
                  <EditableImage
                    src={topic.image}
                    isEditing={isEditing}
                    onUpdate={(src) => {
                      const next = [...topics];
                      next[i] = { ...next[i], image: src };
                      onUpdate({ inspiration: { ...data, topics: next } });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {isEditing && (
          <button
            onClick={() => onUpdate({ topics: [...topics, { id: topics.length + 1, text: "New Trending Topic", count: "0" }] })}
            className="w-full mt-10 py-3.5 rounded-xl border border-dashed border-border text-muted-foreground font-bold text-[14.5px] hover:bg-muted/50"
          >
            + Add topic
          </button>
        )}
      </div>
    </div>
  );
};

const ContentTabContent = ({ isEditing, data, onUpdate }: { isEditing: boolean, data: any, onUpdate: (d: any) => void }) => {
  const videos = data.videos;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616] text-left">
        <div className="flex items-center gap-1.5 mb-6">
          <h2 className="text-[17px] font-bold"><EditableVal val="Video posts" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {["Most views", "Most new viewers", "Most likes", "Most shares"].map(t => (
            <button key={t} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[13.5px] font-bold ${t === "Most views" ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground/50"}`}>
              <EditableVal val={t} isEditing={isEditing} />
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          {videos.map((vid: any, idx: number) => (
            <div key={idx} className="flex gap-3">
              <span className="text-muted-foreground text-[13px] font-black mt-1 w-4 text-center leading-[1.3]"><EditableVal val={vid.id || idx + 1} isEditing={isEditing} /></span>
              <div className="relative w-[74px] h-[100px] bg-muted/30 rounded-xl flex-shrink-0 overflow-hidden border border-border/50">
                {!vid.image && (
                  <img
                    src={`https://picsum.photos/seed/studio-vid-${vid.id || idx + 1}/200/280`}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                <EditableImage
                  src={vid.image}
                  isEditing={isEditing}
                  onUpdate={(src) => {
                    const next = [...videos];
                    next[idx] = { ...next[idx], image: src };
                    onUpdate({ videos: next });
                  }}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-[14.5px] font-bold text-foreground leading-[1.3] line-clamp-2 mb-1"><EditableVal val={vid.title || "The future of trading is almost here best Ai Of 2026 #viralityflooz"} isEditing={isEditing} /></h3>
                <p className="text-muted-foreground text-[12px] font-bold leading-tight mb-0.5"><EditableVal val={`${vid.views} views in the last 7 days`} isEditing={isEditing} /></p>
                <p className="text-muted-foreground text-[12px] font-bold leading-tight"><EditableVal val={vid.date} isEditing={isEditing} /></p>
              </div>
            </div>
          ))}
          {isEditing && (
            <button
              onClick={() => onUpdate({
                videos: [
                  ...videos,
                  { id: videos.length + 1, title: "New Video", date: "Just now", views: "0", likes: "0", comments: "0" }
                ]
              })}
              className="w-full py-3.5 rounded-xl border border-dashed border-border text-muted-foreground font-bold text-[14.5px] hover:bg-muted/50 mt-4"
            >
              + Add video
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const FollowersContent = ({ isEditing, data, onUpdate }: { isEditing: boolean, data: any, onUpdate: (d: any) => void }) => {
  const selectedMetric = data.selectedMetric;
  const insightTab = data.insightTab;
  const fGraphData = data.graphData;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616] text-left">
        <div className="flex items-center gap-1.5 mb-1.5">
          <h2 className="text-[17px] font-bold"><EditableVal val="Key metrics" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>
        <p className="text-muted-foreground text-[13px] mb-5 font-medium"><EditableVal val="Mar 3 - Mar 9" isEditing={isEditing} /></p>

        <div className="grid grid-cols-2 gap-2 mb-8">
          {Object.entries(data.metrics).map(([key, m]: [string, any]) => (
            <MetricCard
              key={key}
              isEditing={isEditing}
              id={key}
              label={key.replace("_", " ")}
              selected={selectedMetric === key}
              val={m.val}
              trend={m.trend}
              onClick={() => onUpdate({ selectedMetric: key })}
              onUpdate={(nd) => onUpdate({ metrics: { ...data.metrics, [key]: { ...m, ...nd } } })}
            />
          ))}
        </div>

        <div className="relative h-[160px] mt-8 select-none">
          {[24, 16, 8].map((v, i) => (
            <div key={v} className="absolute right-0 text-[11px] text-muted-foreground font-bold" style={{ top: `${i * 33}%`, transform: 'translateY(-50%)' }}>
              <EditableVal val={v} isEditing={isEditing} />
            </div>
          ))}

          {[0, 33, 66, 100].map(pct => (
            <div key={pct} className="absolute left-0 right-8 border-t border-dashed border-border" style={{ top: `${pct}%` }} />
          ))}

          <div className="absolute bottom-[-24px] left-0 text-[11px] text-muted-foreground/50 font-bold"><EditableVal val="Mar 3" isEditing={isEditing} /></div>
          <div className="absolute bottom-[-24px] right-8 text-[11px] text-muted-foreground/50 font-bold"><EditableVal val="Mar 9" isEditing={isEditing} /></div>

          <DrawablePolygonGraph
            data={fGraphData[selectedMetric]}
            onDataChange={(newData) => onUpdate({ graphData: { ...fGraphData, [selectedMetric]: newData } })}
            maxVal={24}
            isEditing={isEditing}
            gradientId={`fgrad-${selectedMetric}`}
          />
        </div>
      </div>

      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616] text-left">
        <div className="flex items-center gap-1.5 mb-6">
          <h2 className="text-[17px] font-bold"><EditableVal val="Follower insights" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground/30 px-[1px]" />
        </div>

        <div className="flex gap-2 mb-8">
          <SubTabBtn label="Gender" active={insightTab === "gender"} onClick={() => onUpdate({ insightTab: "gender" })} isEditing={isEditing} />
          <SubTabBtn label="Age" active={insightTab === "age"} onClick={() => onUpdate({ insightTab: "age" })} isEditing={isEditing} />
          <SubTabBtn label="Locations" active={insightTab === "locations"} onClick={() => onUpdate({ insightTab: "locations" })} isEditing={isEditing} />
        </div>

        {insightTab === "gender" && (
          <div className="animate-in fade-in duration-300">
            <div className="relative w-full h-[180px] flex flex-col items-center justify-center mt-2 mb-2 select-none">
              <HalfDonutChart
                segments={(data.genderData || [
                  { label: "Male", pct: "68%", color: "#00a1ff" },
                  { label: "Female", pct: "30%", color: "#00a1ff66" },
                  { label: "Other", pct: "2%", color: "#00a1ff1a" }
                ]).map((g: any) => ({
                  value: parseFloat(g.pct.replace('%', '')) || 0,
                  color: g.color || "#00a1ff"
                }))}
              />
            </div>
            <div className="space-y-[1px] px-1">
              {(data.genderData || [
                { label: "Male", pct: "68%", color: "#00a1ff" },
                { label: "Female", pct: "30%", color: "#00a1ff66" },
                { label: "Other", pct: "2%", color: "#00a1ff1a" }
              ]).map((g: any, i: number, arr: any[]) => (
                <React.Fragment key={i}>
                  <GenderRow
                    color={g.color}
                    label={g.label}
                    pct={g.pct}
                    isEditing={isEditing}
                    onUpdate={(v) => {
                      const currentData = data.genderData || arr;
                      const next = [...currentData];
                      next[i] = { ...next[i], pct: v };
                      onUpdate({ genderData: next });
                    }}
                  />
                  {i < arr.length - 1 && <div className="h-[1px] bg-border w-full my-3" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Age and Location segments already updated in previous views */}
      </div>

      <div className="bg-card px-4 py-4 border-t-[6px] border-[#f3f3f3] dark:border-[#161616] text-left">
        <div className="flex items-center gap-1.5 mb-6">
          <h2 className="text-[17px] font-black leading-tight"><EditableVal val="Most active times" isEditing={isEditing} /></h2>
          <Info className="w-4 h-4 text-muted-foreground px-[1px]" />
        </div>

        <div className="flex gap-2 mb-6">
          <button className="px-4 py-2 rounded-lg text-[13px] font-bold bg-muted text-foreground">
            <EditableVal val="Hours" isEditing={isEditing} />
          </button>
          <button className="px-4 py-2 rounded-lg text-[13px] font-bold bg-transparent text-muted-foreground/30">
            <EditableVal val="Days" isEditing={isEditing} />
          </button>
        </div>

        <p className="text-muted-foreground text-[13.5px] font-bold leading-[1.4] mb-8">
          <EditableVal val="Information will be displayed when there is enough data." isEditing={isEditing} />
        </p>
        <div className="border-t border-dashed border-border w-full mb-4" />
      </div>
    </div>
  );
};


// -----------------------------------------------------
// HELPER COMPONENTS
// -----------------------------------------------------


const HalfDonutChart = ({ segments }: { segments: { value: number, color: string }[] }) => {
  const radius = 80;
  const strokeWidth = 28;
  const center = 100;
  const circumference = Math.PI * radius; // Half circle

  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  let currentOffset = 0;

  return (
    <svg viewBox="0 0 200 110" className="w-[240px] h-[130px] overflow-visible">
      <path
        d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
        className="text-foreground/10"
      />
      {segments.map((s, i) => {
        const sliceLength = (s.value / total) * circumference;
        // Add a tiny overlap (0.5) to prevent gaps
        const strokeDasharray = `${sliceLength + 0.5} ${circumference * 2}`;
        const dashOffset = currentOffset;
        currentOffset -= sliceLength;

        return (
          <path
            key={i}
            d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            style={{ transformOrigin: 'center', transform: 'rotate(0deg)' }}
          />
        );
      })}
    </svg>
  );
};

const GenderRow = ({ color, label, pct, isEditing, onUpdate, className = "", showChevron = false }: { color: string; label: string; pct: string; isEditing: boolean; onUpdate?: (v: string) => void; className?: string; showChevron?: boolean }) => (
  <div className={`flex items-center justify-between py-1 ${className}`}>
    <div className="flex items-center gap-3">
      <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[15px] font-bold text-foreground truncate"><EditableVal val={label} isEditing={isEditing} /></span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="text-[15px] font-black text-foreground"><EditableVal val={pct} isEditing={isEditing} onUpdate={onUpdate} /></span>
      {showChevron && <ChevronRight className="w-4 h-4 text-muted-foreground/30" />}
    </div>
  </div>
);

const EditableVal = ({ val, isEditing, className = "", onUpdate, id }: { val: string | number; isEditing: boolean; className?: string; onUpdate?: (v: string) => void; id?: string }) => {
  const getInitialVal = () => {
    if (onUpdate) return val;
    try {
      const saved = localStorage.getItem("tiktok_overrides");
      if (saved) {
        const overrides = JSON.parse(saved);
        const overrideKey = id || String(val);
        if (overrides[overrideKey] !== undefined) {
           return overrides[overrideKey];
        }
      }
    } catch(e) {}
    return val;
  };

  const [internalVal, setInternalVal] = useState(getInitialVal);

  useEffect(() => {
    if (onUpdate) {
      setInternalVal(val);
    } else {
      setInternalVal(getInitialVal());
    }
  }, [val, onUpdate, id]);

  return (
    <span
      contentEditable={isEditing}
      suppressContentEditableWarning
      onPointerDown={e => { if (isEditing) e.stopPropagation(); }}
      onBlur={(e) => {
        const text = e.currentTarget.textContent || "";
        setInternalVal(text);
        if (onUpdate) {
          onUpdate(text);
        } else {
          try {
             const saved = localStorage.getItem("tiktok_overrides");
             const overrides = saved ? JSON.parse(saved) : {};
             overrides[id || String(val)] = text;
             localStorage.setItem("tiktok_overrides", JSON.stringify(overrides));
          } catch(err) {}
        }
      }}
      className={`outline-none transition-all ${isEditing ? 'border border-dashed border-[#fe2c55] text-foreground bg-[#fe2c55]/5 rounded px-1' : ''} ${className}`}
    >
      {internalVal}
    </span>
  );
};

const DrawablePolygonGraph = ({ data, onDataChange, maxVal, isEditing, gradientId, showTooltip = false }: { data: number[], onDataChange: (d: number[]) => void, maxVal: number, isEditing: boolean, gradientId: string, showTooltip?: boolean }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDrawing = useRef(false);

  const getPt = (e: React.PointerEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 300;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(300, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const updatePt = (e: React.PointerEvent) => {
    const pt = getPt(e);
    if (pt) {
      const idx = Math.min(data.length - 1, Math.max(0, Math.round((pt.x / 300) * (data.length - 1))));
      const val = Math.max(0, Math.round(((100 - pt.y) / 100) * maxVal));
      const next = [...data];
      next[idx] = val;
      onDataChange(next);
    }
  };

  return (
    <div className="absolute inset-0 w-[calc(100%-32px)] h-full overflow-hidden">
      <svg
        ref={svgRef}
        className={`absolute inset-0 w-full h-full overflow-visible ${isEditing ? "touch-none cursor-crosshair" : "pointer-events-none"}`}
        viewBox="0 0 300 100"
        preserveAspectRatio="none"
        onPointerDown={e => {
          if (!isEditing) return;
          isDrawing.current = true;
          (e.target as Element).setPointerCapture(e.pointerId);
          updatePt(e);
          e.stopPropagation();
        }}
        onPointerMove={e => {
          if (!isEditing || !isDrawing.current) return;
          updatePt(e);
          e.stopPropagation();
        }}
        onPointerUp={e => {
          isDrawing.current = false;
          (e.target as Element).releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => { isDrawing.current = false; }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00a1ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00a1ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${data.map((v: number, i: number) => `${(i / (data.length - 1)) * 300},${100 - (v / maxVal) * 100}`).join(" ")} 300,100`}
          fill={`url(#${gradientId})`}
        />
        {data.map((v: number, i: number) => {
          const x = (i / (data.length - 1)) * 300;
          const y = 100 - (v / maxVal) * 100;
          if (i === 0) return null;
          const prevX = ((i - 1) / (data.length - 1)) * 300;
          const prevY = 100 - (data[i - 1] / maxVal) * 100;
          return <line key={`line-${i}`} x1={prevX} y1={prevY} x2={x} y2={y} stroke="#00a1ff" strokeWidth="2.5" />;
        })}
        {data.map((v: number, i: number) => {
          const x = (i / (data.length - 1)) * 300;
          const y = 100 - (v / maxVal) * 100;
          return <circle key={`point-${i}`} cx={x} cy={y} r="2" fill="#ffffff" stroke="#00a1ff" strokeWidth="1.5" />;
        })}
      </svg>

      {showTooltip && (
        <div className="absolute right-[100px] bottom-[40px] z-10 pointer-events-none sm:pointer-events-auto">
          <div className="bg-card rounded-lg border border-border p-2 shadow-xl flex flex-col items-start gap-0.5">
            <span className="text-[10px] text-muted-foreground font-bold uppercase"><EditableVal val="Mar 7" isEditing={isEditing} /></span>
            <span className="text-[13px] text-foreground font-black leading-none"><EditableVal val="$0.00" isEditing={isEditing} /></span>
          </div>
          <div className="w-[1.5px] h-[70px] bg-border mx-auto mt-1" />
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ label, active, onClick, dot, isEditing }: { label: string; active: boolean; onClick: () => void; dot?: boolean; isEditing: boolean }) => (
  <button onClick={onClick} className="relative pb-3 pt-1 whitespace-nowrap">
    <span className={`text-[15.5px] font-black ${active ? "text-foreground" : "text-muted-foreground"}`}>
      <EditableVal val={label} isEditing={isEditing} />
    </span>
    {dot && <span className="absolute top-1 -right-2 w-1.5 h-1.5 bg-[#fe2c55] rounded-full" />}
    {active && <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-foreground rounded-t-sm" />}
  </button>
);

const SubTabBtn = ({ label, active, onClick, isEditing }: { label: string; active: boolean; onClick: () => void; isEditing: boolean }) => (
  <button
    onClick={onClick}
    className={`px-[18px] py-[7px] rounded-full text-[14px] font-bold ${active ? "bg-foreground text-background" : "bg-muted text-foreground"
      }`}
  >
    <EditableVal val={label} isEditing={isEditing} />
  </button>
);

const MetricCard = ({
  id, label, selected, val, trend, onClick, isEditing, onUpdate
}: {
  id: string; label: string; selected: boolean; val: string; trend: string; onClick: () => void; isEditing: boolean; onUpdate?: (d: any) => void;
}) => {
  const [currentTrend, setCurrentTrend] = useState(trend);

  const getTrendType = (t: string): "up" | "down" | "neutral" => {
    if (t.startsWith("+")) return "up";
    if (t.startsWith("-")) return "down";
    return "neutral";
  };

  const trendType = getTrendType(currentTrend);

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border text-left flex flex-col justify-between min-h-[105px] ${selected
        ? "bg-[#e9f8ff] border-[#bae5f8] dark:bg-[#00a1ff20] dark:border-[#00a1ff40]"
        : "border-border bg-card"
        }`}
    >
      <span className="text-[13px] text-foreground/60 font-black capitalize tracking-tight">
        <EditableVal val={label} isEditing={isEditing} onUpdate={(v) => onUpdate?.({ label: v })} />
      </span>
      <div>
        <div className="text-[22px] font-black mt-1 leading-tight text-foreground">
          <EditableVal val={val} isEditing={isEditing} onUpdate={(v) => onUpdate?.({ val: v })} />
        </div>
        <div className="flex items-center gap-1 mt-1">
          {trendType === "up" && (
            <div className="bg-accent rounded-full w-[15px] h-[15px] flex items-center justify-center">
              <ArrowUp className="w-[10px] h-[10px] text-accent-foreground" strokeWidth={4} />
            </div>
          )}
          {trendType === "down" && (
            <div className="bg-muted rounded-full w-[15px] h-[15px] flex items-center justify-center">
              <ArrowDown className="w-[10px] h-[10px] text-muted-foreground" strokeWidth={4} />
            </div>
          )}
          <span className={`text-[12px] font-bold ${trendType === "up" ? "text-[#00b2c1]" : (trendType === "down" ? "text-muted-foreground" : "text-muted-foreground/50")}`}>
            <EditableVal
              val={trend}
              isEditing={isEditing}
              onUpdate={(v) => {
                setCurrentTrend(v);
                onUpdate?.({ trend: v });
              }}
            />
          </span>
        </div>
      </div>
    </button>
  );
};

const TrafficBar = ({ label, pct, active = false, isEditing }: { label: string; pct: string; active?: boolean; isEditing: boolean }) => {
  const [currentPct, setCurrentPct] = useState(pct);
  const [barWidth, setBarWidth] = useState(pct);

  const handleUpdate = (v: string) => {
    setCurrentPct(v);
    const num = parseFloat(v.replace('%', ''));
    if (!isNaN(num)) {
      setBarWidth(`${num}%`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center text-[15px] mb-2 font-bold">
        <span className="text-foreground shrink-0 pr-2"><EditableVal val={label} isEditing={isEditing} /></span>
        <span className="text-foreground font-black"><EditableVal val={currentPct} isEditing={isEditing} onUpdate={handleUpdate} /></span>
      </div>
      <div className="w-full h-[12px] bg-[#e5e7eb] dark:bg-[#2a2a2a] overflow-hidden mt-1.5 relative">
        <div
          className="h-full bg-[#00a1ff] absolute left-0 top-0 transition-all duration-300"
          style={{ width: barWidth }}
        />
      </div>
    </div>
  );
};

const LocationBar = ({ label, pct, width, active = false, isEditing, hideChevron = false }: { label: string; pct: string; width: string; active?: boolean; isEditing: boolean; hideChevron?: boolean }) => {
  const [currentPct, setCurrentPct] = useState(pct);
  const [barWidth, setBarWidth] = useState(width);

  const handleUpdate = (v: string) => {
    setCurrentPct(v);
    const num = parseFloat(v.replace('%', ''));
    if (!isNaN(num)) {
      setBarWidth(`${num}%`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center text-[15px] mb-2 font-black">
        <span className="text-foreground truncate pr-2"><EditableVal val={label} isEditing={isEditing} /></span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-foreground font-black">
            <EditableVal val={currentPct} isEditing={isEditing} onUpdate={handleUpdate} />
          </span>
          {!hideChevron && <ChevronRight className="w-4 h-4 text-muted-foreground/60" strokeWidth={3} />}
        </div>
      </div>
      <div className="w-full h-[12px] bg-[#e5e7eb] dark:bg-[#2a2a2a] overflow-hidden mt-1.5 relative">
        <div
          className="h-full bg-[#00a1ff] absolute left-0 top-0 transition-all duration-300"
          style={{ width: barWidth }}
        />
      </div>
    </div>
  );
};

const EditableImage = ({ src, isEditing, className = "", onUpdate, id }: { src?: string; isEditing: boolean; className?: string; onUpdate?: (s: string) => void; id?: string }) => {
  const getInitialVal = () => {
    if (onUpdate) return src || "";
    try {
      const saved = localStorage.getItem("tiktok_image_overrides");
      if (saved) {
        const overrides = JSON.parse(saved);
        if (id && overrides[id] !== undefined) return overrides[id];
      }
    } catch(e) {}
    return src || "";
  };

  const [internalSrc, setInternalSrc] = useState(getInitialVal);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (onUpdate) setInternalSrc(src || "");
    else setInternalSrc(getInitialVal());
  }, [src, onUpdate, id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setInternalSrc(preview);
      if (onUpdate) onUpdate(preview);
      
      setIsUploading(true);
      try {
        const res = await uploadToCloudinary(file);
        setInternalSrc(res.secure_url);
        if (onUpdate) {
          onUpdate(res.secure_url);
        } else if (id) {
          const saved = localStorage.getItem("tiktok_image_overrides");
          const overrides = saved ? JSON.parse(saved) : {};
          overrides[id] = res.secure_url;
          localStorage.setItem("tiktok_image_overrides", JSON.stringify(overrides));
        }
      } catch (err) {
        console.error(err);
      }
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <div
        className={`absolute inset-0 z-10 flex items-center justify-center transition-all ${className} ${isEditing ? 'cursor-pointer hover:bg-foreground/10 bg-black/10' : ''}`}
        onClick={() => { if (isEditing) fileInputRef.current?.click(); }}
      >
        {internalSrc ? (
          <img src={internalSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          isEditing && (
            <div className="flex flex-col items-center gap-1 opacity-60">
              <div className="w-5 h-5 border-[1.5px] border-foreground rounded-sm flex items-center justify-center">
                <div className="w-[1px] h-2 bg-foreground" />
                <div className="w-2 h-[1px] bg-foreground absolute" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter">
                {isUploading ? "..." : "Edit"}
              </span>
            </div>
          )
        )}
      </div>
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
    </>
  );
};
