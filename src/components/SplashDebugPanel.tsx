import { useEffect, useState } from "react";

type Mark = { name: string; t: number };
type SplashDoneDetail = { t0: number; marks: Mark[] };

/**
 * Dev-only UI panel showing splash timing. Enabled when:
 *  - URL has ?debug-splash=1  OR
 *  - localStorage.debug_splash === '1'
 * Tap the badge to toggle expanded/collapsed.
 */
const SplashDebugPanel = () => {
  const [enabled, setEnabled] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    try {
      const on =
        new URLSearchParams(window.location.search).get("debug-splash") === "1" ||
        localStorage.getItem("debug_splash") === "1";
      setEnabled(on);
      if (!on) return;
    } catch {
      return;
    }

    const readMarks = () => {
      const t = (window as unknown as { __splashTiming?: SplashDoneDetail }).__splashTiming;
      if (t?.marks) setMarks([...t.marks]);
    };
    readMarks();
    const iv = window.setInterval(readMarks, 100);
    const onDone = (e: Event) => {
      const detail = (e as CustomEvent<SplashDoneDetail>).detail;
      if (detail?.marks) setMarks([...detail.marks]);
      window.clearInterval(iv);
    };
    window.addEventListener("splash:done", onDone);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("splash:done", onDone);
    };
  }, []);

  if (!enabled) return null;

  const total = marks.length ? marks[marks.length - 1].t : 0;

  return (
    <div
      className="fixed z-[2147483645] font-mono text-[10px] leading-tight"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 60px)",
        left: 8,
        right: 8,
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left bg-black/85 text-emerald-400 border border-emerald-500/40 rounded-lg px-2 py-1 shadow-2xl backdrop-blur"
      >
        <div className="flex items-center justify-between">
          <span className="font-bold">SPLASH · {total}ms · {marks.length} marks</span>
          <span className="text-emerald-300/70">{expanded ? "▼" : "▶"}</span>
        </div>
        {expanded && (
          <div className="mt-1 space-y-0.5 max-h-40 overflow-auto">
            {marks.map((m, i) => {
              const prev = i > 0 ? marks[i - 1].t : 0;
              const delta = m.t - prev;
              return (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-white/90 truncate">{m.name}</span>
                  <span className="text-emerald-400/80 flex-shrink-0">
                    {m.t}ms{delta > 0 ? ` (+${delta})` : ""}
                  </span>
                </div>
              );
            })}
            {!marks.length && <div className="text-white/50">Waiting…</div>}
          </div>
        )}
      </button>
    </div>
  );
};

export default SplashDebugPanel;
