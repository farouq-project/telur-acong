"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Listen for a waiting SW (new version available)
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              // New SW ready — tell it to take over immediately
              next.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        // When the controller changes, reload to use the new SW
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      })
      .catch((err) => {
        // Surface SW errors in development so they can be debugged
        if (process.env.NODE_ENV !== "production") {
          console.warn("[SW] registration failed:", err);
        }
      });
  }, []);

  return null;
}
