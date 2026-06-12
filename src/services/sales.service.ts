import prisma from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";
import type { EggType } from "@/types";

export interface CreateSaleInput {
  date: string;
  customerName: string;
  qtySold: number;
  unitPrice: number;
  invoiceNo?: string;
  jatuhTempoDays?: number | null;
  notes?: string;
  eggType?: string | null;
}

function serializeSale(r: {
  id: string;
  date: Date;
  customerName: string;
  invoiceNo: string | null;
  jatuhTempoDays: number | null;
  qtySold: unknown;
  unitPrice: unknown;
  totalValue: unknown;
  notes: string | null;
  eggType: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...r,
    qtySold: decimalToNumber(r.qtySold),
    unitPrice: decimalToNumber(r.unitPrice),
    totalValue: decimalToNumber(r.totalValue),
    eggType: r.eggType as EggType | null,
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
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
    data: records.map(serializeSale),
    total,
  };
}

export async function getSaleById(id: string) {
  const record = await prisma.eggSale.findUnique({ where: { id } });
  if (!record) return null;
  return serializeSale(record);
}

export async function createSale(input: CreateSaleInput) {
  const totalValue = input.qtySold * input.unitPrice;
  const record = await prisma.eggSale.create({
    data: {
      date: new Date(input.date),
      customerName: input.customerName,
      invoiceNo: input.invoiceNo ?? null,
      jatuhTempoDays: input.jatuhTempoDays ?? null,
      qtySold: input.qtySold,
      unitPrice: input.unitPrice,
      totalValue,
      notes: input.notes,
      eggType: input.eggType ?? null,
    },
  });
  return serializeSale(record);
}

export async function updateSale(id: string, input: Partial<CreateSaleInput>) {
  const existing = await prisma.eggSale.findUnique({ where: { id } });
  if (!existing) throw new Error("Record not found");

  const qtySold = input.qtySold ?? decimalToNumber(existing.qtySold);
  const unitPrice = input.unitPrice ?? decimalToNumber(existing.unitPrice);
  const totalValue = qtySold * unitPrice;

  const record = await prisma.eggSale.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.customerName !== undefined && { customerName: input.customerName }),
      ...(input.qtySold !== undefined && { qtySold: input.qtySold }),
      ...(input.unitPrice !== undefined && { unitPrice: input.unitPrice }),
      ...(input.jatuhTempoDays !== undefined && { jatuhTempoDays: input.jatuhTempoDays }),
      totalValue,
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.eggType !== undefined && { eggType: input.eggType }),
    },
  });
  return serializeSale(record);
}

export async function deleteSale(id: string) {
  await prisma.eggSale.delete({ where: { id } });
}

export async function deleteSales(ids: string[]) {
  const result = await prisma.eggSale.deleteMany({ where: { id: { in: ids } } });
  return result.count;
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
  return decimalToNumber(result._sum.qtySold);
}

export async function getTotalEggsSold(): Promise<number> {
  const result = await prisma.eggSale.aggregate({
    _sum: { qtySold: true },
  });
  return decimalToNumber(result._sum.qtySold);
}

export async function getEggSalesByType(params?: { from?: string; to?: string }): Promise<{ telurBagusKg: number; telurRetakKg: number }> {
  const { from, to } = params ?? {};
  const dateFilter = from || to
    ? {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }
    : {};
  const [bagus, retak] = await Promise.all([
    prisma.eggSale.aggregate({
      where: { eggType: "TELUR_BAGUS", ...dateFilter },
      _sum: { qtySold: true },
    }),
    prisma.eggSale.aggregate({
      where: { eggType: "TELUR_RETAK", ...dateFilter },
      _sum: { qtySold: true },
    }),
  ]);
  return {
    telurBagusKg: decimalToNumber(bagus._sum.qtySold),
    telurRetakKg: decimalToNumber(retak._sum.qtySold),
  };
}

export interface CustomerSalesReport {
  customerName: string;
  telurBagusKg: number;
  telurRetakKg: number;
  telurBuleKg: number;
  totalJual: number;
}

export async function getSalesReportByCustomer(params?: { from?: string; to?: string }): Promise<CustomerSalesReport[]> {
  const { from, to } = params ?? {};
  const dateFilter = from || to
    ? {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }
    : {};

  const records = await prisma.eggSale.findMany({
    where: dateFilter,
    select: { customerName: true, eggType: true, qtySold: true, totalValue: true },
  });

  const map = new Map<string, CustomerSalesReport>();
  for (const r of records) {
    let entry = map.get(r.customerName);
    if (!entry) {
      entry = { customerName: r.customerName, telurBagusKg: 0, telurRetakKg: 0, telurBuleKg: 0, totalJual: 0 };
      map.set(r.customerName, entry);
    }
    const qty = decimalToNumber(r.qtySold);
    if (r.eggType === "TELUR_BAGUS") entry.telurBagusKg += qty;
    else if (r.eggType === "TELUR_RETAK") entry.telurRetakKg += qty;
    else if (r.eggType === "TELUR_BULE") entry.telurBuleKg += qty;
    entry.totalJual += decimalToNumber(r.totalValue);
  }

  return Array.from(map.values()).sort((a, b) => a.customerName.localeCompare(b.customerName));
}

export async function getMonthlySales(): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const result = await prisma.eggSale.aggregate({
    where: { date: { gte: start, lte: end } },
    _sum: { qtySold: true },
  });
  return decimalToNumber(result._sum.qtySold);
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
    grouped[key] = (grouped[key] ?? 0) + decimalToNumber(r.qtySold);
  });

  return Object.entries(grouped).map(([date, value]) => ({ date, value }));
}
