// Deep-link / bfcache guard for the splash overlay.
// Ensures the inline #app-splash element never re-appears after:
//   • SPA (React Router) navigation
//   • Browser back/forward, including bfcache restore (`pageshow.persisted`)
//   • popstate / hashchange
//
// The overlay is meant to render exactly ONCE per hard load. Any later
// reappearance (e.g. a stray re-insertion, iOS bfcache resurrecting the
// element with opacity:1) is stripped immediately.

type SplashWin = Window & {
  __splashMark?: (name: string) => void;
  __splashLocked?: boolean;
};

const w = window as SplashWin;

function killSplash(reason: string) {
  const el = document.getElementById("app-splash");
  if (el) {
    el.classList.add("hide");
    el.remove();
    w.__splashMark?.("splash-killed:" + reason);
  }
  try {
    sessionStorage.setItem("__splashShown", "1");
  } catch {
    /* noop */
  }
}

export function installSplashGuard() {
  if (w.__splashLocked) return;
  w.__splashLocked = true;

  // bfcache restore — iOS/Safari can revive the DOM with the overlay visible.
  window.addEventListener("pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted) killSplash("bfcache-restore");
  });

  // History nav within the SPA — splash must never re-appear.
  window.addEventListener("popstate", () => killSplash("popstate"));
  window.addEventListener("hashchange", () => killSplash("hashchange"));

  // Defensive: observe DOM in case anything re-inserts the overlay.
  const mo = new MutationObserver(() => {
    if (document.getElementById("app-splash")) killSplash("mutation-reinsert");
  });
  try {
    mo.observe(document.body, { childList: true, subtree: false });
  } catch {
    /* noop */
  }

  // Stop observing once page unloads
  window.addEventListener("pagehide", () => mo.disconnect(), { once: true });
}
