import prisma from "@/lib/prisma";

export interface CreateProductionInput {
  date: string;
  house: string;
  goodEggs: number;
  crackedEggs: number;
  rejectedEggs: number;
  notes?: string;
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
    data: records.map((r) => ({
      ...r,
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function getProductionById(id: string) {
  const record = await prisma.eggProduction.findUnique({ where: { id } });
  if (!record) return null;
  return {
    ...record,
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function createProduction(input: CreateProductionInput) {
  const record = await prisma.eggProduction.create({
    data: {
      date: new Date(input.date),
      house: input.house,
      goodEggs: input.goodEggs,
      crackedEggs: input.crackedEggs,
      rejectedEggs: input.rejectedEggs,
      notes: input.notes,
    },
  });
  return {
    ...record,
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
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
      ...(input.goodEggs !== undefined && { goodEggs: input.goodEggs }),
      ...(input.crackedEggs !== undefined && { crackedEggs: input.crackedEggs }),
      ...(input.rejectedEggs !== undefined && {
        rejectedEggs: input.rejectedEggs,
      }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return {
    ...record,
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
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
