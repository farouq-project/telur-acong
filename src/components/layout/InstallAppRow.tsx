"use client";

import { useEffect, useState } from "react";
import { Smartphone, ChevronRight, CheckCircle2, Share } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  getInstallPrompt,
  clearInstallPrompt,
  isAppInstalled,
  isIosSafari,
} from "@/lib/pwa";

export function InstallAppRow() {
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    setInstalled(isAppInstalled());
    setIos(isIosSafari());

    if (getInstallPrompt()) setCanInstall(true);

    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => { setInstalled(true); setCanInstall(false); };
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  async function handleClick() {
    if (installed) return;
    if (ios) {
      setShowIosHint((v) => !v);
      return;
    }
    const prompt = getInstallPrompt();
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        clearInstallPrompt();
        setInstalled(true);
        setCanInstall(false);
      }
    }
  }

  return (
    <>
      <Separator />
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            installed ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
          }`}
        >
          {installed ? (
            <CheckCircle2 className="w-4.5 h-4.5" />
          ) : ios ? (
            <Share className="w-4.5 h-4.5" />
          ) : (
            <Smartphone className="w-4.5 h-4.5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-700 block">
            {installed ? "Aplikasi Terinstall" : "Install Aplikasi"}
          </span>
          {!installed && (
            <span className="text-xs text-gray-400">
              {ios
                ? "Tap untuk lihat cara install di iPhone"
                : canInstall
                ? "Tap untuk install di perangkat ini"
                : "Buka di Chrome untuk install"}
            </span>
          )}
        </div>
        {!installed && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
      </button>

      {showIosHint && (
        <div className="px-4 pb-3 bg-blue-50 border-t border-blue-100">
          <p className="text-xs text-blue-700 pt-2 leading-relaxed">
            1. Tap tombol <span className="font-semibold">Share</span> (
            <span className="font-mono">⬆</span>) di bagian bawah Safari
            <br />
            2. Scroll ke bawah, pilih{" "}
            <span className="font-semibold">Add to Home Screen</span>
            <br />
            3. Tap <span className="font-semibold">Add</span> — selesai!
          </p>
        </div>
      )}
    </>
  );
}
