"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "s4a-v2:install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install Sealants4All">
      <span>Install Sealants4All for faster ordering</span>
      <button
        className="primary"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        Install
      </button>
      <button
        className="ghost"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
