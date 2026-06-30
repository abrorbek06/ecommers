// Re-import directly from the generated .prisma/client to force VS Code
// to pick up fresh types after `prisma generate`
import { PrismaClient } from "@prisma/client";

// Singleton pattern — prevents multiple connections during hot reload
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Database connection configuration with retry logic
const maxRetries = parseInt(process.env.DATABASE_MAX_RETRIES || '5', 10);
const retryDelay = parseInt(process.env.DATABASE_RETRY_DELAY || '1000', 10);

const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// Connection test with retry logic
async function testConnection(retryCount = 0): Promise<boolean> {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    if (retryCount < maxRetries) {
      console.warn(`Database connection failed (attempt ${retryCount + 1}/${maxRetries}), retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return testConnection(retryCount + 1);
    }
    console.error('Database connection failed after all retries:', error);
    throw error;
  }
}

// Initialize connection with retry logic
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Test connection on startup
testConnection().catch((error) => {
  console.error('Failed to establish database connection:', error);
  process.exit(1);
});

export default prisma;
export { prisma, testConnection };
