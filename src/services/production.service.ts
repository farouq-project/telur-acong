import prisma from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";
import { computeFifoFeedCost } from "@/services/feed.service";

export interface CreateProductionInput {
  date: string;
  house: string;
  populasi?: number;
  goodEggs: number;
  crackedEggs: number;
  rejectedEggs: number;
  goodEggsKg?: number;
  crackedEggsKg?: number;
  rejectedEggsKg?: number;
  feedQtyKg?: number;
  feedPricePerKg?: number;
  feedProductId?: string;
  mortality?: number;
  notes?: string;
}

function serializeRecord(r: {
  id: string;
  date: Date;
  house: string;
  populasi: number | null;
  goodEggs: number;
  crackedEggs: number;
  rejectedEggs: number;
  goodEggsKg: unknown;
  crackedEggsKg: unknown;
  rejectedEggsKg: unknown;
  feedQtyKg: unknown;
  feedPricePerKg: unknown;
  feedProductId: string | null;
  mortality: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...r,
    date: r.date.toISOString(),
    goodEggsKg: r.goodEggsKg != null ? decimalToNumber(r.goodEggsKg) : null,
    crackedEggsKg: r.crackedEggsKg != null ? decimalToNumber(r.crackedEggsKg) : null,
    rejectedEggsKg: r.rejectedEggsKg != null ? decimalToNumber(r.rejectedEggsKg) : null,
    feedQtyKg: r.feedQtyKg != null ? decimalToNumber(r.feedQtyKg) : null,
    feedPricePerKg: r.feedPricePerKg != null ? decimalToNumber(r.feedPricePerKg) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function getProductions(params?: {
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const { search, from, to, limit = 50, offset = 0 } = params ?? {};

  const where: Record<string, unknown> = {};

  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  if (search) {
    where.house = { contains: search };
  }

  const [records, total] = await Promise.all([
    prisma.eggProduction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.eggProduction.count({ where }),
  ]);

  return {
    data: records.map(serializeRecord),
    total,
  };
}

export async function getProductionById(id: string) {
  const record = await prisma.eggProduction.findUnique({ where: { id } });
  if (!record) return null;
  return serializeRecord(record);
}

// Sinkronkan catatan FeedUsage yang terhubung ke produksi: dibuat/diperbarui/dihapus
// otomatis mengikuti Jenis Pakan + Pakan (kg) pada form Produksi, agar Stok Pakan
// (yang menjumlahkan FeedProduct.usages) selalu mencerminkan konsumsi dari Produksi.
async function syncProductionFeedUsage(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  production: { id: string; date: Date; house: string },
  feedProductId?: string | null,
  feedQtyKg?: number | null
) {
  const shouldHaveUsage = !!feedProductId && feedQtyKg != null && feedQtyKg > 0;

  if (shouldHaveUsage) {
    const existing = await tx.feedUsage.findUnique({ where: { productionId: production.id } });
    const { unitCost, totalCost } = await computeFifoFeedCost(tx, {
      feedProductId: feedProductId!,
      date: production.date,
      qtyUsed: feedQtyKg!,
      createdAt: existing?.createdAt,
      excludeUsageId: existing?.id,
    });

    await tx.feedUsage.upsert({
      where: { productionId: production.id },
      create: {
        date: production.date,
        house: production.house,
        feedProductId: feedProductId!,
        qtyUsed: feedQtyKg!,
        unitCost,
        totalCost,
        notes: "Otomatis dari catatan Produksi",
        productionId: production.id,
      },
      update: {
        date: production.date,
        house: production.house,
        feedProductId: feedProductId!,
        qtyUsed: feedQtyKg!,
        unitCost,
        totalCost,
      },
    });
  } else {
    await tx.feedUsage.deleteMany({ where: { productionId: production.id } });
  }
}

export async function createProduction(input: CreateProductionInput) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.eggProduction.create({
      data: {
        date: new Date(input.date),
        house: input.house,
        populasi: input.populasi ?? null,
        goodEggs: input.goodEggs,
        crackedEggs: input.crackedEggs,
        rejectedEggs: input.rejectedEggs,
        goodEggsKg: input.goodEggsKg ?? null,
        crackedEggsKg: input.crackedEggsKg ?? null,
        rejectedEggsKg: input.rejectedEggsKg ?? null,
        feedQtyKg: input.feedQtyKg ?? null,
        feedPricePerKg: input.feedPricePerKg ?? null,
        feedProductId: input.feedProductId ?? null,
        mortality: input.mortality ?? null,
        notes: input.notes,
      },
    });

    await syncProductionFeedUsage(tx, record, input.feedProductId, input.feedQtyKg);

    return serializeRecord(record);
  });
}

export async function bulkCreateProductions(inputs: CreateProductionInput[]) {
  let count = 0;
  for (const input of inputs) {
    await prisma.$transaction(async (tx) => {
      const record = await tx.eggProduction.create({
        data: {
          date: new Date(input.date),
          house: input.house,
          populasi: input.populasi ?? null,
          goodEggs: input.goodEggs,
          crackedEggs: input.crackedEggs,
          rejectedEggs: input.rejectedEggs,
          goodEggsKg: input.goodEggsKg ?? null,
          crackedEggsKg: input.crackedEggsKg ?? null,
          rejectedEggsKg: input.rejectedEggsKg ?? null,
          feedQtyKg: input.feedQtyKg ?? null,
          feedPricePerKg: input.feedPricePerKg ?? null,
          feedProductId: input.feedProductId ?? null,
          mortality: input.mortality ?? null,
          notes: input.notes ?? null,
        },
      });

      await syncProductionFeedUsage(tx, record, input.feedProductId, input.feedQtyKg);
    });
    count += 1;
  }
  return count;
}

export async function updateProduction(
  id: string,
  input: Partial<CreateProductionInput>
) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.eggProduction.update({
      where: { id },
      data: {
        ...(input.date && { date: new Date(input.date) }),
        ...(input.house !== undefined && { house: input.house }),
        ...(input.populasi !== undefined && { populasi: input.populasi }),
        ...(input.goodEggs !== undefined && { goodEggs: input.goodEggs }),
        ...(input.crackedEggs !== undefined && { crackedEggs: input.crackedEggs }),
        ...(input.rejectedEggs !== undefined && { rejectedEggs: input.rejectedEggs }),
        ...(input.goodEggsKg !== undefined && { goodEggsKg: input.goodEggsKg }),
        ...(input.crackedEggsKg !== undefined && { crackedEggsKg: input.crackedEggsKg }),
        ...(input.rejectedEggsKg !== undefined && { rejectedEggsKg: input.rejectedEggsKg }),
        ...(input.feedQtyKg !== undefined && { feedQtyKg: input.feedQtyKg }),
        ...(input.feedPricePerKg !== undefined && { feedPricePerKg: input.feedPricePerKg }),
        ...(input.feedProductId !== undefined && { feedProductId: input.feedProductId }),
        ...(input.mortality !== undefined && { mortality: input.mortality }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });

    if (input.feedProductId !== undefined || input.feedQtyKg !== undefined) {
      const feedProductId = input.feedProductId !== undefined ? input.feedProductId : record.feedProductId;
      const feedQtyKg = input.feedQtyKg !== undefined ? input.feedQtyKg : decimalToNumber(record.feedQtyKg);
      await syncProductionFeedUsage(tx, record, feedProductId, feedQtyKg);
    }

    return serializeRecord(record);
  });
}

export async function deleteProduction(id: string) {
  // FeedUsage terhubung dihapus otomatis lewat onDelete: Cascade pada relasi productionId
  await prisma.eggProduction.delete({ where: { id } });
}

export async function getTodayProduction(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const result = await prisma.eggProduction.aggregate({
    where: { date: { gte: today, lt: tomorrow } },
    _sum: { goodEggs: true },
  });
  return result._sum.goodEggs ?? 0;
}

export async function getTotalGoodEggs(): Promise<number> {
  const result = await prisma.eggProduction.aggregate({
    _sum: { goodEggs: true },
  });
  return result._sum.goodEggs ?? 0;
}

export async function getMonthlyProduction(): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const result = await prisma.eggProduction.aggregate({
    where: { date: { gte: start, lte: end } },
    _sum: { goodEggs: true },
  });
  return result._sum.goodEggs ?? 0;
}

export async function getProductionTrend(days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const records = await prisma.eggProduction.findMany({
    where: { date: { gte: from } },
    select: { date: true, goodEggs: true },
    orderBy: { date: "asc" },
  });

  const grouped: Record<string, number> = {};
  records.forEach((r) => {
    const key = r.date.toISOString().split("T")[0];
    grouped[key] = (grouped[key] ?? 0) + r.goodEggs;
  });

  return Object.entries(grouped).map(([date, value]) => ({ date, value }));
}

export interface DailyMetric {
  id: string;
  date: string;
  house: string;
  fcr: number | null;
  hd: number | null;
  feedIntake: number | null;
}

// Metrik dihitung per hari per kandang langsung dari satu record produksi:
// - FCR = Pakan (kg) / Total Produksi Telur (kg) [Bagus + Retak] — rasio desimal
// - HD  = Total Butir [Bagus + Retak] / Sisa Populasi [Populasi - Kematian] — persentase
// - FI  = Pakan (kg) / Sisa Populasi [Populasi - Kematian] — rasio desimal
export async function getDailyMetrics(days = 14) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const records = await prisma.eggProduction.findMany({
    where: { date: { gte: from } },
    select: {
      id: true,
      date: true,
      house: true,
      populasi: true,
      mortality: true,
      goodEggs: true,
      crackedEggs: true,
      goodEggsKg: true,
      crackedEggsKg: true,
      feedQtyKg: true,
    },
    orderBy: [{ date: "desc" }, { house: "asc" }],
  });

  return records.map((r): DailyMetric => {
    const feedQtyKg = decimalToNumber(r.feedQtyKg);
    const totalEggsKg = decimalToNumber(r.goodEggsKg) + decimalToNumber(r.crackedEggsKg);
    const totalEggs = r.goodEggs + r.crackedEggs;
    const sisaPopulasi = r.populasi != null ? r.populasi - (r.mortality ?? 0) : null;

    const fcr = totalEggsKg > 0 && feedQtyKg > 0 ? feedQtyKg / totalEggsKg : null;
    const hd = sisaPopulasi != null && sisaPopulasi > 0 ? (totalEggs / sisaPopulasi) * 100 : null;
    const feedIntake = sisaPopulasi != null && sisaPopulasi > 0 && feedQtyKg > 0 ? feedQtyKg / sisaPopulasi : null;

    return {
      id: r.id,
      date: r.date.toISOString(),
      house: r.house,
      fcr: fcr !== null ? Math.round(fcr * 100000) / 100000 : null,
      hd: hd !== null ? Math.round(hd * 100) / 100 : null,
      feedIntake: feedIntake !== null ? Math.round(feedIntake * 1000) / 1000 : null,
    };
  });
}
