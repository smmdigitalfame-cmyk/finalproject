import ExpandableCaption from "@/components/ExpandableCaption";
import { useState, useRef, useCallback, useEffect, memo } from "react";
import { ReelData, formatNumber, formatViewsDisplay } from "@/lib/mockData";
import { parseInputNumber } from "@/lib/utils";
import { Heart, Bookmark, Music, Search, X, Save, PlayCircle, AlertCircle } from "lucide-react";
import { CommentIcon } from "./CommentIcon";
import { ShareIcon } from "@/components/ShareIcon";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { playableVideoUrl } from "@/lib/videoUrls";
import avatar from "@/assets/avatar.jpg";

interface HomeFeedProps {
  reels: ReelData[];
  onSave?: (updated: ReelData) => void;
}

const HomeFeed = ({ reels, onSave }: HomeFeedProps) => {
  const [activeTopTab, setActiveTopTab] = useState("foryou");
  const [editingReel, setEditingReel] = useState<ReelData | null>(null);

  return (
    <div className="fixed inset-0 z-30 min-h-0 bg-black">
      {/* Top tabs */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pb-2 max-w-lg mx-auto pt-safe pl-safe pr-safe" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div className="w-8" />
        <div className="flex items-center gap-5">
          <button
            onClick={() => setActiveTopTab("explore")}
            className={`text-[16px] transition-colors ${activeTopTab === "explore" ? "text-white font-bold" : "text-white/60 font-medium"}`}
          >
            Community
          </button>
          <div className="relative">
            <button
              onClick={() => setActiveTopTab("following")}
              className={`text-[16px] transition-colors ${activeTopTab === "following" ? "text-white font-bold" : "text-white/60 font-medium"}`}
            >
              Following
            </button>
          </div>
          <button
            onClick={() => setActiveTopTab("foryou")}
            className={`relative text-[16px] transition-colors ${activeTopTab === "foryou" ? "text-white font-bold" : "text-white/60 font-medium"}`}
          >
            For You
            {activeTopTab === "foryou" && (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-white rounded-full" />
            )}
          </button>
        </div>
        <Search className="w-6 h-6 text-white" />
      </div>

      {/* Scrollable feed */}
      <div className="h-[100dvh] min-h-0 overflow-y-scroll snap-y snap-proximity scrollbar-hide max-w-lg mx-auto overscroll-y-contain touch-pan-y" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {reels.map((reel) => (
          <FeedCard key={reel.id} reel={reel} />
        ))}
      </div>

      {/* Edit modal */}
      {editingReel && (
        <HomeFeedEditSheet
          reel={editingReel}
          onSave={(updated) => {
            onSave?.(updated);
            setEditingReel(null);
          }}
          onClose={() => setEditingReel(null)}
        />
      )}
    </div>
  );
};

const FeedCard = memo(({ reel }: { reel: ReelData }) => {
  const ins = reel.insights;
  const [isNear, setIsNear] = useState(false); // mount <video> only when card is near viewport
  const [playing, setPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [liked, setLiked] = useState(false);
  const [likePop, setLikePop] = useState(0);
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number; r: number }[]>([]);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);

  // Mount the <video> element only when the card is within ~1 viewport of the user.
  // Saves memory & network when there are 1000s of reels.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const nearObserver = new IntersectionObserver(
      ([entry]) => setIsNear(entry.isIntersecting),
      { rootMargin: "150% 0px 150% 0px" }
    );
    nearObserver.observe(container);
    return () => nearObserver.disconnect();
  }, []);

  // Autoplay when on-screen, pause when off-screen OR tab/window hidden
  const isVisibleRef = useRef(false); // is the card sufficiently on-screen
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const playIfShould = () => {
      if (isVisibleRef.current && document.visibilityState === "visible") {
        video.muted = mutedRef.current;
        video.play().then(() => setPlaying(true)).catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "NotAllowedError" && !mutedRef.current) {
            mutedRef.current = true;
            setMuted(true);
            video.muted = true;
            void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
          } else if (!(error instanceof DOMException && error.name === "AbortError")) {
            setPlaying(false);
          }
        });
      } else {
        video.pause();
        setPlaying(false);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        playIfShould();
      },
      { threshold: 0.6 }
    );
    observer.observe(container);

    const onVisibility = () => playIfShould();
    const onPageHide = () => video.pause();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("blur", onPageHide);
    window.addEventListener("focus", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("blur", onPageHide);
      window.removeEventListener("focus", onVisibility);
      video.pause();
    };
  }, [isNear, reel.videoUrl]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setVideoError(false);
      // User tap is a gesture: attempt audible playback first; autoplay fallback stays muted only if policy blocks it.
      mutedRef.current = false;
      setMuted(false);
      video.muted = false;
      if (video.error || video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load();
      video.play().catch(() => {
        const retry = () => video.play().catch(() => {
          setPlaying(false);
          setVideoError(true);
        });
        video.addEventListener("canplay", retry, { once: true });
      });
    } else {
      video.pause();
    }
  }, []);



  const handleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      const rect = containerRef.current?.getBoundingClientRect();
      const id = now + Math.random();
      setBursts((b) => [...b, { id, x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0), r: Math.round(Math.random() * 40 - 20) }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 900);
      if (!liked) { setLiked(true); setLikePop((n) => n + 1); }
      lastTap.current = now;
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => { tapTimer.current = null; togglePlayback(); }, 300);
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked((v) => !v);
    setLikePop((n) => n + 1);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] snap-start flex-shrink-0 select-none"
      onClick={handleTap}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Card wrapper */}
      <div className="relative w-full h-full">
        {/* Video or thumbnail — video element only mounted when card is near viewport */}
        {reel.videoUrl && isNear ? (
          <video
            ref={videoRef}
            src={playableVideoUrl(reel.videoUrl)}
            className="absolute inset-0 w-full h-full object-cover"
            loop
             muted={muted}
            playsInline
             preload="auto"
            poster={reel.thumbnail}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => { setVideoError(true); setPlaying(false); }}
          />
        ) : (
          <img
            src={reel.thumbnail}
            alt={reel.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 15%, transparent 50%, rgba(0,0,0,0.85) 100%)' }} />
        {bursts.map((b) => (
          <Heart key={b.id} className="like-burst pointer-events-none absolute z-20 w-24 h-24 text-[#fe2c55]" fill="currentColor"
            style={{ left: b.x - 48, top: b.y - 48, ["--r" as string]: `${b.r}deg` }} />
        ))}
        {reel.videoUrl && !playing && !videoError && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <PlayCircle className="h-16 w-16 text-white/90 drop-shadow-lg" fill="currentColor" />
          </div>
        )}
        {videoError && (
          <div className="pointer-events-none absolute inset-x-4 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center gap-2 rounded-lg bg-black/60 px-4 py-3 text-sm font-semibold text-white">
            <AlertCircle className="h-5 w-5" /> Video could not be loaded
          </div>
        )}


        {/* Bottom info */}
        <div className="absolute left-0 right-14 z-10 px-4" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
          <p className="text-white font-bold text-[16px] drop-shadow-lg mb-1.5">{reel.title}</p>
          <ExpandableCaption text={reel.description} className="mb-1.5" />
          <div className="flex items-center gap-2 mt-2">
            {reel.musicCover ? <img src={reel.musicCover} alt="" className="w-5 h-5 rounded-sm object-cover flex-shrink-0" /> : <Music className="w-4 h-4 text-white flex-shrink-0" />}
            <span className="text-white text-[13px] drop-shadow-lg truncate">{reel.music}</span>
          </div>
        </div>
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-36 z-10 flex flex-col items-center gap-5">
        <div className="relative mb-3">
          {localStorage.getItem("user_has_story") === "1" ? (
            <div className="relative w-[52px] h-[52px]">
              <div className="absolute inset-0 rounded-full animate-spin" style={{ animationDuration: "2.5s", background: "conic-gradient(#20d5ec, #2ee59d, #20d5ec, #1fb8f0, #20d5ec)" }} />
              <div className="absolute inset-[3px] rounded-full overflow-hidden bg-black p-[2px]">
                <img src={localStorage.getItem("user_avatar") || avatar} alt="" className="w-full h-full rounded-full object-cover" />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full overflow-hidden border-[2px] border-white">
              <img src={localStorage.getItem("user_avatar") || avatar} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[hsl(var(--tiktok-red))] flex items-center justify-center text-white text-[15px] font-bold leading-none">+</div>
        </div>

        <div className="flex flex-col items-center">
          <button type="button" aria-label="Like" onClick={toggleLike} className="p-0 bg-transparent">
            <Heart key={likePop} className={`w-8 h-8 drop-shadow-lg ${liked ? "text-[#fe2c55] like-pop" : "text-white"}`} fill="currentColor" />
          </button>
          <span className="text-white text-[12px] font-semibold mt-1 drop-shadow-lg">{formatNumber(ins.likes + (liked ? 1 : 0))}</span>
        </div>
        <div className="flex flex-col items-center">
          <CommentIcon className="w-8 h-8" invert />
          <span className="text-white text-[12px] font-semibold mt-1 drop-shadow-lg">{formatNumber(ins.comments)}</span>
        </div>
        <div className="flex flex-col items-center">
          <Bookmark className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" />
          <span className="text-white text-[12px] font-semibold mt-1 drop-shadow-lg">{formatNumber(ins.saves)}</span>
        </div>
        <div className="flex flex-col items-center">
          <ShareIcon className="w-8 h-8 drop-shadow-lg" variant="white" />
          <span className="text-white text-[12px] font-semibold mt-1 drop-shadow-lg">{formatNumber(ins.shares)}</span>
        </div>
      </div>

      {/* Spinning music disc */}
      <div className="absolute right-3 z-10" style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="w-[40px] h-[40px] rounded-full overflow-hidden border-[5px] border-[#282828] animate-spin" style={{ animationDuration: '3s' }}>
          <img src={reel.musicCover || localStorage.getItem("user_avatar") || avatar} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
});
FeedCard.displayName = "FeedCard";

/* ─── Edit Sheet for Home Feed reel ─── */
const HomeFeedEditSheet = ({ reel, onSave, onClose }: { reel: ReelData; onSave: (r: ReelData) => void; onClose: () => void }) => {
  const [title, setTitle] = useState(reel.title);
  const [description, setDescription] = useState(reel.description);
  const [tags, setTags] = useState(reel.tags.join(", "));
  const [music, setMusic] = useState(reel.music);
  const [username, setUsername] = useState(reel.username);
  const [thumbnail, setThumbnail] = useState(reel.thumbnail);
  const [videoUrl, setVideoUrl] = useState(reel.videoUrl || "");
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

  const handleSave = () => {
    onSave({
      ...reel,
      title, description, music, username, thumbnail,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      videoUrl: videoUrl || undefined,
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
      <div className="w-full max-w-lg bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-foreground font-bold text-lg">Edit Reel</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={!!uploading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold ${uploading ? "bg-[#8a8b91] text-white cursor-not-allowed" : "bg-primary text-primary-foreground"}`}>
              {uploading ? <>Processing... {progress}%</> : <><Save className="w-4 h-4" />Done</>}
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
                {uploading === "thumbnail" ? null : <span>📷</span>} Change Thumbnail
                <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
              </label>
              <label className={`flex items-center gap-1.5 text-primary text-[13px] font-semibold cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                {uploading === "video" ? null : <span>🎬</span>} {videoUrl ? "Change Video" : "Upload Video"}
                <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
              </label>
            </div>
          </div>
          {uploading && (
            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}

          <Field label="Username" value={username} onChange={setUsername} />
          <Field label="Title" value={title} onChange={setTitle} />
          <FieldArea label="Caption / Description" value={description} onChange={setDescription} />
          <Field label="Tags (comma separated)" value={tags} onChange={setTags} />
          <Field label="Music" value={music} onChange={setMusic} />

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

export default HomeFeed;
