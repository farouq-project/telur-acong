import prisma from "@/lib/prisma";
import type { NotificationType } from "@/types";

export async function getNotifications(
  userId: string,
  params?: { unreadOnly?: boolean; limit?: number }
) {
  const { unreadOnly = false, limit = 50 } = params ?? {};

  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markAsRead(id: string): Promise<void> {
  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}): Promise<void> {
  // Avoid duplicate unread notifications of the same type
  const existing = await prisma.notification.findFirst({
    where: { userId: input.userId, type: input.type, isRead: false },
  });
  if (existing) return;

  await prisma.notification.create({ data: input });
}

export async function checkAndNotify(userId: string): Promise<void> {
  const [eggStockModule, feedStockModule, vaccinationModule] =
    await Promise.all([
      import("./stock.service"),
      import("./stock.service"),
      import("./vaccination.service"),
    ]);

  const eggStock = await eggStockModule.getEggStock();
  if (eggStock < 500) {
    await createNotification({
      userId,
      type: "LOW_EGG_STOCK",
      title: "Stok Telur Menipis",
      message: `Stok telur saat ini hanya ${eggStock} butir. Segera lakukan panen atau kurangi penjualan.`,
    });
  } else {
    // Clear old low-stock notifications when stock is replenished
    await prisma.notification.deleteMany({
      where: { userId, type: "LOW_EGG_STOCK", isRead: false },
    });
  }

  const feedStocks = await feedStockModule.getFeedStock();
  for (const feed of feedStocks) {
    if (feed.stock < 100) {
      await createNotification({
        userId,
        type: "LOW_FEED_STOCK",
        title: "Stok Pakan Rendah",
        message: `Stok ${feed.productName} tinggal ${feed.stock} ${feed.unit}.`,
      });
    }
  }

  const upcoming = await vaccinationModule.getUpcomingVaccinations(7);
  for (const v of upcoming) {
    await createNotification({
      userId,
      type: "VACCINATION_DUE",
      title: "Jadwal Vaksin Mendekat",
      message: `Vaksin ${v.vaccineName} dijadwalkan ${new Date(v.scheduleDate).toLocaleDateString("id-ID")}.`,
    });
  }
}

export async function deleteNotification(id: string): Promise<void> {
  await prisma.notification.delete({ where: { id } });
}
