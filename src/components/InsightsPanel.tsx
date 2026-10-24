import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { ReelData, formatNumber, formatViewsDisplay } from "@/lib/mockData";
import { ArrowLeft, Play, Heart, MessageCircle, Share2, Bookmark, Info, ChevronRight, X, Save, Upload, Settings, Image as ImageIcon, Edit3 } from "lucide-react";
import { CommentIcon } from "./CommentIcon";
import { ShareIcon } from "@/components/ShareIcon";
import { parseInputNumber, parseDuration, formatDuration } from "@/lib/utils";
import { orderedAudienceRegions } from "@/lib/bulkInsights";

const formatDurationDisplay = (raw: string): string => {
  if (!raw) return "0s";
  const trimmed = raw.trim();
  if (/s$/i.test(trimmed)) return trimmed;
  const mmss = trimmed.match(/^(\d+):(\d{2})$/);
  if (mmss) return `${parseInt(mmss[1]) * 60 + parseInt(mmss[2])}s`;
  const n = trimmed.match(/[\d.]+/);
  return n ? `${n[0]}s` : trimmed;
};

// TikTok-style count: exact with commas under 10K, then "K" (floored)
const formatCount = (n: number): string => {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return (Math.floor(n / 100_000) / 10) + "M";
  if (n >= 10_000) return Math.floor(n / 1000) + "K";
  return n.toLocaleString("en-US");
};

const formatInsightMoment = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;


const formatPostedDate = (raw: string): string => {
  if (!raw) return "";
  // If user already typed a custom string, keep it
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const dateStr = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const hasTime = /\d{1,2}:\d{2}/.test(raw) || raw.includes("T");
  const timeStr = hasTime
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    : "7:00 PM";
  return `${dateStr}, ${timeStr}`;
};

interface InsightsPanelProps {
  reel: ReelData;
  onClose: () => void;
  onSave?: (updated: ReelData) => void;
}

type TabName = "inspiration" | "overview" | "viewers" | "engagement";
type EditSection = null | "quickStats" | "keyMetrics" | "graph" | "traffic" | "viewerTypes" | "gender" | "age" | "locations" | "thumbnail" | "tab_overview" | "tab_viewers" | "tab_engagement" | "tab_inspiration";

const ReelEditScopeContext = createContext("");

const TikTokDots = () => (
  <div className="tiktok-loader my-4">
    <div className="tiktok-dot tiktok-dot-cyan" />
    <div className="tiktok-dot tiktok-dot-red" />
  </div>
);

const SkeletonCard = () => (
  <div className="w-full space-y-6">
    {/* Profile row */}
    <div className="flex items-center gap-3 px-2">
      <div className="w-10 h-10 rounded-full skeleton" />
      <div className="space-y-2">
        <div className="h-4 w-24 skeleton" />
        <div className="h-3 w-16 skeleton opacity-50" />
      </div>
    </div>
    
    {/* Stats Grid */}
    <div className="grid grid-cols-3 gap-3 px-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-20 bg-muted/10 rounded-xl skeleton" />
      ))}
    </div>

    {/* Big Chart Area */}
    <div className="px-2">
      <div className="h-44 w-full bg-muted/10 rounded-2xl skeleton" />
    </div>

    {/* List items */}
    <div className="space-y-3 px-2">
      <div className="h-12 w-full skeleton rounded-xl" />
      <div className="h-12 w-full skeleton rounded-xl" />
    </div>
  </div>
);

const InsightsPanel = ({ reel, onClose, onSave }: InsightsPanelProps) => {
  const [localReel, setLocalReel] = useState<ReelData>(reel);
  const localReelRef = useRef<ReelData>(reel);
  const ins = localReel.insights;
  const [activeTab, setActiveTab] = useState<TabName>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // TikTok-style: show loading dots + skeleton for a moment before insights appear
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(t);
  }, [reel.id]);

  useEffect(() => {
    setLocalReel(reel);
    localReelRef.current = reel;
  }, [reel]);

  const commitLocalReel = (next: ReelData) => {
    localReelRef.current = next;
    setLocalReel(next);
  };

  const toggleEditMode = () => {
    setIsEditing(prev => !prev);
    if (navigator.vibrate) navigator.vibrate(30);
  };


  const updateReel = (updates: Partial<ReelData>) => {
    const next = { ...localReelRef.current, ...updates };
    commitLocalReel(next);
  };

  const updateInsights = (updates: any) => {
    const current = localReelRef.current;
    const next = { ...current, insights: { ...current.insights, ...updates } };
    commitLocalReel(next);
  };

  const handleTabChange = (tab: TabName) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  const handleDone = () => {
    const active = document.activeElement as HTMLElement | null;
    if (active?.isContentEditable) active.blur();
    setTimeout(() => {
      onSave?.(localReelRef.current);
      setIsEditing(false);
    }, 0);
  };

  return (
    <ReelEditScopeContext.Provider value={localReel.id}>
    <div 
      className="fixed inset-0 z-[60] min-h-0 bg-[#f7f7f8] dark:bg-[#141414] overflow-y-auto scrollbar-hide text-foreground overscroll-y-contain touch-pan-y"
      style={{ WebkitOverflowScrolling: "touch" }}
      onContextMenu={e => e.preventDefault()}
    >
      <div className="max-w-lg mx-auto min-h-screen flex flex-col bg-[#f7f7f8] dark:bg-[#141414] shadow-2xl relative border-x border-border/50">
        {isLoading && (
          <div className="absolute inset-x-0 top-14 bottom-0 z-40 bg-[#f7f7f8] dark:bg-[#141414] px-4 pt-2 animate-in fade-in">
            <TikTokDots />
            <SkeletonCard />
          </div>
        )}
        {/* Top bar */}
        <div className="sticky top-0 bg-[#f7f7f8] dark:bg-[#141414] z-10 pt-safe pl-safe pr-safe">
          <div className="relative flex items-center h-[52px] px-3">
            <button onClick={onClose} className="p-1 -ml-1 relative z-10">
              <ArrowLeft className="w-7 h-7 text-foreground" />
            </button>
            <h1
              className="fixed z-[70] -translate-x-1/2 -translate-y-1/2 text-center font-bold text-[16px] tracking-normal cursor-pointer select-none pointer-events-none whitespace-nowrap font-sans"
              style={{
                left: "calc(env(safe-area-inset-left, 0px) + (100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)) / 2)",
                top: "calc(env(safe-area-inset-top, 0px) + 26px)",
              }}
              onClick={toggleEditMode}
            >
              {isEditing ? (
                <span className="text-primary animate-pulse pointer-events-auto">Edit Mode</span>
              ) : (
                <span className="pointer-events-auto">Video analysis</span>
              )}
            </h1>
            <div className="ml-auto relative z-10">
            {isEditing ? (
              <button 
                onClick={handleDone}
                className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-[13px] font-black shadow-lg shadow-primary/20 shrink-0"
              >
                Done
              </button>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border bg-card shrink-0">
                <div className="relative">
                  <svg className="w-3.5 h-3.5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  <div className="absolute -bottom-[1px] -right-[1px] bg-card rounded-full p-[0.3px]">
                    <svg className="w-2 h-2 text-foreground" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.46 21z" />
                    </svg>
                  </div>
                </div>
                <span className="text-[11px] font-black tracking-tight text-foreground whitespace-nowrap">
                  <EditableVal val="TikTok Studio" isEditing={isEditing} />
                </span>
              </div>
            )}
            </div>
          </div>

        </div>

      {/* Video thumbnail + date */}
      <div className="flex flex-col items-center pt-5 pb-0 bg-[#f7f7f8] dark:bg-[#141414]">
        <div className="w-[90px] h-[120px] rounded-xl overflow-hidden relative mb-2 border border-border">
          <EditableImage isEditing={isEditing} />
          {!isEditing && (
            <>
              <img src={localReel.thumbnail} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-1.5 inset-x-0 flex justify-center pointer-events-none">
                <span className="text-white text-[12px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {formatDurationDisplay(localReel.duration)}
                </span>
              </div>
            </>
          )}
        </div>
        {isEditing && (
          <p className="text-foreground text-[13px] font-bold mb-2">
            Duration: <EditableVal val={localReel.duration} isEditing={isEditing} onUpdate={(v) => updateReel({ duration: v })} />
          </p>
        )}


        <p className="text-muted-foreground text-[13.5px] font-bold mb-4">
          Posted on <EditableVal val={formatPostedDate(localReel.createdAt)} isEditing={isEditing} onUpdate={(v) => updateReel({ createdAt: v })} />
        </p>

        {/* Quick stats */}
        <div className="flex items-center w-full px-4 mb-3.5">
          <QuickStat icon={(props: any) => <Play {...props} fill="currentColor" strokeWidth={1.5} />} value={formatCount(ins.views)} label="views" id="quick-stat-views" isEditing={isEditing} onUpdate={(v) => updateInsights({ views: parseInputNumber(v) })} />
          <Divider />
          <QuickStat icon={(props: any) => <Heart {...props} fill="currentColor" strokeWidth={1.5} />} value={formatCount(ins.likes)} label="likes" id="quick-stat-likes" isEditing={isEditing} onUpdate={(v) => updateInsights({ likes: parseInputNumber(v) })} />
          <Divider />
          <QuickStat icon={(props: any) => <CommentIcon {...props} className="w-[18px] h-[18px]" />} value={formatCount(ins.comments)} label="comments" id="quick-stat-comments" isEditing={isEditing} onUpdate={(v) => updateInsights({ comments: parseInputNumber(v) })} />
          <Divider />
          <QuickStat icon={(props: any) => <ShareIcon {...props} className="w-[18px] h-[18px]" variant="muted" />} value={formatCount(ins.shares)} label="shares" id="quick-stat-shares" isEditing={isEditing} onUpdate={(v) => updateInsights({ shares: parseInputNumber(v) })} />
          <Divider />
          <QuickStat icon={(props: any) => <Bookmark {...props} fill="currentColor" strokeWidth={1.5} />} value={formatCount(ins.saves)} label="saves" id="quick-stat-saves" isEditing={isEditing} onUpdate={(v) => updateInsights({ saves: parseInputNumber(v) })} />

        </div>

        {/* Tabs */}
        <div className="relative w-full border-b border-border overflow-hidden tab-shadow-right bg-[#f7f7f8] dark:bg-[#141414]">
          <div className="flex w-full scrollbar-hide overflow-x-auto px-4 justify-center gap-4">
            <TabBtn label="Inspiration" active={activeTab === "inspiration"} onClick={() => handleTabChange("inspiration")} isEditing={isEditing} />
            <TabBtn label="Overview" active={activeTab === "overview"} onClick={() => handleTabChange("overview")} isEditing={isEditing} />
            <TabBtn label="Viewers" active={activeTab === "viewers"} onClick={() => handleTabChange("viewers")} isEditing={isEditing} />
            <TabBtn label="Engagement" active={activeTab === "engagement"} onClick={() => handleTabChange("engagement")} isEditing={isEditing} />
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="pb-0 bg-card">
          <div>
            {activeTab === "overview" && <OverviewTab ins={ins} reel={localReel} isEditing={isEditing} onUpdate={updateInsights} />}
            {activeTab === "viewers" && <ViewersTab ins={ins} isEditing={isEditing} onUpdate={updateInsights} />}
            {activeTab === "engagement" && <EngagementTab ins={ins} reel={localReel} isEditing={isEditing} onUpdate={updateInsights} />}
            {activeTab === "inspiration" && <InspirationTab ins={ins} reel={localReel} isEditing={isEditing} />}
          </div>
        </div>
      </div>
    </div>
    </ReelEditScopeContext.Provider>
  );
};

/* ─── Helpers ─── */
const EditableVal = ({ val, isEditing, className = "", onUpdate, id }: { val: string | number; isEditing: boolean; className?: string; onUpdate?: (v: string) => void; id?: string }) => {
  const reelId = useContext(ReelEditScopeContext);
  const storageKey = id && reelId ? `${reelId}:${id}` : null;
  const getInitialVal = () => {
    if (onUpdate) return val;
    if (typeof window === "undefined") return val;
    try {
      const saved = storageKey ? localStorage.getItem("tiktok_overrides") : null;
      if (saved && storageKey) {
        const overrides = JSON.parse(saved);
        if (overrides[storageKey] !== undefined) return overrides[storageKey];
      }
    } catch(e) {}
    return val;
  };

  const [internalVal, setInternalVal] = useState(getInitialVal);

  useEffect(() => {
    if (isEditing) return;
    setInternalVal(getInitialVal());
  }, [val, onUpdate, id, isEditing]);

  return (
    <span 
      contentEditable={isEditing} 
      aria-label={isEditing ? id : undefined}
      suppressContentEditableWarning 
      onPointerDown={e => { if (isEditing) e.stopPropagation(); }}
      onBlur={(e) => {
        const text = e.currentTarget.textContent || "";
        setInternalVal(text);
        try {
          if (storageKey && !onUpdate) {
            const saved = localStorage.getItem("tiktok_overrides");
            const overrides = saved ? JSON.parse(saved) : {};
            overrides[storageKey] = text;
            localStorage.setItem("tiktok_overrides", JSON.stringify(overrides));
          }
        } catch(err) {}

        if (onUpdate) {
            onUpdate(text);
        }
      }}
      className={`outline-none transition-all ${isEditing ? 'border border-dashed border-[#fe2c55] text-foreground bg-[#fe2c55]/5 rounded px-1 min-w-[20px] inline-block' : ''} ${className}`}
    >
      {internalVal}
    </span>
  );
};

const HalfDonutChart = ({ segments }: { segments: { value: number, color: string }[] }) => {
  const radius = 80;
  const strokeWidth = 28;
  const center = 100;
  const circumference = Math.PI * radius;
  
  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  let currentOffset = 0;

  return (
    <svg viewBox="0 0 200 110" className="w-[170px] h-[95px] overflow-visible">
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
        // Add tiny overlap to prevent white gaps between segments
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
  <div className={`flex items-center justify-between py-0.5 ${className}`}>
    <div className="flex items-center gap-2.5">
      <div className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[13px] font-bold text-foreground truncate"><EditableVal val={label} isEditing={isEditing} /></span>
    </div>
    <div className="flex items-center gap-1">
      <span className="text-[13px] font-black text-foreground"><EditableVal val={pct} isEditing={isEditing} onUpdate={onUpdate} /></span>
      {showChevron && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
    </div>
  </div>

);

const MetricBar = ({ label, value, isEditing, onUpdate, onLabelUpdate, color = "#00a1ff", bgOpacity = "" }: { label: string; value: number; isEditing: boolean; onUpdate?: (v: number) => void; onLabelUpdate?: (v: string) => void; color?: string; bgOpacity?: string }) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [barWidth, setBarWidth] = useState(value);
  const [currentLabel, setCurrentLabel] = useState(label);

  useEffect(() => {
    setCurrentValue(value);
    setBarWidth(value);
  }, [value]);

  useEffect(() => {
    setCurrentLabel(label);
  }, [label]);

  const handleUpdate = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      setBarWidth(num);
      setCurrentValue(num);
      onUpdate?.(num);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center text-[15px] mb-2 font-bold leading-tight">
        <span className="text-foreground/90 truncate pr-2"><EditableVal val={currentLabel} isEditing={isEditing} onUpdate={onLabelUpdate ? (v) => { setCurrentLabel(v); onLabelUpdate(v); } : undefined} /></span>
        <span className="text-foreground font-black"><EditableVal val={`${currentValue}%`} isEditing={isEditing} onUpdate={handleUpdate} /></span>
      </div>
      <div className={`w-full h-[12px] bg-[#e5e7eb] dark:bg-[#2a2a2a] overflow-hidden mt-1.5 relative`}>
        <div 
          className="h-full absolute left-0 top-0 transition-all duration-300" 
          style={{ width: `${barWidth}%`, backgroundColor: color + bgOpacity }} 
        />
      </div>
    </div>
  );
};

const EditableImage = ({ isEditing }: { isEditing: boolean }) => {
  if (!isEditing) return null;
  return (
    <div 
      className="absolute inset-0 z-20 bg-background/40 dark:bg-black/40 flex items-center justify-center cursor-pointer"
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="w-8 h-8 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center border border-foreground/30">
        <Upload className="w-4 h-4 text-foreground" />
      </div>
      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
    </div>
  );
};

const TabBtn = ({ label, active, onClick, isEditing }: { label: string; active: boolean; onClick: () => void; isEditing: boolean }) => (
  <button
    onClick={onClick}
    className={`whitespace-nowrap pb-[1px] px-1 text-[13.5px] font-black transition-all text-center flex flex-col items-center gap-1 ${
      active ? "text-foreground" : "text-foreground/45"
    }`}
  >
    <EditableVal val={label} isEditing={isEditing} />
    <span className={`h-[2px] rounded-full transition-all ${active ? "w-[80px] bg-foreground" : "w-0 bg-transparent"}`} />
  </button>
);

const SubTabBtn = ({ label, active, onClick, isEditing }: { label: string; active: boolean; onClick: () => void; isEditing: boolean }) => (
  <button 
    onClick={onClick} 
    className={`px-[18px] py-[7px] rounded-full text-[14px] font-bold transition-colors ${
      active ? "bg-foreground text-background" : "bg-muted text-foreground"
    }`}
  >
    <EditableVal val={label} isEditing={isEditing} />
  </button>
);

const QuickStat = ({ icon: Icon, value, label, id, isEditing, onUpdate }: { icon: any; value: string; label: string; id?: string; isEditing: boolean; onUpdate?: (v: string) => void }) => (
  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1" aria-label={`${value} ${label}`} title={label}>
    <Icon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
    <span className="text-foreground text-[15px] font-semibold leading-none"><EditableVal val={value} isEditing={isEditing} onUpdate={onUpdate} id={id} /></span>
  </div>
);

const Divider = () => null;

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card px-4 py-4 rounded-2xl ${className}`}>{children}</div>
);

const getDateLabel = (raw: string | undefined, offsetDays = 0) => {
  const base = raw ? new Date(raw) : new Date();
  if (isNaN(base.getTime())) return raw || "";
  const d = new Date(base);
  d.setDate(base.getDate() + offsetDays);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getVideoDurationSeconds = (duration: string) => {
  const parts = duration.split(":").map((part) => parseInt(part.replace(/[^0-9]/g, ""), 10));
  if (parts.some(Number.isNaN)) return 24;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 24;
};

const buildTikTokDecayGraph = (raw: number[], totalViews: number) => {
  const length = Math.max(raw.length, 5);
  const maxRaw = Math.max(...raw, 0);
  const alreadyLooksReal = raw.length >= 4 && raw[0] >= raw[1] && raw[2] <= maxRaw * 0.08;
  if (alreadyLooksReal) return raw;

  const peak = Math.max(maxRaw, Math.round(totalViews * 0.82), 1);
  const second = Math.max(Math.round(peak * 0.56), 1);
  const drop = totalViews > 0 ? Math.max(40, Math.round(peak * 0.012)) : 0;
  return Array.from({ length }, (_, i) => {
    if (i === 0) return peak;
    if (i === 1) return second;
    if (i === 2) return drop;
    return Math.max(0, Math.round(drop * (0.72 - (i - 3) * 0.08)));
  });
};

 const AnalyticsVideoFrame = ({ src, videoUrl, isEditing, showPlay = true, onProgress, seekRef }: { src: string; videoUrl?: string; isEditing: boolean; showPlay?: boolean; onProgress?: (t: number) => void; seekRef?: React.MutableRefObject<((t: number) => void) | null> }) => {
  const [playing, setPlaying] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggle = () => {
    if (!videoUrl || isEditing) return;
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play().catch(() => setPlaying(false)); }
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = Math.min(1, (v.duration || 1) - 0.01);
    } catch {}
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !onProgress) return;
    const d = v.duration || 0;
    if (d > 0) onProgress(Math.max(0, Math.min(1, v.currentTime / d)));
  };

  useEffect(() => {
    if (!seekRef) return;
    seekRef.current = (t: number) => {
      const v = videoRef.current;
      if (!v) return;
      const d = v.duration || 0;
      if (d > 0) {
        try { v.currentTime = t * d; } catch {}
      }
    };
    return () => { if (seekRef.current) seekRef.current = null; };
  }, [seekRef]);

  return (
    <div
      className="aspect-[16/9] w-full rounded-md overflow-hidden relative mb-4 bg-muted border border-border/70 cursor-pointer"
      onClick={toggle}
    >
      <EditableImage isEditing={isEditing} />
      {!isEditing && videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          style={{ objectPosition: "50% 30%" }}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          loop
          muted={!playing}
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onError={() => { setLoadError(true); setPlaying(false); }}
        />
      )}
      {!isEditing && !videoUrl && (
        <img
          src={src}
          alt="Video preview"
          style={{ objectPosition: "50% 30%" }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {showPlay && !isEditing && !playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
          </div>
        </div>
      )}
      {!isEditing && loadError && (
        <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 -translate-y-1/2 rounded-md bg-black/60 px-3 py-2 text-center text-xs font-semibold text-white">
          Video could not be loaded
        </div>
      )}
    </div>
  );
};

/* ═══════ OVERVIEW TAB ═══════ */
const OverviewTab = ({ ins, reel, isEditing, onUpdate }: { ins: ReelData["insights"]; reel: ReelData; isEditing: boolean; onUpdate: (d: any) => void }) => {
  type MetricKey = "views" | "totalPlayTime" | "avgWatchTime" | "followers";
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("views");
  const [retentionT, setRetentionT] = useState(0);
  const retentionSeekRef = useRef<((t: number) => void) | null>(null);

  const hasManual = ins.viewsByDay.some(d => d.manual);
  const rawGraphData = ins.viewsByDay.map(d => d.views);
  const graphData = hasManual ? rawGraphData : buildTikTokDecayGraph(rawGraphData, ins.views);
  const maxVal = Math.max(...graphData, 1);

  const metricCards: { key: MetricKey; label: string; value: string; rawKey: string }[] = [
    { key: "views", label: "Video views", value: formatViewsDisplay(ins.views), rawKey: "views" },
    { key: "totalPlayTime", label: "Total play time", value: formatDuration(ins.totalPlayTime), rawKey: "totalPlayTime" },
    { key: "avgWatchTime", label: "Average watch time", value: `${ins.avgWatchTime}s`, rawKey: "avgWatchTime" },
    { key: "followers", label: "New followers", value: String(ins.followsFromPost), rawKey: "followsFromPost" },
  ];

  return (
    <>
      {/* Key metrics */}
      <div className="bg-[#f7f7f8] dark:bg-[#141414] px-3 pt-1.5 pb-0">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-t-2xl px-4 pt-4 pb-4">
        <div className="flex items-center gap-1.5 leading-none">
          <h3 className="text-[#111111] dark:text-foreground text-[16px] font-bold leading-none tracking-tight"><EditableVal val="Key metrics" isEditing={isEditing} /></h3>
          <Info className="w-[13px] h-[13px] text-[#8E8E93]" />
        </div>
        <p className="text-[#8E8E93] text-[12px] mt-1 mb-4 font-normal leading-none"><EditableVal val={`Updated on ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}.`} isEditing={isEditing} /></p>


        
        <div className="grid grid-cols-2 gap-4">
          {metricCards.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={`rounded-2xl p-3.5 text-left min-h-[74px] w-full flex flex-col justify-center ${
                selectedMetric === m.key
                  ? "bg-[#F4F8FF] border-2 border-[#A8D3FF] dark:bg-[#00a1ff1c] dark:border-[#00a1ff33]"
                  : "border border-[#E5E5E5] dark:border-border bg-white dark:bg-card"
              }`}
            >
              <p className="text-[#111111] dark:text-foreground text-[14px] font-semibold mb-0.5 line-clamp-1">
                <EditableVal val={m.label} isEditing={isEditing} />
              </p>
              <p className="text-black dark:text-foreground text-[24px] font-bold leading-tight break-words" style={{ letterSpacing: '-0.5px' }}>

                <EditableVal 
                  val={m.value} 
                  isEditing={isEditing} 
                  id={`key-metric-${m.key}`}
                  onUpdate={(v) => {
                    let newVal: number;
                    if (m.key === "totalPlayTime") {
                      newVal = parseDuration(v);
                    } else if (m.key === "avgWatchTime") {
                      newVal = parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
                    } else {
                      newVal = parseInputNumber(v);
                    }
                    
                    if (m.key === "views") {
                        // Scale graph data proportionally
                        const ratio = newVal / (ins.views || 1);
                        const scaledViewsByDay = ins.viewsByDay.map(d => ({
                            ...d,
                            views: Math.round(d.views * ratio)
                        }));
                        onUpdate({ views: newVal, viewsByDay: scaledViewsByDay });
                    } else {
                        onUpdate({ [m.rawKey]: newVal });
                    }
                }} 
                />
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-b-2xl px-4 pt-0 pb-3 -mt-px">
        <DrawableGraph
          data={graphData}
          days={ins.viewsByDay.map((d, i) => d.day || getDateLabel(reel.createdAt, i))}
          postedAt={reel.createdAt}
          maxVal={maxVal}
          isEditing={isEditing}
          pointPositions={ins.viewsByDay.map((d) => d.xPct)}
          onUpdatePoint={(idx, patch) => {
            // If user edits views without a full data array, seed manual data from current decay curve
            const seed = hasManual
              ? ins.viewsByDay
              : ins.viewsByDay.map((d, i) => ({ ...d, views: graphData[i] ?? d.views }));
            const base = seed.map((d, i) => ({
              ...d,
              xPct: typeof d.xPct === "number" ? d.xPct : (seed.length <= 1 ? 0 : i / (seed.length - 1)),
            }));
            const next = base.map((d, i) =>
              i === idx ? { ...d, ...patch, manual: true } : d
            );
            onUpdate({ viewsByDay: next });
          }}
          onCreatePoint={(point) => {
            const seed = hasManual
              ? ins.viewsByDay
              : ins.viewsByDay.map((d, i) => ({ ...d, views: graphData[i] ?? d.views }));
            const base = seed.map((d, i) => ({
              ...d,
              xPct: typeof d.xPct === "number" ? d.xPct : (seed.length <= 1 ? 0 : i / (seed.length - 1)),
              manual: true,
            }));
            const next = [...base, { ...point, manual: true }].sort((a, b) => (a.xPct ?? 0) - (b.xPct ?? 0));
            onUpdate({ viewsByDay: next });
          }}
        />
      </div>
      </div>

      {/* Retention rate */}
      <div className="bg-[#f7f7f8] dark:bg-[#141414] px-3 pt-2.5">
      <Card className="">
        <div className="flex items-center gap-1.5">
          <h3 className="text-foreground text-[18px] font-black tracking-tight"><EditableVal val={ins.retentionHeading ?? "Retention rate"} isEditing={isEditing} id="retention-heading" onUpdate={(v) => onUpdate({ retentionHeading: v })} /></h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        <p className="text-foreground text-[14px] font-black mt-3 leading-snug">
          <EditableVal val={ins.retentionWatchedPrefix ?? "On average, viewers watched"} isEditing={isEditing} id="retention-watched-prefix" onUpdate={(v) => onUpdate({ retentionWatchedPrefix: v })} />{" "}
          <EditableVal
            val={`${ins.retentionWatchedPct ?? Math.round((ins.avgWatchTime / 30) * 100)}`}
            isEditing={isEditing}
            id="retention-watched-pct"
            onUpdate={(v) => onUpdate({ retentionWatchedPct: parseFloat(v.replace(/[^0-9.]/g, '')) || 0 })}
          />
          <EditableVal val={ins.retentionWatchedSuffix ?? "% of your video."} isEditing={isEditing} id="retention-watched-suffix" onUpdate={(v) => onUpdate({ retentionWatchedSuffix: v })} />
        </p>
        <p className="text-muted-foreground text-[13px] mt-1 mb-5 font-medium leading-snug">
          <EditableVal val={ins.retentionStopPrefix ?? "Most viewers stopped watching at"} isEditing={isEditing} id="retention-stop-prefix" onUpdate={(v) => onUpdate({ retentionStopPrefix: v })} />{" "}
          <EditableVal
            val={formatInsightMoment(ins.retentionStopSec ?? Math.max(2, Math.floor(ins.avgWatchTime * 0.3)))}
            isEditing={isEditing}
            id="retention-stop-sec"
            onUpdate={(v) => onUpdate({ retentionStopSec: Math.max(0, Math.round(parseDuration(v) || 0)) })}
          />
          . <EditableVal val={ins.retentionDescription ?? "Check out the moment in your video where most viewers lost interest."} isEditing={isEditing} id="retention-desc" onUpdate={(v) => onUpdate({ retentionDescription: v })} />
        </p>

        <AnalyticsVideoFrame src={reel.thumbnail} videoUrl={reel.videoUrl} isEditing={isEditing} onProgress={setRetentionT} seekRef={retentionSeekRef} />
        <RetentionScrubber
          durationSec={getVideoDurationSeconds(reel.duration)}
          isEditing={isEditing}
          progress={retentionT}
          onSeek={(t) => retentionSeekRef.current?.(t)}
          curve={ins.retentionCurve}
          onCurveChange={(pcts) => onUpdate({ retentionCurve: pcts })}
        />
      </Card>
      </div>

      {/* Traffic Sources */}
      <div className="bg-[#f7f7f8] dark:bg-[#141414] px-3 pt-2.5">
      <Card className="">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-foreground text-[17px] font-black"><EditableVal val="Traffic sources" isEditing={isEditing} /></h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground/50" />
        </div>
        <div className="space-y-[15px]">
          {[
            { label: "For You", value: ins.trafficSources.forYouPage, key: "forYouPage" },
            { label: "Personal profile", value: ins.trafficSources.profile, key: "profile" },
            { label: "Following", value: ins.trafficSources.following, key: "following" },
            { label: "Search", value: ins.trafficSources.search, key: "search" },
            { label: "Other", value: ins.trafficSources.hashtags, key: "hashtags" },
          ].map((item) => (
            <MetricBar 
              key={item.label}
              label={item.label}
              value={item.value}
              isEditing={isEditing}
              onUpdate={(v) => onUpdate({ trafficSources: { ...ins.trafficSources, [item.key]: v } })}
            />
          ))}
        </div>
      </Card>
      </div>

      {/* Search queries */}
      <div className="bg-[#f7f7f8] dark:bg-[#141414] px-3 pt-2.5">
      <Card className="">
        <div className="flex items-center gap-1.5 mb-3">
          <h3 className="text-foreground text-[17px] font-black"><EditableVal val="Search queries" isEditing={isEditing} /></h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground text-[13px] font-medium leading-snug">
          <EditableVal val="Each search query has low traffic at the moment. Information will be available once at least 1 query has enough traffic." isEditing={isEditing} />
        </p>
      </Card>
      </div>

      {/* Want more traffic */}
      <div className="bg-[#f7f7f8] dark:bg-[#141414] px-3 pt-2.5">
      <Card className="">
        <button className="w-full flex items-center justify-between text-left">
          <div>
            <p className="text-foreground text-[15px] font-black"><EditableVal val="Want more traffic?" isEditing={isEditing} /></p>
            <p className="text-muted-foreground text-[13px] mt-1 font-medium"><EditableVal val="Use Promote to grow your audience." isEditing={isEditing} /></p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/70 shrink-0" />
        </button>
      </Card>
      </div>

      {/* View data for other posts */}
      <div className="bg-[#f7f7f8] dark:bg-[#141414] px-3 pt-2.5 pb-3">
      <Card className="">
        <div className="flex items-center justify-between gap-3">
          <p className="text-foreground text-[14.5px] font-black"><EditableVal val="View data for other posts" isEditing={isEditing} /></p>
          <div className="flex items-center -space-x-1.5 shrink-0">
            {[reel.thumbnail, reel.thumbnail, reel.thumbnail].map((src, i) => (
              <div key={i} className="w-8 h-9 rounded-md overflow-hidden border-2 border-card">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </Card>
      </div>

    </>

  );
};

/* ─── Retention Scrubber (draggable slider on curve) ─── */
const RETENTION_XS = [0, 12, 28, 52, 82, 126, 172, 224, 278, 300];
const DEFAULT_RETENTION_PCT = [100, 74, 39, 15, 10, 6, 4, 4, 6, 4];
const pctToY = (pct: number) => 72 - (Math.max(0, Math.min(100, pct)) / 100) * 69;

const RetentionScrubber = ({ durationSec, isEditing, progress, onSeek, curve, onCurveChange }: { durationSec: number; isEditing: boolean; progress?: number; onSeek?: (t: number) => void; curve?: number[]; onCurveChange?: (pcts: number[]) => void }) => {
  const [t, setT] = useState(0); // 0..1
  const trackRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const dragPointIdx = useRef<number | null>(null);

  const savedCurve = Array.isArray(curve) && curve.length === RETENTION_XS.length ? curve : null;
  const [localPcts, setLocalPcts] = useState<number[]>(savedCurve || DEFAULT_RETENTION_PCT);
  const pcts = savedCurve || localPcts;
  const points: [number, number][] = RETENTION_XS.map((x, i) => [x, pctToY(pcts[i] ?? 0)]);

  // Follow the video's playback position unless the user is dragging
  useEffect(() => {
    if (typeof progress !== "number" || dragging.current) return;
    setT(Math.max(0, Math.min(1, progress)));
  }, [progress]);

  // Interpolate y on the polyline for a given x (0..300)
  const yAtX = (x: number) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      if (x >= x1 && x <= x2) {
        const r = (x - x1) / (x2 - x1 || 1);
        return y1 + (y2 - y1) * r;
      }
    }
    return points[points.length - 1][1];
  };

  const x = t * 300;
  const y = yAtX(x);
  const pct = Math.max(0, Math.min(100, Math.round(((72 - y) / 69) * 100)));
  const sec = Math.max(0, Math.min(durationSec, Math.round(t * durationSec)));
  const secLabel = `0:${String(sec).padStart(2, '0')}`;

  const updateFromEvent = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const nt = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setT(nt);
    onSeek?.(nt);
  };

  const updatePointFromEvent = (clientY: number) => {
    if (dragPointIdx.current === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgY = ((clientY - rect.top) / rect.height) * 80;
    const newPct = Math.max(0, Math.min(100, Math.round(((72 - svgY) / 69) * 100)));
    const next = pcts.map((p, i) => (i === dragPointIdx.current ? newPct : p));
    setLocalPcts(next);
  };

  const commitCurve = () => {
    if (dragPointIdx.current === null) return;
    dragPointIdx.current = null;
    onCurveChange?.(localPcts);
  };

  return (
    <div className="pt-1">
      <div className="relative h-[90px] w-full pr-10">
        <div className="absolute inset-0 pr-10 flex flex-col justify-between pointer-events-none">
          <div className="border-t border-dashed border-muted-foreground/40" />
          <div className="border-t border-dashed border-muted-foreground/40" />
          <div className="border-t border-solid border-muted-foreground/40" />
        </div>
        <div className="absolute right-0 top-0 h-full flex flex-col justify-between text-[10.5px] font-bold text-muted-foreground/70 w-9 text-right">
          <span>100%</span>
          <span>50%</span>
          <span>&nbsp;</span>
        </div>
        <svg ref={svgRef} className="absolute inset-0 w-[calc(100%-2.5rem)] h-full overflow-visible" viewBox="0 0 300 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7cc4f7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#7cc4f7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M${points.map(p => p.join(',')).join(' L')} L300,80 L0,80 Z`} fill="url(#retentionGrad)" />
          <polyline
            points={points.map(p => p.join(',')).join(' ')}
            fill="none" stroke="#7cc4f7" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
          />
          {/* vertical guide */}
          <line x1={x} y1="0" x2={x} y2="80" stroke="#7cc4f7" strokeWidth="0.8" opacity="0.6" vectorEffect="non-scaling-stroke" style={{ transition: 'x1 120ms linear, x2 120ms linear' }} />
          {/* marker on curve */}
          <circle cx={x} cy={y} r="4" fill="hsl(var(--card))" stroke="#7cc4f7" strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ transition: 'cx 120ms linear, cy 120ms linear' }} />
          {/* editable drag handles */}
          {isEditing && points.map(([px, py], i) => (
            <g key={i}>
              <circle cx={px} cy={py} r="6" fill="#7cc4f7" stroke="hsl(var(--card))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <circle
                cx={px} cy={py} r="16" fill="transparent"
                style={{ cursor: 'ns-resize', touchAction: 'none' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  dragPointIdx.current = i;
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => { if (dragPointIdx.current === i) updatePointFromEvent(e.clientY); }}
                onPointerUp={(e) => {
                  try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
                  commitCurve();
                }}
              />
            </g>
          ))}
        </svg>

        {/* Tooltip above the marker */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: `calc((100% - 2.5rem) * ${x / 300})`,
            top: `calc(${(y / 80) * 100}% - 46px)`,
            transform: 'translateX(-50%)',
            transition: 'left 120ms linear, top 120ms linear',
          }}
        >
          <div className="rounded-md border border-border bg-card shadow-sm text-foreground text-[11px] font-semibold text-center w-[46px] overflow-hidden pointer-events-auto">
            <div className="px-1.5 py-1 leading-tight">
              <EditableVal val={secLabel} isEditing={isEditing} id={`retention-time-${Math.round(t * 100)}`} />
            </div>
            <div className="border-t border-border" />
            <div className="px-1.5 py-1 leading-tight">
              <EditableVal val={`${pct}%`} isEditing={isEditing} id={`retention-pct-${Math.round(t * 100)}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Slider track — same width as chart (excludes 2.5rem right label column) */}
      <div className="pr-10 mt-1">
        <div
          ref={trackRef}
          className="relative h-6 touch-none select-none"
          onPointerDown={e => {
            if (isEditing) return;
            dragging.current = true;
            (e.target as Element).setPointerCapture(e.pointerId);
            updateFromEvent(e.clientX);
          }}
          onPointerMove={e => { if (dragging.current) updateFromEvent(e.clientX); }}
          onPointerUp={e => {
            dragging.current = false;
            try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
          }}
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-foreground/20" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-foreground"
            style={{ width: `${t * 100}%`, transition: dragging.current ? 'none' : 'width 120ms linear' }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-card border border-border shadow-md pointer-events-none"
            style={{
              left: `calc(${t * 100}% - 10px)`,
              transition: dragging.current ? 'none' : 'left 120ms linear',
            }}
          />
        </div>
      </div>

      <div className="flex justify-between text-[11px] text-muted-foreground/70 mt-1.5 font-bold pr-10">
        <span>
          <EditableVal val={`00:${String(sec).padStart(2, '0')} (${pct}%)`} isEditing={isEditing} id={`retention-bottom-${Math.round(t * 100)}`} />
        </span>
        <span>
          <EditableVal val={`0:${String(durationSec).padStart(2, '0')}`} isEditing={isEditing} id="retention-duration" />
        </span>
      </div>
    </div>
  );
};

/* ─── Likes graph (editable + savable, same pattern as retention) ─── */
const LIKES_XS = [0, 20, 50, 90, 140, 190, 240, 290, 300];
const DEFAULT_LIKES_PCT = [87, 50, 30, 23, 20, 17, 18, 13, 13];
const likesPctToY = (pct: number) => 60 - (Math.max(0, Math.min(100, pct)) / 100) * 60;

const LikesScrubber = ({ isEditing, curve, axisLabels, footerLabels, onCurveChange, onAxisChange, onFooterChange }: {
  isEditing: boolean;
  curve?: number[];
  axisLabels?: string[];
  footerLabels?: string[];
  onCurveChange?: (pcts: number[]) => void;
  onAxisChange?: (labels: string[]) => void;
  onFooterChange?: (labels: string[]) => void;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragPointIdx = useRef<number | null>(null);
  const savedCurve = Array.isArray(curve) && curve.length === LIKES_XS.length ? curve : null;
  const [localPcts, setLocalPcts] = useState<number[]>(savedCurve || DEFAULT_LIKES_PCT);
  const [isDragging, setIsDragging] = useState(false);
  const pcts = isDragging ? localPcts : (savedCurve || localPcts);
  const points: [number, number][] = LIKES_XS.map((x, i) => [x, likesPctToY(pcts[i] ?? 0)]);

  const updatePointFromEvent = (clientY: number) => {
    if (dragPointIdx.current === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgY = ((clientY - rect.top) / rect.height) * 60;
    const newPct = Math.max(0, Math.min(100, Math.round(((60 - svgY) / 60) * 100)));
    const next = pcts.map((p, i) => (i === dragPointIdx.current ? newPct : p));
    setLocalPcts(next);
  };

  const commitCurve = () => {
    if (dragPointIdx.current === null) return;
    dragPointIdx.current = null;
    setIsDragging(false);
    onCurveChange?.(localPcts);
  };

  const axis = Array.isArray(axisLabels) && axisLabels.length === 3 ? axisLabels : ["60%", "40%", "20%"];
  const footer = Array.isArray(footerLabels) && footerLabels.length === 2 ? footerLabels : ["00:20 (0%)", "00:20"];

  const setFooter = (i: number, v: string) => {
    const next = [...footer];
    next[i] = v;
    onFooterChange?.(next);
  };

  return (
    <>
      <div className="relative h-[70px] w-full pr-10">
        <div className="absolute inset-0 pr-10 flex flex-col justify-between pointer-events-none">
          <div className="border-t border-dashed border-muted-foreground/40" />
          <div className="border-t border-dashed border-muted-foreground/40" />
          <div className="border-t border-solid border-muted-foreground/40" />
        </div>
        <div className="absolute right-0 top-0 h-full flex flex-col justify-between text-[10.5px] font-bold text-muted-foreground/70 w-9 text-right">
          {axis.map((a, i) => (
            <span key={i}>
              <EditableVal val={a} isEditing={isEditing} onUpdate={onAxisChange ? (v) => { const n = [...axis]; n[i] = v; onAxisChange(n); } : undefined} />
            </span>
          ))}
        </div>
        <svg ref={svgRef} className="absolute inset-0 w-[calc(100%-2.5rem)] h-full overflow-visible" viewBox="0 0 300 60" preserveAspectRatio="none">
          <defs>
            <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7cc4f7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7cc4f7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M${points.map(p => p.join(',')).join(' L')} L300,60 L0,60 Z`} fill="url(#likesGrad)" />
          <polyline
            points={points.map(p => p.join(',')).join(' ')}
            fill="none" stroke="#7cc4f7" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
          />
          {isEditing && points.map(([px, py], i) => (
            <g key={i}>
              <circle cx={px} cy={py} r="6" fill="#7cc4f7" stroke="hsl(var(--card))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <circle
                cx={px} cy={py} r="16" fill="transparent"
                style={{ cursor: 'ns-resize', touchAction: 'none' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  dragPointIdx.current = i;
                  setIsDragging(true);
                  (e.target as Element).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => { if (dragPointIdx.current === i) updatePointFromEvent(e.clientY); }}
                onPointerUp={(e) => {
                  try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
                  commitCurve();
                }}
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="relative h-[18px] mt-3 mb-1">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-[#e5e7eb] dark:bg-[#2a2a2a] rounded-full" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border border-border shadow" />
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground/70 mt-2 font-bold">
        <span><EditableVal val={footer[0]} isEditing={isEditing} onUpdate={onFooterChange ? (v) => setFooter(0, v) : undefined} /></span>
        <span><EditableVal val={footer[1]} isEditing={isEditing} onUpdate={onFooterChange ? (v) => setFooter(1, v) : undefined} /></span>
      </div>
    </>
  );
};



const DrawableGraph = ({
  data, days, postedAt, maxVal, isEditing, pointPositions, onUpdatePoint, onCreatePoint,
}: {
  data: number[];
  days: string[];
  postedAt?: string;
  maxVal: number;
  isEditing: boolean;
  pointPositions?: (number | undefined)[];
  onUpdatePoint: (idx: number, patch: { views?: number; day?: string }) => void;
  onCreatePoint?: (point: { views: number; day: string; xPct: number }) => void;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [areaWidth, setAreaWidth] = useState(0);
  const isScrubbing = useRef(false);
  const editDragIndex = useRef<number | null>(null);
  const editDragScale = useRef<number | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedPoint = useRef(false);
  const isDraftingPoint = useRef(false);
  const [draftPoint, setDraftPoint] = useState<{ x: number; y: number; xPct: number; views: number; day: string } | null>(null);
  const draftPointRef = useRef<{ x: number; y: number; xPct: number; views: number; day: string } | null>(null);
  const safeData = data.length >= 2 ? data : [data[0] || 0, 0, 0, 0, 0];

  const hiddenKey = `insight-hidden-dots-${postedAt || 'default'}-${safeData.length}`;
  const [hidden, setHidden] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(hiddenKey);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });
  const persistHidden = (s: Set<number>) => {
    try { localStorage.setItem(hiddenKey, JSON.stringify([...s])); } catch {}
  };

  useEffect(() => {
    if (!areaRef.current) return;
    const el = areaRef.current;
    const update = () => setAreaWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visibleIdx = safeData.map((_, i) => i).filter(i => !hidden.has(i));
  const visibleData = visibleIdx.length >= 2 ? visibleIdx.map(i => safeData[i]) : safeData;
  const effectiveIdx = visibleIdx.length >= 2 ? visibleIdx : safeData.map((_, i) => i);

  const peak = Math.max(...visibleData, 1);
  const paddedMax = Math.max(maxVal, peak) * 1.02;
  const points = visibleData.map((v, j) => {
    const origIdx = effectiveIdx[j];
    const savedX = pointPositions?.[origIdx];
    const hasSavedX = typeof savedX === "number" && Number.isFinite(savedX);
    const x = hasSavedX ? Math.max(0, Math.min(300, savedX * 300)) : (visibleData.length === 1 ? 0 : (j / (visibleData.length - 1)) * 300);
    const y = 100 - (v / paddedMax) * 100;
    return { x, y, origIdx };
  }).sort((a, b) => a.x - b.x);
  const pathPoints = draftPoint ? [...points, draftPoint].sort((a, b) => a.x - b.x) : points;

  // auto-selected point (first big drop) — used only until user interacts
  const firstSharpDrop = visibleData.findIndex((value, index) => index > 0 && value <= peak * 0.08);
  const autoIndex = firstSharpDrop > -1 ? firstSharpDrop : points.reduce((best, point, index) => point.y > points[best].y ? index : best, 0);

  const [userIndex, setUserIndex] = useState<number | null>(null);
  const clampedUserIndex = userIndex !== null ? Math.min(userIndex, points.length - 1) : null;
  const selectedIndex = clampedUserIndex ?? autoIndex;
  const selectedPoint = points[selectedIndex] || points[0];
  const selectedOrigIdx = selectedPoint?.origIdx ?? 0;
  const selectedValue = safeData[selectedOrigIdx] || 0;
  const selectedDay = days[selectedOrigIdx] || getDateLabel(postedAt, selectedOrigIdx);

  const topLabel = formatNumber(Math.ceil(paddedMax / 100) * 100);
  const midHighLabel = formatNumber(Math.round((paddedMax * 0.6667) / 100) * 100);
  const midLabel = formatNumber(Math.round((paddedMax * 0.3333) / 100) * 100);
  const midLowLabel = formatNumber(Math.round((paddedMax * 0.25) / 100) * 100);


  const pointerPoint = (e: React.PointerEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 300;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(300, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const pickIndexFromEvent = (e: React.PointerEvent) => {
    const pointer = pointerPoint(e);
    if (!pointer) return null;
    const clamped = Math.max(0, Math.min(300, pointer.x));
    const idx = Math.round((clamped / 300) * (points.length - 1));
    return Math.max(0, Math.min(points.length - 1, idx));
  };

  const pickEditablePointFromEvent = (e: React.PointerEvent) => {
    if (!svgRef.current || points.length === 0) return null;
    const rect = svgRef.current.getBoundingClientRect();
    let best = { index: 0, distance: Number.POSITIVE_INFINITY };
    points.forEach((p, index) => {
      const px = rect.left + (p.x / 300) * rect.width;
      const py = rect.top + (p.y / 100) * rect.height;
      const distance = Math.hypot(e.clientX - px, e.clientY - py);
      if (distance < best.distance) best = { index, distance };
    });
    return best.distance <= 20 ? best.index : null;
  };

  const valueFromPointerY = (e: React.PointerEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedY = Math.max(0, Math.min(100, y));
    const scale = editDragScale.current || paddedMax;
    return Math.max(0, Math.round(((100 - clampedY) / 100) * scale));

  };

  const resetDragState = () => {
    isScrubbing.current = false;
    editDragIndex.current = null;
    editDragScale.current = null;
    dragStart.current = null;
    hasDraggedPoint.current = false;
    isDraftingPoint.current = false;
  };

  const updateDraftPoint = (next: { x: number; y: number; xPct: number; views: number; day: string } | null) => {
    draftPointRef.current = next;
    setDraftPoint(next);
  };

  const hideSelected = () => {
    if (points.length <= 2) return; // keep at least 2 dots
    const origIdx = selectedOrigIdx;
    const next = new Set(hidden);
    next.add(origIdx);
    setHidden(next);
    persistHidden(next);
    setUserIndex(null);
  };
  const resetHidden = () => {
    const next = new Set<number>();
    setHidden(next);
    persistHidden(next);
  };

  // Straight-line path (mountain/peak style — no smoothing)
  const buildLinearPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  };

  const linePath = buildLinearPath(pathPoints);
  const areaPath = `${linePath} L 300,100 L 0,100 Z`;

  return (
    <div className="relative pt-[30px] pb-4">
      {isEditing && hidden.size > 0 && (
        <button
          onClick={resetHidden}
          className="absolute -top-1 right-[58px] z-40 text-[10px] font-bold text-primary bg-card border border-border rounded-full px-2 py-0.5 shadow-sm"
        >
          Reset dots ({hidden.size})
        </button>
      )}
      <div ref={areaRef} className="relative h-[220px] pl-0 pr-[58px]">
        <div className="absolute left-0 right-[58px] z-20 pointer-events-none" style={{ top: 0, bottom: '18px' }}>
          {[100, 66.67, 33.33].map(p => (
            <div key={p} className="flex items-center gap-2 pointer-events-none" style={{ position: 'absolute', left: 0, right: 0, top: `${100 - p}%` }}>

              <div className="flex-1" style={{ height: '1px', backgroundImage: 'linear-gradient(to right, hsl(var(--muted-foreground) / 0.45) 50%, transparent 50%)', backgroundSize: '6px 1px', backgroundRepeat: 'repeat-x' }} />
              <span className="absolute left-full ml-2 text-[13px] leading-none font-semibold text-muted-foreground/70 whitespace-nowrap pointer-events-auto">
                <EditableVal 
                  val={p === 100 ? topLabel : p === 66.67 ? midHighLabel : midLabel} 
                  isEditing={isEditing} 
                  id={`insight-y-label-${p}`}
                />
              </span>
            </div>
          ))}
          <div className="absolute left-0 right-0 border-t border-muted-foreground/30" style={{ bottom: 0 }} />
        </div>



        <svg
          ref={svgRef}
          className={`relative z-10 w-full h-[calc(100%-18px)] overflow-visible touch-none ${isEditing ? "cursor-ns-resize" : "cursor-pointer"}`}
          viewBox="0 0 300 100"
          preserveAspectRatio="none"
          onPointerDown={e => {
            const pointer = pointerPoint(e);
            if (!pointer) return;
            const editableIdx = isEditing ? pickEditablePointFromEvent(e) : null;
            const idx = isEditing ? editableIdx : pickIndexFromEvent(e);
            isScrubbing.current = true;
            editDragIndex.current = isEditing && idx !== null ? idx : null;
            editDragScale.current = isEditing ? paddedMax : null;
            dragStart.current = { x: e.clientX, y: e.clientY };
            hasDraggedPoint.current = false;
            isDraftingPoint.current = isEditing && idx === null;
            if (isEditing && idx === null) {
              const scale = editDragScale.current || paddedMax;
              const views = Math.max(0, Math.round(((100 - pointer.y) / 100) * scale));
              const xPct = Math.max(0, Math.min(1, pointer.x / 300));
              const dayIndex = Math.round(xPct * Math.max(1, safeData.length - 1));
              updateDraftPoint({ x: pointer.x, y: pointer.y, xPct, views, day: getDateLabel(postedAt, dayIndex) });
            }
            (e.target as Element).setPointerCapture(e.pointerId);
            if (idx !== null) setUserIndex(idx);
            e.stopPropagation();
          }}
          onPointerMove={e => {
            if (!isScrubbing.current) return;
            if (isEditing && isDraftingPoint.current) {
              const pointer = pointerPoint(e);
              if (!pointer) return;
              const start = dragStart.current;
              if (start && !hasDraggedPoint.current) {
                const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
                if (moved < 2) return;
                hasDraggedPoint.current = true;
              }
              const scale = editDragScale.current || paddedMax;
              const views = Math.max(0, Math.round(((100 - pointer.y) / 100) * scale));
              if (draftPointRef.current) updateDraftPoint({ ...draftPointRef.current, y: pointer.y, views });
            } else if (isEditing && editDragIndex.current !== null) {
              const start = dragStart.current;
              if (start && !hasDraggedPoint.current) {
                const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
                if (moved < 2) return;
                hasDraggedPoint.current = true;
              }
              const idx = editDragIndex.current;
              const origIdx = points[idx]?.origIdx;
              const views = valueFromPointerY(e);
              if (origIdx !== undefined && views !== null) onUpdatePoint(origIdx, { views });
            } else {
              const idx = pickIndexFromEvent(e);
              if (idx !== null) setUserIndex(idx);
            }
            e.stopPropagation();
          }}
          onPointerUp={e => {
            if (isDraftingPoint.current && draftPointRef.current) {
              const point = draftPointRef.current;
              onCreatePoint?.({ views: point.views, day: point.day, xPct: point.xPct });
              updateDraftPoint(null);
            }
            resetDragState();
            try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
            e.stopPropagation();
          }}
          onPointerLeave={() => {
            if (isDraftingPoint.current && draftPointRef.current) {
              const point = draftPointRef.current;
              onCreatePoint?.({ views: point.views, day: point.day, xPct: point.xPct });
              updateDraftPoint(null);
            }
            resetDragState();
          }}
        >
          <defs>
            <linearGradient id="graphGradV2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7cc4f7" stopOpacity="0.55" />
              <stop offset="60%" stopColor="#7cc4f7" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#7cc4f7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#graphGradV2)" />
          {selectedPoint && (
            <line x1={selectedPoint.x} y1="0" x2={selectedPoint.x} y2="100" stroke="#7cc4f7" strokeWidth="0.9" vectorEffect="non-scaling-stroke" opacity="0.9" style={{ transition: 'x1 200ms ease, x2 200ms ease' }} />
          )}
          <path d={linePath} fill="none" stroke="#7cc4f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        </svg>

        {/* Round markers as HTML overlay (svg is stretched with preserveAspectRatio=none, which would turn <circle> into ovals) */}
        <div className="absolute left-0 right-[58px] top-0 pointer-events-none z-20" style={{ height: 'calc(100% - 18px)' }}>
          {pathPoints.map((p, i) => {
            const isSelected = p === selectedPoint;
            const size = isSelected ? 9 : 7;
            const bw = isSelected ? 2.2 : 1.5;
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${(p.x / 300) * 100}%`,
                  top: `${p.y}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  transform: 'translate(-50%, -50%)',
                  background: 'hsl(var(--card))',
                  border: `${bw}px solid #7cc4f7`,
                }}
              />
            );
          })}



        </div>


        {selectedPoint && (
          <div
            className="absolute z-30 rounded-[8px] border border-border bg-card shadow-md text-foreground w-[46px] overflow-visible pointer-events-auto"
            style={{
              left: `calc(${(selectedPoint.x / 300) * 100}% + 6px)`,
              top: `${Math.min(120, Math.max(6, selectedPoint.y * 1.6 + 8))}px`,
              transition: 'left 220ms cubic-bezier(0.22, 1, 0.36, 1), top 220ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {isEditing && points.length > 2 && (
              <button
                onClick={hideSelected}
                aria-label="Remove dot"
                className="absolute -top-2 -right-2 z-40 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black leading-none flex items-center justify-center shadow-md"
              >
                ×
              </button>
            )}
            <div className="px-1.5 py-1.5 text-[11px] font-semibold leading-tight text-foreground text-center">
              <EditableVal
                val={selectedDay}
                isEditing={isEditing}
                onUpdate={(v) => onUpdatePoint(selectedOrigIdx, { day: v })}
                id={`insight-tooltip-date-${selectedOrigIdx}`}
              />
            </div>
            <div className="border-t border-border" />
            <div className="px-1.5 py-1.5 text-[11px] font-semibold leading-tight text-foreground text-center">
              <EditableVal
                val={formatNumber(selectedValue)}
                isEditing={isEditing}
                onUpdate={(v) => onUpdatePoint(selectedOrigIdx, { views: parseInputNumber(v) })}
                id={`insight-tooltip-value-${selectedOrigIdx}`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pl-0 pr-[58px] mt-1">
        <span className="text-[13px] font-medium text-muted-foreground/70 truncate capitalize">
          <EditableVal val={getDateLabel(postedAt, 0) || days[0]} isEditing={isEditing} id="insight-x-label-start" />
        </span>
        <span className="text-[13px] font-medium text-muted-foreground/70 truncate capitalize">
          <EditableVal val={getDateLabel(postedAt, safeData.length - 1) || days[days.length - 1]} isEditing={isEditing} id="insight-x-label-end" />
        </span>
      </div>
    </div>
  );
};

const ViewersTab = ({ ins, isEditing, onUpdate }: { ins: ReelData["insights"]; isEditing: boolean; onUpdate: (d: any) => void }) => {
  const reelEditScope = useContext(ReelEditScopeContext);
  const totalViewers = ins.views;

  const newViewerPct2 = ins.newViewerPct ?? 11;
  const nonFollowersPct = ins.nonFollowersPct ?? 86;
  const returningPct2 = 100 - newViewerPct2;
  const followersPct = 100 - nonFollowersPct;

  const SplitBar = ({ leftLabel, leftPct, rightLabel, rightPct, onLeftUpdate, onRightUpdate }: { leftLabel: string; leftPct: number; rightLabel: string; rightPct: number; onLeftUpdate: (v: number) => void; onRightUpdate: (v: number) => void }) => (
    <div>
      <div className="flex justify-between text-[13px] font-black text-foreground mb-1.5">
        <span>
          <EditableVal val={`${leftPct}%`} isEditing={isEditing} onUpdate={(v) => {
            const n = parseFloat(v.replace(/[^0-9.]/g, ''));
            if (!isNaN(n)) onLeftUpdate(Math.max(0, Math.min(100, n)));
          }} />
        </span>
        <span>
          <EditableVal val={`${rightPct}%`} isEditing={isEditing} onUpdate={(v) => {
            const n = parseFloat(v.replace(/[^0-9.]/g, ''));
            if (!isNaN(n)) onRightUpdate(Math.max(0, Math.min(100, n)));
          }} />
        </span>
      </div>
      <div className="w-full h-[10px] flex overflow-hidden bg-[#e5e7eb] dark:bg-[#2a2a2a]">
        <div className="h-full bg-[#00a1ff]" style={{ width: `${leftPct}%` }} />
      </div>

      <div className="flex justify-between text-[12.5px] font-bold text-muted-foreground mt-1.5">
        <span><EditableVal val={leftLabel} isEditing={isEditing} /></span>
        <span><EditableVal val={rightLabel} isEditing={isEditing} /></span>
      </div>
    </div>
  );

  return (
    <div>
      <Card className="!py-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-foreground text-[15px] font-black"><EditableVal val="Total viewers" isEditing={isEditing} /></h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        <p className="text-foreground text-[24px] font-black leading-tight mt-0.5">
          <EditableVal val={formatNumber(totalViewers)} isEditing={isEditing} />
        </p>
      </Card>


      {/* Viewer types */}
      <Card className="mt-2.5">
        <div className="flex items-center gap-1.5 mb-5">
          <h3 className="text-foreground text-[17px] font-black"><EditableVal val="Viewer types" isEditing={isEditing} /></h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        <div className="space-y-5">
          <SplitBar
            leftLabel="New viewers" leftPct={newViewerPct2}
            rightLabel="Returning viewers" rightPct={returningPct2}
            onLeftUpdate={(n) => onUpdate({ newViewerPct: n })}
            onRightUpdate={(n) => onUpdate({ newViewerPct: 100 - n })}
          />
          <SplitBar
            leftLabel="Non-followers" leftPct={nonFollowersPct}
            rightLabel="Followers" rightPct={followersPct}
            onLeftUpdate={(n) => onUpdate({ nonFollowersPct: n })}
            onRightUpdate={(n) => onUpdate({ nonFollowersPct: 100 - n })}
          />
        </div>
      </Card>

      {/* Gender Section */}
      <Card className="mt-2.5">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-foreground text-[17px] font-black"><EditableVal val="Gender" isEditing={isEditing} /></h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        <div className="flex justify-center mb-4 relative">
          <HalfDonutChart segments={[
            { value: ins.genderSplit.male, color: "#00a1ff" },
            { value: ins.genderSplit.female, color: "#5cc0ff" },
            { value: 100 - ins.genderSplit.male - ins.genderSplit.female, color: "#cfe7fb" }

          ]} />
        </div>
        <div className="space-y-2">
          <GenderRow color="#00a1ff" label="Male" pct={`${ins.genderSplit.male}%`} isEditing={isEditing} onUpdate={(v) => {
            const num = parseFloat(v.replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) onUpdate({ genderSplit: { ...ins.genderSplit, male: num } });
          }} />
          <GenderRow color="#5cc0ff" label="Female" pct={`${ins.genderSplit.female}%`} isEditing={isEditing} onUpdate={(v) => {
            const num = parseFloat(v.replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) onUpdate({ genderSplit: { ...ins.genderSplit, female: num } });
          }} />
          <GenderRow color="#cfe7fb" label="Other" pct={`${100 - ins.genderSplit.male - ins.genderSplit.female}%`} isEditing={isEditing} showChevron />

        </div>

      </Card>


      {/* Age Section */}
      <Card className="mt-2.5">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-foreground text-[17px] font-black"><EditableVal val="Age" isEditing={isEditing} /></h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        <div className="space-y-[18px]">
          {ins.ageGroups.map((group, i) => (
            <MetricBar 
              key={i}
              label={group.range}
              value={group.percentage}
              isEditing={isEditing}
              onUpdate={(v) => {
                const next = [...ins.ageGroups];
                next[i] = { ...group, percentage: v };
                onUpdate({ ageGroups: next });
              }}
              onLabelUpdate={(v) => {
                const next = [...ins.ageGroups];
                next[i] = { ...group, range: v };
                onUpdate({ ageGroups: next });
              }}
            />
          ))}
        </div>
      </Card>

      {/* Locations Section */}
      <Card className="mt-2.5">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-foreground text-[17px] font-black"><EditableVal val="Locations" isEditing={isEditing} /></h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
        <div className="space-y-[18px]">
          {orderedAudienceRegions(ins.audienceRegions, reelEditScope)
            .map(({ region, i }) => (
            <MetricBar
              key={i}
              label={region.name}
              value={region.percentage}
              isEditing={isEditing}
              onUpdate={(v) => {
                const next = [...ins.audienceRegions];
                next[i] = { ...region, percentage: v };
                onUpdate({ audienceRegions: next });
              }}
              onLabelUpdate={(v) => {
                const next = [...ins.audienceRegions];
                next[i] = { ...region, name: v };
                onUpdate({ audienceRegions: next });
              }}
            />
          ))}
        </div>
      </Card>

    </div>
  );
};

/* ═══════ ENGAGEMENT TAB ═══════ */
const EngagementTab = ({ ins, reel, isEditing, onUpdate }: { ins: ReelData["insights"]; reel: ReelData; isEditing: boolean; onUpdate?: (updates: any) => void }) => {
  const [muted, setMuted] = useState(true);

  return (
  <div>
    <Card className="">
      <div className="flex items-center gap-1.5 mb-2">
        <h3 className="text-foreground text-[17px] font-black"><EditableVal val="Top words used in comments" isEditing={isEditing} id="top-words-heading" /></h3>
        <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
      </div>
      <p className="text-muted-foreground text-[13px] font-medium leading-snug">
        <EditableVal val="Top word insights are not ready yet. Please check back later." isEditing={isEditing} id="top-words-desc" />
      </p>
    </Card>

    <Card className="">
      <div className="flex items-center gap-1.5">
        <h3 className="text-foreground text-[17px] font-black"><EditableVal val={ins.likesHeading ?? "Likes"} isEditing={isEditing} id="likes-heading" onUpdate={(v) => onUpdate?.({ likesHeading: v })} /></h3>
        <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
      </div>
      <p className="text-muted-foreground text-[13px] mt-2 mb-4 font-medium leading-snug">
        <EditableVal val={ins.likesTimePrefix ?? "Most viewers liked this video at"} isEditing={isEditing} id="likes-time-prefix" onUpdate={(v) => onUpdate?.({ likesTimePrefix: v })} />{" "}
        <EditableVal
          val={formatInsightMoment(ins.likesAtSec ?? 0)}
          isEditing={isEditing}
          id="likes-at-sec"
          onUpdate={(v) => onUpdate?.({ likesAtSec: Math.max(0, Math.round(parseDuration(v) || 0)) })}
        />
        . <EditableVal val={ins.likesDescription ?? "Check out the moment where most viewers liked your video."} isEditing={isEditing} id="likes-desc" onUpdate={(v) => onUpdate?.({ likesDescription: v })} />
      </p>
      
      <div className="aspect-[16/9] w-full rounded-md overflow-hidden relative mb-4 bg-muted border border-border/70 group">
        <EditableImage isEditing={isEditing} />
        {reel.videoUrl ? (
          <>
            <video src={reel.videoUrl} className="w-full h-full object-cover" autoPlay loop muted={muted} playsInline />
            <button 
              onClick={() => setMuted(!muted)}
              className="absolute bottom-3 right-3 z-20 p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {muted ? <X className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white" />}
            </button>
          </>
        ) : (
          <img src={reel.thumbnail} alt="Video preview" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!reel.videoUrl && (
            <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
              <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
            </div>
          )}
        </div>
      </div>

      <LikesScrubber
        isEditing={isEditing}
        curve={ins.likesCurve}
        axisLabels={ins.likesAxis}
        footerLabels={ins.likesFooter}
        onCurveChange={(pcts) => onUpdate?.({ likesCurve: pcts })}
        onAxisChange={(labels) => onUpdate?.({ likesAxis: labels })}
        onFooterChange={(labels) => onUpdate?.({ likesFooter: labels })}
      />
    </Card>
  </div>
  );
};



/* ═══════ INSPIRATION TAB ═══════ */
const InspirationTab = ({ ins, reel, isEditing }: { ins: ReelData["insights"]; reel: ReelData; isEditing: boolean }) => {
  const [subTab, setSubTab] = useState("trending");
  return (
    <div>
      <Card className="  !pb-8">
        <div className="mb-6">
          <h3 className="text-foreground text-[18.5px] font-black tracking-tight"><EditableVal val="Creation Inspiration" isEditing={isEditing} /></h3>
          <p className="text-muted-foreground text-[13.5px] mt-0.5 font-bold"><EditableVal val="Discover your next big idea!" isEditing={isEditing} /></p>
        </div>
        <div className="flex gap-2.5 mb-6 overflow-x-auto scrollbar-hide">
          <SubTab label="Trending posts" active={subTab === "trending"} onClick={() => setSubTab("trending")} isEditing={isEditing} />
          <SubTab label="Similar posts" active={subTab === "similar"} onClick={() => setSubTab("similar")} isEditing={isEditing} />
          <SubTab label="Followers viewed" active={subTab === "followers"} onClick={() => setSubTab("followers")} isEditing={isEditing} />
        </div>
        <p className="text-muted-foreground text-[13.5px] mb-6 font-bold leading-snug"><EditableVal val="Post videos like these for possible virality." isEditing={isEditing} /></p>
        <div className="space-y-[22px]">
          {[
            { caption: "Please, I need to reach this beautiful girl 😭❤️ #JIMIN #PARKJIMIN #BTS", likes: 8800000, user: "Emiliajjk", thumb: "https://picsum.photos/seed/tt1/200/280", dp: "https://i.pravatar.cc/40?img=47" },
            { caption: "#fyp", likes: 4600000, user: "游戏", thumb: "https://picsum.photos/seed/tt2/200/280", dp: "https://i.pravatar.cc/40?img=15" },
            { caption: "Coconut Waraaah 🥥🌴 . . . Small slim girl did the unbelievable 😯 #funnytik...", likes: 1200000, user: "Nonsito", thumb: "https://picsum.photos/seed/tt3/200/280", dp: "https://i.pravatar.cc/40?img=33" },
            { caption: "Social experiment part 1 #fyp", likes: 1800000, user: "Eaglet concept", thumb: "https://picsum.photos/seed/tt4/200/280", dp: "https://i.pravatar.cc/40?img=12" },
            { caption: "#LIVEIncentiveProgram#LIVEFEST2026#MakeLIVEcount#Paidpartnership", likes: 371300, user: "onlyclipsc87", thumb: "https://picsum.photos/seed/tt5/200/280", dp: "https://i.pravatar.cc/40?img=22" },
            { caption: "دعاء يوم عرفه #عرفه #يوم_عرفة 💗 #دعاء_مستجاب_باذن_الله #اللهم_امين_يارب", likes: 1700000, user: "فرح الرشيدي", thumb: "https://picsum.photos/seed/tt6/200/280", dp: "https://i.pravatar.cc/40?img=68" },
          ].map((item, idx) => {
            const num = idx + 1;
            return (
            <div key={num} className="flex gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-[#fcd535] flex items-center justify-center text-[11.5px] font-black text-black absolute -left-2.5 -top-1.5 z-10 border-[3px] border-card">
                   <EditableVal val={num} isEditing={isEditing} />
                </div>
                <div className="w-[72px] h-[96px] rounded-xl bg-muted overflow-hidden ml-2 border border-border relative">
                   <img src={item.thumb} alt="" className="w-full h-full object-cover" />
                   <EditableImage isEditing={isEditing} />
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-foreground text-[14.5px] font-bold leading-[1.3] line-clamp-2 mb-1.5 pr-2">
                  <EditableVal val={item.caption} isEditing={isEditing} />
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Heart className="w-3.5 h-3.5 text-muted-foreground/30" strokeWidth={2.5} />
                  <span className="text-muted-foreground text-[12px] font-black"><EditableVal val={formatNumber(item.likes)} isEditing={isEditing} /></span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-5 h-5 rounded-full bg-muted overflow-hidden border border-border relative">
                     <img src={item.dp} alt="" className="w-full h-full object-cover" />
                     <EditableImage isEditing={isEditing} />
                  </div>
                  <span className="text-muted-foreground text-[12px] font-black"><EditableVal val={item.user} isEditing={isEditing} /></span>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

const SubTab = ({ label, active, onClick, isEditing }: { label: string; active: boolean; onClick: () => void; isEditing: boolean }) => (
  <button 
    onClick={onClick} 
    className={`whitespace-nowrap px-4 py-2 rounded-lg text-[13px] font-black transition-all ${
      active ? "bg-foreground text-background" : "bg-muted text-muted-foreground border border-border"
    }`}
  >
    <EditableVal val={label} isEditing={isEditing} />
  </button>
);



export default InsightsPanel;

