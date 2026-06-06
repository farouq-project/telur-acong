import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function getUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
}

export async function getUserById(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!u) return null;
  return {
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "OWNER" | "STAFF";
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) throw new Error("Email sudah digunakan");

  const passwordHash = await bcrypt.hash(input.password, 10);
  const u = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: input.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return {
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

export async function updateUser(
  id: string,
  input: {
    name?: string;
    email?: string;
    role?: "OWNER" | "STAFF";
    isActive?: boolean;
  }
) {
  if (input.email) {
    const existing = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id } },
    });
    if (existing) throw new Error("Email sudah digunakan");
  }

  const u = await prisma.user.update({
    where: { id },
    data: input,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return {
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
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
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  });
}

export async function resetPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  });
}
