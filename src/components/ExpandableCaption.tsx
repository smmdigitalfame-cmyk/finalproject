import { useLayoutEffect, useRef, useState } from "react";

/**
 * TikTok-style caption: 2 lines with inline "...more"; tap expands smoothly
 * to the full real caption with a "less" link, tap again collapses.
 */
const MORE = "...more";

const ExpandableCaption = ({ text, className = "" }: { text: string; className?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [short, setShort] = useState<string | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);
  const shortRef = useRef<HTMLParagraphElement>(null);

  // Find the longest prefix that fits in 2 lines together with "...more".
  useLayoutEffect(() => {
    const m = measureRef.current;
    if (!m || !text) { setShort(null); return; }
    const lineH = parseFloat(getComputedStyle(m).lineHeight) || 20;
    const maxH = lineH * 2 + 1;
    m.textContent = text;
    if (m.scrollHeight <= maxH) { setShort(null); return; }
    let lo = 0, hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      m.textContent = text.slice(0, mid).trimEnd() + " " + MORE;
      if (m.scrollHeight <= maxH) lo = mid; else hi = mid - 1;
    }
    setShort(text.slice(0, lo).trimEnd());
  }, [text]);

  useLayoutEffect(() => {
    const target = expanded ? fullRef.current : shortRef.current;
    if (target) setHeight(target.scrollHeight);
  }, [expanded, short, text]);

  if (!text) return null;

  const toggle = (e: React.MouseEvent) => {
    if (short === null) return;
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <div className={`relative ${className}`} onClick={toggle}>
      <p ref={measureRef} aria-hidden className="invisible absolute inset-x-0 top-0 text-[14px] leading-[1.4] whitespace-pre-line break-words" />
      <div
        ref={wrapRef}
        className="overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ height }}
      >
        {expanded || short === null ? (
          <div ref={fullRef}>
            <p className="text-white text-[14px] leading-[1.4] drop-shadow-lg whitespace-pre-line break-words">{text}</p>
            {short !== null && (
              <p className="text-right text-white/80 text-[14px] font-semibold leading-[1.4] drop-shadow-lg pt-0.5">less</p>
            )}
          </div>
        ) : (
          <p ref={shortRef} className="text-white text-[14px] leading-[1.4] drop-shadow-lg whitespace-pre-line break-words">
            {short} <span className="font-semibold text-white/80">{MORE}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default ExpandableCaption;
