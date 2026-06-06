import prisma from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

export interface CreateSaleInput {
  date: string;
  customerName: string;
  qtySold: number;
  unitPrice: number;
  notes?: string;
}

export async function getSales(params?: {
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
    where.customerName = { contains: search };
  }

  const [records, total] = await Promise.all([
    prisma.eggSale.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.eggSale.count({ where }),
  ]);

  return {
    data: records.map((r) => ({
      ...r,
      unitPrice: decimalToNumber(r.unitPrice),
      totalValue: decimalToNumber(r.totalValue),
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function getSaleById(id: string) {
  const record = await prisma.eggSale.findUnique({ where: { id } });
  if (!record) return null;
  return {
    ...record,
    unitPrice: decimalToNumber(record.unitPrice),
    totalValue: decimalToNumber(record.totalValue),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function createSale(input: CreateSaleInput) {
  const totalValue = input.qtySold * input.unitPrice;
  const record = await prisma.eggSale.create({
    data: {
      date: new Date(input.date),
      customerName: input.customerName,
      qtySold: input.qtySold,
      unitPrice: input.unitPrice,
      totalValue,
      notes: input.notes,
    },
  });
  return {
    ...record,
    unitPrice: decimalToNumber(record.unitPrice),
    totalValue: decimalToNumber(record.totalValue),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function updateSale(id: string, input: Partial<CreateSaleInput>) {
  const existing = await prisma.eggSale.findUnique({ where: { id } });
  if (!existing) throw new Error("Record not found");

  const qtySold = input.qtySold ?? existing.qtySold;
  const unitPrice = input.unitPrice ?? decimalToNumber(existing.unitPrice);
  const totalValue = qtySold * unitPrice;

  const record = await prisma.eggSale.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.customerName !== undefined && {
        customerName: input.customerName,
      }),
      ...(input.qtySold !== undefined && { qtySold: input.qtySold }),
      ...(input.unitPrice !== undefined && { unitPrice: input.unitPrice }),
      totalValue,
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return {
    ...record,
    unitPrice: decimalToNumber(record.unitPrice),
    totalValue: decimalToNumber(record.totalValue),
    date: record.date.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function deleteSale(id: string) {
  await prisma.eggSale.delete({ where: { id } });
}

export async function getTodaySales(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const result = await prisma.eggSale.aggregate({
    where: { date: { gte: today, lt: tomorrow } },
    _sum: { qtySold: true },
  });
  return result._sum.qtySold ?? 0;
}

export async function getTotalEggsSold(): Promise<number> {
  const result = await prisma.eggSale.aggregate({
    _sum: { qtySold: true },
  });
  return result._sum.qtySold ?? 0;
}

export async function getMonthlySales(): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const result = await prisma.eggSale.aggregate({
    where: { date: { gte: start, lte: end } },
    _sum: { qtySold: true },
  });
  return result._sum.qtySold ?? 0;
}

export async function getSalesTrend(days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);

  const records = await prisma.eggSale.findMany({
    where: { date: { gte: from } },
    select: { date: true, qtySold: true },
    orderBy: { date: "asc" },
  });

  const grouped: Record<string, number> = {};
  records.forEach((r) => {
    const key = r.date.toISOString().split("T")[0];
    grouped[key] = (grouped[key] ?? 0) + r.qtySold;
  });

  return Object.entries(grouped).map(([date, value]) => ({ date, value }));
}
