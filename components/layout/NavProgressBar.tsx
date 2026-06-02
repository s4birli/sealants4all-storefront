"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Brand top progress bar. START = global click on an internal <a> + patched
// history.pushState/replaceState (covers router.push in cart/checkout).
// END = pathname/searchParams change after commit. Debounced ~150ms so
// ISR-instant nav never flickers. Reduced-motion aware; announces politely.
export function NavProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "running" | "done">("idle");

  // Refs so listeners read current values without re-binding.
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(false);

  const clearTimers = () => {
    for (const t of [showTimer, doneTimer, maxTimer]) {
      if (t.current) clearTimeout(t.current);
      t.current = null;
    }
  };

  // START: schedule the bar 150ms out. If nav commits first, finish() cancels it.
  const start = () => {
    if (visibleRef.current || showTimer.current) return;
    showTimer.current = setTimeout(() => {
      visibleRef.current = true;
      setState("running");
      // Anti-stuck: force completion after 10s.
      maxTimer.current = setTimeout(finish, 10000);
    }, 150);
  };

  // END: if the bar never painted, just cancel; else drive to 100% then hide.
  const finish = () => {
    clearTimers();
    if (!visibleRef.current) {
      setState("idle");
      return;
    }
    setState("done");
    doneTimer.current = setTimeout(() => {
      visibleRef.current = false;
      setState("idle");
    }, 300);
  };

  useEffect(() => {
    // 1) Click START: nearest <a>, internal, plain left-click only.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
      if (/^(mailto:|tel:|#)/.test(href)) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Same URL or hash-only on same page → not a navigation.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    // 2) Programmatic START: patch pushState/replaceState (covers router.push).
    const patch = (key: "pushState" | "replaceState") => {
      const orig = history[key];
      history[key] = function (this: History, ...args: Parameters<History["pushState"]>) {
        start();
        return orig.apply(this, args);
      };
      return orig;
    };
    const origPush = patch("pushState");
    const origReplace = patch("replaceState");

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      history.pushState = origPush;
      history.replaceState = origReplace;
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // END signal: any committed URL change finishes the bar (covers ?q= / ?sort=).
  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  const running = state === "running";
  const done = state === "done";

  return (
    <>
      <div
        className={`nav-progress${running ? " is-running" : ""}${done ? " is-done" : ""}`}
        role="progressbar"
        aria-hidden="true"
      />
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {running ? "Loading page" : ""}
      </div>
    </>
  );
}
