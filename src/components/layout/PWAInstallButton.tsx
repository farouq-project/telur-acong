"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInstallPrompt, clearInstallPrompt, isIosSafari } from "@/lib/pwa";

// Show on any mobile browser that is NOT already running as a standalone PWA.
// The prompt availability only matters on click, not for visibility.
function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  // Already installed — running in standalone (or minimal-ui) mode
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  ) return false;
  // Show on any touch-capable mobile device
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

type InfoState = "none" | "ios" | "manual";

export function PWAInstallButton() {
  const [visible, setVisible] = useState(false);
  const [info, setInfo] = useState<InfoState>("none");

  useEffect(() => {
    setVisible(shouldShow());

    // If prompt fires later, re-evaluate
    const onInstallable = () => setVisible(shouldShow());
    const onInstalled = () => setVisible(false);
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  async function handleClick() {
    // iOS Safari — native prompt not supported, show share instructions
    if (isIosSafari()) {
      setInfo(info === "ios" ? "none" : "ios");
      return;
    }

    // Android / Chrome — try native prompt first
    const prompt = getInstallPrompt();
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        clearInstallPrompt();
        setVisible(false);
      }
      return;
    }

    // Prompt not available yet — show manual Chrome instructions
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
        title="Install Aplikasi"
      >
        <Download className="w-5 h-5" />
      </Button>

      {/* iOS instruction bar */}
      {info === "ios" && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 flex items-start gap-3 shadow-lg">
          <Share className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm leading-snug">
            <span className="font-semibold">Install Hontalin: </span>
            Tap <strong>Share</strong> (⬆) di toolbar Safari, lalu pilih{" "}
            <strong>Add to Home Screen</strong>
          </div>
          <button onClick={() => setInfo("none")} className="flex-shrink-0 opacity-80 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Android manual instruction bar (when native prompt not yet available) */}
      {info === "manual" && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 flex items-start gap-3 shadow-lg">
          <MoreVertical className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm leading-snug">
            <span className="font-semibold">Install Hontalin: </span>
            Tap <strong>⋮</strong> di Chrome, lalu pilih{" "}
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
