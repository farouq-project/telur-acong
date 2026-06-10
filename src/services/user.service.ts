import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

const USER_SELECT_BASE = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  companyName: true,
  notes: true,
  logoUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

function serializeUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  companyName: string | null;
  notes: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  password?: string;
}) {
  return {
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export async function getUsers(includePassword = false) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { ...USER_SELECT_BASE, ...(includePassword ? { password: true } : {}) },
  });
  return users.map(serializeUser);
}

export async function getUserById(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT_BASE,
  });
  if (!u) return null;
  return serializeUser(u);
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "DEVELOPER" | "OWNER" | "STAFF" | "FARM_HEAD" | "QA_HEAD";
  companyName?: string;
  notes?: string;
  logoUrl?: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("Email sudah digunakan");

  const passwordHash = await bcrypt.hash(input.password, 10);
  const u = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: input.role,
      companyName: input.companyName ?? null,
      notes: input.notes ?? null,
      logoUrl: input.logoUrl ?? null,
    },
    select: USER_SELECT_BASE,
  });
  return serializeUser(u);
}

export async function updateUser(
  id: string,
  input: {
    name?: string;
    email?: string;
    role?: "DEVELOPER" | "OWNER" | "STAFF" | "FARM_HEAD" | "QA_HEAD";
    isActive?: boolean;
    companyName?: string | null;
    notes?: string | null;
    logoUrl?: string | null;
  }
) {
  if (input.email) {
    const existing = await prisma.user.findFirst({ where: { email: input.email, NOT: { id } } });
    if (existing) throw new Error("Email sudah digunakan");
  }

  const u = await prisma.user.update({
    where: { id },
    data: input,
    select: USER_SELECT_BASE,
  });
  return serializeUser(u);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User tidak ditemukan");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error("Password lama salah");

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });
}

export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });
}
