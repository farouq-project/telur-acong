"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
      disabled={pending}
      title="Perbarui data"
    >
      <RefreshCw
        className={`w-4 h-4 text-gray-400 transition-transform ${pending ? "animate-spin" : ""}`}
      />
    </button>
  );
}
