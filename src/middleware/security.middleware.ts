import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../config/env';
import { RateLimitError } from '../core/errors';
import { getLogger } from '../logger';

const logger = getLogger();

export function setupSecurityMiddleware() {
  const env = getEnv();
  const isDevelopment = env.NODE_ENV === 'development';

  return [
    // Helmet for security headers
    helmet({
      contentSecurityPolicy: isDevelopment ? false : undefined,
      crossOriginEmbedderPolicy: isDevelopment ? false : undefined,
    }),

    // CORS
    cors({
      origin: env.ALLOWED_ORIGINS
        ? env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
        : isDevelopment
          ? ['http://localhost:5173', 'http://localhost:3000']
          : false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400, // 24 hours
      optionsSuccessStatus: 204,
    }),

    // Compression
    compression({
      filter: (req: any, _res: any) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, _res);
      },
      threshold: 1024,
    }),

    // Rate limiting
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      message: {
        error: {
          message: 'Too many requests from this IP, please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req: Request, _res: Response, next: NextFunction) => {
        logger.warn({ ip: _req.ip, url: _req.url }, 'Rate limit exceeded');
        next(new RateLimitError());
      },
      skip: (req: Request) => {
        // Skip rate limiting for health checks and webhook
        return req.path === '/health' || req.path === '/' || req.path.startsWith('/blog/webhook');
      },
      // Store rate limit in Redis if available, otherwise memory
      store: undefined, // Will use memory store by default
    }),
  ];
}

// In-memory store for webhook request deduplication (prevents replay attacks)
const webhookRequestCache = new Map<string, number>();
const WEBHOOK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const WEBHOOK_CACHE_CLEANUP_INTERVAL = 60 * 1000; // 1 minute

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of webhookRequestCache.entries()) {
    if (now - timestamp > WEBHOOK_CACHE_TTL) {
      webhookRequestCache.delete(key);
    }
  }
}, WEBHOOK_CACHE_CLEANUP_INTERVAL);

// Telegram IP ranges (as of 2024)
const TELEGRAM_IP_RANGES = [
  '149.154.160.0/20',
  '91.108.4.0/22',
  '91.108.56.0/22',
  '91.108.8.0/22',
  '91.108.12.0/22',
  '91.108.16.0/22',
  '91.108.20.0/22',
  '91.108.200.0/24',
];

// Simple IP range check function
function isIPInRange(ip: string, range: string): boolean {
  const [rangeAddr, mask] = range.split('/');
  const maskBits = parseInt(mask, 10);
  
  const ipParts = ip.split('.').map(Number);
  const rangeParts = rangeAddr.split('.').map(Number);
  
  const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
  
  const maskNum = (0xFFFFFFFF << (32 - maskBits)) >>> 0;
  
  return (ipNum & maskNum) === (rangeNum & maskNum);
}

function isFromTelegram(ip: string): boolean {
  return TELEGRAM_IP_RANGES.some(range => isIPInRange(ip, range));
}

export function validateWebhook(req: Request, res: Response, next: NextFunction): void {
  const secretToken = process.env.WEBHOOK_SECRET_TOKEN;
  
  if (!secretToken) {
    logger.warn('WEBHOOK_SECRET_TOKEN not configured, skipping webhook verification');
    next();
    return;
  }

  // Telegram webhook verification using X-Telegram-Bot-Api-Secret-Token header
  const telegramSecretToken = req.headers['x-telegram-bot-api-secret-token'] as string;
  
  if (!telegramSecretToken) {
    logger.warn({ ip: req.ip }, 'Webhook request missing secret token header');
    res.status(401).json({ error: 'Unauthorized: Missing secret token' });
    return;
  }

  if (telegramSecretToken !== secretToken) {
    logger.warn({ ip: req.ip }, 'Webhook request with invalid secret token');
    res.status(401).json({ error: 'Unauthorized: Invalid secret token' });
    return;
  }

  // IP-based filtering - verify request is from Telegram
  const clientIP = req.ip || req.socket.remoteAddress || '';
  // Remove IPv6 prefix if present
  const cleanIP = clientIP.replace(/^::ffff:/, '');
  
  if (!isFromTelegram(cleanIP)) {
    logger.warn({ ip: cleanIP }, 'Webhook request from non-Telegram IP');
    res.status(403).json({ error: 'Forbidden: Invalid source IP' });
    return;
  }

  // Replay attack prevention - deduplicate requests
  if (req.body && req.body.update_id) {
    const updateId = req.body.update_id;
    const cacheKey = `${cleanIP}_${updateId}`;
    const now = Date.now();
    
    if (webhookRequestCache.has(cacheKey)) {
      const timestamp = webhookRequestCache.get(cacheKey)!;
      if (now - timestamp < WEBHOOK_CACHE_TTL) {
        logger.warn({ ip: cleanIP, updateId }, 'Duplicate webhook request detected (possible replay attack)');
        res.status(200).json({ status: 'ok' }); // Return 200 to prevent Telegram from retrying
        return;
      }
    }
    
    webhookRequestCache.set(cacheKey, now);
  }

  // Request size validation
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const MAX_WEBHOOK_SIZE = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > MAX_WEBHOOK_SIZE) {
    logger.warn({ ip: cleanIP, size: contentLength }, 'Webhook request too large');
    res.status(413).json({ error: 'Payload too large' });
    return;
  }

  next();
}
