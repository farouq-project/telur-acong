"use client";

import { useEffect, useState } from "react";
import { Smartphone, ChevronRight, CheckCircle2, Share, MoreVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  getInstallPrompt,
  clearInstallPrompt,
  isAppInstalled,
  isIosSafari,
  isAndroidChrome,
} from "@/lib/pwa";

type Mode = "installed" | "native-prompt" | "ios" | "android-manual" | "unknown";

function getMode(): Mode {
  if (isAppInstalled()) return "installed";
  if (getInstallPrompt()) return "native-prompt";
  if (isIosSafari()) return "ios";
  if (isAndroidChrome()) return "android-manual";
  return "unknown";
}

export function InstallAppRow() {
  const [mode, setMode] = useState<Mode>("unknown");
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setMode(getMode());

    const onInstallable = () => setMode(getMode());
    const onInstalled = () => setMode("installed");
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("pwa-installed", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  async function handleClick() {
    if (mode === "installed") return;

    if (mode === "native-prompt") {
      const prompt = getInstallPrompt();
      if (prompt) {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          clearInstallPrompt();
          setMode("installed");
        }
      }
      return;
    }

    // ios or android-manual: toggle step-by-step hint
    setShowHint((v) => !v);
  }

  const iconBg =
    mode === "installed"
      ? "bg-green-100 text-green-600"
      : mode === "ios"
      ? "bg-blue-100 text-blue-600"
      : "bg-purple-100 text-purple-600";

  const Icon =
    mode === "installed"
      ? CheckCircle2
      : mode === "ios"
      ? Share
      : mode === "android-manual"
      ? MoreVertical
      : Smartphone;

  const subtitle: Record<Mode, string> = {
    installed: "",
    "native-prompt": "Tap untuk install di perangkat ini",
    ios: "Tap untuk lihat cara install di iPhone",
    "android-manual": "Tap untuk lihat cara install",
    unknown: "Buka di Chrome untuk install",
  };

  return (
    <>
      <Separator />
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-700 block">
            {mode === "installed" ? "Aplikasi Terinstall" : "Install Aplikasi"}
          </span>
          {mode !== "installed" && (
            <span className="text-xs text-gray-400">{subtitle[mode]}</span>
          )}
        </div>
        {mode !== "installed" && (
          <ChevronRight
            className={`w-4 h-4 flex-shrink-0 transition-transform ${showHint ? "rotate-90 text-gray-500" : "text-gray-300"}`}
          />
        )}
      </button>

      {showHint && mode === "ios" && (
        <div className="px-4 pb-4 bg-blue-50 border-t border-blue-100">
          <p className="text-xs text-blue-700 pt-3 leading-relaxed space-y-1">
            <span className="block">1. Tap tombol <strong>Share</strong> (ikon kotak dengan panah ke atas) di toolbar Safari</span>
            <span className="block">2. Scroll ke bawah, pilih <strong>Add to Home Screen</strong></span>
            <span className="block">3. Tap <strong>Add</strong> — selesai!</span>
          </p>
        </div>
      )}

      {showHint && mode === "android-manual" && (
        <div className="px-4 pb-4 bg-purple-50 border-t border-purple-100">
          <p className="text-xs text-purple-700 pt-3 leading-relaxed">
            <span className="block">1. Tap ikon <strong>⋮</strong> (tiga titik) di pojok kanan atas Chrome</span>
            <span className="block">2. Pilih <strong>Add to Home Screen</strong></span>
            <span className="block">3. Tap <strong>Add</strong> — aplikasi akan muncul di layar utama</span>
          </p>
        </div>
      )}
    </>
  );
}
