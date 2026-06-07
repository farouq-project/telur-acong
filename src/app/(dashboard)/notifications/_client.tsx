"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types";

const typeColors: Record<NotificationType, string> = {
  LOW_EGG_STOCK: "bg-red-100 text-red-600",
  LOW_FEED_STOCK: "bg-orange-100 text-orange-600",
  VACCINATION_DUE: "bg-blue-100 text-blue-600",
  GENERAL: "bg-gray-100 text-gray-600",
};

const typeLabels: Record<NotificationType, string> = {
  LOW_EGG_STOCK: "Stok Telur",
  LOW_FEED_STOCK: "Stok Pakan",
  VACCINATION_DUE: "Vaksinasi",
  GENERAL: "Umum",
};

interface Props {
  initialData: Notification[];
}

export default function NotificationsClient({ initialData }: Props) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>(initialData);

  async function markRead(id: string) {
    await fetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function markAllRead() {
    await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast({ variant: "success", title: "Semua notifikasi ditandai sudah dibaca" });
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <MobileHeader title="Notifikasi" />
      <div className="px-4 py-4 space-y-3">
        {unreadCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{unreadCount} belum dibaca</span>
            <Button variant="ghost" size="sm" className="text-green-600 h-8 px-2" onClick={markAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" />
              Tandai Semua
            </Button>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Tidak ada notifikasi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`rounded-xl p-4 border shadow-sm transition-colors ${n.isRead ? "bg-white border-gray-100" : "bg-blue-50 border-blue-100"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5 ${typeColors[n.type]}`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="secondary" className="text-xs mb-1">{typeLabels[n.type]}</Badge>
                        <p className="font-medium text-sm text-gray-800">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-xs text-gray-300 mt-1">{formatDate(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-blue-100 shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
