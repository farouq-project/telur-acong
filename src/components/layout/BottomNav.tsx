"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Egg,
  ShoppingCart,
  Wheat,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isPathAllowed } from "@/lib/access";

const navItems = [
  {
    href: "/dashboard",
    label: "Beranda",
    icon: LayoutDashboard,
  },
  {
    href: "/production",
    label: "Produksi",
    icon: Egg,
  },
  {
    href: "/sales",
    label: "Penjualan",
    icon: ShoppingCart,
  },
  {
    href: "/feed",
    label: "Pakan",
    icon: Wheat,
  },
  {
    href: "/more",
    label: "Lainnya",
    icon: MoreHorizontal,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const items = role ? navItems.filter((item) => isPathAllowed(role, item.href)) : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-pb">
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors active:bg-gray-50",
                isActive ? "text-green-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all",
                  isActive && "scale-110"
                )}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
