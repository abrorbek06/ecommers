import * as dotenv from 'dotenv';
// Load environment variables before importing bot or server configurations
dotenv.config();

import { validateEnv, getEnv } from './config/env';
import { getLogger } from './logger';
import { cacheService } from './services/cache.service';
import { bot } from './bot/bot';
import { app, webhookPath, httpServer } from './server';

// Validate environment variables
validateEnv();

const logger = getLogger();
const env = getEnv();

async function bootstrap() {
  try {
    logger.info('Starting application...', {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      webhookMode: !!env.WEBHOOK_URL,
    });

    if (env.WEBHOOK_URL) {
      // 1. Webhook Mode (Production / Tunneling)
      const fullWebhookUrl = `${env.WEBHOOK_URL.replace(/\/$/, '')}${webhookPath}`;
      logger.info({ webhookUrl: fullWebhookUrl }, 'Setting webhook');

      await bot.telegram.setWebhook(fullWebhookUrl);

      httpServer.listen(env.PORT, () => {
        logger.info({ port: env.PORT }, 'Webhook server is running');
        logger.info('Bot status: ACTIVE (Webhook Mode)');
      });
    } else {
      // 2. Long Polling Mode (Development)
      logger.info('No WEBHOOK_URL defined. Falling back to Long Polling...');

      // Clear any active webhook before starting polling
      await bot.telegram.deleteWebhook();

      bot.launch();
      logger.info('Bot status: ACTIVE (Long Polling Mode)');

      // Start express server for health checks
      httpServer.listen(env.PORT, () => {
        logger.info({ port: env.PORT }, 'Healthcheck server is running');
      });
    }

    logger.info('Application started successfully');
  } catch (error) {
    logger.error({ error }, 'Bootstrap failure');
    process.exit(1);
  }
}

// Enable graceful stop
process.once('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  bot.stop('SIGINT');
  await cacheService.disconnect();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  bot.stop('SIGTERM');
  await cacheService.disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
  process.exit(1);
});

bootstrap();
