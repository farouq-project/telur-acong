import prisma from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

// ─── Feed Products ────────────────────────────────────────────────────────────

export async function getFeedProducts() {
  return prisma.feedProduct.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createFeedProduct(input: { name: string; unit: string }) {
  return prisma.feedProduct.create({ data: input });
}

export async function updateFeedProduct(
  id: string,
  input: { name?: string; unit?: string }
) {
  return prisma.feedProduct.update({ where: { id }, data: input });
}

export async function deleteFeedProduct(id: string) {
  await prisma.feedProduct.delete({ where: { id } });
}

// ─── Feed Purchases ───────────────────────────────────────────────────────────

export async function getFeedPurchases(params?: {
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { from, to, limit = 50 } = params ?? {};
  const records = await prisma.feedPurchase.findMany({
    where: {
      ...(from || to
        ? {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    },
    include: { feedProduct: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return records.map((r) => ({
    ...r,
    qty: decimalToNumber(r.qty),
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createFeedPurchase(input: {
  date: string;
  feedProductId: string;
  qty: number;
  notes?: string;
}) {
  const record = await prisma.feedPurchase.create({
    data: {
      date: new Date(input.date),
      feedProductId: input.feedProductId,
      qty: input.qty,
      notes: input.notes,
    },
    include: { feedProduct: true },
  });
  return {
    ...record,
    qty: decimalToNumber(record.qty),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function updateFeedPurchase(
  id: string,
  input: { date?: string; feedProductId?: string; qty?: number; notes?: string }
) {
  const record = await prisma.feedPurchase.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.feedProductId && { feedProductId: input.feedProductId }),
      ...(input.qty !== undefined && { qty: input.qty }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: { feedProduct: true },
  });
  return {
    ...record,
    qty: decimalToNumber(record.qty),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function deleteFeedPurchase(id: string) {
  await prisma.feedPurchase.delete({ where: { id } });
}

// ─── Feed Usage ───────────────────────────────────────────────────────────────

export async function getFeedUsages(params?: {
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { from, to, limit = 50 } = params ?? {};
  const records = await prisma.feedUsage.findMany({
    where: {
      ...(from || to
        ? {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    },
    include: { feedProduct: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return records.map((r) => ({
    ...r,
    qtyUsed: decimalToNumber(r.qtyUsed),
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createFeedUsage(input: {
  date: string;
  house: string;
  feedProductId: string;
  qtyUsed: number;
  notes?: string;
}) {
  const record = await prisma.feedUsage.create({
    data: {
      date: new Date(input.date),
      house: input.house,
      feedProductId: input.feedProductId,
      qtyUsed: input.qtyUsed,
      notes: input.notes,
    },
    include: { feedProduct: true },
  });
  return {
    ...record,
    qtyUsed: decimalToNumber(record.qtyUsed),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function updateFeedUsage(
  id: string,
  input: {
    date?: string;
    house?: string;
    feedProductId?: string;
    qtyUsed?: number;
    notes?: string;
  }
) {
  const record = await prisma.feedUsage.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.house !== undefined && { house: input.house }),
      ...(input.feedProductId && { feedProductId: input.feedProductId }),
      ...(input.qtyUsed !== undefined && { qtyUsed: input.qtyUsed }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: { feedProduct: true },
  });
  return {
    ...record,
    qtyUsed: decimalToNumber(record.qtyUsed),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function deleteFeedUsage(id: string) {
  await prisma.feedUsage.delete({ where: { id } });
}

// ─── Feed Sales ───────────────────────────────────────────────────────────────

export async function getFeedSales(params?: {
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { from, to, limit = 50 } = params ?? {};
  const records = await prisma.feedSale.findMany({
    where: {
      ...(from || to
        ? {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    },
    include: { feedProduct: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return records.map((r) => ({
    ...r,
    qty: decimalToNumber(r.qty),
    unitPrice: decimalToNumber(r.unitPrice),
    totalValue: decimalToNumber(r.totalValue),
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createFeedSale(input: {
  date: string;
  customerName: string;
  feedProductId: string;
  qty: number;
  unitPrice: number;
}) {
  const totalValue = input.qty * input.unitPrice;
  const record = await prisma.feedSale.create({
    data: {
      date: new Date(input.date),
      customerName: input.customerName,
      feedProductId: input.feedProductId,
      qty: input.qty,
      unitPrice: input.unitPrice,
      totalValue,
    },
    include: { feedProduct: true },
  });
  return {
    ...record,
    qty: decimalToNumber(record.qty),
    unitPrice: decimalToNumber(record.unitPrice),
    totalValue: decimalToNumber(record.totalValue),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function updateFeedSale(
  id: string,
  input: {
    date?: string;
    customerName?: string;
    feedProductId?: string;
    qty?: number;
    unitPrice?: number;
  }
) {
  const existing = await prisma.feedSale.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const qty = input.qty ?? decimalToNumber(existing.qty);
  const unitPrice = input.unitPrice ?? decimalToNumber(existing.unitPrice);
  const totalValue = qty * unitPrice;

  const record = await prisma.feedSale.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.customerName !== undefined && {
        customerName: input.customerName,
      }),
      ...(input.feedProductId && { feedProductId: input.feedProductId }),
      qty,
      unitPrice,
      totalValue,
    },
    include: { feedProduct: true },
  });
  return {
    ...record,
    qty: decimalToNumber(record.qty),
    unitPrice: decimalToNumber(record.unitPrice),
    totalValue: decimalToNumber(record.totalValue),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function deleteFeedSale(id: string) {
  await prisma.feedSale.delete({ where: { id } });
}
