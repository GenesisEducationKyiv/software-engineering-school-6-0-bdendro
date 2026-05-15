import pino from 'pino';
import { ENV, NodeEnv } from '../common/constants/env';
import { LOG_LEVELS_BY_ENV } from '../common/constants/logger';

export function createLogger(nodeEnv: NodeEnv, appName: string) {
  const isProduction = nodeEnv === ENV.PRODUCTION;
  const isTest = nodeEnv === ENV.TEST;

  const logLevel = isProduction
    ? LOG_LEVELS_BY_ENV.PRODUCTION
    : isTest
      ? LOG_LEVELS_BY_ENV.TEST
      : LOG_LEVELS_BY_ENV.DEVELOPMENT;

  return pino({
    name: appName,
    timestamp: pino.stdTimeFunctions.isoTime,
    level: logLevel,

    serializers: {
      err: pino.stdSerializers.errWithCause,
    },

    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        },
  });
}

export type AppLogger = pino.Logger;
