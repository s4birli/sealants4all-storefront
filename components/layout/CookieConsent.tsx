"use client";

// Lightweight, first-party cookie-consent banner. No third-party CMP. Stores
// the visitor's choice in localStorage and exposes it via a `s4a-consent`
// CustomEvent + a global getter, so analytics/marketing tags can gate
// themselves on it. The footer "Consent Preferences" control re-opens the
// banner by dispatching `open-consent`.

import { useEffect, useState } from "react";

const STORAGE_KEY = "s4a_consent";

export type ConsentState = {
  necessary: true; // always on
  analytics: boolean;
  marketing: boolean;
  ts: string;
};

function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      ts: String(parsed.ts ?? ""),
    };
  } catch {
    return null;
  }
}

function writeConsent(state: ConsentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("s4a-consent", { detail: state }));
  } catch {
    // Private mode / storage disabled — nothing more we can do.
  }
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Show on first visit (no stored choice).
    if (!readConsent()) setOpen(true);

    // Footer control re-opens the banner in preferences mode.
    const reopen = () => {
      const current = readConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setShowPrefs(true);
      setOpen(true);
    };
    window.addEventListener("open-consent", reopen);
    return () => window.removeEventListener("open-consent", reopen);
  }, []);

  const persist = (a: boolean, m: boolean) => {
    writeConsent({
      necessary: true,
      analytics: a,
      marketing: m,
      ts: new Date().toISOString(),
    });
    setOpen(false);
    setShowPrefs(false);
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-label="Cookie consent" className="cookie-banner">
      <div className="cookie-inner">
        <div className="cookie-copy">
          <strong>We value your privacy.</strong> We use necessary cookies to
          make our site work. With your consent we also use analytics and
          marketing cookies to improve the site and show relevant offers. See our{" "}
          <a href="/privacy">Privacy Policy</a>.
        </div>

        {showPrefs && (
          <div className="cookie-prefs">
            <label className="cookie-row">
              <input type="checkbox" checked readOnly disabled />
              <span>
                <strong>Strictly necessary</strong> — required for the site to
                function. Always on.
              </span>
            </label>
            <label className="cookie-row">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <strong>Analytics</strong> — helps us understand how the site is
                used.
              </span>
            </label>
            <label className="cookie-row">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <span>
                <strong>Marketing</strong> — lets us show you relevant offers.
              </span>
            </label>
          </div>
        )}

        <div className="cookie-actions">
          {showPrefs ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => persist(analytics, marketing)}
            >
              Save preferences
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setAnalytics(false);
                setMarketing(false);
                setShowPrefs(true);
              }}
            >
              Preferences
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => persist(false, false)}
          >
            Reject non-essential
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => persist(true, true)}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
