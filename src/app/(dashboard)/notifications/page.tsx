import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getNotifications } from "@/services/notification.service";
import NotificationsClient from "./_client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  const raw = session ? await getNotifications(session.user.id, { limit: 50 }) : [];
  const data = raw.map((n: { id: string; userId: string; type: string; title: string; message: string; isRead: boolean; createdAt: Date }) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }));
  return <NotificationsClient initialData={data as import("@/types").Notification[]} />;
}
