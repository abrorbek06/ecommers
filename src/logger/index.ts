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
          formatters: {
            level: (label: string) => {
              return { level: label };
            },
          },
          timestamp: pino.stdTimeFunctions.isoTime,
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
