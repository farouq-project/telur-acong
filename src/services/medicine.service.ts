import prisma from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

export async function getMedicines(params?: {
  search?: string;
  category?: "MEDICINE" | "VACCINE";
  from?: string;
  to?: string;
  limit?: number;
}) {
  const { search, category, from, to, limit = 50 } = params ?? {};

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (search) where.productName = { contains: search };
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const [records, total] = await Promise.all([
    prisma.medicineVaccine.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
    prisma.medicineVaccine.count({ where }),
  ]);

  return {
    data: records.map((r) => ({
      ...r,
      qty: decimalToNumber(r.qty),
      date: r.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
  };
}

export async function getMedicineById(id: string) {
  const r = await prisma.medicineVaccine.findUnique({ where: { id } });
  if (!r) return null;
  return {
    ...r,
    qty: decimalToNumber(r.qty),
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createMedicine(input: {
  date: string;
  productName: string;
  category: "MEDICINE" | "VACCINE";
  qty: number;
  unit: string;
  notes?: string;
}) {
  const r = await prisma.medicineVaccine.create({
    data: {
      date: new Date(input.date),
      productName: input.productName,
      category: input.category,
      qty: input.qty,
      unit: input.unit,
      notes: input.notes,
    },
  });
  return {
    ...r,
    qty: decimalToNumber(r.qty),
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function updateMedicine(
  id: string,
  input: {
    date?: string;
    productName?: string;
    category?: "MEDICINE" | "VACCINE";
    qty?: number;
    unit?: string;
    notes?: string;
  }
) {
  const r = await prisma.medicineVaccine.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.productName !== undefined && {
        productName: input.productName,
      }),
      ...(input.category && { category: input.category }),
      ...(input.qty !== undefined && { qty: input.qty }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return {
    ...r,
    qty: decimalToNumber(r.qty),
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function deleteMedicine(id: string) {
  await prisma.medicineVaccine.delete({ where: { id } });
}
