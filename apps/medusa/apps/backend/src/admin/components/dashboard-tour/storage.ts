/**
 * localStorage persistence for the dashboard tour.
 *
 * - Global kill switch: `s4all:tours:disabled` = "1" | absent.
 *   When "1", no tour ever auto-opens (the "Don't show again" control sets this).
 * - Per-page seen set: `s4all:tours:seen` = JSON string[] of pageIds already
 *   completed or skipped. A page auto-starts only if its id is NOT in this set
 *   AND the disabled flag is not set.
 * - Version guard: `s4all:tours:v`. Bump TOURS_VERSION to force-re-show all
 *   tours after a content change (the seen set is cleared on mismatch).
 *
 * All reads/writes are wrapped in try/catch: in private-mode or locked-down
 * browsers localStorage can throw, and we must degrade to "tours disabled /
 * nothing seen" silently rather than break the admin page.
 */

const DISABLED_KEY = "s4all:tours:disabled";
const SEEN_KEY = "s4all:tours:seen";
const VERSION_KEY = "s4all:tours:v";

/** Bump this when tour content changes enough that everyone should see it again. */
export const TOURS_VERSION = "1";

function safeGet(key: string): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / access errors */
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Migrate / reset the seen set if the stored version doesn't match. */
function ensureVersion(): void {
  const stored = safeGet(VERSION_KEY);
  if (stored !== TOURS_VERSION) {
    safeRemove(SEEN_KEY);
    safeSet(VERSION_KEY, TOURS_VERSION);
  }
}

export function areToursDisabled(): boolean {
  return safeGet(DISABLED_KEY) === "1";
}

export function disableAllTours(): void {
  safeSet(DISABLED_KEY, "1");
}

export function getSeenTours(): string[] {
  ensureVersion();
  const raw = safeGet(SEEN_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
    return [];
  } catch {
    return [];
  }
}

export function hasSeenTour(pageId: string): boolean {
  return getSeenTours().includes(pageId);
}

export function markTourSeen(pageId: string): void {
  ensureVersion();
  const seen = getSeenTours();
  if (!seen.includes(pageId)) {
    seen.push(pageId);
    safeSet(SEEN_KEY, JSON.stringify(seen));
  }
}

/**
 * A page should auto-start its tour when it has not been seen AND tours are
 * not globally disabled.
 */
export function shouldAutoStart(pageId: string): boolean {
  return !areToursDisabled() && !hasSeenTour(pageId);
}

/** Re-enable every tour everywhere (used by the Hub "Replay tours" button). */
export function resetAllTours(): void {
  safeRemove(DISABLED_KEY);
  safeRemove(SEEN_KEY);
  safeSet(VERSION_KEY, TOURS_VERSION);
}

/** Re-run a single page's tour on next visit (clears its seen flag + disabled). */
export function replayTour(pageId: string): void {
  safeRemove(DISABLED_KEY);
  const seen = getSeenTours().filter((id) => id !== pageId);
  safeSet(SEEN_KEY, JSON.stringify(seen));
}
