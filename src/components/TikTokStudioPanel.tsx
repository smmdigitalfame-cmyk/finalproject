import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ChevronRight, Settings } from "lucide-react";
import ProfileAnalyticsPanel from "./ProfileAnalyticsPanel";
import { uploadToCloudinary } from "@/lib/cloudinary";

const TikTokDots = () => (
  <div className="tiktok-loader my-4">
    <div className="tiktok-dot tiktok-dot-cyan" />
    <div className="tiktok-dot tiktok-dot-red" />
  </div>
);

const SkeletonCard = () => (
  <div className="w-full space-y-8">
    {/* Analytics Summary Plate */}
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-muted/10 rounded-xl skeleton" />
      ))}
    </div>

    {/* Inspiration List */}
    <div className="space-y-6">
      <div className="h-5 w-32 skeleton mb-4" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 skeleton" />
            <div className="h-3 w-1/2 skeleton opacity-50" />
          </div>
          <div className="h-8 w-16 rounded-full skeleton shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

interface TikTokStudioPanelProps {
  onClose: () => void;
}

export default function TikTokStudioPanel({ onClose }: TikTokStudioPanelProps) {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleEditMode = () => {
    setIsEditing(prev => !prev);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  if (showAnalytics) {
    return <ProfileAnalyticsPanel onClose={() => setShowAnalytics(false)} />;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto scrollbar-hide text-foreground">
      {/* Header */}
      <div className="sticky top-0 bg-background z-20 border-b border-border">
        <div className="flex items-center justify-between h-[52px] px-4">
          <button onClick={onClose} className="p-1 -ml-1">
            <ArrowLeft className="w-7 h-7 text-foreground" />
          </button>
          <h1 className="text-center font-bold text-[17.5px] tracking-tight cursor-pointer select-none" onClick={toggleEditMode}>
            {isEditing ? <span className="text-primary animate-pulse">Edit Mode</span> : <EditableVal val="TikTok Studio" isEditing={isEditing} />}
          </h1>
          <button className="p-1 -mr-1">
            <Settings className="w-6 h-6 text-foreground" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div 
        className="p-3 pb-12 space-y-[12px] animate-in slide-in-from-bottom-4 duration-500"
        onContextMenu={e => e.preventDefault()}
      >
        {/* Analytics Card */}
        <div 
          className="bg-card rounded-[14px] p-4 cursor-pointer relative border border-border active:bg-muted/50 transition-colors"
          onClick={() => {
            if (!isEditing) {
              setIsLoading(true);
              setTimeout(() => {
                setShowAnalytics(true);
                setIsLoading(false);
              }, 450);
            }
          }}
        >
          {isLoading && (
            <div className="loading-full-screen">
              <TikTokDots />
              <div className="w-full space-y-4 px-8 mt-16 max-w-lg">
                <SkeletonCard />
              </div>
            </div>
          )}
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-[17.5px] font-bold"><EditableVal val="Analytics" isEditing={isEditing} /></h2>
            <ChevronRight className="w-5.5 h-5.5 text-muted-foreground/30" />
          </div>
          
          <div className="grid grid-cols-3 gap-1">
            <div className="flex flex-col">
               <div className="text-muted-foreground text-[13.5px] mb-3 font-medium"><EditableVal val="Post views" isEditing={isEditing} /></div>
               <div className="text-foreground font-black text-[23.5px] mb-1.5 leading-none"><EditableVal val="868" isEditing={isEditing} /></div>
               <div className="text-muted-foreground/30 text-[12.5px] font-bold"><EditableVal val="0% 7d" isEditing={isEditing} /></div>
            </div>
            <div className="flex flex-col">
               <div className="text-muted-foreground text-[13.5px] mb-3 font-medium"><EditableVal val="Net followers" isEditing={isEditing} /></div>
               <div className="text-foreground font-black text-[23.5px] mb-1.5 leading-none"><EditableVal val="-1" isEditing={isEditing} /></div>
               <div className="text-muted-foreground/30 text-[12.5px] font-bold flex items-center gap-1">
                 <span className="text-[10px] transform translate-y-[0.5px]">▼</span>
                 <EditableVal val="5% 7d" isEditing={isEditing} />
               </div>
            </div>
            <div className="flex flex-col">
               <div className="text-muted-foreground text-[13.5px] mb-3 font-medium"><EditableVal val="Likes" isEditing={isEditing} /></div>
               <div className="text-foreground font-black text-[23.5px] mb-1.5 leading-none"><EditableVal val="41" isEditing={isEditing} /></div>
               <div className="text-muted-foreground/30 text-[12.5px] font-bold"><EditableVal val="0% 7d" isEditing={isEditing} /></div>
            </div>
          </div>
        </div>

        {/* Promo Banner */}
        <div className="bg-card rounded-[14px] p-2.5 flex items-center gap-3 border border-border active:bg-muted/50 transition-colors">
          <div className="w-[62px] h-[62px] bg-background rounded-[14px] flex-shrink-0 relative overflow-hidden flex items-center justify-center border border-border group">
             <EditableImage id="promo_banner" isEditing={isEditing} />
             {!isEditing && (
               <div className="flex flex-col items-center justify-center bg-black w-full h-full relative p-1.5">
                  <div className="relative w-9 h-9 flex items-center justify-center mb-1">
                    {/* Simplified TikTok "d" logo SVG */}
                    <svg viewBox="0 0 24 24" className="w-full h-full" fill="white">
                      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-.98v7.59c0 5.29-4.39 8.6-8.88 5.85-3.08-1.89-4.22-6.15-2.03-9.15 1.56-2.26 4.67-3.08 7.15-1.99.37.16.71.37 1.02.63V.02z" />
                    </svg>
                  </div>
                  <div className="absolute bottom-0 w-full bg-white h-[16px] flex items-center justify-center shadow-sm">
                    <span className="text-black text-[9px] font-black uppercase tracking-[-0.2px]">Studio</span>
                  </div>
               </div>
             )}
          </div>
          <div className="flex-1 pr-1">
            <p className="text-[14px] leading-[1.35] text-foreground font-bold mb-0.5">
              <EditableVal val="Post when the time is right with Scheduled Posts on the TikTok Studio a..." isEditing={isEditing} />
            </p>
            <p className="text-[14px] text-primary font-black mt-1"><EditableVal val="Download" isEditing={isEditing} /></p>
          </div>
          <div className="flex-shrink-0 w-[64px] h-[64px] bg-green-500/10 rounded-lg overflow-hidden border border-border opacity-50 relative">
             <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 blur-[1px]" />
          </div>
        </div>

        {/* Inspiration Section */}
        <div className="bg-card rounded-[14px] p-4 border border-border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[17.5px] font-bold"><EditableVal val="Inspiration" isEditing={isEditing} /></h2>
            <ChevronRight className="w-5.5 h-5.5 text-muted-foreground/30" />
          </div>

          <div className="flex overflow-x-auto gap-2 mb-7 scrollbar-hide -mx-1 px-1">
            <button className="whitespace-nowrap px-[18.5px] py-[8.5px] rounded-full text-[14px] font-bold bg-foreground text-background shrink-0 transition-opacity">
               <EditableVal val="Trending creators" isEditing={isEditing} />
            </button>
            <button className="whitespace-nowrap px-[18.5px] py-[8.5px] rounded-full text-[14px] font-bold bg-muted text-foreground shrink-0 transition-opacity">
               <EditableVal val="Trending posts" isEditing={isEditing} />
            </button>
            <button className="whitespace-nowrap px-[18.5px] py-[8.5px] rounded-full text-[14px] font-bold bg-muted text-foreground shrink-0 transition-opacity">
               <EditableVal val="Followers viewe..." isEditing={isEditing} />
            </button>
          </div>

          <div className="space-y-[21px]">
            {[
              { id: 1, name: "ronielsouza559", followers: "1.1M" },
              { id: 2, name: "Solo Wild", followers: "1.5M" },
              { id: 3, name: "DoubleBite", followers: "365.6K" },
              { id: 4, name: "Cat Mind", followers: "578.1K" },
              { id: 5, name: "Mundos Salvajes", followers: "591K" },
            ].map((creator, i) => {
              const bgClass =
                i === 0 ? "bg-[#ffcc00]" :
                i === 1 ? "bg-[#ced4da]" :
                i === 2 ? "bg-[#ff9500]" :
                "bg-[#3a3a3c]";
              const textClass = i < 3 ? "text-black" : "text-white";

              return (
                <div key={creator.id} className="flex items-center gap-3.5">
                  <div className={`w-[22px] h-[22px] text-[11px] font-black rounded-[4px] flex shrink-0 items-center justify-center ${bgClass} ${textClass}`}>
                    <EditableVal val={creator.id} isEditing={isEditing} />
                  </div>
                  <div className="w-[50px] h-[50px] rounded-full bg-muted flex-shrink-0 relative overflow-hidden border border-border">
                    <img
                      src={`https://i.pravatar.cc/150?u=${encodeURIComponent(creator.name)}`}
                      alt={creator.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <EditableImage id={`studio_creator_${creator.id}`} isEditing={isEditing} className="rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-bold text-[15.5px] leading-none mb-1.5 truncate"><EditableVal val={creator.name} isEditing={isEditing} /></h3>
                    <p className="text-muted-foreground text-[13.5px] font-bold"><EditableVal val={`${creator.followers} followers`} isEditing={isEditing} /></p>
                  </div>
                  <button className="bg-primary text-primary-foreground px-[22px] py-[8.5px] rounded-full font-black text-[14px] shrink-0 active:scale-95 transition-all">
                    <EditableVal val="Follow" isEditing={isEditing} />
                  </button>
                </div>
              );
            })}
          </div>

          <button className="w-full mt-10 py-[14px] rounded-xl bg-muted text-foreground font-black text-[14.5px] active:bg-muted/50 transition-all border border-border">
            <EditableVal val="Get more inspiration" isEditing={isEditing} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Editable helpers
const EditableVal = ({ val, isEditing, className = "", onUpdate, id }: { val: string | number; isEditing: boolean; className?: string; onUpdate?: (v: string) => void; id?: string }) => {
  const getInitialVal = () => {
    if (onUpdate || typeof window === "undefined") return val;
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
      className={`outline-none transition-colors ${isEditing ? 'border-b border-dashed border-[#69c0ff] text-[#69c0ff] bg-[#69c0ff]/10 rounded px-1 min-w-[10px] inline-block whitespace-pre-wrap' : ''} ${className}`}
    >
      {internalVal}
    </span>
  );
};

const EditableImage = ({ src, isEditing, className = "", onUpdate, id }: { src?: string; isEditing: boolean; className?: string; onUpdate?: (s: string) => void; id?: string }) => {
  const getInitialVal = () => {
    if (onUpdate || typeof window === "undefined") return src || "";
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
        className={`absolute inset-0 z-0 flex items-center justify-center ${className} ${isEditing ? 'cursor-pointer hover:bg-white/20 bg-black/50' : ''}`}
        onClick={() => { if (isEditing) fileInputRef.current?.click(); }}
      >
        {internalSrc ? (
          <img src={internalSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          isEditing && (
            <div className="flex flex-col items-center gap-0.5">
               <div className="text-white/90 text-[10px] text-center font-bold px-1.5 py-0.5 rounded bg-[#fe2c55] shadow-sm">
                 {isUploading ? "..." : "Img"}
               </div>
            </div>
          )
        )}
      </div>
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
    </>
  );
};
