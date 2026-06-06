import prisma from "@/lib/prisma";

export async function getMortalities(params?: {
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { search, from, to, limit = 50 } = params ?? {};

  const where: Record<string, unknown> = {};
  if (search) where.house = { contains: search };
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const [records, total] = await Promise.all([
    prisma.mortality.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
    prisma.mortality.count({ where }),
  ]);

  return {
    data: records.map((r) => ({
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function getMortalityById(id: string) {
  const r = await prisma.mortality.findUnique({ where: { id } });
  if (!r) return null;
  return {
    ...r,
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createMortality(input: {
  date: string;
  house: string;
  count: number;
  notes?: string;
}) {
  const r = await prisma.mortality.create({
    data: {
      date: new Date(input.date),
      house: input.house,
      count: input.count,
      notes: input.notes,
    },
  });
  return {
    ...r,
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function updateMortality(
  id: string,
  input: { date?: string; house?: string; count?: number; notes?: string }
) {
  const r = await prisma.mortality.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.house !== undefined && { house: input.house }),
      ...(input.count !== undefined && { count: input.count }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return {
    ...r,
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function deleteMortality(id: string) {
  await prisma.mortality.delete({ where: { id } });
}

export async function getTodayMortality(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const result = await prisma.mortality.aggregate({
    where: { date: { gte: today, lt: tomorrow } },
    _sum: { count: true },
  });
  return result._sum.count ?? 0;
}

export async function getMonthlyMortality(): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const result = await prisma.mortality.aggregate({
    where: { date: { gte: start, lte: end } },
    _sum: { count: true },
  });
  return result._sum.count ?? 0;
}

export async function getMortalityTrend(days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const records = await prisma.mortality.findMany({
    where: { date: { gte: from } },
    select: { date: true, count: true },
    orderBy: { date: "asc" },
  });

  const grouped: Record<string, number> = {};
  records.forEach((r) => {
    const key = r.date.toISOString().split("T")[0];
    grouped[key] = (grouped[key] ?? 0) + r.count;
  });

  return Object.entries(grouped).map(([date, value]) => ({ date, value }));
}
