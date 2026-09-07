import prisma from "../src/lib/prisma";

async function main() {
  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        { companyName: { not: null } },
        { notes: { not: null } },
        { logoUrl: { not: null } },
      ],
    },
    orderBy: [{ role: "asc" }, { updatedAt: "desc" }],
    select: { id: true, name: true, role: true, companyName: true, notes: true, logoUrl: true },
  });

  const source = candidates.find((u) => u.role === "OWNER") ?? candidates[0];

  if (!source) {
    console.log("No user has companyName/notes/logoUrl set — nothing to backfill.");
    return;
  }

  console.log(`Backfilling BusinessSettings from user "${source.name}" (${source.role})`);

  await prisma.businessSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      companyName: source.companyName,
      address: source.notes,
      logoUrl: source.logoUrl,
    },
    update: {
      companyName: source.companyName,
      address: source.notes,
      logoUrl: source.logoUrl,
    },
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
