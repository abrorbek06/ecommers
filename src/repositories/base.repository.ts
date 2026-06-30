import { PrismaClient } from '@prisma/client';
import { DatabaseError } from '../core/errors';
import { getLogger } from '../logger';

export abstract class BaseRepository {
  protected prisma: PrismaClient;
  protected logger = getLogger();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  protected async handleDatabaseError<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.logger.error({ error, operation }, 'Database operation failed');
      throw new DatabaseError(
        `Database operation failed: ${operation}`
      );
    }
  }
}
