import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  if (process.env.NODE_ENV === "production" && process.env.PRISMA_ACCELERATE_URL) {
    // Cast to PrismaClient so downstream service return types stay fully typed
    return base.$extends(withAccelerate()) as unknown as PrismaClient;
  }
  return base;
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
