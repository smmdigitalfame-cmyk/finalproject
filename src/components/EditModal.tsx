import { formatNumber, ReelData } from "@/lib/mockData";
import { parseInputNumber } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { X, Save, Image, Film, Music } from "lucide-react";
import { useState } from "react";

interface EditModalProps {
  reel: ReelData;
  onSave: (updated: ReelData) => void;
  onClose: () => void;
}

const EditModal = ({ reel, onSave, onClose }: EditModalProps) => {
  const [title, setTitle] = useState(reel.title);
  const [description, setDescription] = useState(reel.description);
  const [tags, setTags] = useState(reel.tags.join(", "));
  const [music, setMusic] = useState(reel.music);
  const [musicCover, setMusicCover] = useState(reel.musicCover || "");
  const [musicHidden, setMusicHidden] = useState(!!reel.musicHidden);
  const [createdAt, setCreatedAt] = useState(reel.createdAt);
  const [thumbnail, setThumbnail] = useState(reel.thumbnail);
  const [videoUrl, setVideoUrl] = useState(reel.videoUrl || "");
  const [views, setViews] = useState(formatNumber(reel.insights.views));
  const [likes, setLikes] = useState(formatNumber(reel.insights.likes));
  const [comments, setComments] = useState(formatNumber(reel.insights.comments));
  const [shares, setShares] = useState(formatNumber(reel.insights.shares));
  const [saves, setSaves] = useState(formatNumber(reel.insights.saves));
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleMusicCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const updatedReel: ReelData = {
      ...reel,
      title,
      description,
      createdAt,
      thumbnail,
      videoUrl: videoUrl || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      music,
      musicCover: musicCover || undefined,
      musicHidden,
      insights: {
        ...reel.insights,
        views: parseInputNumber(views),
        likes: parseInputNumber(likes),
        comments: parseInputNumber(comments),
        shares: parseInputNumber(shares),
        saves: parseInputNumber(saves),
      },
    };
    onSave(updatedReel);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-lg min-h-0 max-h-[85dvh] overflow-y-auto overscroll-contain touch-pan-y bg-card rounded-t-2xl"
        style={{ WebkitOverflowScrolling: "touch" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-foreground font-bold text-lg">Edit Reel</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!!uploading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-opacity ${
                uploading
                  ? "bg-[#8a8b91] text-white cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {uploading ? (
                <>
                  Processing... {progress}%
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Media Section */}
          <SectionLabel label="Media" />
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
                {uploading === "thumbnail" ? null : <Image className="w-4 h-4" />}
                Change Thumbnail
                <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
              </label>
              <label className={`flex items-center gap-1.5 text-primary text-[13px] font-semibold cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                {uploading === "video" ? null : <Film className="w-4 h-4" />}
                {videoUrl ? "Change Video" : "Upload Video"}
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
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

          {/* Content Section */}
          <SectionLabel label="Content" />
          <InputField label="Title" value={title} onChange={setTitle} />
          <TextareaField label="Description" value={description} onChange={setDescription} />
          <InputField label="Tags (comma separated)" value={tags} onChange={setTags} />
          <InputField label="Music / Song name" value={music} onChange={setMusic} />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border border-border bg-secondary flex items-center justify-center">
              {musicCover ? (
                <img src={musicCover} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <label className={`flex items-center gap-1.5 text-[hsl(var(--tiktok-cyan))] text-[13px] font-semibold cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              <Music className="w-4 h-4" /> {musicCover ? "Change Music Cover" : "Upload Music Cover"}
              <input type="file" accept="image/*" onChange={handleMusicCoverUpload} className="hidden" />
            </label>
            {musicCover && (
              <button type="button" onClick={() => setMusicCover("")} className="text-xs text-muted-foreground underline">Remove</button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
            <input type="checkbox" checked={musicHidden} onChange={e => setMusicHidden(e.target.checked)} className="w-4 h-4 accent-primary" />
            Hide music from video
          </label>
          <InputField label="Date (YYYY-MM-DD)" value={createdAt} onChange={setCreatedAt} type="date" />

          {/* Insights Section */}
          <SectionLabel label="Insights" />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Views" value={views} onChange={setViews} />
            <NumberField label="Likes" value={likes} onChange={setLikes} />
            <NumberField label="Comments" value={comments} onChange={setComments} />
            <NumberField label="Shares" value={shares} onChange={setShares} />
            <NumberField label="Saves" value={saves} onChange={setSaves} />
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionLabel = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 pt-2">
    <div className="h-px flex-1 bg-border" />
    <span className="text-xs text-primary font-semibold uppercase tracking-wider">{label}</span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

const InputField = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) => (
  <div>
    <label className="text-xs text-muted-foreground font-medium mb-1 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none transition-colors"
    />
  </div>
);

const TextareaField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="text-xs text-muted-foreground font-medium mb-1 block">{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none transition-colors resize-none"
    />
  </div>
);

const NumberField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label className="text-xs text-muted-foreground font-medium mb-1 block">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-secondary text-foreground rounded-lg px-3 py-2.5 text-sm border border-border focus:border-primary focus:outline-none transition-colors"
    />
  </div>
);

export default EditModal;
