import { useCallback, useEffect, useState } from "react";
import type { TourStep } from "./types";
import {
  disableAllTours,
  markTourSeen,
  shouldAutoStart,
} from "./storage";

type UseTourArgs = {
  pageId: string;
  steps: TourStep[];
  /** When false, the tour never auto-opens (still openable via replay). */
  autoStart?: boolean;
};

export type UseTourResult = {
  open: boolean;
  index: number;
  step: TourStep | null;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  next: () => void;
  back: () => void;
  /** Skip the rest of the tour; marks the page seen and closes. */
  skip: () => void;
  /** Finish on the last step; marks the page seen and closes. */
  done: () => void;
  /** Disable ALL tours globally and close. */
  dontShowAgain: () => void;
  /** Manually (re)open the tour from step 0, ignoring seen/disabled state. */
  start: () => void;
};

/**
 * Drives a single page's tour: auto-opens on first visit (unless disabled),
 * tracks the active step, and persists seen/disabled state.
 *
 * The hook never reads the DOM — positioning lives in the renderer — so it is
 * safe to mount before data-dependent targets exist.
 */
export function useTour({
  pageId,
  steps,
  autoStart = true,
}: UseTourArgs): UseTourResult {
  const total = steps.length;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // Auto-open once, after first paint, only if unseen + not globally disabled.
  useEffect(() => {
    if (!autoStart || total === 0) {
      return;
    }
    if (shouldAutoStart(pageId)) {
      // Defer to the next frame so the page's first paint (and any
      // always-present step-1 targets) are in the DOM before we measure.
      const raf = requestAnimationFrame(() => {
        setIndex(0);
        setOpen(true);
      });
      return () => cancelAnimationFrame(raf);
    }
    return;
    // pageId/steps are stable per mount; intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const finishSeen = useCallback(() => {
    markTourSeen(pageId);
    close();
  }, [pageId, close]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        markTourSeen(pageId);
        setOpen(false);
        return i;
      }
      return i + 1;
    });
  }, [pageId, total]);

  const back = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const skip = useCallback(() => {
    finishSeen();
  }, [finishSeen]);

  const done = useCallback(() => {
    finishSeen();
  }, [finishSeen]);

  const dontShowAgain = useCallback(() => {
    disableAllTours();
    markTourSeen(pageId);
    close();
  }, [pageId, close]);

  const start = useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  const step = open && total > 0 ? steps[index] ?? null : null;

  return {
    open,
    index,
    step,
    total,
    isFirst: index === 0,
    isLast: index === total - 1,
    next,
    back,
    skip,
    done,
    dontShowAgain,
    start,
  };
}
