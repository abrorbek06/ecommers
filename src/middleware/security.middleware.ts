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
    }),

    // Compression
    compression({
      filter: (req: any, res: any) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
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
      handler: (req: Request, res: Response, next: NextFunction) => {
        logger.warn({ ip: req.ip, url: req.url }, 'Rate limit exceeded');
        next(new RateLimitError());
      },
      skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/';
      },
    }),
  ];
}

export function validateWebhook(req: Request, res: Response, next: NextFunction): void {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    next(new Error('BOT_TOKEN not configured'));
    return;
  }

  // Telegram webhook verification
  const telegramToken = req.query.token as string;
  if (telegramToken && telegramToken !== botToken.split(':')[1]) {
    res.status(401).json({ error: 'Invalid webhook token' });
    return;
  }

  next();
}
