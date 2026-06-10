"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isPathAllowed, ROLE_HOME } from "@/lib/access";

export function RoleGuard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    const role = session.user.role;
    if (!isPathAllowed(role, pathname)) {
      router.replace(ROLE_HOME[role]);
    }
  }, [session, status, pathname, router]);

  return null;
}
