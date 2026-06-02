/**
 * Shared types for the dashboard tour engine.
 */

export type TourStep = {
  /**
   * CSS selector for the element to highlight, e.g. `[data-tour="hub:stats"]`.
   * If the element is not in the DOM when the step is reached (e.g. a table that
   * only renders after data loads, or an empty state), the step is shown
   * centered with no spotlight rather than breaking the tour.
   */
  target: string;
  /** Short step title. */
  title: string;
  /** One-line explanation shown in the step card. */
  body: string;
  /**
   * Preferred placement of the card relative to the target. The engine clamps
   * to the viewport and falls back to centered when the target is missing.
   * Defaults to "bottom".
   */
  placement?: "top" | "bottom" | "left" | "right";
};
