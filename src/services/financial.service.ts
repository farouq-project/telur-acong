import prisma from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils";

export interface CreateFinancialNoteInput {
  date: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  userId: string;
}

function serializeNote(r: {
  id: string;
  date: Date;
  type: "INCOME" | "EXPENSE";
  amount: unknown;
  description: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...r,
    amount: decimalToNumber(r.amount),
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function getFinancialNotes(params?: {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const { from, to, limit = 100, offset = 0 } = params ?? {};

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const [records, total] = await Promise.all([
    prisma.financialNote.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.financialNote.count({ where }),
  ]);

  return {
    data: records.map(serializeNote),
    total,
  };
}

export async function getFinancialSummary(params?: { from?: string; to?: string }) {
  const { from, to } = params ?? {};
  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const [incomeResult, expenseResult] = await Promise.all([
    prisma.financialNote.aggregate({ where: { ...where, type: "INCOME" }, _sum: { amount: true } }),
    prisma.financialNote.aggregate({ where: { ...where, type: "EXPENSE" }, _sum: { amount: true } }),
  ]);

  const totalIncome = decimalToNumber(incomeResult._sum.amount);
  const totalExpense = decimalToNumber(expenseResult._sum.amount);
  return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
}

export async function createFinancialNote(input: CreateFinancialNoteInput) {
  const record = await prisma.financialNote.create({
    data: {
      date: new Date(input.date),
      type: input.type,
      amount: input.amount,
      description: input.description,
      userId: input.userId,
    },
  });
  return serializeNote(record);
}

export async function updateFinancialNote(
  id: string,
  input: Partial<Omit<CreateFinancialNoteInput, "userId">>
) {
  const record = await prisma.financialNote.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.description !== undefined && { description: input.description }),
    },
  });
  return serializeNote(record);
}

export async function deleteFinancialNote(id: string) {
  await prisma.financialNote.delete({ where: { id } });
}
