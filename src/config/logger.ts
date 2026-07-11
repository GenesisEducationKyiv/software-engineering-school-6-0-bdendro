import { ENV } from '../common/constants/env';
import { LoggerConfig } from '../common/modules/logger/interfaces/logger.interface';
import { Env } from './env';

const LOG_LEVELS_BY_ENV = {
  [ENV.DEVELOPMENT]: 'debug',
  [ENV.TEST]: 'error',
  [ENV.PRODUCTION]: 'info',
} as const;

export function createLoggerConfig(env: Env): LoggerConfig {
  return {
    appName: env.APP_NAME,
    level: LOG_LEVELS_BY_ENV[env.NODE_ENV],
    pretty: env.NODE_ENV !== ENV.PRODUCTION,
  };
}
