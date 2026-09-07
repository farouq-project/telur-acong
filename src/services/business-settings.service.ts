import prisma from "@/lib/prisma";

const SINGLETON_ID = "singleton";

export interface BusinessSettingsInput {
  companyName?: string | null;
  slogan?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
}

function serialize(row: {
  id: string;
  companyName: string | null;
  slogan: string | null;
  address: string | null;
  logoUrl: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  updatedAt: Date | null;
}) {
  return {
    ...row,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

export async function getBusinessSettings() {
  const row = await prisma.businessSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (row) return serialize(row);
  return serialize({
    id: SINGLETON_ID,
    companyName: null,
    slogan: null,
    address: null,
    logoUrl: null,
    bankName: null,
    bankAccountNumber: null,
    bankAccountHolder: null,
    updatedAt: null,
  });
}

export async function updateBusinessSettings(input: BusinessSettingsInput) {
  const row = await prisma.businessSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...input },
    update: input,
  });
  return serialize(row);
}
