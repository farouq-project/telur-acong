"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, MoreVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getInstallPrompt,
  clearInstallPrompt,
  isIosSafari,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return false;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// Wait up to `ms` milliseconds for Chrome to fire beforeinstallprompt.
// Chrome sometimes fires it only after the first user interaction.
function awaitPrompt(ms: number): Promise<BeforeInstallPromptEvent | null> {
  return new Promise((resolve) => {
    const already = getInstallPrompt();
    if (already) { resolve(already); return; }

    const handler = () => resolve(getInstallPrompt());
    window.addEventListener("pwa-installable", handler, { once: true });

    setTimeout(() => {
      window.removeEventListener("pwa-installable", handler);
      resolve(getInstallPrompt()); // one final check after timeout
    }, ms);
  });
}

type Info = "none" | "ios" | "manual";

export function PWAInstallButton() {
  const [visible, setVisible] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [info, setInfo] = useState<Info>("none");

  useEffect(() => {
    setVisible(shouldShow());
    const onInstallable = () => setVisible(shouldShow());
    const onInstalled = () => { setVisible(false); setInfo("none"); };
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  async function handleClick() {
    // iOS Safari doesn't support beforeinstallprompt
    if (isIosSafari()) {
      setInfo(info === "ios" ? "none" : "ios");
      return;
    }

    // Try the native prompt immediately
    let prompt = getInstallPrompt();

    if (!prompt) {
      // Chrome fires beforeinstallprompt after first user interaction on some
      // versions — wait up to 3 s before falling back to manual instructions.
      setWaiting(true);
      if ("serviceWorker" in navigator) {
        try { await navigator.serviceWorker.ready; } catch { /* ignore */ }
      }
      prompt = await awaitPrompt(3000);
      setWaiting(false);
    }

    if (prompt) {
      // Native Chrome PWA install dialog
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        clearInstallPrompt();
        setVisible(false);
        setInfo("none");
      }
      return;
    }

    // Prompt still not available — Chrome hasn't approved this site yet.
    // Show manual fallback.
    setInfo(info === "manual" ? "none" : "manual");
  }

  if (!visible) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-green-600"
        onClick={handleClick}
        disabled={waiting}
        title="Install Aplikasi"
      >
        {waiting
          ? <Loader2 className="w-4 h-4 animate-spin text-green-600" />
          : <Download className="w-5 h-5" />}
      </Button>

      {info === "ios" && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 flex items-start gap-3 shadow-lg">
          <Share className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm leading-snug">
            <span className="font-semibold">Install Hontalin: </span>
            Tap <strong>Share ⬆</strong> di Safari → pilih{" "}
            <strong>Add to Home Screen</strong>
          </div>
          <button onClick={() => setInfo("none")} className="flex-shrink-0 opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {info === "manual" && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 flex items-start gap-3 shadow-lg">
          <MoreVertical className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm leading-snug">
            <span className="font-semibold">Install Hontalin: </span>
            Tap <strong>⋮</strong> di pojok kanan atas Chrome → pilih{" "}
            <strong>Add to Home Screen</strong>
          </div>
          <button onClick={() => setInfo("none")} className="flex-shrink-0 opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
