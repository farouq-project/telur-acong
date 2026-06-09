"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Bell, LogOut, User, Settings, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const companyName = session?.user?.companyName;
  const isDeveloper = session?.user?.role === "DEVELOPER";
  const canManageUsers = isDeveloper || session?.user?.role === "OWNER";

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/v1/notifications?unread=true");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.data?.length ?? 0);
      }
    } catch {
      // silently fail
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 h-14 relative">
        <h1 className="text-base font-semibold text-gray-900 truncate max-w-[130px]">
          {title}
        </h1>
        {companyName && (
          <span className="absolute left-1/2 -translate-x-1/2 text-xs font-semibold text-green-700 truncate max-w-[130px] pointer-events-none">
            {companyName}
          </span>
        )}

        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-red-500 text-white font-bold",
                    unreadCount > 9
                      ? "w-5 h-5 text-[9px]"
                      : "w-4 h-4 text-[10px]"
                  )}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </Link>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2 gap-1.5">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-green-700" />
                </div>
                <span className="text-xs text-gray-700 max-w-[80px] truncate hidden sm:block">
                  {session?.user?.name}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <p className="font-medium text-sm">{session?.user?.name}</p>
                <p className="text-xs text-gray-400 font-normal truncate">
                  {session?.user?.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isDeveloper && (
                <DropdownMenuItem asChild>
                  <Link href="/settings/password">
                    <Settings className="w-4 h-4 mr-2" />
                    Ganti Password
                  </Link>
                </DropdownMenuItem>
              )}
              {canManageUsers && (
                <DropdownMenuItem asChild>
                  <Link href="/settings/users">
                    <User className="w-4 h-4 mr-2" />
                    Kelola Pengguna
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

