import { PrismaClient } from "@/generated/prisma";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Prisma 7 requires a driver adapter. DATABASE_URL must be an absolute file:// path or a libsql URL.
const DB_URL = process.env.DATABASE_URL_ABSOLUTE || "file:/home/user/l/candy-shop/dev.db";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter: new PrismaLibSql({ url: DB_URL }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
