export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  timestamp: string;
  version: string;
  services: {
    database: HealthStatus;
    redis: HealthStatus;
    telegram: HealthStatus;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StorageConfig {
  type: 'local' | 's3';
  path?: string;
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
}

export interface CacheOptions {
  ttl?: number;
  key: string;
}

export interface TelegramFile {
  fileId: string;
  fileUniqueId: string;
  fileSize?: number;
  filePath?: string;
}
