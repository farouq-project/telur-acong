export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Captured once on first browser event; survives component re-mounts
let _deferred: BeforeInstallPromptEvent | null = null;
let _installed = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _deferred = e as BeforeInstallPromptEvent;
    // Dispatch a custom event so any listening component can react
    window.dispatchEvent(new CustomEvent("pwa-installable"));
  });

  window.addEventListener("appinstalled", () => {
    _installed = true;
    _deferred = null;
    window.dispatchEvent(new CustomEvent("pwa-installed"));
  });
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return _deferred;
}

export function clearInstallPrompt() {
  _deferred = null;
}

export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return _installed || window.matchMedia("(display-mode: standalone)").matches;
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/chrome/i.test(ua);
}
