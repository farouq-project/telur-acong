import prisma from "@/lib/prisma";

export async function getHouses() {
  const houses = await prisma.house.findMany({
    orderBy: { name: "asc" },
  });
  return houses.map((h) => ({
    ...h,
    createdAt: h.createdAt.toISOString(),
    updatedAt: h.updatedAt.toISOString(),
  }));
}

export async function createHouse(input: { name: string; currentPopulation: number; notes?: string | null }) {
  return prisma.house.create({
    data: {
      name: input.name,
      currentPopulation: input.currentPopulation,
      notes: input.notes ?? null,
    },
  });
}

export async function updateHouse(
  id: string,
  input: { name?: string; currentPopulation?: number; notes?: string | null }
) {
  return prisma.house.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.currentPopulation !== undefined && { currentPopulation: input.currentPopulation }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteHouse(id: string) {
  return prisma.house.delete({ where: { id } });
}
