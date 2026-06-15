import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// On Vercel's serverless runtime each function instance opens its own Prisma
// connection pool against the shared Hostinger MySQL server, which has a low
// max_connections limit. Cap the pool per instance so concurrent instances
// don't exhaust it. Skipped for Accelerate, which manages pooling itself.
function pooledDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  if (url.includes("connection_limit=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=3&pool_timeout=10`;
}

function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === "production";
  const useAccelerate = isProduction && !!process.env.PRISMA_ACCELERATE_URL;

  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(isProduction && !useAccelerate
      ? { datasources: { db: { url: pooledDatabaseUrl() } } }
      : {}),
  });
  if (useAccelerate) {
    // Cast to PrismaClient so downstream service return types stay fully typed
    return base.$extends(withAccelerate()) as unknown as PrismaClient;
  }
  return base;
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
