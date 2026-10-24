import ExpandableCaption from "@/components/ExpandableCaption";
import { useState, useRef, useCallback, useEffect } from "react";
import { ReelData, formatNumber, formatViewsDisplay } from "@/lib/mockData";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { ArrowLeft, Heart, Bookmark, MoreHorizontal, Music, Search, Play, X, Save, AlertCircle } from "lucide-react";
import { CommentIcon } from "./CommentIcon";
import { ShareIcon } from "@/components/ShareIcon";
import { parseInputNumber } from "@/lib/utils";
import { playableVideoUrl } from "@/lib/videoUrls";
import avatar from "@/assets/avatar.jpg";

interface VideoDetailProps {
  reel: ReelData;
  reels: ReelData[];
  onBack: () => void;
  onInsights: (reel: ReelData) => void;
  onSave?: (updated: ReelData) => void;
  suspended?: boolean;
}

const formatTikTokPostedDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;

  const postedDay = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const todayValues = Object.fromEntries(todayParts.map((part) => [part.type, part.value]));
  const today = Date.UTC(Number(todayValues.year), Number(todayValues.month) - 1, Number(todayValues.day));
  const daysAgo = Math.floor((today - postedDay) / 86_400_000);

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "1 day ago";
  if (daysAgo >= 2 && daysAgo <= 7) return `${daysAgo} days ago`;
  return `${match[1]}-${match[2]}-${match[3]}`;
};

const VideoDetail = ({ reel, reels, onBack, onInsights, onSave, suspended }: VideoDetailProps) => {
  const [localReel, setLocalReel] = useState<ReelData>(reel);
  const [activeReelId, setActiveReelId] = useState(reel.id);
  const [editing, setEditing] = useState(false);
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const activeReelIdRef = useRef(reel.id);
  const manuallyPausedRef = useRef(new Set<string>());

  const handleSave = useCallback((updated: ReelData) => {
    setLocalReel(updated);
    onSave?.(updated);
    setEditing(false);
  }, [onSave]);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  const suspendedRef = useRef(!!suspended);

  // Pause every reel while analytics (or any overlay) is open; resume the active one on return.
  useEffect(() => {
    suspendedRef.current = !!suspended;
    if (suspended) {
      for (const v of videoRefs.current.values()) v.pause();
    } else if (!manuallyPausedRef.current.has(activeReelIdRef.current)) {
      const v = videoRefs.current.get(activeReelIdRef.current);
      if (v) { v.muted = mutedRef.current; void v.play().catch(() => {}); }
    }
  }, [suspended]);

  // Stop all audio when leaving the reel viewer.
  useEffect(() => {
    const videos = videoRefs.current;
    return () => {
      for (const v of videos.values()) {
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
    };
  }, []);

  const playReel = useCallback((reelId: string) => {
    const video = videoRefs.current.get(reelId);
    if (!video) return;
    if (suspendedRef.current) { video.pause(); return; }


    for (const [id, otherVideo] of videoRefs.current) {
      if (id !== reelId && !otherVideo.paused) otherVideo.pause();
    }

    video.muted = mutedRef.current;
    setVideoErrors((current) => current[reelId] ? { ...current, [reelId]: false } : current);

    void video.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof DOMException && error.name === "NotAllowedError" && !mutedRef.current) {
        mutedRef.current = true;
        setMuted(true);
        video.muted = true;
        void video.play().catch(() => setPlayingId((current) => current === reelId ? null : current));
        return;
      }
      setPlayingId((current) => current === reelId ? null : current);
    });
  }, []);

  const togglePlay = useCallback((reelId: string) => {
    const video = videoRefs.current.get(reelId);
    if (!video) return;
    if (video.paused) {
      manuallyPausedRef.current.delete(reelId);
      if (video.error) video.load();
      // User tap is a gesture: attempt audible playback first; playReel falls back to muted if policy blocks it.
      mutedRef.current = false;
      setMuted(false);
      playReel(reelId);
    } else {
      manuallyPausedRef.current.add(reelId);
      video.pause();
    }
  }, [playReel]);

  useEffect(() => {
    setLocalReel(reel);
    setActiveReelId(reel.id);
    activeReelIdRef.current = reel.id;
    manuallyPausedRef.current.clear();
    setPlayingId(null);
    setVideoErrors({});
  }, [reel]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // The browser asynchronously restores the previous viewer's scroll offset
    // onto this fresh scroller (same history entry); disable that while open.
    const prevRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const initialCard = cardRefs.current.get(reel.id);
    if (initialCard) {
      const target = initialCard.offsetTop;
      scroller.scrollTop = target;
      // Re-assert after the frame in case a queued restore lands late.
      requestAnimationFrame(() => { scroller.scrollTop = target; });
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.reelId;
        if (!id) continue;
        const video = videoRefs.current.get(id);
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          const changedReel = activeReelIdRef.current !== id;
          activeReelIdRef.current = id;
          setActiveReelId(id);
          const next = reels.find((item) => item.id === id);
          if (next) setLocalReel(next);
          if (changedReel) manuallyPausedRef.current.delete(id);
          if (!manuallyPausedRef.current.has(id)) playReel(id);
        } else if (video) {
          video.pause();
        }
      }
    }, { root: scroller, threshold: [0.65] });
    for (const card of cardRefs.current.values()) observer.observe(card);
    return () => {
      observer.disconnect();
      window.history.scrollRestoration = prevRestoration;
    };
  }, [reel.id, reels, playReel]);

  const r = localReel;
  const ins = r.insights;

  return (
    <div className="fixed inset-0 z-50 min-h-0 overflow-hidden bg-background" data-detail-reel={reel.id}>
      <div
        ref={scrollerRef}
        className="absolute inset-0 h-[100dvh] min-h-0 overflow-y-scroll overscroll-y-contain touch-pan-y snap-y snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      >
        {reels.map((item) => (
          <section
            key={item.id}
            ref={(node) => { if (node) cardRefs.current.set(item.id, node); else cardRefs.current.delete(item.id); }}
            data-reel-id={item.id}
            className="relative h-[100dvh] w-full shrink-0 snap-start select-none cursor-pointer"
            onClick={() => togglePlay(item.id)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {item.videoUrl ? (
              <video
                key={`${item.id}:${item.videoUrl}`}
                ref={(node) => {
                  if (node) {
                    videoRefs.current.set(item.id, node);
                    if (item.id === activeReelIdRef.current && !manuallyPausedRef.current.has(item.id)) {
                      requestAnimationFrame(() => playReel(item.id));
                    }
                  } else {
                    videoRefs.current.delete(item.id);
                  }
                }}
                src={playableVideoUrl(item.videoUrl)}
                className="h-full w-full object-cover"
                autoPlay={item.id === activeReelId}
                loop
                muted={muted}
                playsInline
                preload={item.id === activeReelId ? "auto" : "metadata"}
                poster={item.thumbnail}
                onPlay={() => setPlayingId(item.id)}
                onPause={() => setPlayingId((current) => current === item.id ? null : current)}
                onLoadedData={() => {
                  if (activeReelIdRef.current === item.id && !manuallyPausedRef.current.has(item.id)) playReel(item.id);
                }}
                onCanPlay={() => {
                  if (activeReelIdRef.current === item.id && !manuallyPausedRef.current.has(item.id)) playReel(item.id);
                }}
                onError={() => { setVideoErrors((current) => ({ ...current, [item.id]: true })); setPlayingId(null); }}
              />
            ) : (
              <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
            )}
            <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 50%, rgba(0,0,0,0.85) 100%)' }} />
            {playingId !== item.id && item.videoUrl && !videoErrors[item.id] && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md">
                  <Play className="ml-1 h-8 w-8 fill-white text-white" />
                </div>
              </div>
            )}
            {videoErrors[item.id] && (
              <div className="pointer-events-none absolute left-4 right-4 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center gap-2 rounded-lg bg-black/60 px-4 py-3 text-sm font-semibold text-white">
                <AlertCircle className="h-5 w-5" /> Video could not be loaded
              </div>
            )}
          </section>
        ))}
      </div>


      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pl-safe pr-safe" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-7 h-7 text-white drop-shadow-lg" />
        </button>
        <button className="p-1">
          <Search className="w-6 h-6 text-white drop-shadow-lg" />
        </button>
      </div>


      {/* Right side actions - TikTok style */}
      <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-2.5">
        {/* Profile avatar */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="relative mb-0 focus:outline-none"
          aria-label="Edit reel"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border-[2px] border-white">
            <img src={localStorage.getItem("user_avatar") || avatar} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </button>

        {/* Heart - red filled */}
        <div className="flex flex-col items-center">
          <Heart className="w-8 h-8 text-white drop-shadow-lg" fill="white" />
          <span className="text-white text-[12px] font-semibold mt-1">{formatNumber(ins.likes)}</span>
        </div>

        {/* Comments */}
        <div className="flex flex-col items-center">
          <CommentIcon className="w-8 h-8" invert />
          <span className="text-white text-[12px] font-semibold mt-1">{formatNumber(ins.comments)}</span>
        </div>

        {/* Bookmark */}
        <div className="flex flex-col items-center">
          <Bookmark className="w-8 h-8 text-white drop-shadow-lg" fill="white" />
          <span className="text-white text-[12px] font-semibold mt-1">{formatNumber(ins.saves)}</span>
        </div>

        {/* More */}
        <div className="flex flex-col items-center">
          <MoreHorizontal className="w-8 h-8 text-white drop-shadow-lg" />
        </div>

        {/* Spinning music disc */}
        {!r.musicHidden && (
          <div className="w-[38px] h-[38px] rounded-full overflow-hidden border-[4px] border-[#282828]">
            <img src={r.musicCover || avatar} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4">
        {/* Username + date */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-white font-bold text-[15px] drop-shadow-lg">{r.username?.replace("@", "") || "Locus"}</span>
          {r.createdAt && (
            <span className="text-white/70 text-[13px] drop-shadow-lg">· {formatTikTokPostedDate(r.createdAt)}</span>
          )}
        </div>

        {/* Caption/description */}
        <ExpandableCaption text={r.description} className="mb-1 pr-14" />

        {/* Music row - TikTok style */}
        {!r.musicHidden && (
          <div className="flex items-center gap-2 mb-3 pr-16">
            {r.musicCover ? (
              <img src={r.musicCover} alt="" className="w-5 h-5 rounded-sm object-cover flex-shrink-0" />
            ) : (
              <Music className="w-4 h-4 text-white flex-shrink-0" />
            )}
            <span className="text-white text-[13px] drop-shadow-lg truncate">
              {r.music}
            </span>
          </div>
        )}

        {/* Views + More insights row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Play className="w-3.5 h-3.5 text-white" fill="white" />
              <span className="text-white text-[13px] font-medium">{formatViewsDisplay(ins.views)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShareIcon className="w-3.5 h-3.5" variant="white" />
              <span className="text-white text-[13px] font-medium">{formatNumber(ins.shares)}</span>
            </div>
          </div>

          {/* More insights button */}
          <div className="flex items-center gap-2">
            <button
              onClick={(event) => { event.stopPropagation(); onInsights(r); }}
              className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 12h10M7 8h6M7 16h8" />
              </svg>
              <span className="text-white text-[13px] font-semibold">More insights</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <ReelEditSheet reel={localReel} onSave={handleSave} onClose={() => setEditing(false)} />
      )}
    </div>
  );
};

/* ─── Edit Sheet for reel ─── */
const ReelEditSheet = ({ reel, onSave, onClose }: { reel: ReelData; onSave: (r: ReelData) => void; onClose: () => void }) => {
  const [title, setTitle] = useState(reel.title);
  const [description, setDescription] = useState(reel.description);
  const [tags, setTags] = useState(reel.tags.join(", "));
  const [music, setMusic] = useState(reel.music);
  const [musicCover, setMusicCover] = useState(reel.musicCover || "");
  const [musicHidden, setMusicHidden] = useState(!!reel.musicHidden);
  const [username, setUsername] = useState(reel.username);
  const [thumbnail, setThumbnail] = useState(reel.thumbnail);
  const [videoUrl, setVideoUrl] = useState(reel.videoUrl || "");
  const [createdAt, setCreatedAt] = useState(reel.createdAt);
  const [duration, setDuration] = useState(reel.duration);
  const [views, setViews] = useState(formatViewsDisplay(reel.insights.views));
  const [likes, setLikes] = useState(formatNumber(reel.insights.likes));
  const [comments, setComments] = useState(formatNumber(reel.insights.comments));
  const [shares, setShares] = useState(formatNumber(reel.insights.shares));
  const [saves, setSaves] = useState(formatNumber(reel.insights.saves));

  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("thumbnail");
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, setProgress);
      setThumbnail(result.secure_url);
    } catch (err) {
      console.error("Thumbnail upload failed:", err);
      alert("Thumbnail upload failed: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setUploading(null);
      setProgress(0);
      e.target.value = "";
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("video");
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, setProgress);
      setVideoUrl(result.secure_url);
    } catch (err) {
      console.error("Video upload failed:", err);
      alert("Video upload failed: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setUploading(null);
      setProgress(0);
      e.target.value = "";
    }
  };

  const handleMusicCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading("musicCover");
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, setProgress);
      setMusicCover(result.secure_url);
    } catch (err) {
      alert("Music cover upload failed: " + (err instanceof Error ? err.message : "Network error"));
    } finally {
      setUploading(null);
      setProgress(0);
      e.target.value = "";
    }
  };

  const handleSave = () => {
    onSave({
      ...reel,
      title,
      description,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      music,
      musicCover: musicCover || undefined,
      musicHidden,
      username,
      thumbnail,
      videoUrl: videoUrl || undefined,
      createdAt,
      duration,
      insights: {
        ...reel.insights,
        views: parseInputNumber(views),
        likes: parseInputNumber(likes),
        comments: parseInputNumber(comments),
        shares: parseInputNumber(shares),
        saves: parseInputNumber(saves),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end justify-center" onClick={onClose}>
       <div className="w-full max-w-lg min-h-0 max-h-[85dvh] overflow-y-auto overscroll-contain touch-pan-y bg-card rounded-t-2xl" style={{ WebkitOverflowScrolling: "touch" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-foreground font-bold text-lg">Edit Reel</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
              <Save className="w-4 h-4" />Done
            </button>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full"><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {/* Media */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-border relative">
              <img src={thumbnail} alt="" className="w-full h-full object-cover" />
              {uploading === "thumbnail" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{progress}%</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className={`flex items-center gap-1.5 text-[hsl(var(--tiktok-cyan))] text-[13px] font-semibold cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <span>📷</span> Change Thumbnail
                <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
              </label>
              <label className={`flex items-center gap-1.5 text-primary text-[13px] font-semibold cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <span>🎬</span> {videoUrl ? "Change Video" : "Upload Video"}
                <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
              </label>
            </div>
          </div>
          {uploading && (
            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
          {videoUrl && !uploading && (
            <div className="rounded-lg overflow-hidden border border-border">
              <video src={videoUrl} className="w-full h-32 object-cover" controls />
            </div>
          )}

          <Field label="Username" value={username} onChange={setUsername} />
          <Field label="Title" value={title} onChange={setTitle} />
          <FieldArea label="Caption / Description" value={description} onChange={setDescription} />
          <Field label="Tags (comma separated)" value={tags} onChange={setTags} />
          <div className="space-y-2">
            <Field label="Music / Song name" value={music} onChange={setMusic} />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border border-border bg-secondary flex items-center justify-center">
                {musicCover ? (
                  <img src={musicCover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <label className={`flex items-center gap-1.5 text-[hsl(var(--tiktok-cyan))] text-[13px] font-semibold cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <span>🎵</span> {musicCover ? "Change Music Cover" : "Upload Music Cover"}
                <input type="file" accept="image/*" onChange={handleMusicCoverChange} className="hidden" />
              </label>
              {musicCover && (
                <button type="button" onClick={() => setMusicCover("")} className="text-xs text-muted-foreground underline">Remove</button>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
              <input type="checkbox" checked={musicHidden} onChange={e => setMusicHidden(e.target.checked)} className="w-4 h-4 accent-primary" />
              Hide music from video (don't show sound name & cover)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Posted Date" value={createdAt} onChange={setCreatedAt} />
            <Field label="Duration" value={duration} onChange={setDuration} />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-primary font-semibold uppercase tracking-wider">Stats</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumField label="Views" value={views} onChange={setViews} />
            <NumField label="Likes" value={likes} onChange={setLikes} />
            <NumField label="Comments" value={comments} onChange={setComments} />
            <NumField label="Shares" value={shares} onChange={setShares} />
            <NumField label="Saves" value={saves} onChange={setSaves} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="text-xs text-muted-foreground font-medium mb-0.5 block">{label}</label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" />
  </div>
);

const FieldArea = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="text-xs text-muted-foreground font-medium mb-0.5 block">{label}</label>
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
      className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none resize-none" />
  </div>
);

const NumField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="text-xs text-muted-foreground font-medium mb-0.5 block">{label}</label>
    <input type="text" value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none" />
  </div>
);

export default VideoDetail;
