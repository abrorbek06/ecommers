import pino from 'pino';
import { getEnv } from '../config/env';

let logger: pino.Logger | null = null;

export function createLogger(): pino.Logger {
  if (logger) {
    return logger;
  }

  const env = getEnv();
  const isDevelopment = env.NODE_ENV === 'development';

  const loggerConfig: pino.LoggerOptions = {
    level: env.LOG_LEVEL,
    ...(isDevelopment
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }
      : {
          // Production: JSON structured logging for log aggregation
          formatters: {
            level: (label: string) => {
              return { level: label };
            },
          },
          timestamp: pino.stdTimeFunctions.isoTime,
          // Redact sensitive information from logs
          redact: {
            paths: ['req.headers.authorization', 'req.headers["x-api-key"]', 'BOT_TOKEN', 'ADMIN_PASSWORD'],
            remove: true,
          },
        }),
  };

  logger = pino(loggerConfig);

  return logger;
}

export function getLogger(): pino.Logger {
  if (!logger) {
    return createLogger();
  }
  return logger;
}

export default getLogger;
