"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInstallPrompt, clearInstallPrompt, isIosSafari } from "@/lib/pwa";

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return false;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

type Info = "none" | "ios" | "manual";

export function PWAInstallButton() {
  const [visible, setVisible] = useState(false);
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
    if (isIosSafari()) {
      setInfo(info === "ios" ? "none" : "ios");
      return;
    }

    const prompt = getInstallPrompt();

    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        clearInstallPrompt();
        setVisible(false);
        setInfo("none");
      }
      return;
    }

    // beforeinstallprompt hasn't fired yet — show manual fallback
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
