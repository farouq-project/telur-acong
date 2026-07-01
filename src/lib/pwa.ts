export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PwaWindow = typeof window & {
  __pwa_prompt: BeforeInstallPromptEvent | null;
};

// Also catch events that fire after React hydrates
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Do NOT call e.preventDefault() — that suppresses Chrome's native install
    // infobar. Without preventDefault, Chrome shows its own banner automatically
    // AND we can still store the event. prompt.prompt() works in Chrome 76+
    // regardless of whether preventDefault was called.
    (window as PwaWindow).__pwa_prompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent("pwa-installable"));
  });

  window.addEventListener("appinstalled", () => {
    (window as PwaWindow).__pwa_prompt = null;
    window.dispatchEvent(new CustomEvent("pwa-installed"));
  });
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return (window as PwaWindow).__pwa_prompt ?? null;
}

export function clearInstallPrompt() {
  if (typeof window !== "undefined") {
    (window as PwaWindow).__pwa_prompt = null;
  }
}

export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/chrome/i.test(ua);
}

export function isAndroidChrome(): boolean {
  if (typeof window === "undefined") return false;
  return /android/i.test(navigator.userAgent) && /chrome/i.test(navigator.userAgent);
}
