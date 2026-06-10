import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "./index";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      companyName?: string | null;
      notes?: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    companyName?: string | null;
    notes?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    companyName?: string | null;
    notes?: string | null;
  }
}
