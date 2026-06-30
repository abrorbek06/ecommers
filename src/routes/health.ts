import { Router } from 'express';
import prisma from '../database';
import { cacheService } from '../services/cache.service';
import { bot } from '../bot/bot';
import { HealthCheck, HealthStatus } from '../core/types';
import { getLogger } from '../logger';

const router = Router();
const logger = getLogger();

async function checkDatabase(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRedis(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    if (!cacheService.isEnabled()) {
      return {
        status: 'healthy',
        latency: 0,
      };
    }
    await cacheService.set('health_check', 'ok', 5);
    await cacheService.delete('health_check');
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    logger.error({ error }, 'Redis health check failed');
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkTelegram(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    await bot.telegram.getMe();
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    logger.error({ error }, 'Telegram health check failed');
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

router.get('/health', async (_req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const version = process.env.npm_package_version || '2.0.0';

  const [dbStatus, redisStatus, telegramStatus] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkTelegram(),
  ]);

  const overallStatus: 'healthy' | 'unhealthy' | 'degraded' =
    dbStatus.status === 'healthy' && 
    telegramStatus.status === 'healthy'
      ? redisStatus.status === 'healthy' ? 'healthy' : 'degraded'
      : 'unhealthy';

  const health: HealthCheck = {
    status: overallStatus,
    uptime,
    timestamp: new Date().toISOString(),
    version,
    services: {
      database: dbStatus,
      redis: redisStatus,
      telegram: telegramStatus,
    },
    memory: {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
    },
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sales-bot',
    version: process.env.npm_package_version || '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint for monitoring (Prometheus-compatible format)
router.get('/metrics', async (_req, res) => {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Simple Prometheus-style metrics
    const metrics = [
      `# HELP process_uptime_seconds Process uptime in seconds`,
      `# TYPE process_uptime_seconds gauge`,
      `process_uptime_seconds ${uptime.toFixed(2)}`,
      '',
      `# HELP process_memory_bytes Process memory usage in bytes`,
      `# TYPE process_memory_bytes gauge`,
      `process_memory_bytes{type="heap_used"} ${memoryUsage.heapUsed}`,
      `process_memory_bytes{type="heap_total"} ${memoryUsage.heapTotal}`,
      `process_memory_bytes{type="rss"} ${memoryUsage.rss}`,
      `process_memory_bytes{type="external"} ${memoryUsage.external}`,
      '',
      `# HELP process_heap_size_percentage Heap size usage percentage`,
      `# TYPE process_heap_size_percentage gauge`,
      `process_heap_size_percentage ${(memoryUsage.heapUsed / memoryUsage.heapTotal * 100).toFixed(2)}`,
    ];
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
  } catch (error) {
    logger.error({ error }, 'Metrics endpoint failed');
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

export default router;
