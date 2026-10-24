import { useRef, useState, type ReactNode, type CSSProperties } from "react";

const THRESHOLD = 70;

export default function PullToRefresh({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onStart = (e: React.TouchEvent) => {
    if (refreshing || (ref.current?.scrollTop ?? 0) > 0) return;
    startY.current = e.touches[0].clientY;
  };
  const onMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const d = e.touches[0].clientY - startY.current;
    if (d <= 0) { setPull(0); return; }
    setPull(Math.min(110, d * 0.5));
  };
  const onEnd = () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(60);
      setTimeout(() => { setRefreshing(false); setPull(0); }, 1200);
    } else setPull(0);
  };

  const shown = refreshing || pull > 4;
  return (
    <div ref={ref} className={className} style={style} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}>
      <div className="flex items-center justify-center overflow-hidden" style={{ height: pull, transition: startY.current === null ? "height 0.25s ease" : "none" }}>
        {shown && (
          <div className={`relative w-8 h-4 ${refreshing ? "ptr-spin" : ""}`} style={!refreshing ? { transform: `rotate(${pull * 3}deg)` } : undefined}>
            <span className="ptr-dot ptr-red" />
            <span className="ptr-dot ptr-cyan" />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
