"use client";

import { useId } from "react";

type StarsProps = { value: number; size?: number };

const STAR_PATH =
  "M12 2.5l2.92 6.34 6.95.66-5.24 4.71 1.5 6.79L12 17.77l-6.13 3.23 1.5-6.79L2.13 9.5l6.95-.66L12 2.5z";

export function Stars({ value, size = 14 }: StarsProps) {
  // Unique gradient id per instance — the old fixed `half-star-${size}` collided
  // across every Stars on the page, so a partial star's url(#id) bound to the
  // FIRST match in ANOTHER <svg>; WebKit refuses such cross-<svg> gradient
  // references and rendered the star black/blank. useId() (colon-stripped) keeps
  // it SSR/hydration-stable, and the gradient is defined INSIDE the partial
  // star's own <svg> so the reference never crosses elements.
  const gradId = `star-${useId().replace(/:/g, "")}`;
  return (
    <span className="stars" aria-label={`${value} stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        // Exact fractional fill for star i (0 = empty, 1 = full): 4.8 → last star 80%.
        const fraction = Math.max(0, Math.min(1, value - i));
        const partial = fraction > 0 && fraction < 1;
        const fill =
          fraction >= 1 ? "#FFB800" : fraction <= 0 ? "#E5E7EB" : `url(#${gradId})`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            {partial && (
              <defs>
                <linearGradient id={gradId}>
                  <stop offset={`${Math.round(fraction * 100)}%`} stopColor="#FFB800" />
                  <stop offset={`${Math.round(fraction * 100)}%`} stopColor="#E5E7EB" />
                </linearGradient>
              </defs>
            )}
            <path fill={fill} d={STAR_PATH} />
          </svg>
        );
      })}
    </span>
  );
}
