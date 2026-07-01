"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Keep start_url: "/" returning HTTP 200 so Chrome's installability check
// passes (it rejects 302 redirects when verifying the manifest start_url).
// Auth redirect is handled client-side via useEffect.
export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated") router.replace("/dashboard");
    else router.replace("/login");
  }, [status, router]);

  return (
    <div className="min-h-screen bg-green-600 flex items-center justify-center">
      <p className="text-white text-base font-medium">Memuat Hontalin…</p>
    </div>
  );
}
