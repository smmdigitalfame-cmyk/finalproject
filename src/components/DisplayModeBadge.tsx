import { useEffect, useState } from "react";

type Mode = "standalone" | "browser" | "minimal-ui" | "fullscreen";

const detectMode = (): Mode => {
  if (typeof window === "undefined") return "browser";
  // iOS Safari legacy
  if ((navigator as unknown as { standalone?: boolean }).standalone) return "standalone";
  const modes: Mode[] = ["standalone", "fullscreen", "minimal-ui"];
  for (const m of modes) {
    if (window.matchMedia(`(display-mode: ${m})`).matches) return m;
  }
  return "browser";
};

const DisplayModeBadge = () => {
  const [mode, setMode] = useState<Mode>(detectMode);

  useEffect(() => {
    const mqs = (["standalone", "fullscreen", "minimal-ui"] as Mode[]).map((m) =>
      window.matchMedia(`(display-mode: ${m})`),
    );
    const update = () => setMode(detectMode());
    mqs.forEach((mq) => mq.addEventListener?.("change", update));
    return () => mqs.forEach((mq) => mq.removeEventListener?.("change", update));
  }, []);

  const isStandalone = mode === "standalone" || mode === "fullscreen";
  const color = isStandalone ? "bg-emerald-500" : "bg-amber-500";
  const label = isStandalone ? `PWA · ${mode}` : `Browser · ${mode}`;

  return (
    <div
      className="fixed z-[2147483646] pointer-events-none select-none"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 6px)",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      <div
        className={`${color} text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-lg`}
      >
        {label}
      </div>
    </div>
  );
};

export default DisplayModeBadge;
