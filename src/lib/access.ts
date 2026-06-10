import type { UserRole } from "@/types";

// null = unrestricted access to all dashboard pages
export const ROLE_ALLOWED_PATHS: Record<UserRole, string[] | null> = {
  DEVELOPER: null,
  OWNER: null,
  STAFF: null,
  FARM_HEAD: ["/production", "/medicine", "/vaccination", "/mortality", "/more", "/settings"],
  QA_HEAD: ["/dashboard", "/sales", "/so-telur", "/more", "/settings"],
};

export const ROLE_HOME: Record<UserRole, string> = {
  DEVELOPER: "/dashboard",
  OWNER: "/dashboard",
  STAFF: "/dashboard",
  FARM_HEAD: "/production",
  QA_HEAD: "/dashboard",
};

export function isPathAllowed(role: UserRole, pathname: string): boolean {
  const allowed = ROLE_ALLOWED_PATHS[role];
  if (allowed === null) return true;
  return allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
