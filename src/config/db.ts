// Re-import directly from the generated .prisma/client to force VS Code
// to pick up fresh types after `prisma generate`
import { PrismaClient } from "@prisma/client";

// Singleton pattern — prevents multiple connections during hot reload
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export default prisma;
export { prisma };
