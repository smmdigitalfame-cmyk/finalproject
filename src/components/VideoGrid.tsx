import { ReelData, formatViewsDisplay } from "@/lib/mockData";
import { Play } from "lucide-react";
import { useCallback, useEffect, useRef, memo, useState } from "react";
import { playableVideoUrl } from "@/lib/videoUrls";

interface VideoGridProps {
  reels: ReelData[];
  onReelClick: (reel: ReelData) => void;
  onAddReel?: () => void;
}

const VideoGrid = ({ reels, onReelClick }: VideoGridProps) => {
  return (
    <div className="grid grid-cols-3 gap-[1px]">
      {reels.map((reel) => (
        <VideoThumbnail
          key={reel.id}
          reel={reel}
          onReelClick={onReelClick}
        />
      ))}
    </div>
  );
};

interface VideoThumbnailProps {
  reel: ReelData;
  onReelClick: (reel: ReelData) => void;
}

const VideoThumbnail = memo(({ reel, onReelClick }: VideoThumbnailProps) => {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setThumbnailFailed(false); }, [reel.thumbnail]);
  useEffect(() => {
    const tile = tileRef.current;
    if (!tile) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false), { rootMargin: "100px" });
    observer.observe(tile);
    return () => observer.disconnect();
  }, []);
  const handleClick = useCallback(() => {
    onReelClick(reel);
  }, [onReelClick, reel]);

  return (
    <div
      ref={tileRef}
      className={`relative aspect-[3/4] overflow-hidden cursor-pointer select-none ${
        ""
      }`}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {!thumbnailFailed ? <img
        src={playableVideoUrl(reel.thumbnail)}
        alt={reel.title}
        loading="lazy"
        decoding="async"
        onError={() => setThumbnailFailed(true)}
        className="w-full h-full object-cover"
      /> : reel.videoUrl && visible ? <video
        src={playableVideoUrl(reel.videoUrl)}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={event => { event.currentTarget.currentTime = Math.min(0.1, event.currentTarget.duration / 2 || 0); }}
        className="w-full h-full object-cover"
      /> : null}

      {/* Views count - bottom left like TikTok */}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
        <Play className="w-3 h-3 text-white" fill="currentColor" />
        <span className="text-white text-[11px] font-semibold drop-shadow-md">
          {formatViewsDisplay(reel.insights.views)}
        </span>
      </div>
    </div>
  );
});
VideoThumbnail.displayName = "VideoThumbnail";

export default memo(VideoGrid);
