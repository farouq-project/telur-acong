"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // iOS detection
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const safari = /safari/i.test(ua) && !/chrome/i.test(ua);
    if (ios && safari) {
      const dismissed = localStorage.getItem("pwa-ios-dismissed");
      if (!dismissed) {
        setIsIos(true);
        setShow(true);
      }
      return;
    }

    // Android / Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      const dismissed = localStorage.getItem("pwa-dismissed");
      if (!dismissed) {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShow(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
    setShow(false);
  }

  function handleDismiss() {
    localStorage.setItem(isIos ? "pwa-ios-dismissed" : "pwa-dismissed", "1");
    setShow(false);
  }

  if (!show || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-green-200 rounded-xl shadow-lg p-4 flex gap-3 items-start">
        <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Install Telur Acong</p>
          {isIos ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Tap <span className="font-medium">Share</span> lalu pilih{" "}
              <span className="font-medium">Add to Home Screen</span> untuk install.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Install sebagai aplikasi untuk akses lebih cepat tanpa browser.
            </p>
          )}
          {!isIos && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="mt-2 h-8 bg-green-600 hover:bg-green-700 text-xs px-3"
            >
              Install Sekarang
            </Button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
