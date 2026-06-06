import prisma from "@/lib/prisma";

export async function getVaccinationSchedules(params?: {
  includeDone?: boolean;
}) {
  const { includeDone = false } = params ?? {};

  const records = await prisma.vaccinationSchedule.findMany({
    where: includeDone ? {} : { isDone: false },
    orderBy: { scheduleDate: "asc" },
  });

  return records.map((r) => ({
    ...r,
    scheduleDate: r.scheduleDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getVaccinationById(id: string) {
  const r = await prisma.vaccinationSchedule.findUnique({ where: { id } });
  if (!r) return null;
  return {
    ...r,
    scheduleDate: r.scheduleDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createVaccination(input: {
  vaccineName: string;
  scheduleDate: string;
  notes?: string;
}) {
  const r = await prisma.vaccinationSchedule.create({
    data: {
      vaccineName: input.vaccineName,
      scheduleDate: new Date(input.scheduleDate),
      notes: input.notes,
      isDone: false,
    },
  });
  return {
    ...r,
    scheduleDate: r.scheduleDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function updateVaccination(
  id: string,
  input: {
    vaccineName?: string;
    scheduleDate?: string;
    notes?: string;
    isDone?: boolean;
  }
) {
  const r = await prisma.vaccinationSchedule.update({
    where: { id },
    data: {
      ...(input.vaccineName !== undefined && { vaccineName: input.vaccineName }),
      ...(input.scheduleDate && {
        scheduleDate: new Date(input.scheduleDate),
      }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.isDone !== undefined && { isDone: input.isDone }),
    },
  });
  return {
    ...r,
    scheduleDate: r.scheduleDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function deleteVaccination(id: string) {
  await prisma.vaccinationSchedule.delete({ where: { id } });
}

export async function getUpcomingVaccinations(
  withinDays = 7
): Promise<
  {
    id: string;
    vaccineName: string;
    scheduleDate: string;
    notes: string | null;
    isDone: boolean;
    createdAt: string;
    updatedAt: string;
  }[]
> {
  const now = new Date();
  const limit = new Date();
  limit.setDate(now.getDate() + withinDays);

  const records = await prisma.vaccinationSchedule.findMany({
    where: {
      isDone: false,
      scheduleDate: { gte: now, lte: limit },
    },
    orderBy: { scheduleDate: "asc" },
  });

  return records.map((r) => ({
    ...r,
    scheduleDate: r.scheduleDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
