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
