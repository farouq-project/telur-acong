"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Syringe,
  CalendarCheck,
  Skull,
  Bell,
  Users,
  Lock,
  ChevronRight,
  FileText,
  Wallet,
  Home,
  ClipboardList,
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Separator } from "@/components/ui/separator";
import { isPathAllowed } from "@/lib/access";
import { InstallAppRow } from "@/components/layout/InstallAppRow";

const menuItems = [
  {
    section: "Operasional",
    items: [
      { href: "/kandang", label: "Kandang", icon: Home, color: "bg-teal-100 text-teal-600" },
      { href: "/medicine", label: "Obat & Vaksin", icon: Syringe, color: "bg-blue-100 text-blue-600" },
      { href: "/vaccination", label: "Jadwal Vaksin", icon: CalendarCheck, color: "bg-emerald-100 text-emerald-600" },
      { href: "/mortality", label: "Kematian Ternak", icon: Skull, color: "bg-red-100 text-red-600" },
      { href: "/so-telur", label: "SO Telur", icon: ClipboardList, color: "bg-amber-100 text-amber-600" },
    ],
  },
];

const ownerItems = {
  section: "Manajemen",
  items: [
    { href: "/financial", label: "Catatan Keuangan", icon: Wallet, color: "bg-green-100 text-green-600" },
    { href: "/reports", label: "Laporan & Export", icon: FileText, color: "bg-indigo-100 text-indigo-600" },
    { href: "/notifications", label: "Notifikasi", icon: Bell, color: "bg-yellow-100 text-yellow-600" },
    { href: "/settings/users", label: "Kelola Pengguna", icon: Users, color: "bg-pink-100 text-pink-600" },
  ],
};

const settingsItems = {
  section: "Pengaturan",
  items: [
    { href: "/settings/password", label: "Ganti Password", icon: Lock, color: "bg-gray-100 text-gray-600" },
    { href: "/notifications", label: "Notifikasi", icon: Bell, color: "bg-yellow-100 text-yellow-600" },
  ],
};

export default function MorePage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isOwner = (role === "OWNER" || role === "DEVELOPER");

  const sections = [...menuItems];
  if (isOwner) sections.push(ownerItems);
  sections.push(settingsItems);

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: role ? section.items.filter((item) => isPathAllowed(role, item.href)) : section.items,
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      <MobileHeader title="Lainnya" />
      <div className="px-4 py-4 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.section}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
              {section.section}
            </p>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={item.href}>
                    {idx > 0 && <Separator />}
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-700">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </Link>
                  </div>
                );
              })}
              {section.section === "Pengaturan" && <InstallAppRow />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
