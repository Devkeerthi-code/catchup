import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

/**
 * pg warns that sslmode=require will change meaning in its next major version. Neon wants full
 * verification anyway, so ask for it explicitly and keep the logs quiet.
 */
function connectionString(): string {
  return env().DATABASE_URL.replace(/sslmode=(require|prefer|verify-ca)\b/, "sslmode=verify-full");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function db(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString() }) });
  }
  return globalForPrisma.prisma;
}
