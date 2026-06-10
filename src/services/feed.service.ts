import prisma from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

// Hitung biaya pemakaian pakan dengan metode FIFO: stok dari pembelian yang lebih
// lama (berdasarkan tanggal) dipakai lebih dulu, mengikuti harga per kg saat dibeli.
// `priorConsumption` = total qty yang sudah terpakai dari batch-batch sebelum
// pemakaian ini (dihitung dari urutan tanggal & waktu pencatatan).
export async function computeFifoFeedCost(
  db: DbClient,
  params: { feedProductId: string; date: Date; qtyUsed: number; createdAt?: Date; excludeUsageId?: string }
): Promise<{ unitCost: number | null; totalCost: number | null }> {
  const { feedProductId, date, qtyUsed } = params;
  const refCreatedAt = params.createdAt ?? new Date();

  const purchases = await db.feedPurchase.findMany({
    where: { feedProductId, date: { lte: date } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: { qty: true, pricePerKg: true },
  });
  if (purchases.length === 0) return { unitCost: null, totalCost: null };

  const priorUsages = await db.feedUsage.findMany({
    where: {
      feedProductId,
      ...(params.excludeUsageId && { id: { not: params.excludeUsageId } }),
      OR: [{ date: { lt: date } }, { date, createdAt: { lt: refCreatedAt } }],
    },
    select: { qtyUsed: true },
  });

  let toSkip = priorUsages.reduce((sum, u) => sum + decimalToNumber(u.qtyUsed), 0);
  let remaining = qtyUsed;
  let totalCost = 0;
  let allocated = 0;
  let lastPrice = 0;

  for (const batch of purchases) {
    let avail = decimalToNumber(batch.qty);
    const price = batch.pricePerKg != null ? decimalToNumber(batch.pricePerKg) : lastPrice;
    lastPrice = price;

    if (toSkip > 0) {
      const skip = Math.min(toSkip, avail);
      avail -= skip;
      toSkip -= skip;
    }
    if (avail <= 0 || remaining <= 0) continue;

    const take = Math.min(remaining, avail);
    totalCost += take * price;
    allocated += take;
    remaining -= take;
  }

  if (remaining > 0) {
    totalCost += remaining * lastPrice;
    allocated += remaining;
  }
  if (allocated === 0) return { unitCost: null, totalCost: null };

  const unitCost = totalCost / allocated;
  return {
    unitCost: Math.round(unitCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

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

  return records.map((r) => {
    const qty = decimalToNumber(r.qty);
    const pricePerKg = r.pricePerKg != null ? decimalToNumber(r.pricePerKg) : null;
    return {
      ...r,
      qty,
      pricePerKg,
      totalValue: pricePerKg != null ? qty * pricePerKg : null,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}

export async function createFeedPurchase(input: {
  date: string;
  feedProductId: string;
  qty: number;
  pricePerKg?: number;
  notes?: string;
}) {
  const record = await prisma.feedPurchase.create({
    data: {
      date: new Date(input.date),
      feedProductId: input.feedProductId,
      qty: input.qty,
      pricePerKg: input.pricePerKg ?? null,
      notes: input.notes,
    },
    include: { feedProduct: true },
  });
  const qty = decimalToNumber(record.qty);
  const pricePerKg = record.pricePerKg != null ? decimalToNumber(record.pricePerKg) : null;
  return {
    ...record,
    qty,
    pricePerKg,
    totalValue: pricePerKg != null ? qty * pricePerKg : null,
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function updateFeedPurchase(
  id: string,
  input: { date?: string; feedProductId?: string; qty?: number; pricePerKg?: number | null; notes?: string }
) {
  const record = await prisma.feedPurchase.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.feedProductId && { feedProductId: input.feedProductId }),
      ...(input.qty !== undefined && { qty: input.qty }),
      ...(input.pricePerKg !== undefined && { pricePerKg: input.pricePerKg }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: { feedProduct: true },
  });
  const qty = decimalToNumber(record.qty);
  const pricePerKg = record.pricePerKg != null ? decimalToNumber(record.pricePerKg) : null;
  return {
    ...record,
    qty,
    pricePerKg,
    totalValue: pricePerKg != null ? qty * pricePerKg : null,
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function deleteFeedPurchase(id: string) {
  await prisma.feedPurchase.delete({ where: { id } });
}

export async function deleteFeedPurchases(ids: string[]) {
  const result = await prisma.feedPurchase.deleteMany({ where: { id: { in: ids } } });
  return result.count;
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
    unitCost: r.unitCost != null ? decimalToNumber(r.unitCost) : null,
    totalCost: r.totalCost != null ? decimalToNumber(r.totalCost) : null,
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
  const date = new Date(input.date);
  const { unitCost, totalCost } = await computeFifoFeedCost(prisma, {
    feedProductId: input.feedProductId,
    date,
    qtyUsed: input.qtyUsed,
  });

  const record = await prisma.feedUsage.create({
    data: {
      date,
      house: input.house,
      feedProductId: input.feedProductId,
      qtyUsed: input.qtyUsed,
      unitCost,
      totalCost,
      notes: input.notes,
    },
    include: { feedProduct: true },
  });
  return {
    ...record,
    qtyUsed: decimalToNumber(record.qtyUsed),
    unitCost: record.unitCost != null ? decimalToNumber(record.unitCost) : null,
    totalCost: record.totalCost != null ? decimalToNumber(record.totalCost) : null,
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
  const existing = await prisma.feedUsage.findUnique({ where: { id } });
  if (!existing) throw new Error("Not found");

  const date = input.date ? new Date(input.date) : existing.date;
  const feedProductId = input.feedProductId ?? existing.feedProductId;
  const qtyUsed = input.qtyUsed ?? decimalToNumber(existing.qtyUsed);
  const { unitCost, totalCost } = await computeFifoFeedCost(prisma, {
    feedProductId,
    date,
    qtyUsed,
    createdAt: existing.createdAt,
    excludeUsageId: id,
  });

  const record = await prisma.feedUsage.update({
    where: { id },
    data: {
      ...(input.date && { date }),
      ...(input.house !== undefined && { house: input.house }),
      ...(input.feedProductId && { feedProductId: input.feedProductId }),
      ...(input.qtyUsed !== undefined && { qtyUsed: input.qtyUsed }),
      ...(input.notes !== undefined && { notes: input.notes }),
      unitCost,
      totalCost,
    },
    include: { feedProduct: true },
  });
  return {
    ...record,
    qtyUsed: decimalToNumber(record.qtyUsed),
    unitCost: record.unitCost != null ? decimalToNumber(record.unitCost) : null,
    totalCost: record.totalCost != null ? decimalToNumber(record.totalCost) : null,
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

export async function deleteFeedSales(ids: string[]) {
  const result = await prisma.feedSale.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}

// ─── Feed Stock Opname (Sisa Stok Pakan Real) ──────────────────────────────────

export async function getFeedStockOpnames(params?: { feedProductId?: string; from?: string; to?: string }) {
  const { feedProductId, from, to } = params ?? {};
  const records = await prisma.feedStockOpname.findMany({
    where: {
      ...(feedProductId && { feedProductId }),
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
    orderBy: [{ date: "desc" }],
  });

  return records.map((r) => ({
    ...r,
    qtyKg: decimalToNumber(r.qtyKg),
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function upsertFeedStockOpname(input: { date: string; feedProductId: string; qtyKg: number }) {
  const date = new Date(input.date);
  const record = await prisma.feedStockOpname.upsert({
    where: { date_feedProductId: { date, feedProductId: input.feedProductId } },
    create: { date, feedProductId: input.feedProductId, qtyKg: input.qtyKg },
    update: { qtyKg: input.qtyKg },
    include: { feedProduct: true },
  });
  return {
    ...record,
    qtyKg: decimalToNumber(record.qtyKg),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function deleteFeedStockOpname(id: string) {
  await prisma.feedStockOpname.delete({ where: { id } });
}

// ─── Feed Stock Daily (Stok Pakan tab) ─────────────────────────────────────────

export interface FeedStockDay {
  date: string;
  beliKg: number;
  pakaiKg: number;
  jualKg: number;
  sisaStokKg: number;
  sisaStokRealKg: number | null;
}

// Tabel harian Stok Pakan untuk satu produk: saldo berjalan = saldo sebelumnya + beli − pakai − jual.
// Jika tidak ada rentang tanggal, default ke 30 hari terakhir.
export async function getFeedStockDaily(params: { feedProductId: string; from?: string; to?: string }): Promise<FeedStockDay[]> {
  const { feedProductId } = params;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const from = params.from ? new Date(params.from) : new Date(today);
  const to = params.to ? new Date(params.to) : new Date(today);
  if (!params.from && !params.to) {
    from.setDate(from.getDate() - 29);
  }
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  const [priorPurchases, priorUsages, priorSales, rangePurchases, rangeUsages, rangeSales, rangeOpnames] = await Promise.all([
    prisma.feedPurchase.aggregate({ where: { feedProductId, date: { lt: from } }, _sum: { qty: true } }),
    prisma.feedUsage.aggregate({ where: { feedProductId, date: { lt: from } }, _sum: { qtyUsed: true } }),
    prisma.feedSale.aggregate({ where: { feedProductId, date: { lt: from } }, _sum: { qty: true } }),
    prisma.feedPurchase.findMany({ where: { feedProductId, date: { gte: from, lte: to } }, select: { date: true, qty: true } }),
    prisma.feedUsage.findMany({ where: { feedProductId, date: { gte: from, lte: to } }, select: { date: true, qtyUsed: true } }),
    prisma.feedSale.findMany({ where: { feedProductId, date: { gte: from, lte: to } }, select: { date: true, qty: true } }),
    prisma.feedStockOpname.findMany({ where: { feedProductId, date: { gte: from, lte: to } }, select: { date: true, qtyKg: true } }),
  ]);

  const byDay = <T extends { date: Date }>(records: T[], pick: (r: T) => number) => {
    const map = new Map<string, number>();
    for (const r of records) {
      const key = r.date.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + pick(r));
    }
    return map;
  };

  const purchasesByDay = byDay(rangePurchases, (r) => decimalToNumber(r.qty));
  const usagesByDay = byDay(rangeUsages, (r) => decimalToNumber(r.qtyUsed));
  const salesByDay = byDay(rangeSales, (r) => decimalToNumber(r.qty));
  const opnameByDay = new Map<string, number>();
  for (const r of rangeOpnames) {
    opnameByDay.set(r.date.toISOString().slice(0, 10), decimalToNumber(r.qtyKg));
  }

  let runningStock =
    decimalToNumber(priorPurchases._sum.qty) -
    decimalToNumber(priorUsages._sum.qtyUsed) -
    decimalToNumber(priorSales._sum.qty);

  const result: FeedStockDay[] = [];
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const beliKg = purchasesByDay.get(key) ?? 0;
    const pakaiKg = usagesByDay.get(key) ?? 0;
    const jualKg = salesByDay.get(key) ?? 0;
    runningStock += beliKg - pakaiKg - jualKg;
    result.push({
      date: key,
      beliKg,
      pakaiKg,
      jualKg,
      sisaStokKg: runningStock,
      sisaStokRealKg: opnameByDay.get(key) ?? null,
    });
  }

  return result;
}
