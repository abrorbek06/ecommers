export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum Language {
  UZ = 'uz',
  RU = 'ru',
}

export enum Source {
  TELEGRAM_BOT = 'TELEGRAM_BOT',
  WEBSITE = 'WEBSITE',
  ADMIN_PANEL = 'ADMIN_PANEL',
}

export enum StorageType {
  LOCAL = 'local',
  S3 = 's3',
}

export enum LogLevel {
  FATAL = 'fatal',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

export const CACHE_KEYS = {
  PRODUCTS: 'products',
  PRODUCT: 'product',
  CATEGORIES: 'categories',
  USER_SESSION: 'user_session',
  TELEGRAM_FILE: 'telegram_file',
} as const;

export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const;

export const TELEGRAM_ERRORS = {
  FLOOD_WAIT: 'FLOOD_WAIT',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
