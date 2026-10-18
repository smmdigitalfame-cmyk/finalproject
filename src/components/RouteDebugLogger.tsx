import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";

export type RouteEntry = { path: string; t: number; sincePrev: number };

declare global {
  interface Window {
    __routeLog?: RouteEntry[];
    __debugSplashOn?: boolean;
    __splashTiming?: { t0: number; marks: { name: string; t: number }[] };


  }
}

/**
 * Logs every route transition to console + window.__routeLog.
 * Also emits `route:change` CustomEvent so SplashDebugPanel can render live.
 * Enabled when ?debug-splash=1 or localStorage.debug_splash === '1'.
 */
const RouteDebugLogger = () => {
  const location = useLocation();
  const prevT = useRef<number>(performance.now());
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    let on = false;
    try {
      on =
        new URLSearchParams(window.location.search).get("debug-splash") === "1" ||
        localStorage.getItem("debug_splash") === "1";
    } catch {
      on = false;
    }
    window.__debugSplashOn = on;
    if (!on) return;

    if (prevPath.current === location.pathname) return;

    const now = performance.now();
    const sincePrev = Math.round(now - prevT.current);
    const t0 = window.__splashTiming?.t0 ?? now;
    const tRel = Math.round(now - t0);

    const entry: RouteEntry = { path: location.pathname, t: tRel, sincePrev };
    window.__routeLog = window.__routeLog || [];
    window.__routeLog.push(entry);

    // eslint-disable-next-line no-console
    console.log(
      `[route] ${prevPath.current ?? "(init)"} → ${location.pathname} @ ${tRel}ms (+${sincePrev}ms)`
    );
    window.dispatchEvent(new CustomEvent("route:change", { detail: entry }));

    prevPath.current = location.pathname;
    prevT.current = now;
  }, [location.pathname]);

  return null;
};

export default RouteDebugLogger;
