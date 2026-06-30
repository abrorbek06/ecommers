import { z } from 'zod';

const envSchema = z.object({
  // Telegram
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  
  // Redis (optional)
  REDIS_URL: z.string().url().optional(),
  
  // Server
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Webhook
  WEBHOOK_URL: z.string().url().optional(),
  
  // Admin
  ADMIN_PASSWORD: z.string().min(1, 'ADMIN_PASSWORD is required'),
  
  // Upload
  UPLOAD_CHAT_ID: z.string().min(1, 'UPLOAD_CHAT_ID is required'),
  
  // OTP
  OTP_EXPIRY_MINUTES: z.string().transform(Number).pipe(z.number().min(1)).default('5'),
  OTP_MAX_ATTEMPTS: z.string().transform(Number).pipe(z.number().min(1)).default('3'),
  OTP_RATE_LIMIT_MINUTES: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  OTP_MAX_REQUESTS_PER_MINUTE: z.string().transform(Number).pipe(z.number().min(1)).default('3'),
  OTP_LENGTH: z.string().transform(Number).pipe(z.number().min(4).max(8)).default('6'),
  
  // Storage
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  STORAGE_PATH: z.string().default('./uploads'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1)).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)).default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Security
  ALLOWED_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      const errors = result.error.errors.map((e: z.ZodError) => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${errors}`);
    }
    
    cachedEnv = result.data;
    return cachedEnv;
  } catch (error) {
    throw new Error(`Failed to validate environment variables: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getEnv(): Env {
  if (!cachedEnv) {
    return validateEnv();
  }
  return cachedEnv;
}
