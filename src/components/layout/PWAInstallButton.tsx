"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getInstallPrompt, clearInstallPrompt, isIosSafari } from "@/lib/pwa";

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return false;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function PWAInstallButton() {
  const [visible, setVisible] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setVisible(shouldShow());
    const onInstallable = () => setVisible(shouldShow());
    const onInstalled = () => { setVisible(false); setShowIos(false); };
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  async function handleClick() {
    // iOS Safari: no beforeinstallprompt API, must use Share sheet
    if (isIosSafari()) {
      setShowIos((v) => !v);
      return;
    }

    const prompt = getInstallPrompt();

    if (prompt) {
      // Native Chrome install dialog
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        clearInstallPrompt();
        setVisible(false);
      }
      return;
    }

    // Chrome hasn't approved install yet.
    // Reload once so Chrome re-evaluates the updated service worker.
    if (!sessionStorage.getItem("__pwa_reload")) {
      sessionStorage.setItem("__pwa_reload", "1");
      toast({
        title: "Menyiapkan instalasi…",
        description: "Halaman akan dimuat ulang sebentar.",
        duration: 2000,
      });
      setTimeout(() => window.location.reload(), 500);
      return;
    }

    // Already reloaded — Chrome still not ready (engagement/cooldown period).
    toast({
      title: "Chrome belum siap",
      description: "Buka aplikasi beberapa kali lagi, lalu tap tombol ini.",
      duration: 4000,
    });
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

      {showIos && (
        <div className="fixed top-14 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 flex items-start gap-3 shadow-lg">
          <Share className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm leading-snug">
            <span className="font-semibold">Install Hontalin: </span>
            Tap <strong>Share ⬆</strong> di Safari → pilih{" "}
            <strong>Add to Home Screen</strong>
          </div>
          <button
            onClick={() => setShowIos(false)}
            className="flex-shrink-0 opacity-80 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
