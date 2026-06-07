import prisma from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

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

export async function createProduction(input: CreateProductionInput) {
  const record = await prisma.eggProduction.create({
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
      mortality: input.mortality ?? null,
      notes: input.notes,
    },
  });
  return serializeRecord(record);
}

export async function updateProduction(
  id: string,
  input: Partial<CreateProductionInput>
) {
  const record = await prisma.eggProduction.update({
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
      ...(input.mortality !== undefined && { mortality: input.mortality }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return serializeRecord(record);
}

export async function deleteProduction(id: string) {
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

export async function getHouseMetrics(days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const records = await prisma.eggProduction.findMany({
    where: { date: { gte: from } },
    select: {
      house: true,
      populasi: true,
      goodEggs: true,
      feedQtyKg: true,
      goodEggsKg: true,
    },
    orderBy: { date: "asc" },
  });

  const grouped: Record<string, {
    totalFeedKg: number;
    totalGoodEggsKg: number;
    totalGoodEggs: number;
    populasiSum: number;
    populasiCount: number;
  }> = {};

  records.forEach((r) => {
    if (!grouped[r.house]) {
      grouped[r.house] = { totalFeedKg: 0, totalGoodEggsKg: 0, totalGoodEggs: 0, populasiSum: 0, populasiCount: 0 };
    }
    const g = grouped[r.house];
    g.totalFeedKg += decimalToNumber(r.feedQtyKg);
    g.totalGoodEggsKg += decimalToNumber(r.goodEggsKg);
    g.totalGoodEggs += r.goodEggs;
    if (r.populasi) {
      g.populasiSum += r.populasi;
      g.populasiCount += 1;
    }
  });

  return Object.entries(grouped).map(([house, g]) => {
    const avgPopulasi = g.populasiCount > 0 ? g.populasiSum / g.populasiCount : 0;
    const feedIntake = avgPopulasi > 0 ? g.totalFeedKg / avgPopulasi : 0;
    const fcr = g.totalGoodEggsKg > 0 ? (g.totalFeedKg / g.totalGoodEggsKg) * 100 : 0;
    const hd = avgPopulasi > 0 ? (g.totalGoodEggs / (avgPopulasi * g.populasiCount)) * 100 : 0;
    return {
      house,
      totalFeedKg: g.totalFeedKg,
      totalGoodEggsKg: g.totalGoodEggsKg,
      totalGoodEggs: g.totalGoodEggs,
      avgPopulasi: Math.round(avgPopulasi),
      feedIntake: Math.round(feedIntake * 100) / 100,
      fcr: Math.round(fcr * 100) / 100,
      hd: Math.round(hd * 100) / 100,
    };
  });
}
