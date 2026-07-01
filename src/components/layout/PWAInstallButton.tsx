"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getInstallPrompt,
  clearInstallPrompt,
  isAppInstalled,
  isIosSafari,
} from "@/lib/pwa";

type State = "hidden" | "android" | "ios";

export function PWAInstallButton() {
  const [state, setState] = useState<State>("hidden");
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    function refresh() {
      if (isAppInstalled()) { setState("hidden"); return; }
      if (getInstallPrompt()) { setState("android"); return; }
      if (isIosSafari()) { setState("ios"); return; }
      setState("hidden");
    }

    refresh();

    window.addEventListener("pwa-installable", refresh);
    window.addEventListener("pwa-installed", refresh);
    return () => {
      window.removeEventListener("pwa-installable", refresh);
      window.removeEventListener("pwa-installed", refresh);
    };
  }, []);

  async function handleAndroid() {
    const prompt = getInstallPrompt();
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      clearInstallPrompt();
      setState("hidden");
    }
  }

  if (state === "hidden") return null;

  if (state === "ios") {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-green-600"
          onClick={() => setIosOpen((v) => !v)}
          title="Install Aplikasi"
        >
          <Download className="w-5 h-5" />
        </Button>

        {iosOpen && (
          <div className="fixed top-14 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 flex items-start gap-3 shadow-lg">
            <Share className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm leading-snug">
              <span className="font-semibold">Install Hontalin:</span> Tap{" "}
              <strong>Share</strong> di Safari, lalu pilih{" "}
              <strong>Add to Home Screen</strong>
            </div>
            <button onClick={() => setIosOpen(false)} className="flex-shrink-0 opacity-80 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </>
    );
  }

  // android — native prompt
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-green-600"
      onClick={handleAndroid}
      title="Install Aplikasi"
    >
      <Download className="w-5 h-5" />
    </Button>
  );
}
