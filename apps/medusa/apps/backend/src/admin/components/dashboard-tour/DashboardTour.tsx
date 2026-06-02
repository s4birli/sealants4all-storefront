import { Button, Heading, Text } from "@medusajs/ui";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TourStep } from "./types";
import { useTour } from "./use-tour";

type DashboardTourProps = {
  /** Stable key for persistence + step lookup, e.g. "s4all-hub". */
  pageId: string;
  /** Ordered steps for this page (from TOURS[pageId]). */
  steps: TourStep[];
  /** Set false to suppress auto-open (rarely needed). Defaults true. */
  autoStart?: boolean;
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 6; // spotlight padding around the target
const CARD_W = 320; // step card width (px)
const GAP = 12; // gap between target and card
const MARGIN = 12; // min distance from viewport edge

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return false;
  }
}

/**
 * Self-contained, dependency-free guided tour.
 *
 * - Highlights an element via a 4-rect dimmed backdrop (a "spotlight"), with a
 *   ring around the target, and positions a step card beside it.
 * - If the target selector is not found (conditional table/empty state), the
 *   card is centered with no spotlight so the tour never breaks.
 * - Accessible: role=dialog + aria-live, Esc to skip, focus moved to the card,
 *   Tab kept inside the card, honors prefers-reduced-motion.
 *
 * Rendered via a portal to <body> so it sits above the admin layout regardless
 * of the page container's stacking/overflow.
 */
export function DashboardTour({ pageId, steps, autoStart }: DashboardTourProps) {
  const tour = useTour({ pageId, steps, autoStart });
  const { open, step, index, total, isFirst, isLast } = tour;

  const cardRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const reduceMotion = prefersReducedMotion();

  // Measure the current target (re-run on step change, resize, scroll).
  const measure = useCallback(() => {
    if (!open || !step) {
      setRect(null);
      return;
    }
    let el: Element | null = null;
    try {
      el = document.querySelector(step.target);
    } catch {
      el = null;
    }
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    // Ignore detached/zero-size elements (treat as missing -> centered card).
    if (r.width === 0 && r.height === 0) {
      setRect(null);
      return;
    }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    if (typeof el.scrollIntoView === "function") {
      el.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }, [open, step, reduceMotion]);

  // Re-measure when the step changes, and on a short retry loop so targets that
  // mount slightly late (widget zones, async data) still get highlighted.
  useLayoutEffect(() => {
    if (!open || !step) {
      return;
    }
    measure();
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      measure();
      if (tries >= 10) {
        window.clearInterval(id);
      }
    }, 120);
    return () => window.clearInterval(id);
  }, [open, step, index, measure]);

  // Keep position correct on scroll/resize while open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = () => measure();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, measure]);

  // Move focus into the card when a step opens.
  useEffect(() => {
    if (open && cardRef.current) {
      cardRef.current.focus();
    }
  }, [open, index]);

  // Keyboard: Esc skips, Tab is trapped inside the card.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        tour.skip();
        return;
      }
      if (e.key === "Tab" && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) {
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, tour]);

  if (!open || !step) {
    return null;
  }

  // Compute card position. Centered when no target rect.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  let cardStyle: { top: number; left: number };
  if (rect) {
    const placement = step.placement ?? "bottom";
    let top: number;
    let left: number;
    if (placement === "top") {
      top = rect.top - GAP - 160;
      left = rect.left + rect.width / 2 - CARD_W / 2;
    } else if (placement === "left") {
      top = rect.top;
      left = rect.left - GAP - CARD_W;
    } else if (placement === "right") {
      top = rect.top;
      left = rect.left + rect.width + GAP;
    } else {
      // bottom
      top = rect.top + rect.height + GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
    }
    // Clamp to viewport.
    left = Math.max(MARGIN, Math.min(left, vw - CARD_W - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - 80 - MARGIN));
    cardStyle = { top, left };
  } else {
    cardStyle = {
      top: Math.round(vh / 2 - 90),
      left: Math.round(vw / 2 - CARD_W / 2),
    };
  }

  const transition = reduceMotion ? "none" : "all 120ms ease";

  return createPortal(
    <div
      // Full-viewport layer. pointer-events on children only so clicks outside
      // the card hit the dim layer (which swallows them) — keeps the tour modal.
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
      }}
      aria-hidden={false}
    >
      {/* Dim + spotlight: four panels around the target, or one full panel. */}
      {rect ? (
        <>
          <Backdrop top={0} left={0} width={vw} height={Math.max(0, rect.top - PAD)} />
          <Backdrop
            top={Math.max(0, rect.top - PAD)}
            left={0}
            width={Math.max(0, rect.left - PAD)}
            height={rect.height + PAD * 2}
          />
          <Backdrop
            top={Math.max(0, rect.top - PAD)}
            left={rect.left + rect.width + PAD}
            width={Math.max(0, vw - (rect.left + rect.width + PAD))}
            height={rect.height + PAD * 2}
          />
          <Backdrop
            top={rect.top + rect.height + PAD}
            left={0}
            width={vw}
            height={Math.max(0, vh - (rect.top + rect.height + PAD))}
          />
          {/* Highlight ring */}
          <div
            style={{
              position: "fixed",
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              border: "2px solid var(--fg-interactive, #3b82f6)",
              borderRadius: 8,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0)",
              pointerEvents: "none",
              transition,
            }}
          />
        </>
      ) : (
        <Backdrop top={0} left={0} width={vw} height={vh} />
      )}

      {/* Step card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        aria-label={`${step.title}. Step ${index + 1} of ${total}`}
        tabIndex={-1}
        style={{
          position: "fixed",
          top: cardStyle.top,
          left: cardStyle.left,
          width: CARD_W,
          maxWidth: "calc(100vw - 24px)",
          pointerEvents: "auto",
          outline: "none",
          transition,
        }}
        className="bg-ui-bg-base border-ui-border-base shadow-elevation-flyout flex flex-col gap-3 rounded-lg border p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <Heading level="h3" className="text-ui-fg-base">
            {step.title}
          </Heading>
          <Text size="xsmall" className="text-ui-fg-muted whitespace-nowrap pt-1">
            Step {index + 1} of {total}
          </Text>
        </div>

        <Text size="small" className="text-ui-fg-subtle">
          {step.body}
        </Text>

        <div className="mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={tour.dontShowAgain}
            className="text-ui-fg-muted hover:text-ui-fg-subtle text-xs underline-offset-2 hover:underline"
          >
            Don&apos;t show again
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button size="small" variant="secondary" onClick={tour.back}>
                Back
              </Button>
            )}
            {!isLast ? (
              <Button size="small" variant="primary" onClick={tour.next}>
                Next
              </Button>
            ) : (
              <Button size="small" variant="primary" onClick={tour.done}>
                Done
              </Button>
            )}
          </div>
        </div>

        {!isLast && (
          <button
            type="button"
            onClick={tour.skip}
            className="text-ui-fg-muted hover:text-ui-fg-subtle self-start text-xs"
          >
            Skip tour
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Backdrop({
  top,
  left,
  width,
  height,
}: {
  top: number;
  left: number;
  width: number;
  height: number;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top,
        left,
        width,
        height,
        background: "rgba(0,0,0,0.45)",
        pointerEvents: "auto",
      }}
    />
  );
}

export default DashboardTour;
