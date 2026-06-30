import { promises as fs } from 'fs';
import path from 'path';
import { getEnv } from '../config/env';
import { StorageConfig } from '../core/types';
import { getLogger } from '../logger';
import { AppError } from '../core/errors';

const logger = getLogger();

export class StorageService {
  private config: StorageConfig;

  constructor() {
    const env = getEnv();
    this.config = {
      type: env.STORAGE_TYPE,
      path: env.STORAGE_PATH,
      s3: env.STORAGE_TYPE === 's3' ? {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
        region: env.AWS_REGION!,
        bucket: env.AWS_S3_BUCKET!,
      } : undefined,
    };
  }

  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      logger.info({ path: dirPath }, 'Created directory');
    }
  }

  async saveFile(fileName: string, buffer: Buffer): Promise<string> {
    if (this.config.type === 'local') {
      return this.saveLocal(fileName, buffer);
    } else if (this.config.type === 's3') {
      return this.saveS3(fileName, buffer);
    }
    throw new AppError('Unsupported storage type');
  }

  async saveLocal(fileName: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.config.path!, fileName);
    const dir = path.dirname(filePath);
    
    await this.ensureDirectoryExists(dir);
    await fs.writeFile(filePath, buffer);
    
    logger.info({ path: filePath }, 'File saved locally');
    return filePath;
  }

  async saveS3(fileName: string, buffer: Buffer): Promise<string> {
    // S3 implementation would go here
    // For now, fall back to local storage
    logger.warn('S3 storage not yet implemented, falling back to local');
    return this.saveLocal(fileName, buffer);
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.config.type === 'local') {
      try {
        await fs.unlink(filePath);
        logger.info({ path: filePath }, 'File deleted');
      } catch (error) {
        logger.error({ error, path: filePath }, 'Failed to delete file');
      }
    } else if (this.config.type === 's3') {
      // S3 delete implementation would go here
      logger.warn('S3 delete not yet implemented');
    }
  }

  async getFile(filePath: string): Promise<Buffer> {
    if (this.config.type === 'local') {
      try {
        return await fs.readFile(filePath);
      } catch (error) {
        logger.error({ error, path: filePath }, 'Failed to read file');
        throw new AppError('File not found');
      }
    } else if (this.config.type === 's3') {
      // S3 get implementation would go here
      throw new AppError('S3 get not yet implemented');
    }
    throw new AppError('Unsupported storage type');
  }
}

export const storageService = new StorageService();
