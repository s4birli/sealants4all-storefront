"use client";

// Footer control that re-opens the cookie-consent banner (see CookieConsent).
export function ConsentPreferencesButton() {
  return (
    <button
      type="button"
      className="footer-link-btn"
      onClick={() => window.dispatchEvent(new CustomEvent("open-consent"))}
    >
      Consent Preferences
    </button>
  );
}
