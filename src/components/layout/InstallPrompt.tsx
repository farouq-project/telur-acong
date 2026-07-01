"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInstallPrompt, clearInstallPrompt, isAppInstalled, isIosSafari } from "@/lib/pwa";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isAppInstalled()) return;

    if (isIosSafari()) {
      if (!localStorage.getItem("pwa-ios-dismissed")) {
        setIos(true);
        setShow(true);
      }
      return;
    }

    // Already captured before component mounted
    if (getInstallPrompt()) {
      if (!localStorage.getItem("pwa-dismissed")) setShow(true);
      return;
    }

    // Wait for the event
    const onInstallable = () => {
      if (!localStorage.getItem("pwa-dismissed")) setShow(true);
    };
    window.addEventListener("pwa-installable", onInstallable);
    return () => window.removeEventListener("pwa-installable", onInstallable);
  }, []);

  async function handleInstall() {
    const prompt = getInstallPrompt();
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") clearInstallPrompt();
    }
    setShow(false);
  }

  function handleDismiss() {
    localStorage.setItem(ios ? "pwa-ios-dismissed" : "pwa-dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-green-200 rounded-xl shadow-lg p-4 flex gap-3 items-start">
        <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">Install Hontalin</p>
          {ios ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Tap <span className="font-medium">Share</span> lalu pilih{" "}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mt-0.5">
                Install sebagai aplikasi untuk akses lebih cepat.
              </p>
              <Button
                size="sm"
                onClick={handleInstall}
                className="mt-2 h-8 bg-green-600 hover:bg-green-700 text-xs px-3"
              >
                Install Sekarang
              </Button>
            </>
          )}
        </div>
        <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
